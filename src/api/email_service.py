"""
Email Dispatch Service for Synora Authentication.
Supports standard SMTP with TLS/SSL (e.g., Gmail, SendGrid, Amazon SES, Mailgun, Outlook).
Dispatches branded HTML + Plain Text verification OTP emails.
Forces IPv4 connection to prevent Linux container '[Errno 101] Network is unreachable' errors on IPv6-less cloud networks.
"""

import os
import socket
import ssl
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from typing import Optional, Tuple
from dotenv import load_dotenv

logger = logging.getLogger("email_service")


def _create_ipv4_socket(host: str, port: int, timeout: float = 10.0) -> socket.socket:
    """Forces IPv4 socket resolution to avoid [Errno 101] Network is unreachable on cloud container runtimes."""
    try:
        res_list = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    except Exception as e:
        raise OSError(101, f"Failed to resolve IPv4 address for {host}: {e}")

    if not res_list:
        raise OSError(101, f"No IPv4 address found for {host}")

    last_err = None
    for res in res_list:
        af, socktype, proto, canonname, sa = res
        sock = None
        try:
            sock = socket.socket(af, socktype, proto)
            sock.settimeout(timeout)
            sock.connect(sa)
            return sock
        except OSError as e:
            last_err = e
            if sock is not None:
                try:
                    sock.close()
                except Exception:
                    pass

    if last_err:
        raise last_err
    raise OSError(101, f"Could not connect to any IPv4 address for {host}:{port}")


class IPv4SMTP(smtplib.SMTP):
    """SMTP client constrained strictly to IPv4 to prevent unreachable network errors in cloud Docker containers."""
    def _get_socket(self, host, port, timeout):
        return _create_ipv4_socket(host, port, timeout)


class IPv4SMTP_SSL(smtplib.SMTP_SSL):
    """SMTP_SSL client constrained strictly to IPv4."""
    def _get_socket(self, host, port, timeout):
        raw_sock = _create_ipv4_socket(host, port, timeout)
        return self.context.wrap_socket(raw_sock, server_hostname=self._host)


def is_email_service_configured() -> bool:
    """Check if any outbound email provider (Resend, Brevo, SendGrid, or SMTP) is provided in environment."""
    load_dotenv()
    if os.getenv("RESEND_API_KEY", "").strip():
        return True
    if os.getenv("BREVO_API_KEY", "").strip():
        return True
    if os.getenv("SENDGRID_API_KEY", "").strip():
        return True
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    return bool(host and user and password)


def is_smtp_configured() -> bool:
    """Backward-compatible alias for is_email_service_configured."""
    return is_email_service_configured()


