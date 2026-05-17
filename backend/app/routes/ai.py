from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.ai.engine import copilot, manager_summary, recommendation_engine, smart_goal
from backend.app.auth.security import current_user, require_roles
from backend.app.database.session import get_db
from backend.app.models.entities import AIInsight, AuditLog, Goal, QuarterUpdate, User
from backend.app.schemas.dto import CopilotPrompt, SmartPrompt
from backend.app.services.cache import cache_delete_prefix
from backend.app.services.calculations import department_metrics, health_for
from backend.app.services.escalation_service import recompute_escalations
from backend.app.services.serializers import goal_out, user_out
from backend.app.utils.ids import uid

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/smart-goal")
def smart(payload: SmartPrompt, db: Session = Depends(get_db), user: User = Depends(current_user)):
    result = smart_goal(payload.prompt, payload.department or user.department)
    db.add(AuditLog(id=uid(), changed_by=user.id, actor_name=user.name, field_changed="AI SMART Goal Generated", old_value=payload.prompt, new_value=result["title"], reason="AI-generated goal draft", affected_entity="AI", entity_id=user.id))
    db.commit()
    cache_delete_prefix("dashboard:")
    return {**result, "audit_hint": "AI suggestion only; saved goal changes are audited when submitted."}


@router.get("/recommendations")
def recommendations(department: str, user: User = Depends(current_user)):
    return recommendation_engine(department)


@router.get("/health/{goal_id}")
def health(goal_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(404, "Goal not found")
    q2 = db.query(QuarterUpdate).filter(QuarterUpdate.goal_id == goal_id, QuarterUpdate.quarter == "Q2").first()
    return health_for(goal, goal.owner, q2)


@router.post("/manager-summary/{employee_id}")
def summary(employee_id: str, db: Session = Depends(get_db), user: User = Depends(require_roles("Manager", "Admin"))):
    employee = db.get(User, employee_id)
    if not employee:
        raise HTTPException(404, "Employee not found")
    goals = db.query(Goal).filter(Goal.user_id == employee_id).all()
    updates = db.query(QuarterUpdate).all()
    payload = [goal_out(goal, employee, [update for update in updates if update.goal_id == goal.goal_id]) for goal in goals]
    text = manager_summary(user_out(employee), payload)
    insight = AIInsight(id=uid(), employee_id=employee_id, summary=text, risk_prediction=json.dumps([goal["risk_score"] for goal in payload]))
    db.add(insight)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"summary": text}


@router.post("/copilot")
def hr_copilot(payload: CopilotPrompt, db: Session = Depends(get_db), user: User = Depends(require_roles("Admin", "Manager"))):
    users = db.query(User).all()
    goals = db.query(Goal).all()
    updates = db.query(QuarterUpdate).all()
    updates_by_goal = {update.goal_id: update for update in updates if update.quarter == "Q2"}
    goal_payload = [goal_out(goal, goal.owner, [update for update in updates if update.goal_id == goal.goal_id]) for goal in goals]
    return {"answer": copilot(payload.query, [user_out(item) for item in users], goal_payload, department_metrics(users, goals, updates_by_goal))}


@router.post("/escalations/recompute")
def recompute(db: Session = Depends(get_db), user: User = Depends(require_roles("Admin", "Manager"))):
    count = recompute_escalations(db)
    db.commit()
    cache_delete_prefix("dashboard:")
    return {"count": count}


@router.post("/voice-achievement")
def voice(payload: CopilotPrompt, user: User = Depends(current_user)):
    words = payload.query.lower()
    number = next((int(token) for token in words.replace(",", " ").split() if token.isdigit()), 0)
    return {"transcript": payload.query, "achievement": number, "status": "Completed" if "completed" in words else "On Track", "confidence": 0.91}
