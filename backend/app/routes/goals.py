from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.app.auth.security import current_user, require_roles
from backend.app.database.session import get_db
from backend.app.models.entities import AuditLog, Goal, Notification, QuarterUpdate, SharedGoalMapping, User
from backend.app.schemas.dto import ApprovalIn, GoalCreate, GoalPatch, QuarterUpdateIn, SharedGoalIn, UnlockIn
from backend.app.services.cache import cache_delete_prefix
from backend.app.services.cycle_service import require_cycle_open as enforce_cycle_open
from backend.app.services.shared_goal_service import create_shared_goal, get_linked_goals, sync_goal_updates, toggle_sync
from backend.app.services.calculations import progress_for
from backend.app.services.serializers import goal_out
from backend.app.services.unlock_service import relock_goal, unlock_goal
from backend.app.utils.ids import uid

router = APIRouter(prefix="/api/goals", tags=["goals"])
ALLOWED_EVIDENCE_EXTENSIONS = {".pdf", ".csv", ".png", ".jpg", ".jpeg", ".webp"}


def audit(db: Session, user: User, field: str, old: str, new: str, reason: str = "", entity: str = "Goal", entity_id: str = ""):
    db.add(AuditLog(id=uid(), changed_by=user.id, actor_name=user.name, field_changed=field, old_value=old, new_value=new, reason=reason, affected_entity=entity, entity_id=entity_id))


def can_access_goal(user: User, goal: Goal) -> bool:
    return user.role == "Admin" or goal.user_id == user.id or goal.owner.manager_id == user.id


def require_cycle_open(period: str, user: User) -> None:
    enforce_cycle_open(period, user.role)


def shared_counts(db: Session) -> Counter:
    return Counter(goal.shared_goal_id for goal in db.query(Goal).filter(Goal.shared_goal_id.isnot(None)).all())


def linked_goals_for(db: Session, goal: Goal) -> list[Goal]:
    return get_linked_goals(db, goal)


def user_weight_total(db: Session, user_id: str, replace_goal_id: str | None = None, replacement_weight: int | None = None) -> int:
    total = 0
    for goal in db.query(Goal).filter(Goal.user_id == user_id).all():
        if goal.goal_id == replace_goal_id and replacement_weight is not None:
            total += replacement_weight
        else:
            total += goal.weightage
    return total


@router.get("")
def list_goals(db: Session = Depends(get_db), user: User = Depends(current_user)):
    goals = db.query(Goal).join(User).all()
    if user.role == "Employee":
        goals = [goal for goal in goals if goal.user_id == user.id]
    elif user.role == "Manager":
        team = {member.id for member in db.query(User).filter(User.manager_id == user.id).all()}
        goals = [goal for goal in goals if goal.user_id in team]
    counts = shared_counts(db)
    return [goal_out(goal, goal.owner, db.query(QuarterUpdate).filter(QuarterUpdate.goal_id == goal.goal_id).all(), counts.get(goal.shared_goal_id, 0)) for goal in goals]


@router.post("")
def create_goal(payload: GoalCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("Employee", "Manager", "Admin"))):
    require_cycle_open("Goal Setting", user)
    owner_id = user.id if user.role == "Employee" else user.id
    existing = db.query(Goal).filter(Goal.user_id == owner_id).count()
    if existing >= 8:
        raise HTTPException(400, "Maximum 8 goals per employee")
    if payload.weightage < 10:
        raise HTTPException(400, "Minimum weightage is 10%")
    if user_weight_total(db, owner_id) + payload.weightage > 100:
        raise HTTPException(400, "Total goal weightage cannot exceed 100%")
    goal = Goal(goal_id=uid(), user_id=owner_id, **payload.model_dump())
    db.add(goal)
    db.flush()
    for quarter, factor in [("Q1", 0.25), ("Q2", 0.5), ("Q3", 0.75), ("Q4", 1)]:
        update = QuarterUpdate(id=uid(), goal_id=goal.goal_id, quarter=quarter, planned=payload.target * factor, achievement=0, status="Not Started")
        update.progress = progress_for(goal, update)
        db.add(update)
    audit(db, user, "Goal Created", "", goal.title, entity_id=goal.goal_id)
    db.commit()
    cache_delete_prefix("dashboard:")
    return goal_out(goal, goal.owner, db.query(QuarterUpdate).filter(QuarterUpdate.goal_id == goal.goal_id).all())


