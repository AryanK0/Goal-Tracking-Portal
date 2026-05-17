from __future__ import annotations

import json

from sqlalchemy.orm import Session

from backend.app.models.entities import AuditLog, Goal, Notification, QuarterUpdate, SharedGoal, SharedGoalMapping, User
from backend.app.schemas.dto import SharedGoalIn
from backend.app.services.calculations import progress_for
from backend.app.utils.ids import uid


def get_linked_goals(db: Session, goal: Goal) -> list[Goal]:
    mappings = db.query(SharedGoalMapping).filter(
        SharedGoalMapping.primary_goal_id == goal.goal_id,
        SharedGoalMapping.sync_enabled.is_(True),
    ).all()
    if mappings:
        linked_ids = [mapping.linked_goal_id for mapping in mappings if mapping.linked_goal_id != goal.goal_id]
        return db.query(Goal).filter(Goal.goal_id.in_(linked_ids)).all() if linked_ids else []
    if goal.shared_goal_id:
        return db.query(Goal).filter(Goal.shared_goal_id == goal.shared_goal_id, Goal.goal_id != goal.goal_id).all()
    return []


def create_shared_goal(db: Session, payload: SharedGoalIn, actor: User) -> tuple[str, int]:
    shared_id = uid()
    shared = SharedGoal(
        shared_goal_id=shared_id,
        linked_users=json.dumps(payload.linked_users),
        **payload.model_dump(exclude={"linked_users", "weightage"}),
    )
    db.add(shared)
    created_goals: list[Goal] = []
    for linked_user in payload.linked_users:
        goal = Goal(
            goal_id=uid(),
            user_id=linked_user,
            title=payload.title,
            description=payload.description,
            thrust_area=payload.thrust_area,
            uom_type=payload.uom_type,
            target=payload.target,
            target_label=payload.target_label,
            direction="min",
            weightage=payload.weightage,
            shared_goal_id=shared_id,
            primary_owner=linked_user == payload.primary_owner,
            approval_status="Pending Approval",
        )
        db.add(goal)
        created_goals.append(goal)
        db.flush()
        for quarter, factor in [("Q1", 0.25), ("Q2", 0.5), ("Q3", 0.75), ("Q4", 1)]:
            db.add(QuarterUpdate(id=uid(), goal_id=goal.goal_id, quarter=quarter, planned=payload.target * factor, achievement=0, progress=0))
    primary_goal = next((goal for goal in created_goals if goal.primary_owner), created_goals[0])
    for goal in created_goals:
        db.add(SharedGoalMapping(id=uid(), primary_goal_id=primary_goal.goal_id, linked_goal_id=goal.goal_id, owner_id=goal.user_id, sync_enabled=True))
        db.add(Notification(id=uid(), user_id=goal.user_id, type="Shared Goal Assigned", message=f"{payload.title} was assigned as a shared KPI."))
    db.add(AuditLog(id=uid(), changed_by=actor.id, actor_name=actor.name, field_changed="Shared Goal Pushed", old_value="", new_value=payload.title, reason=f"Recipients: {len(payload.linked_users)}", affected_entity="SharedGoal", entity_id=shared_id))
    return shared_id, len(payload.linked_users)


def sync_goal_updates(db: Session, primary_goal: Goal, source_update: QuarterUpdate, actor: User) -> int:
    linked = get_linked_goals(db, primary_goal)
    for linked_goal in linked:
        linked_update = db.query(QuarterUpdate).filter(
            QuarterUpdate.goal_id == linked_goal.goal_id,
            QuarterUpdate.quarter == source_update.quarter,
        ).first()
        if linked_update:
            old_value = str(linked_update.achievement)
            linked_update.achievement = source_update.achievement
            linked_update.status = source_update.status
            linked_update.progress = progress_for(linked_goal, linked_update)
            linked_goal.status = source_update.status
            db.add(Notification(id=uid(), user_id=linked_goal.user_id, type="Shared Goal Sync", message=f"{primary_goal.title} synced {source_update.quarter} achievement to your linked KPI."))
            db.add(AuditLog(id=uid(), changed_by=actor.id, actor_name=actor.name, field_changed="Shared Goal Update", old_value=old_value, new_value=str(source_update.achievement), reason=f"{source_update.quarter} sync from primary owner", affected_entity="Goal", entity_id=linked_goal.goal_id))
    if linked:
        db.add(Notification(id=uid(), user_id=primary_goal.user_id, type="Shared Goal Sync", message=f"This action affects {len(linked)} linked goals."))
    return len(linked)


def toggle_sync(db: Session, mapping_id: str, enabled: bool, actor: User) -> SharedGoalMapping | None:
    mapping = db.get(SharedGoalMapping, mapping_id)
    if not mapping:
        return None
    old_value = str(mapping.sync_enabled)
    mapping.sync_enabled = enabled
    db.add(AuditLog(id=uid(), changed_by=actor.id, actor_name=actor.name, field_changed="Shared Goal Sync Toggled", old_value=old_value, new_value=str(enabled), reason="Admin/Manager sync control", affected_entity="SharedGoalMapping", entity_id=mapping.id))
    return mapping
