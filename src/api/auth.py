"""
Authentication & Authorization Layer for FastAPI Backend.
Uses bcrypt for secure password hashing and PyJWT for stateless bearer tokens.
Enforces strict Role-Based Access Control (RBAC) and user ownership.
"""

import os
import socket
import re
import secrets
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field

from src.api.database import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    save_verification_code,
    verify_code_match,
)

# JWT Secret and Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-triadflow-multiagent-jwt-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7-day token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# --- Email Authenticity Verification Guard ---
DISPOSABLE_MAIL_DOMAINS = {
    "mailinator.com", "tempmail.com", "temp-mail.org", "10minutemail.com",
    "guerrillamail.com", "guerrillamail.net", "guerrillamail.biz",
    "yopmail.com", "yopmail.fr", "yopmail.net",
    "trashmail.com", "trashmail.net", "trashmail.me", "trashmail.org",
    "sharklasers.com", "dispostable.com", "getairmail.com",
    "burnermail.io", "throwawaymail.com", "fakeinbox.com",
    "maildrop.cc", "crazymailing.com", "mohmal.com", "mytemp.email",
    "minuteinbox.com", "inboxbear.com", "inboxkitten.com",
    "emailondeck.com", "nada.ltd", "getnada.com", "fakemailgenerator.com",
    "tempinbox.com", "discard.email", "generator.email",
    "dropmail.me", "mailnesia.com", "mailcatch.com", "meltmail.com",
    "tmail.ws", "luxusmail.org", "temp-mail.io", "tempmail.net",
    "10minutemail.net", "fakemail.net", "burnermail.com", "temporarymail.com",
}

DISPOSABLE_KEYWORDS = (
    "tempmail", "10minute", "throwaway", "fakeinbox", "dispostable",
    "burnermail", "guerrillamail", "mailinator", "yopmail", "trashmail",
    "dropmail", "fakeemail", "trash-mail"
)

TRUSTED_AUTHENTIC_DOMAINS = {
    "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
    "msn.com", "yahoo.com", "yahoo.co.in", "yahoo.co.uk", "yahoo.fr",
    "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
    "zoho.com", "zohomail.in", "aol.com", "fastmail.com", "gmx.com",
    "mail.com", "yandex.com", "tutanota.com", "tutamail.com", "hey.com",
    "example.com", "example.org", "example.net",
    "triadflow.ai", "triadflow.io", "triadflow.com", "triadflow.org", "localhost",
}


def validate_authentic_email(email: str) -> str:
    """
    Verifies that the provided email address is authentic:
    1. Valid structural formatting and TLD.
    2. Rejects disposable / burner / temporary mail platforms.
    3. Verifies that the domain belongs to a recognized authentic mail provider
       or resolves to an active, reachable host via DNS.
    """
    cleaned = email.strip().lower()
    if "@" not in cleaned:
        raise HTTPException(status_code=400, detail="Invalid email format.")

    local_part, domain = cleaned.rsplit("@", 1)
    if not local_part or not domain or "." not in domain:
        raise HTTPException(status_code=400, detail="Invalid email format: incomplete domain.")

    tld = domain.split(".")[-1]
    if len(tld) < 2 or not tld.isalpha():
        raise HTTPException(status_code=400, detail="Invalid email format: invalid top-level domain.")

    # Check against known disposable platforms and keywords
    if domain in DISPOSABLE_MAIL_DOMAINS or any(kw in domain for kw in DISPOSABLE_KEYWORDS):
        raise HTTPException(
            status_code=400,
            detail="Registration with temporary or disposable email platforms is prohibited. Please use an authentic email address (e.g. Gmail, Outlook, Yahoo, or your official organization domain).",
        )

    # Trusted public and test domains
    if domain in TRUSTED_AUTHENTIC_DOMAINS:
        return cleaned

    # For custom / enterprise / university domains, verify DNS reachability
    try:
        socket.getaddrinfo(domain, 80, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except (socket.gaierror, socket.herror, TimeoutError, OSError):
        raise HTTPException(
            status_code=400,
            detail=f"The domain '@{domain}' could not be verified on the internet. Please provide an authentic, active email address.",
        )

    return cleaned


# --- Schemas ---
class GoogleAuthRequest(BaseModel):
    credential: str = Field(description="Google ID Token JWT returned by Google Identity Services")
    client_id: Optional[str] = Field(default=None, description="Optional Google Client ID override")


class GoogleCodeRequest(BaseModel):
    code: str = Field(description="Google OAuth2 authorization code")
    redirect_uri: str = Field(description="OAuth2 redirect URI used in authorization request")


class GoogleConfigResponse(BaseModel):
    enabled: bool
    client_id: Optional[str] = None


class SendCodeRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class SendCodeResponse(BaseModel):
    status: str = "success"
    message: str
    email: str
    smtp_sent: bool = False
    warning_type: Optional[str] = None
    dev_code: Optional[str] = None  # Returned strictly during automated test runs (pytest) or explicit dev mode


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, description="6-digit verification code")
    name: Optional[str] = None


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str = "user"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Utility Functions ---
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Mandatory authentication guard. Rejects unauthenticated requests."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = get_user_by_id(int(user_id))
    if user is None:
        raise credentials_exception
    return user


