from django.conf import settings
from django.core.mail import send_mail
import threading


def render_otp_html(name: str, otp: str, title: str = "Your Login OTP", subtitle: str = "Secure Land Registry Platform", intro: str | None = None) -> str:
    safe_name = name or "User"
    intro_line = intro or "You requested to log in to Block Estate. Please use the following One‑Time Password (OTP) to complete your authentication."
    return f"""
<!doctype html>
<html>
  <head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <title>{title}</title>
    <style>
      body {{ background:#f6f7fb; margin:0; font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111827; }}
      .container {{ max-width:560px; margin:0 auto; padding:24px 16px; }}
      .card {{ background:#ffffff; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.05); overflow:hidden; }}
      .brand {{ padding:20px 24px; background:linear-gradient(135deg,#7c3aed,#06b6d4); color:white; display:flex; align-items:center; gap:12px; }}
      .brand-title {{ font-size:20px; font-weight:600; }}
      .brand-sub {{ font-size:13px; opacity:0.9; }}
      .content {{ padding:24px; }}
      h1 {{ margin:0 0 8px 0; font-size:22px; }}
      p {{ margin:0 0 14px 0; line-height:1.6; color:#374151; }}
      .otp-box {{ margin:18px 0; border:2px dashed #d1d5db; border-radius:12px; padding:18px; text-align:center; }}
      .otp {{ font-size:32px; letter-spacing:6px; font-weight:700; color:#2563eb; }}
      .muted {{ color:#6b7280; font-size:13px; }}
      .note {{ background:#fff7ed; border-left:4px solid #f59e0b; padding:12px 14px; border-radius:8px; color:#92400e; font-size:13px; }}
      .footer {{ padding:16px 24px; color:#6b7280; font-size:12px; text-align:center; }}
    </style>
  </head>
  <body>
    <div class='container'>
      <div class='card'>
        <div class='brand'>
          <div class='brand-title'>Block Estate</div>
        </div>
        <div class='content'>
          <h1>Hello {safe_name},</h1>
          <p>{intro_line}</p>
          <div class='otp-box'>
            <div class='otp'>{otp}</div>
            <div class='muted'>This OTP is valid for 10 minutes</div>
          </div>
          <div class='note'>
            <strong>Security Notice:</strong> Never share this OTP with anyone. Block Estate will never ask for your OTP via phone or email.
          </div>
          <p class='muted' style='margin-top:16px;'>If you didn't request this, you can ignore this email or contact our support.</p>
        </div>
        <div class='footer'>
          © 2025 Block Estate. All rights reserved.
        </div>
      </div>
    </div>
  </body>
</html>
"""


def send_otp_email(to_email: str, otp: str, subject: str = None, body_prefix: str = None, async_send: bool = True, html_body: str | None = None) -> bool:
    """
    Send an OTP email using Django's configured SMTP settings.
    If async_send=True (default), the email is dispatched in a background thread and this
    function returns immediately with True (best-effort). Errors are logged.
    If async_send=False, this will block until send completes or fails (uses EMAIL_TIMEOUT if configured).
    Supports HTML bodies via the html_body parameter.
    """
    if not to_email or not otp:
        return False

    subj = subject or "Your BlockEstate OTP"
    prefix = body_prefix or "Use the following One-Time Password (OTP) to proceed."
    body = (
        f"{prefix}\n\n"
        f"OTP: {otp}\n\n"
        f"This OTP will expire soon. If you did not request this, you can ignore this email.\n"
        f"- BlockEstate"
    )

    def _send():
        try:
            from_email = getattr(settings, 'EMAIL_HOST_USER', None) or getattr(settings, 'DEFAULT_FROM_EMAIL', None)
            send_mail(
                subject=subj,
                message=body,
                from_email=from_email,
                recipient_list=[to_email],
                fail_silently=False,
                html_message=html_body,
            )
        except Exception as e:
            print(f"send_otp_email failed for {to_email}: {e}")

    if async_send:
        try:
            t = threading.Thread(target=_send, daemon=True)
            t.start()
            return True
        except Exception as e:
            print(f"Failed to start async email thread: {e}")
            # Fall through to synchronous send

    # Synchronous path
    try:
        _send()
        return True
    except Exception:
        return False