@router.patch("/{goal_id}")
def update_goal(goal_id: str, payload: GoalPatch, db: Session = Depends(get_db), user: User = Depends(current_user)):
    goal = db.get(Goal, goal_id)
    if not goal or not can_access_goal(user, goal):
        raise HTTPException(404, "Goal not found")
    if goal.locked and user.role != "Admin":
        raise HTTPException(403, "Goal is locked")
    if goal.shared_goal_id and not goal.primary_owner and user.role == "Employee":
        readonly = {"title", "description", "target", "target_label", "uom_type"}
        if any(getattr(payload, field) is not None for field in readonly):
            raise HTTPException(403, "Shared goal recipients can modify weightage only")
    if payload.weightage is not None and user_weight_total(db, goal.user_id, goal.goal_id, payload.weightage) > 100:
        raise HTTPException(400, "Total goal weightage cannot exceed 100%")
    if any(getattr(payload, field) is not None for field in {"title", "description", "thrust_area", "uom_type", "direction", "target", "target_label", "weightage"}):
        require_cycle_open("Goal Setting", user)
    old_values = {
        key: getattr(goal, key)
        for key, value in payload.model_dump(exclude_none=True).items()
        if value != getattr(goal, key)
    }
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(goal, key, value)
    for key, old_value in old_values.items():
        audit(db, user, f"Goal Updated: {key}", str(old_value), str(getattr(goal, key)), entity_id=goal.goal_id)
    db.commit()
    cache_delete_prefix("dashboard:")
    return goal_out(goal, goal.owner, db.query(QuarterUpdate).filter(QuarterUpdate.goal_id == goal.goal_id).all(), shared_counts(db).get(goal.shared_goal_id, 0))


@router.post("/submit")
def submit_sheet(db: Session = Depends(get_db), user: User = Depends(require_roles("Employee"))):
    require_cycle_open("Goal Setting", user)
    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    total = sum(goal.weightage for goal in goals)
    if total != 100 or any(goal.weightage < 10 for goal in goals) or len(goals) > 8:
        raise HTTPException(400, f"Validation failed. Total={total}, min weightage=10, max goals=8")
    for goal in goals:
        if goal.approval_status != "Approved":
            goal.approval_status = "Pending Approval"
    if user.manager_id:
        db.add(Notification(id=uid(), user_id=user.manager_id, type="Goal Submitted", message=f"{user.name} submitted goals for approval."))
    audit(db, user, "Goal Sheet Submitted", "Draft", "Pending Approval", entity="Goal Sheet", entity_id=user.id)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"ok": True}


@router.post("/{goal_id}/approve")
def approve(goal_id: str, payload: ApprovalIn, db: Session = Depends(get_db), user: User = Depends(require_roles("Manager", "Admin"))):
    goal = db.get(Goal, goal_id)
    if not goal or not can_access_goal(user, goal):
        raise HTTPException(404, "Goal not found")
    goal.approval_status = "Approved"
    goal.locked = True
    db.add(Notification(id=uid(), user_id=goal.user_id, type="Goal Approved", message=f"{goal.title} was approved and locked."))
    audit(db, user, "Goal Approved", "Pending", "Locked", payload.reason or "Approved", entity_id=goal.goal_id)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"ok": True}


@router.post("/{goal_id}/return")
def return_goal(goal_id: str, payload: ApprovalIn, db: Session = Depends(get_db), user: User = Depends(require_roles("Manager", "Admin"))):
    goal = db.get(Goal, goal_id)
    if not goal or not can_access_goal(user, goal):
        raise HTTPException(404, "Goal not found")
    goal.approval_status = "Returned"
    goal.locked = False
    db.add(Notification(id=uid(), user_id=goal.user_id, type="Goal Returned", message=f"{goal.title} returned: {payload.reason or 'Needs rework'}"))
    audit(db, user, "Goal Returned", goal.title, "Returned", payload.reason or "Needs rework", entity_id=goal.goal_id)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"ok": True}