def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """RBAC Guard: Restricts endpoint access strictly to users with role='admin'."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Administrative privileges required.",
        )
    return current_user


def is_admin_email_address(email: str) -> bool:
    """
    Determines if an email address qualifies for administrative governance:
    1. Explicitly listed in the ADMIN_EMAILS environment variable (comma-separated).
    2. Default enterprise admin addresses (admin@triadflow.ai, admin@triadflow.io, admin@triadflow.com, or admin@triadflow.*).
    """
    cleaned = email.strip().lower()
    env_admins = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}
    if cleaned in env_admins:
        return True
    if cleaned in ("admin@triadflow.ai", "admin@triadflow.io", "admin@triadflow.com") or cleaned.startswith("admin@triadflow."):
        return True
    return False


def verify_google_id_token(token: str, client_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Verifies a Google ID Token (JWT) and extracts user profile claims.
    Uses google.oauth2.id_token and falls back to Google's tokeninfo API.
    Supports simulated tokens in test environments.
    """
    token = token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Missing Google credential token.")

    # 1. Test/Dev Environment Mock Token Support
    is_test_env = bool(
        os.getenv("PYTEST_CURRENT_TEST")
        or os.getenv("TESTING", "").lower() in ("true", "1")
        or os.getenv("MOCK_GOOGLE_AUTH", "").lower() in ("true", "1")
    )
    if is_test_env and token.startswith("mock-google-"):
        # Format: mock-google-email@domain.com[:Display Name]
        parts = token[len("mock-google-"):].split(":", 1)
        mock_email = parts[0]
        mock_name = parts[1] if len(parts) > 1 else mock_email.split("@")[0].title()
        return {
            "email": mock_email,
            "name": mock_name,
            "email_verified": True,
            "sub": f"mock-sub-{mock_email}",
        }

    expected_client_id = (
        client_id
        or os.getenv("GOOGLE_CLIENT_ID", "").strip()
        or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "").strip()
    )

    # 2. Try google.oauth2.id_token verification
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=expected_client_id if expected_client_id else None,
        )
        if id_info and id_info.get("email"):
            return id_info
    except Exception:
        pass

    # 3. Fallback to Google's tokeninfo HTTP endpoint
    try:
        import httpx

        with httpx.Client(timeout=10.0) as client:
            resp = client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
            if resp.status_code == 200:
                data = resp.json()
                if expected_client_id and data.get("aud") != expected_client_id:
                    raise HTTPException(
                        status_code=400,
                        detail="Google authentication failed: Client ID audience mismatch.",
                    )
                if data.get("email"):
                    return data
    except HTTPException:
        raise
    except Exception:
        pass

    raise HTTPException(
        status_code=400,
        detail="Google authentication failed: Invalid, expired, or unverified Google token.",
    )


