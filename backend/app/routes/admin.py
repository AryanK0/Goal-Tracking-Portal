from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.auth.security import hash_password, require_roles
from backend.app.database.session import get_db
from backend.app.models.entities import AuditLog, CycleConfig, Notification, User
from backend.app.schemas.dto import CycleIn, UserCreate
from backend.app.services.serializers import user_out
from backend.app.utils.ids import uid

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def users(db: Session = Depends(get_db), user: User = Depends(require_roles("Admin"))):
    return [user_out(item) for item in db.query(User).order_by(User.department, User.name).all()]


@router.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("Admin"))):
    new_user = User(id=uid(), name=payload.name, email=payload.email.lower(), password_hash=hash_password(payload.password), role=payload.role, manager_id=payload.manager_id, department=payload.department, profile_image=payload.profile_image, workload=payload.workload, badges="[]")
    db.add(new_user)
    db.add(AuditLog(id=uid(), changed_by=user.id, actor_name=user.name, field_changed="User Created", old_value="", new_value=payload.email))
    db.commit()
    return user_out(new_user)


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), user: User = Depends(require_roles("Admin", "Manager", "Employee"))):
    return [
        {"id": item.id, "type": item.type, "message": item.message, "read": item.read, "created_at": item.created_at.isoformat()}
        for item in db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).all()
    ]


@router.patch("/notifications/{notification_id}/read")
def read_notification(notification_id: str, db: Session = Depends(get_db), user: User = Depends(require_roles("Admin", "Manager", "Employee"))):
    item = db.get(Notification, notification_id)
    if item and item.user_id == user.id:
        item.read = True
        db.commit()
    return {"ok": True}


@router.post("/cycles")
def save_cycle(payload: CycleIn, db: Session = Depends(get_db), user: User = Depends(require_roles("Admin"))):
    cycle = CycleConfig(id=uid(), **payload.model_dump())
    db.add(cycle)
    db.add(AuditLog(id=uid(), changed_by=user.id, actor_name=user.name, field_changed="Cycle Configured", old_value="", new_value=payload.period))
    db.commit()
    return {"id": cycle.id}
