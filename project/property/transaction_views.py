from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json, random

from project.utils.cloudant_client import (
    find_user_by_email,
    get_property_by_id,
    get_wallet_from_user_doc,
    create_transaction_doc,
    get_transaction_by_id,
    update_transaction_doc,
    find_user_by_wallet,
    remove_property_from_sale,
    get_prop_docs,
    assign_random_surveyor,
    find_transactions_for_user,
)
from project.utils.mailer import send_otp_email, render_otp_html

# Simple OTP stores for transaction flow
TX_OTP_SELLER = {}
TX_OTP_BUYER = {}

def _norm_email(val):
    try:
        return val.strip().lower() if isinstance(val, str) else val
    except Exception:
        return val


def _require_json(request):
    try:
        return json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception:
        return None


def _error(msg, code=400):
    return JsonResponse({"success": False, "message": msg}, status=code)


def _ok(**kwargs):
    resp = {"success": True}
    resp.update(kwargs)
    return JsonResponse(resp)


@csrf_exempt
def initiate_transfer(request):
    """
    Seller initiates property transfer to a selected buyer.
    Body: { property_id: str, seller_email: str, buyer_email: str }
    Effects:
      - Validates seller owns the property (by wallet mapping)
      - Creates in-transaction doc with status PENDING_SELLER_OTP
      - Sends OTP to seller (prints to console in dev)
      - Removes listing from marketplace (marks sold/inactive)
    """
    if request.method != 'POST':
        return _error('POST required', 405)
    body = _require_json(request)
    if body is None:
        return _error('Invalid JSON')
    property_id = body.get('property_id')
    seller_email = body.get('seller_email')
    buyer_email = body.get('buyer_email')

    if not property_id or not seller_email or not buyer_email:
        return _error('property_id, seller_email, buyer_email are required')

    # Validate seller is known
    seller_doc = find_user_by_email(seller_email)
    if not seller_doc:
        return _error('Unknown seller', 403)

    # Validate property and seller owns it
    prop = get_property_by_id(property_id)
    if not prop:
        return _error('Property not found', 404)
    prop_wallet = prop.get('wallet') or prop.get('wallet_address') or prop.get('wallet_adrdess') or prop.get('Wallet') or prop.get('walletAddress')
    if not prop_wallet:
        return _error('Property owner information not found', 404)

    # Resolve seller wallet
    seller_wallet = get_wallet_from_user_doc(seller_doc)
    if not seller_wallet:
        # try cross-lookup via wallet mapping
        seller_doc2 = find_user_by_wallet(prop_wallet)
        seller_wallet = prop_wallet if seller_doc2 else None
    if not seller_wallet:
        return _error('Seller wallet unavailable', 400)

    # Resolve buyer wallet if available
    buyer_doc = find_user_by_email(buyer_email)
    buyer_wallet = get_wallet_from_user_doc(buyer_doc) if buyer_doc else None

    # Create transaction doc
    docs = get_prop_docs(property_id)
    docs_link = docs.get('gdrive_link') if docs else None
    tx = create_transaction_doc(
        property_id=property_id,
        seller_email=seller_email,
        buyer_email=buyer_email,
        status='PENDING_SELLER_OTP',
        seller_wallet=seller_wallet,
        buyer_wallet=buyer_wallet,
        docs_link=docs_link,
    )
    if isinstance(tx, dict) and tx.get('error'):
        return _error(f"Failed to create transaction: {tx['error']}", 500)

    # Generate and store seller OTP keyed by transaction (robust when multiple txs exist)
    otp = str(random.randint(100000, 999999))
    TX_OTP_SELLER[tx.get('_id')] = otp
    # Email OTP to seller; fallback to console print for dev
    try:
        seller_name = seller_doc.get('Name') if isinstance(seller_doc, dict) else None
        html = render_otp_html(seller_name or seller_email.split('@')[0], otp, title="Seller OTP")
    except Exception:
        html = None
    if not send_otp_email(
        to_email=seller_email,
        otp=otp,
        subject=f"Block Estate - Seller OTP for Property {property_id}",
        body_prefix="Use this OTP to confirm you are initiating a transfer for the property.",
        html_body=html,
    ):
        print(f"TX SELLER OTP for {seller_email}: {otp}")

    return _ok(transaction={"id": tx.get("_id"), "status": tx.get("status")})