def provision_or_login_oauth_user(
    email: str, name: Optional[str] = None, provider: str = "Google"
) -> TokenResponse:
    """
    Common user provisioning & session generation for OAuth2 identity providers.
    Creates account with auto-assigned role if not exists, or signs in existing user.
    """
    valid_email = validate_authentic_email(email)
    user = get_user_by_email(valid_email)
    from src.api.audit_logger import log_user_event

    is_admin = is_admin_email_address(valid_email)

    if not user:
        role = "admin" if is_admin else "user"
        display_name = (
            name.strip()
            if name and name.strip()
            else valid_email.split("@")[0].replace(".", " ").title()
        )
        dummy_hash = hash_password(secrets.token_urlsafe(32))
        user = create_user(
            email=valid_email, name=display_name, password_hash=dummy_hash, role=role
        )
        log_user_event(
            action="USER_REGISTRATION",
            user_id=user["id"],
            email=user["email"],
            role=user["role"],
            details=f"User registered via {provider} OAuth: '{user['name']}'",
        )
    else:
        from src.api.database import set_user_role, update_user_name

        if is_admin and user.get("role") != "admin":
            set_user_role(user["id"], "admin")
            user["role"] = "admin"

        if name and name.strip() and (not user.get("name") or user.get("name") in ("User", valid_email.split("@")[0])):
            update_user_name(user["id"], name.strip())
            user["name"] = name.strip()

        user_role = user.get("role", "user")
        log_user_event(
            action="USER_LOGIN",
            user_id=user["id"],
            email=user["email"],
            role=user_role,
            details=f"User authenticated successfully via {provider} OAuth for '{user['name']}'",
        )

    user_role = user.get("role", "user")
    token = create_access_token(
        data={
            "sub": str(user["id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user_role,
        }
    )
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], name=user["name"], email=user["email"], role=user_role
        ),
    )


from src.api.email_service import send_verification_email, is_smtp_configured

# --- Endpoints ---
@router.get("/google/config", response_model=GoogleConfigResponse)
def get_google_auth_config():
    """Returns the Google OAuth client ID and configuration status for the frontend."""
    client_id = (
        os.getenv("GOOGLE_CLIENT_ID", "").strip()
        or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "").strip()
    )
    return GoogleConfigResponse(
        enabled=bool(client_id),
        client_id=client_id or None,
    )


@router.post("/google", response_model=TokenResponse)
def authenticate_with_google(req: GoogleAuthRequest):
    """
    Google One-Tap / Identity Services Login & Registration.
    Verifies the Google ID token, ensures email authenticity and verification,
    auto-provisions or retrieves user, and returns JWT session token.
    """
    id_info = verify_google_id_token(req.credential, req.client_id)
    email = id_info.get("email")
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Google authentication failed: Email claim missing from token.",
        )

    # Enforce verified email
    email_verified = id_info.get("email_verified")
    if email_verified is False or str(email_verified).lower() == "false":
        raise HTTPException(
            status_code=400, detail="Google account email is not verified by Google."
        )

    name = id_info.get("name") or id_info.get("given_name")
    return provision_or_login_oauth_user(email=email, name=name, provider="Google")


@router.post("/google/code", response_model=TokenResponse)
def authenticate_with_google_code(req: GoogleCodeRequest):
    """
    Google OAuth2 Authorization Code Exchange.
    Exchanges code for tokens, retrieves profile, and creates session.
    """
    client_id = (
        os.getenv("GOOGLE_CLIENT_ID", "").strip()
        or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "").strip()
    )
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured on the server (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET).",
        )

    import httpx

    try:
        with httpx.Client(timeout=15.0) as client:
            token_resp = client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": req.code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": req.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                err_data = (
                    token_resp.json()
                    if token_resp.headers.get("content-type", "").startswith("application/json")
                    else {}
                )
                err_msg = (
                    err_data.get("error_description")
                    or err_data.get("error")
                    or token_resp.text
                )
                raise HTTPException(
                    status_code=400,
                    detail=f"Google token exchange failed: {err_msg}",
                )

            tokens = token_resp.json()
            access_token = tokens.get("access_token")
            id_token_str = tokens.get("id_token")

            # Try to verify id_token if returned, or fetch userinfo
            if id_token_str:
                id_info = verify_google_id_token(id_token_str, client_id)
                email = id_info.get("email")
                name = id_info.get("name")
            else:
                userinfo_resp = client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if userinfo_resp.status_code != 200:
                    raise HTTPException(
                        status_code=400, detail="Failed to fetch user profile from Google."
                    )
                user_data = userinfo_resp.json()
                email = user_data.get("email")
                name = user_data.get("name")

            if not email:
                raise HTTPException(status_code=400, detail="No email returned by Google.")

            return provision_or_login_oauth_user(email=email, name=name, provider="Google")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google OAuth exchange failed: {str(e)}")
