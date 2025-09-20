from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json, random

from project.utils.cloudant_client import find_user_by_aadhaar, find_user_by_pan
from project.utils.mailer import send_otp_email


from django.shortcuts import render

def test_form(request):
    return render(request, "form.html")


OTP_STORE = {}  # production me Redis/DB use karna

@csrf_exempt
def verify_aadhaar_pan(request):
    if request.method == "POST":
        body = json.loads(request.body)

        aadhaar = body.get("aadhaar")
        pan = body.get("pan")

        user = None
        if aadhaar:
            user = find_user_by_aadhaar(aadhaar)
        elif pan:
            user = find_user_by_pan(pan)

        if not user:
            return JsonResponse({"success": False, "message": "No record found"})

        # Support both 'Email' and 'email' keys in Cloudant doc
        email = user.get("Email") or user.get("email")
        if not email:
            return JsonResponse({"success": False, "message": "Email missing in record"})

        # OTP generate
        otp = str(random.randint(100000, 999999))
        OTP_STORE[email] = otp

        # Try to send OTP via email; if it fails, still print to console for dev
        try:
            from project.utils.mailer import render_otp_html
            user_name = user.get("Name") or email.split('@')[0]
            html = render_otp_html(user_name, otp, title="Your Login OTP")
        except Exception:
            html = None
        sent = send_otp_email(
            to_email=email,
            otp=otp,
            subject="Block Estate - Your Login OTP",
            body_prefix="Use this OTP to complete your login/verification on BlockEstate.",
            html_body=html,
        )
        if not sent:
            print(f"DEBUG OTP for {email}: {otp}")

        return JsonResponse ({"success": True, "message": "OTP sent", "email": email})


@csrf_exempt
def verify_otp(request):
    if request.method == "POST":
        body = json.loads(request.body)

        email = body.get("email")
        otp = body.get("otp")

        if OTP_STORE.get(email) == otp:
            del OTP_STORE[email]  # ek bar use hone ke baad hata do
            return JsonResponse({"success": True, "message": "OTP verified"})
        else:
            return JsonResponse({"success": False, "message": "Invalid OTP"})