@router.post("/{goal_id}/unlock")
def unlock(goal_id: str, payload: UnlockIn, db: Session = Depends(get_db), user: User = Depends(require_roles("Admin"))):
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(404, "Goal not found")
    unlock_goal(db, goal, user, payload.reason)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"ok": True}


@router.post("/{goal_id}/relock")
def relock(goal_id: str, payload: UnlockIn, db: Session = Depends(get_db), user: User = Depends(require_roles("Admin"))):
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(404, "Goal not found")
    relock_goal(db, goal, user, payload.reason)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"ok": True}


@router.post("/{goal_id}/quarter-update")
def quarter_update(goal_id: str, payload: QuarterUpdateIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    require_cycle_open(payload.quarter, user)
    goal = db.get(Goal, goal_id)
    if not goal or not can_access_goal(user, goal):
        raise HTTPException(404, "Goal not found")
    update = db.query(QuarterUpdate).filter(QuarterUpdate.goal_id == goal_id, QuarterUpdate.quarter == payload.quarter).first()
    if not update:
        update = QuarterUpdate(id=uid(), goal_id=goal_id, quarter=payload.quarter, planned=payload.planned)
        db.add(update)
    update.planned = payload.planned
    update.achievement = payload.achievement
    update.status = payload.status
    update.progress = progress_for(goal, update)
    goal.status = payload.status
    affected = 1
    if goal.shared_goal_id and goal.primary_owner:
        affected += sync_goal_updates(db, goal, update, user)
    audit(db, user, "Quarter Update", goal.title, f"{payload.quarter}: {payload.achievement}", f"Affected linked goals: {affected}", entity="QuarterUpdate", entity_id=goal.goal_id)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"ok": True, "progress": update.progress, "affected_linked_goals": affected}


@router.post("/{goal_id}/evidence")
async def upload_evidence(goal_id: str, file: UploadFile, db: Session = Depends(get_db), user: User = Depends(current_user)):
    goal = db.get(Goal, goal_id)
    if not goal or not can_access_goal(user, goal):
        raise HTTPException(404, "Goal not found")
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EVIDENCE_EXTENSIONS:
        raise HTTPException(400, "Evidence must be PDF, CSV, or image file")
    files = json.loads(goal.evidence_files or "[]")
    files.insert(0, file.filename)
    goal.evidence_files = json.dumps(files)
    audit(db, user, "Evidence Uploaded", "", file.filename, entity="Evidence", entity_id=goal.goal_id)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"filename": file.filename}


@router.post("/shared")
def push_shared_goal(payload: SharedGoalIn, db: Session = Depends(get_db), user: User = Depends(require_roles("Manager", "Admin"))):
    require_cycle_open("Goal Setting", user)
    for linked_user in payload.linked_users:
        if db.query(Goal).filter(Goal.user_id == linked_user).count() >= 8:
            raise HTTPException(400, f"Recipient {linked_user} already has maximum goals")
        if user_weight_total(db, linked_user) + payload.weightage > 100:
            raise HTTPException(400, f"Recipient {linked_user} would exceed 100% weightage")
    shared_id, affected = create_shared_goal(db, payload, user)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"shared_goal_id": shared_id, "affected_linked_goals": affected}


@router.patch("/shared/mappings/{mapping_id}")
def update_shared_mapping(mapping_id: str, sync_enabled: bool, db: Session = Depends(get_db), user: User = Depends(require_roles("Manager", "Admin"))):
    mapping = toggle_sync(db, mapping_id, sync_enabled, user)
    if not mapping:
        raise HTTPException(404, "Shared goal mapping not found")
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"id": mapping.id, "sync_enabled": mapping.sync_enabled}