@router.post("/send-code", response_model=SendCodeResponse)
def send_auth_code(req: SendCodeRequest):
    """
    Passwordless Email Authentication: Step 1.
    Validates authentic email (rejects disposable mail), generates a 6-digit cryptographic OTP,
    persists code with 10-minute expiry, sends OTP via SMTP if configured, and records the event in audit logs.
    """
    valid_email = validate_authentic_email(req.email)
    code = f"{secrets.randbelow(900000) + 100000:06d}"
    save_verification_code(email=valid_email, code=code, expires_in_minutes=10)

    # Attempt live email delivery via SMTP
    smtp_sent, smtp_detail = send_verification_email(
        to_email=valid_email,
        code=code,
        user_name=req.name,
    )

    from src.api.audit_logger import log_user_event
    log_user_event(
        action="OTP_CODE_DISPATCHED",
        user_id=None,
        email=valid_email,
        role="pending",
        details=f"Verification code generated (SMTP sent: {smtp_sent}, detail: {smtp_detail})",
    )
    print(f"\n[AUTH SERVICE] ==================================================")
    print(f"[AUTH SERVICE] Dispatching 6-Digit Verification Code to: {valid_email}")
    print(f"[AUTH SERVICE] SMTP Delivery: {'SUCCESS (Email sent to inbox)' if smtp_sent else 'FALLBACK (SMTP unconfigured - printed to console)'}")
    print(f"[AUTH SERVICE] Code: >>> {code} <<< (Valid for 10 minutes)")
    print(f"[AUTH SERVICE] ==================================================\n")

    # dev_code is accessible strictly during automated tests (pytest) or when EXPOSE_OTP_IN_RESPONSE is enabled
    is_test_env = bool(
        os.getenv("PYTEST_CURRENT_TEST")
        or os.getenv("TESTING", "").lower() in ("true", "1")
        or os.getenv("EXPOSE_OTP_IN_RESPONSE", "").lower() in ("true", "1")
    )
    returned_dev_code = code if is_test_env else None

    if smtp_sent:
        response_msg = f"Verification code sent to {valid_email}. Please check your inbox."
        warning_type = None
    elif "Render Free Tier blocks" in smtp_detail or "Network is unreachable" in smtp_detail or "[Errno 101]" in smtp_detail:
        response_msg = (
            f"Render Free Tier blocks outbound SMTP ports (587/465). "
            f"Check your Render server logs for your OTP code, or set RESEND_API_KEY in Render dashboard for free HTTPS delivery."
        )
        warning_type = "host_smtp_blocked"
    elif is_smtp_configured():
        response_msg = f"Verification code generated, but email dispatch failed: {smtp_detail}. Check server logs."
        warning_type = "smtp_error"
    else:
        response_msg = f"Outbound email is not configured in .env. Check server console for the OTP code."
        warning_type = "smtp_unconfigured"

    return SendCodeResponse(
        status="success",
        message=response_msg,
        email=valid_email,
        smtp_sent=smtp_sent,
        warning_type=warning_type,
        dev_code=returned_dev_code,
    )