def generate_otp_email_html(code: str, user_name: Optional[str] = None) -> str:
    """Render an enterprise-grade HTML email template for authentication OTP."""
    greeting = f"Hello {user_name}," if user_name else "Hello,"
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Synora Verification Code</title>
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
      background: linear-gradient(120deg, #ffe18a 0%, #12b9d5 46%, #ff765f 72%, #8980d8 100%);
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
      opacity: 0.95;
    }}
    .content {{
      padding: 32px 28px;
    }}
    .otp-box {{
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-code {{
      font-family: 'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #0f172a;
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
      <h1>Synora</h1>
      <p>Autonomous research powered by coordinated intelligence</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; font-weight: 600; margin-top: 0;">{greeting}</p>
      <p style="font-size: 14px; color: #475569;">
        You recently requested to sign in or register for Synora. Use the 6-digit verification code below to complete your authentication:
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
      Synora &bull; Secure sign-in verification
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
        f"Your Synora verification code is: {code}\n\n"
        f"This code will expire in 10 minutes and can only be used once.\n\n"
        f"If you did not request this code, you can safely ignore this email.\n\n"
        f"--\nSynora"
    )


def _send_via_resend(to_email: str, code: str, user_name: Optional[str] = None) -> Tuple[bool, str]:
    """Dispatches verification code via Resend HTTPS REST API (Port 443 - never blocked by cloud container firewalls)."""
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        return False, "RESEND_API_KEY is not set"

    from_email = os.getenv("RESEND_FROM_EMAIL", "").strip() or "Synora <onboarding@resend.dev>"
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": f"Your Synora Verification Code: {code}",
        "html": generate_otp_email_html(code, user_name),
        "text": generate_otp_email_text(code, user_name),
    }

    try:
        import httpx
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201):
                logger.info(f"Verification OTP successfully sent via Resend HTTPS API to {to_email}")
                return True, f"Verification code successfully sent to {to_email} via Resend"
            else:
                err_detail = resp.text
                logger.warning(f"Resend API returned status {resp.status_code}: {err_detail}")
                return False, f"Resend API error ({resp.status_code}): {err_detail}"
    except Exception as e:
        logger.warning(f"Resend HTTPS request failed: {e}")
        return False, f"Resend connection failed: {e}"


def _send_via_brevo(to_email: str, code: str, user_name: Optional[str] = None) -> Tuple[bool, str]:
    """Dispatches verification code via Brevo (Sendinblue) HTTPS REST API (Port 443)."""
    api_key = os.getenv("BREVO_API_KEY", "").strip()
    if not api_key:
        return False, "BREVO_API_KEY is not set"

    from_email = os.getenv("BREVO_FROM_EMAIL", "").strip() or os.getenv("SMTP_FROM_EMAIL", "auth@triadflow.ai").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "Synora Security").strip()
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email}],
        "subject": f"Your Synora Verification Code: {code}",
        "htmlContent": generate_otp_email_html(code, user_name),
        "textContent": generate_otp_email_text(code, user_name),
    }

    try:
        import httpx
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201, 202):
                logger.info(f"Verification OTP successfully sent via Brevo HTTPS API to {to_email}")
                return True, f"Verification code successfully sent to {to_email} via Brevo"
            else:
                err_detail = resp.text
                logger.warning(f"Brevo API returned status {resp.status_code}: {err_detail}")
                return False, f"Brevo API error ({resp.status_code}): {err_detail}"
    except Exception as e:
        logger.warning(f"Brevo HTTPS request failed: {e}")
        return False, f"Brevo connection failed: {e}"


def _send_via_sendgrid(to_email: str, code: str, user_name: Optional[str] = None) -> Tuple[bool, str]:
    """Dispatches verification code via SendGrid HTTPS REST API (Port 443)."""
    api_key = os.getenv("SENDGRID_API_KEY", "").strip()
    if not api_key:
        return False, "SENDGRID_API_KEY is not set"

    from_email = os.getenv("SENDGRID_FROM_EMAIL", "").strip() or os.getenv("SMTP_FROM_EMAIL", "auth@triadflow.ai").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "Synora Security").strip()
    url = "https://api.sendgrid.com/v3/mail/send"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": from_email, "name": from_name},
        "subject": f"Your Synora Verification Code: {code}",
        "content": [
            {"type": "text/plain", "value": generate_otp_email_text(code, user_name)},
            {"type": "text/html", "value": generate_otp_email_html(code, user_name)},
        ],
    }

    try:
        import httpx
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 202):
                logger.info(f"Verification OTP successfully sent via SendGrid HTTPS API to {to_email}")
                return True, f"Verification code successfully sent to {to_email} via SendGrid"
            else:
                err_detail = resp.text
                logger.warning(f"SendGrid API returned status {resp.status_code}: {err_detail}")
                return False, f"SendGrid API error ({resp.status_code}): {err_detail}"
    except Exception as e:
        logger.warning(f"SendGrid HTTPS request failed: {e}")
        return False, f"SendGrid connection failed: {e}"


