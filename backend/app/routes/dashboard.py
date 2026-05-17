from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.auth.security import current_user
from backend.app.database.session import get_db
from backend.app.models.entities import AIInsight, AuditLog, Comment, CycleConfig, EscalationLog, Goal, Notification, QuarterUpdate, SharedGoal, SharedGoalMapping, UnlockHistory, User
from collections import Counter

from backend.app.services.calculations import cycle_state, department_metrics
from backend.app.services.cache import cache_get, cache_set
from backend.app.services.serializers import goal_out, user_out

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(db: Session = Depends(get_db), user: User = Depends(current_user)):
    cache_key = f"dashboard:{user.role}:{user.id}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    users = db.query(User).all()
    goals = db.query(Goal).all()
    updates = db.query(QuarterUpdate).all()
    updates_by_goal = {update.goal_id: update for update in updates if update.quarter == "Q2"}
    by_user = {item.id: item for item in users}
    shared_counts = Counter(goal.shared_goal_id for goal in goals if goal.shared_goal_id)
    goal_payload = [
        goal_out(goal, by_user[goal.user_id], [update for update in updates if update.goal_id == goal.goal_id], shared_counts.get(goal.shared_goal_id, 0))
        for goal in goals
    ]
    if user.role == "Employee":
        visible_goals = [goal for goal in goal_payload if goal["user_id"] == user.id]
    elif user.role == "Manager":
        team = {item.id for item in users if item.manager_id == user.id}
        visible_goals = [goal for goal in goal_payload if goal["user_id"] in team]
    else:
        visible_goals = goal_payload
    payload = {
        "current_user": user_out(user),
        "users": [user_out(item) for item in users],
        "goals": goal_payload,
        "visible_goals": visible_goals,
        "departments": department_metrics(users, goals, updates_by_goal),
        "cycle_state": cycle_state(),
        "notifications": [
            {
                "id": item.id,
                "type": item.type,
                "message": item.message,
                "read": item.read,
                "created_at": item.created_at.isoformat(),
            }
            for item in db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).all()
        ],
        "audit_logs": [
            {
                "id": item.id,
                "actor_name": item.actor_name,
                "field_changed": item.field_changed,
                "old_value": item.old_value,
                "new_value": item.new_value,
                "reason": item.reason,
                "affected_entity": item.affected_entity,
                "entity_id": item.entity_id,
                "timestamp": item.timestamp.isoformat(),
            }
            for item in db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
        ],
        "comments": [
            {
                "id": item.id,
                "manager_id": item.manager_id,
                "manager_name": by_user.get(item.manager_id).name if by_user.get(item.manager_id) else "Manager",
                "employee_id": item.employee_id,
                "employee_name": by_user.get(item.employee_id).name if by_user.get(item.employee_id) else "Employee",
                "goal_id": item.goal_id,
                "text": item.text,
                "created_at": item.created_at.isoformat(),
            }
            for item in db.query(Comment).order_by(Comment.created_at.desc()).all()
        ],
        "cycles": [
            {"id": item.id, "period": item.period, "window_opens": item.window_opens, "action": item.action, "active": item.active}
            for item in db.query(CycleConfig).all()
        ],
        "shared_goals": [
            {"shared_goal_id": item.shared_goal_id, "title": item.title, "primary_owner": item.primary_owner, "linked_users": item.linked_users}
            for item in db.query(SharedGoal).all()
        ],
        "shared_goal_mappings": [
            {
                "id": item.id,
                "primary_goal_id": item.primary_goal_id,
                "linked_goal_id": item.linked_goal_id,
                "owner_id": item.owner_id,
                "sync_enabled": item.sync_enabled,
            }
            for item in db.query(SharedGoalMapping).all()
        ],
        "unlock_history": [
            {
                "id": item.id,
                "goal_id": item.goal_id,
                "admin_id": item.admin_id,
                "admin_name": item.admin_name,
                "action": item.action,
                "reason": item.reason,
                "created_at": item.created_at.isoformat(),
            }
            for item in db.query(UnlockHistory).order_by(UnlockHistory.created_at.desc()).all()
        ],
        "escalations": [
            {
                "id": item.id,
                "employee_id": item.employee_id,
                "goal_id": item.goal_id,
                "risk_score": item.risk_score,
                "risk_level": "High" if item.risk_score >= 75 else "Medium" if item.risk_score >= 45 else "Low",
                "days_overdue": item.days_overdue,
                "status": item.status,
                "escalation_level": item.escalation_level,
                "reason": item.reason,
                "created_at": item.created_at.isoformat(),
            }
            for item in db.query(EscalationLog).order_by(EscalationLog.created_at.desc()).all()
        ],
        "ai_insights": [
            {"id": item.id, "employee_id": item.employee_id, "summary": item.summary, "risk_prediction": item.risk_prediction}
            for item in db.query(AIInsight).order_by(AIInsight.created_at.desc()).all()
        ],
    }
    cache_set(cache_key, payload)
    return payload
