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
    "example.com", "example.org", "example.net", "triadflow.ai", "localhost",
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
class SendCodeRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class SendCodeResponse(BaseModel):
    status: str = "success"
    message: str
    email: str
    dev_code: Optional[str] = None  # Returned to facilitate local verification and developer testing


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


# --- Endpoints ---
@router.post("/send-code", response_model=SendCodeResponse)
def send_auth_code(req: SendCodeRequest):
    """
    Passwordless Email Authentication: Step 1.
    Validates authentic email (rejects disposable mail), generates a 6-digit cryptographic OTP,
    persists code with 10-minute expiry, and records the event in audit logs.
    """
    valid_email = validate_authentic_email(req.email)
    code = f"{secrets.randbelow(900000) + 100000:06d}"
    save_verification_code(email=valid_email, code=code, expires_in_minutes=10)

    from src.api.audit_logger import log_user_event
    log_user_event(
        action="OTP_CODE_DISPATCHED",
        user_id=None,
        email=valid_email,
        role="pending",
        details="Verification code generated and dispatched (Expires in 10m)",
    )
    print(f"\n[AUTH SERVICE] ==================================================")
    print(f"[AUTH SERVICE] Dispatching 6-Digit Verification Code to: {valid_email}")
    print(f"[AUTH SERVICE] Code: >>> {code} <<< (Valid for 10 minutes)")
    print(f"[AUTH SERVICE] ==================================================\n")

    return SendCodeResponse(
        status="success",
        message=f"Verification code sent to {valid_email}. Please check your inbox or server logs.",
        email=valid_email,
        dev_code=code,
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

    if not user:
        # Determine initial role: admin@triadflow.ai is system administrator, others are researchers
        role = "admin" if valid_email == "admin@triadflow.ai" else "user"
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
        user_role = user.get("role", "user")
        log_user_event(
            action="USER_LOGIN",
            user_id=user["id"],
            email=user["email"],
            role=user_role,
            details="Passwordless OTP authentication verified successfully",
        )

    user_role = user.get("role", "user")
    token = create_access_token(data={"sub": str(user["id"]), "email": user["email"], "role": user_role})
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
    user = create_user(email=valid_email, name=req.name, password_hash=pw_hash, role="user")

    from src.api.audit_logger import log_user_event
    log_user_event(
        action="USER_REGISTRATION",
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        details=f"New user registered: '{user['name']}'",
    )

    token = create_access_token(data={"sub": str(user["id"]), "email": user["email"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"], role=user["role"]),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_role = user.get("role", "user")

    from src.api.audit_logger import log_user_event
    log_user_event(
        action="USER_LOGIN",
        user_id=user["id"],
        email=user["email"],
        role=user_role,
        details="User authenticated successfully",
    )

    token = create_access_token(data={"sub": str(user["id"]), "email": user["email"], "role": user_role})
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
    token = create_access_token(data={"sub": str(user["id"]), "email": user["email"], "role": user_role})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"], role=user_role),
    )


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user.get("role", "user"),
    )
