from __future__ import annotations

from sqlalchemy.orm import Session

from backend.app.models.entities import AuditLog, Goal, Notification, UnlockHistory, User
from backend.app.utils.ids import uid


def unlock_goal(db: Session, goal: Goal, admin: User, reason: str) -> None:
    goal.locked = False
    goal.approval_status = "Unlocked"
    db.add(UnlockHistory(id=uid(), goal_id=goal.goal_id, admin_id=admin.id, admin_name=admin.name, action="Unlocked", reason=reason))
    db.add(Notification(id=uid(), user_id=goal.user_id, type="Goal Unlocked", message=f"{goal.title} unlocked by Admin: {reason}"))
    db.add(AuditLog(id=uid(), changed_by=admin.id, actor_name=admin.name, field_changed="Goal Unlocked", old_value="Locked", new_value="Unlocked", reason=reason, affected_entity="Goal", entity_id=goal.goal_id))


def relock_goal(db: Session, goal: Goal, admin: User, reason: str) -> None:
    goal.locked = True
    goal.approval_status = "Approved"
    db.add(UnlockHistory(id=uid(), goal_id=goal.goal_id, admin_id=admin.id, admin_name=admin.name, action="Re-locked", reason=reason))
    db.add(Notification(id=uid(), user_id=goal.user_id, type="Goal Re-locked", message=f"{goal.title} re-locked by Admin: {reason}"))
    db.add(AuditLog(id=uid(), changed_by=admin.id, actor_name=admin.name, field_changed="Goal Re-locked", old_value="Unlocked", new_value="Locked", reason=reason, affected_entity="Goal", entity_id=goal.goal_id))