@router.post("/verify-code", response_model=TokenResponse)
def verify_auth_code(req: VerifyCodeRequest):
    """
    Passwordless Email Authentication: Step 2.
    Validates 6-digit OTP, verifies single-use & expiration, auto-provisions or retrieves user,
    determines role ('admin' for admin@triadflow.ai, 'user' for researchers),
    and issues JWT bearer session token.
    """
    valid_email = validate_authentic_email(req.email)
    success, message = verify_code_match(valid_email, req.code)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    user = get_user_by_email(valid_email)
    from src.api.audit_logger import log_user_event

    is_admin = is_admin_email_address(valid_email)

    if not user:
        # Determine initial role: admin addresses are system administrators, others are researchers
        role = "admin" if is_admin else "user"
        display_name = req.name.strip() if req.name and req.name.strip() else valid_email.split("@")[0].replace(".", " ").title()
        dummy_hash = hash_password(secrets.token_urlsafe(32))
        user = create_user(email=valid_email, name=display_name, password_hash=dummy_hash, role=role)
        log_user_event(
            action="USER_REGISTRATION",
            user_id=user["id"],
            email=user["email"],
            role=user["role"],
            details=f"Passwordless user registered: '{user['name']}'",
        )
    else:
        from src.api.database import set_user_role, update_user_name
        if is_admin and user.get("role") != "admin":
            set_user_role(user["id"], "admin")
            user["role"] = "admin"

        if req.name and req.name.strip():
            submitted_name = req.name.strip()
            if submitted_name != user.get("name"):
                update_user_name(user["id"], submitted_name)
                user["name"] = submitted_name

        user_role = user.get("role", "user")
        log_user_event(
            action="USER_LOGIN",
            user_id=user["id"],
            email=user["email"],
            role=user_role,
            details=f"Passwordless OTP authentication verified successfully for '{user['name']}'",
        )

    user_role = user.get("role", "user")
    token = create_access_token(data={"sub": str(user["id"]), "email": user["email"], "name": user["name"], "role": user_role})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"], role=user_role),
    )


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest):
    valid_email = validate_authentic_email(req.email)
    existing = get_user_by_email(valid_email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    pw_hash = hash_password(req.password)
    role = "admin" if is_admin_email_address(valid_email) else "user"
    user = create_user(email=valid_email, name=req.name, password_hash=pw_hash, role=role)

    from src.api.audit_logger import log_user_event
    log_user_event(
        action="USER_REGISTRATION",
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        details=f"New user registered: '{user['name']}'",
    )

    token = create_access_token(data={"sub": str(user["id"]), "email": user["email"], "name": user["name"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"], role=user["role"]),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    from src.api.database import set_user_role
    if is_admin_email_address(user["email"]) and user.get("role") != "admin":
        set_user_role(user["id"], "admin")
        user["role"] = "admin"

    user_role = user.get("role", "user")

    from src.api.audit_logger import log_user_event
    log_user_event(
        action="USER_LOGIN",
        user_id=user["id"],
        email=user["email"],
        role=user_role,
        details="User authenticated with password",
    )

    token = create_access_token(data={"sub": str(user["id"]), "email": user["email"], "name": user["name"], "role": user_role})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"], role=user_role),
    )


@router.post("/token", response_model=TokenResponse)
def login_for_swagger(form_data: OAuth2PasswordRequestForm = Depends()):
    """Supports Swagger UI native OAuth2 authorize modal."""
    user = get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    user_role = user.get("role", "user")
    token = create_access_token(data={"sub": str(user["id"]), "email": user["email"], "name": user["name"], "role": user_role})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"], role=user_role),
    )


class UpdateProfileRequest(BaseModel):
    name: str


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user.get("role", "user"),
    )


@router.put("/me", response_model=UserResponse)
def update_profile(
    req: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    from src.api.database import update_user_name
    clean_name = req.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Name cannot be blank.")
    update_user_name(current_user["id"], clean_name)
    current_user["name"] = clean_name
    return UserResponse(
        id=current_user["id"],
        name=clean_name,
        email=current_user["email"],
        role=current_user.get("role", "user"),
    )
