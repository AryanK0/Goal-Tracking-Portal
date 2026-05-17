from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.auth.security import require_roles
from backend.app.database.session import get_db
from backend.app.models.entities import AuditLog, Comment, User
from backend.app.schemas.dto import CommentIn
from backend.app.services.cache import cache_delete_prefix
from backend.app.utils.ids import uid

router = APIRouter(prefix="/api/comments", tags=["comments"])


@router.post("")
def add_comment(payload: CommentIn, db: Session = Depends(get_db), user: User = Depends(require_roles("Manager", "Admin"))):
    comment = Comment(id=uid(), manager_id=user.id, employee_id=payload.employee_id, goal_id=payload.goal_id, text=payload.text)
    db.add(comment)
    db.add(AuditLog(id=uid(), changed_by=user.id, actor_name=user.name, field_changed="Check-in Comment", old_value="", new_value=payload.text, affected_entity="Comment", entity_id=payload.goal_id))
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"id": comment.id, "text": comment.text}