@csrf_exempt
def verify_seller_otp(request):
    """
    Verify seller OTP and move transaction to PENDING_BUYER_OTP.
    Body: { transaction_id: str, seller_email: str, otp: str }
    Also generates buyer OTP and prints it to console.
    """
    if request.method != 'POST':
        return _error('POST required', 405)
    body = _require_json(request)
    if body is None:
        return _error('Invalid JSON')

    tx_id = body.get('transaction_id')
    seller_email = body.get('seller_email')
    otp = body.get('otp')

    if not tx_id or not seller_email or not otp:
        return _error('transaction_id, seller_email, otp are required')

    # Accept OTP with case-insensitive email
    tx = get_transaction_by_id(tx_id)
    if not tx:
        return _error('Transaction not found', 404)

    # Validate seller identity and OTP keyed by transaction id
    if (tx.get('seller_email') or '').strip().lower() != _norm_email(seller_email):
        return _error('Unauthorized seller', 403)
    if TX_OTP_SELLER.get(tx_id) != otp:
        return _error('Invalid OTP', 403)

    # Clear seller OTP after success
    try:
        if tx_id in TX_OTP_SELLER:
            del TX_OTP_SELLER[tx_id]
    except Exception:
        pass

    tx['status'] = 'PENDING_BUYER_OTP'
    update_transaction_doc(tx)

    # Generate buyer OTP
    buyer_email = tx.get('buyer_email')
    if buyer_email:
        b_otp = str(random.randint(100000, 999999))
        # Store OTP keyed by transaction id
        TX_OTP_BUYER[tx_id] = b_otp
        # Email OTP to buyer; fallback to console print for dev
        try:
            buyer_doc = find_user_by_email(buyer_email)
            buyer_name = buyer_doc.get('Name') if buyer_doc else None
            html_b = render_otp_html(buyer_name or buyer_email.split('@')[0], b_otp, title="Buyer OTP")
        except Exception:
            html_b = None
        if not send_otp_email(
            to_email=buyer_email,
            otp=b_otp,
            subject=f"Block Estate - Buyer OTP for Property {tx.get('property_id')}",
            body_prefix="Use this OTP to confirm you are the buyer for the property transfer.",
            html_body=html_b,
        ):
            print(f"TX BUYER OTP for {buyer_email}: {b_otp}")

    # Now that seller verified, remove the property from sale listings
    try:
        if tx.get('property_id'):
            remove_property_from_sale(tx.get('property_id'))
    except Exception as e:
        print(f"Seller OTP verified but remove from sale failed: {e}")

    return _ok(transaction={"id": tx.get("_id"), "status": tx.get("status")})


@csrf_exempt
def verify_buyer_otp(request):
    """
    Verify buyer OTP, assign a surveyor, and move to PENDING_SURVEYOR_APPROVAL.
    Body: { transaction_id: str, buyer_email: str, otp: str }
    """
    if request.method != 'POST':
        return _error('POST required', 405)
    body = _require_json(request)
    if body is None:
        return _error('Invalid JSON')

    tx_id = body.get('transaction_id')
    buyer_email = body.get('buyer_email')
    otp = body.get('otp')

    if not tx_id or not buyer_email or not otp:
        return _error('transaction_id, buyer_email, otp are required')

    tx = get_transaction_by_id(tx_id)
    if not tx:
        return _error('Transaction not found', 404)

    # Validate buyer identity and OTP keyed by tx
    if (tx.get('buyer_email') or '').strip().lower() != _norm_email(buyer_email):
        return _error('Unauthorized buyer', 403)
    if TX_OTP_BUYER.get(tx_id) != otp:
        return _error('Invalid OTP', 403)

    # Clear OTP after successful verification
    try:
        if tx_id in TX_OTP_BUYER:
            del TX_OTP_BUYER[tx_id]
    except Exception:
        pass

    surveyor = assign_random_surveyor()
    tx['surveyor_email'] = surveyor.get('email') if surveyor else None
    tx['officer_details'] = surveyor
    tx['status'] = 'PENDING_SURVEYOR_APPROVAL'
    update_transaction_doc(tx)

    return _ok(transaction={"id": tx.get("_id"), "status": tx.get("status"), "surveyor": tx.get('surveyor_email')})


