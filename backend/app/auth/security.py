from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import User

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    if os.getenv("VERCEL") or os.getenv("RENDER") or os.getenv("RAILWAY_ENVIRONMENT"):
        raise RuntimeError("JWT_SECRET must be configured in production.")
    SECRET_KEY = "local-development-only"
ALGORITHM = "HS256"
security = HTTPBearer()


def hash_password(password: str) -> str:
    salt = "momentum-ai"
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000).hex()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def create_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=10),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles: str):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role permission")
        return user

    return dependency
