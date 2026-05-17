from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.auth.security import create_token, current_user, verify_password
from backend.app.database.session import get_db
from backend.app.models.entities import User
from backend.app.schemas.dto import LoginRequest
from backend.app.services.serializers import user_out

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": create_token(user), "user": user_out(user)}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return user_out(user)


@router.get("/demo-credentials")
def demo_credentials(db: Session = Depends(get_db)):
    return [
        {"role": user.role, "name": user.name, "email": user.email, "password": "Momentum@123"}
        for user in db.query(User).order_by(User.role, User.name).all()
    ]