def send_verification_email(
    to_email: str,
    code: str,
    user_name: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Dispatches a verification email containing the 6-digit OTP code to the recipient.
    Priority 1: HTTPS Email APIs (Resend, Brevo, SendGrid over port 443 - immune to Render/cloud SMTP port blocks).
    Priority 2: Standard IPv4 SMTP (Gmail, Outlook, custom SMTP with port 587/465 fallback).
    Returns (success: bool, status_message: str).
    """
    load_dotenv()

    # 1. Check HTTPS email services first (ideal for cloud container hosts like Render free tier)
    if os.getenv("RESEND_API_KEY", "").strip():
        ok, msg = _send_via_resend(to_email, code, user_name)
        if ok:
            return True, msg
        logger.warning(f"Resend attempt failed: {msg}. Falling back to next configured provider...")

    if os.getenv("BREVO_API_KEY", "").strip():
        ok, msg = _send_via_brevo(to_email, code, user_name)
        if ok:
            return True, msg
        logger.warning(f"Brevo attempt failed: {msg}. Falling back to next configured provider...")

    if os.getenv("SENDGRID_API_KEY", "").strip():
        ok, msg = _send_via_sendgrid(to_email, code, user_name)
        if ok:
            return True, msg
        logger.warning(f"SendGrid attempt failed: {msg}. Falling back to next configured provider...")

    # 2. Check Standard SMTP
    host = os.getenv("SMTP_HOST", "").strip()
    configured_port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    # Clean app password (remove spaces if user entered 'xxxx xxxx xxxx xxxx')
    raw_password = os.getenv("SMTP_PASSWORD", "").strip()
    password = raw_password.replace(" ", "")
    from_name = os.getenv("SMTP_FROM_NAME", "Synora Security").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", user or "auth@triadflow.ai").strip()

    if not host or not user or not password:
        logger.info(
            f"No outbound email service configured (set RESEND_API_KEY or SMTP_HOST/USER/PASSWORD). "
            f"Verification OTP for {to_email} logged to terminal: >>> {code} <<<"
        )
        return False, "Outbound email service is not configured in environment"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your Synora Verification Code: {code}"
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    # Attach plain text and HTML versions
    part_text = MIMEText(generate_otp_email_text(code, user_name), "plain")
    part_html = MIMEText(generate_otp_email_html(code, user_name), "html")
    msg.attach(part_text)
    msg.attach(part_html)

    # Ports to attempt: requested port first, then alternate (465 SSL or 587 TLS)
    ports_to_try = [configured_port]
    if configured_port == 587 and 465 not in ports_to_try:
        ports_to_try.append(465)
    elif configured_port == 465 and 587 not in ports_to_try:
        ports_to_try.append(587)

    last_error = None
    for port in ports_to_try:
        try:
            if port == 465:
                # SSL over IPv4
                with IPv4SMTP_SSL(host, port, timeout=10) as server:
                    server.login(user, password)
                    server.sendmail(from_email, [to_email], msg.as_string())
            else:
                # STARTTLS over IPv4 (port 587)
                with IPv4SMTP(host, port, timeout=10) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(user, password)
                    server.sendmail(from_email, [to_email], msg.as_string())

            logger.info(f"Verification OTP successfully dispatched via SMTP (port {port}) to {to_email}")
            return True, f"Verification code successfully sent to {to_email}"
        except Exception as e:
            last_error = e
            logger.warning(f"SMTP dispatch attempt on port {port} failed: {e}. Trying alternate port if available...")

    # Detect cloud network firewall block (Render Free Tier blocks ports 25, 465, 587)
    err_str = str(last_error)
    is_network_blocked = (
        "[Errno 101]" in err_str
        or "Network is unreachable" in err_str
        or "ETIMEDOUT" in err_str
        or "timed out" in err_str.lower()
    )

    if is_network_blocked:
        error_msg = (
            f"Cloud host firewall blocked outbound SMTP (Render Free Tier blocks ports 25, 465, and 587). "
            f"Code {code} was logged to your server console. "
            f"To deliver directly to your inbox on Render, add a free RESEND_API_KEY in your Render environment variables."
        )
    else:
        error_msg = f"Failed to send email via SMTP to {to_email}: {err_str}"

    logger.error(error_msg)
    return False, error_msg
