from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from project.utils.cloudant_client import _select


def _ok(**kwargs):
    resp = {"success": True}
    resp.update(kwargs)
    return JsonResponse(resp)


def _error(msg, code=400):
    return JsonResponse({"success": False, "message": msg}, status=code)


def _norm_email(v):
    try:
        return v.strip().lower() if isinstance(v, str) else v
    except Exception:
        return v


@csrf_exempt
def login_surveyor(request):
    """
    Minimal surveyor login gate.
    Body: { email: string }
    Accept only if a govt-citizen record exists with Email=email and role indicates SURVEYOR.
    """
    if request.method != 'POST':
        return _error('POST required', 405)
    try:
        body = json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception:
        return _error('Invalid JSON')

    email = body.get('email')
    if not email:
        return _error('email is required')

    el = _norm_email(email)

    try:
        docs = _select("govt_citizens", {"email": f"eq.{el}"})
        if not docs:
            # attempt exact original case as fallback just in case
            docs = _select("govt_citizens", {"email": f"eq.{email}"})
            
        if not docs:
            return _error('Not a surveyor', 403)
            
        doc = docs[0]
        role = str(doc.get("role") or doc.get("Role") or doc.get("designation") or "").upper()
        
        if "SURVEYOR" not in role and "SURVEYER" not in role:
            return _error('Not a surveyor', 403)

        # Return a minimal profile
        profile = {
            "email": doc.get("Email") or doc.get("email"),
            "name": doc.get("Name") or doc.get("name"),
            "role": doc.get("role") or doc.get("Role") or doc.get("designation"),
        }
        return _ok(profile=profile)
    except Exception as e:
        print(f"surveyor login error: {e}")
        return _error('Error verifying surveyor', 500)


@csrf_exempt
def list_pending_for_surveyor(request):
    """
    List transactions assigned to this surveyor that are pending surveyor approval.
    """
    if request.method != 'POST':
        return _error('POST required', 405)
    try:
        body = json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception:
        return _error('Invalid JSON')

    email = body.get('email')
    if not email:
        return _error('email is required')

    el = _norm_email(email)

    try:
        # Verify surveyor exists
        docs = _select("govt_citizens", {"email": f"eq.{el}"})
        if not docs: docs = _select("govt_citizens", {"email": f"eq.{email}"})
        
        if not docs:
            return _error('Not a surveyor', 403)
            
        role = str(docs[0].get("role") or "").upper()
        if "SURVEYOR" not in role and "SURVEYER" not in role:
            return _error('Not a surveyor', 403)
        
        # Fetch transactions
        docs = _select("in_transaction", {
            "status": "eq.PENDING_SURVEYOR_APPROVAL",
            "order": "updated_at.desc"
        })
        
        # Map to lightweight items
        items = []
        for d in docs:
            items.append({
                "id": d.get("_id"),
                "property_id": d.get("property_id"),
                "seller_email": d.get("seller_email"),
                "buyer_email": d.get("buyer_email"),
                "status": d.get("status"),
                "updated_at": d.get("updated_at") or d.get("created_at"),
                "docs_link": d.get("docs_link"),
            })
        return _ok(transactions=items, count=len(items))
    except Exception as e:
        print(f"list_pending_for_surveyor error: {e}")
        return _error('Error listing transactions for surveyor', 500)