@csrf_exempt
def surveyor_approve(request):
    """
    Surveyor approves and optionally uploads report URL.
    Body: { transaction_id: str, surveyor_email: str, report_url?: str }
    Moves status to PENDING_BUYER_AGREEMENT.
    """
    if request.method != 'POST':
        return _error('POST required', 405)
    body = _require_json(request)
    if body is None:
        return _error('Invalid JSON')

    tx_id = body.get('transaction_id')
    surveyor_email = body.get('surveyor_email')
    report_url = body.get('report_url')

    if not tx_id or not surveyor_email:
        return _error('transaction_id and surveyor_email are required')

    tx = get_transaction_by_id(tx_id)
    if not tx:
        return _error('Transaction not found', 404)

    if tx.get('surveyor_email') and tx.get('surveyor_email') != surveyor_email:
        return _error('Unauthorized surveyor', 403)

    if report_url:
        tx['surveyor_report_url'] = report_url
    tx['status'] = 'PENDING_BUYER_AGREEMENT'
    update_transaction_doc(tx)

    return _ok(transaction={"id": tx.get("_id"), "status": tx.get("status")})


@csrf_exempt
def get_transaction_info(request, tx_id):
    """
    Public endpoint to fetch minimal transaction info for the transaction page.
    GET /api/property/transactions/<tx_id>/info/
    """
    if request.method != 'GET':
        return _error('GET required', 405)
    tx = get_transaction_by_id(tx_id)
    if not tx:
        return _error('Transaction not found', 404)
    data = {
        'id': tx.get('_id'),
        'property_id': tx.get('property_id'),
        'seller_email': tx.get('seller_email'),
        'buyer_email': tx.get('buyer_email'),
        'status': tx.get('status'),
        'updated_at': tx.get('updated_at') or tx.get('created_at'),
    }
    return _ok(transaction=data)


@csrf_exempt
def buyer_agree(request):
    """
    Buyer confirms whether they accept surveyor verification.
    Body: { transaction_id: str, buyer_email: str, agree: bool }
    If agree=True, moves to PENDING_AUTHENTICATOR_APPROVAL, else ON_HOLD.
    """
    if request.method != 'POST':
        return _error('POST required', 405)
    body = _require_json(request)
    if body is None:
        return _error('Invalid JSON')

    tx_id = body.get('transaction_id')
    buyer_email = body.get('buyer_email')
    agree = body.get('agree')

    if not tx_id or not buyer_email or agree is None:
        return _error('transaction_id, buyer_email and agree are required')

    tx = get_transaction_by_id(tx_id)
    if not tx:
        return _error('Transaction not found', 404)

    if tx.get('buyer_email') != buyer_email:
        return _error('Unauthorized buyer', 403)

    tx['status'] = 'PENDING_AUTHENTICATOR_APPROVAL' if agree else 'ON_HOLD'
    update_transaction_doc(tx)

    return _ok(transaction={"id": tx.get("_id"), "status": tx.get("status")})


@csrf_exempt
def list_transactions(request):
    """
    List transactions for a user (seller or buyer or both).
    POST body: { user_email: str, role?: 'seller'|'buyer', status?: str }
    """
    if request.method != 'POST':
        return _error('POST required', 405)
    body = _require_json(request)
    if body is None:
        return _error('Invalid JSON')

    user_email = body.get('user_email')
    role = body.get('role')  # optional
    status = body.get('status')  # optional

    if not user_email:
        return _error('user_email is required')

    try:
        docs = find_transactions_for_user(user_email, role=role, status=status)
        # Format lightweight response for dashboard
        txs = []
        for d in docs:
            # Determine role for this user
            role_for_user = 'buyer' if d.get('buyer_email') == user_email else ('seller' if d.get('seller_email') == user_email else None)
            counterpart = None
            if d.get('seller_email') and d.get('seller_email') != user_email:
                counterpart = d.get('seller_email')
            elif d.get('buyer_email') and d.get('buyer_email') != user_email:
                counterpart = d.get('buyer_email')
            txs.append({
                'id': d.get('_id'),
                'property_id': d.get('property_id'),
                'status': d.get('status'),
                'updated_at': d.get('updated_at') or d.get('created_at'),
                'counterpart': counterpart,
                'role_for_user': role_for_user,
            })
        return _ok(transactions=txs, count=len(txs))
    except Exception as e:
        print(f"Error listing transactions: {e}")
        return _error('Error listing transactions', 500)
