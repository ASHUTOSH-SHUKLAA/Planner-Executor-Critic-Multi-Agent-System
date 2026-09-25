"""
Email Dispatch Service for TriadFlow Authentication.
Supports standard SMTP with TLS/SSL (e.g., Gmail, SendGrid, Amazon SES, Mailgun, Outlook).
Dispatches branded HTML + Plain Text verification OTP emails.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from typing import Optional, Tuple

logger = logging.getLogger("email_service")


def is_smtp_configured() -> bool:
    """Check if outbound SMTP server credentials are provided in environment."""
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    return bool(host and user and password)


def generate_otp_email_html(code: str, user_name: Optional[str] = None) -> str:
    """Render an enterprise-grade HTML email template for authentication OTP."""
    greeting = f"Hello {user_name}," if user_name else "Hello,"
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TriadFlow Verification Code</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f4f7;
      color: #333333;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }}
    .container {{
      max-width: 540px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 28px 24px;
      text-align: center;
      color: #ffffff;
    }}
    .header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }}
    .header p {{
      margin: 6px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }}
    .content {{
      padding: 32px 28px;
    }}
    .otp-box {{
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-code {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #4f46e5;
      margin: 0;
    }}
    .meta-text {{
      font-size: 13px;
      color: #64748b;
      margin-top: 8px;
    }}
    .footer {{
      border-top: 1px solid #f1f5f9;
      padding: 20px 28px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      background: #fafafa;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TriadFlow Multi-Agent System</h1>
      <p>Secure Passwordless Authentication</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; font-weight: 600; margin-top: 0;">{greeting}</p>
      <p style="font-size: 14px; color: #475569;">
        You recently requested to sign in or register for TriadFlow. Use the 6-digit verification code below to complete your authentication:
      </p>
      <div class="otp-box">
        <div class="otp-code">{code}</div>
        <div class="meta-text">Valid for <strong>10 minutes</strong> &bull; Single-use only</div>
      </div>
      <p style="font-size: 12px; color: #64748b;">
        If you did not request this verification code, please ignore this email or contact security if you suspect unauthorized activity.
      </p>
    </div>
    <div class="footer">
      TriadFlow Multi-Agent Research Platform &bull; Automated System Security Notification
    </div>
  </div>
</body>
</html>
"""


def generate_otp_email_text(code: str, user_name: Optional[str] = None) -> str:
    """Plain text email fallback."""
    greeting = f"Hello {user_name},\n\n" if user_name else "Hello,\n\n"
    return (
        f"{greeting}"
        f"Your TriadFlow verification code is: {code}\n\n"
        f"This code will expire in 10 minutes and can only be used once.\n\n"
        f"If you did not request this code, you can safely ignore this email.\n\n"
        f"--\nTriadFlow Multi-Agent System"
    )


def send_verification_email(
    to_email: str,
    code: str,
    user_name: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Dispatches a verification email containing the 6-digit OTP code to the recipient.
    Returns (success: bool, status_message: str).
    """
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "TriadFlow Security").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", user or "auth@triadflow.ai").strip()

    if not host or not user or not password:
        logger.info(
            f"SMTP not configured (SMTP_HOST/USER/PASSWORD missing). "
            f"Verification OTP for {to_email} logged to terminal: >>> {code} <<<"
        )
        return False, "SMTP server not configured in environment"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your TriadFlow Verification Code: {code}"
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    # Attach plain text and HTML versions
    part_text = MIMEText(generate_otp_email_text(code, user_name), "plain")
    part_html = MIMEText(generate_otp_email_html(code, user_name), "html")
    msg.attach(part_text)
    msg.attach(part_html)

    try:
        if port == 465:
            # SSL
            with smtplib.SMTP_SSL(host, port, timeout=10) as server:
                server.login(user, password)
                server.sendmail(from_email, [to_email], msg.as_string())
        else:
            # STARTTLS (e.g. port 587 or 25)
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(user, password)
                server.sendmail(from_email, [to_email], msg.as_string())

        logger.info(f"Verification OTP successfully dispatched via SMTP to {to_email}")
        return True, f"Verification code successfully sent to {to_email}"
    except Exception as e:
        error_msg = f"Failed to send email via SMTP to {to_email}: {str(e)}"
        logger.error(error_msg)
        return False, error_msg
