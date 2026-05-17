from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from backend.app.models.entities import EscalationLog, Goal, QuarterUpdate
from backend.app.services.calculations import health_for
from backend.app.utils.ids import uid


def escalation_days(goal: Goal, update: QuarterUpdate | None) -> int:
    if update:
        return max(1, (datetime.utcnow() - update.updated_at).days)
    return max(1, (datetime.utcnow() - goal.updated_at).days)


def escalation_status(risk_score: int) -> str:
    return "Open" if risk_score >= 45 else "Watch"


def recompute_escalations(db: Session) -> int:
    db.query(EscalationLog).delete()
    updates = db.query(QuarterUpdate).all()
    count = 0
    for goal in db.query(Goal).all():
        q2 = next((update for update in updates if update.goal_id == goal.goal_id and update.quarter == "Q2"), None)
        health = health_for(goal, goal.owner, q2)
        reasons = list(health["causes"])
        if goal.approval_status in {"Draft", "Returned"}:
            reasons.append("No submission")
        if goal.approval_status in {"Submitted", "Pending", "Pending Approval"}:
            reasons.append("Delayed approval")
        if not q2 or q2.achievement == 0:
            reasons.append("Missing quarter update")
        if health["risk_score"] >= 45 or len(reasons) > len(health["causes"]):
            level = "HR + skip-level" if health["risk_score"] >= 75 else "Manager" if health["risk_score"] >= 45 else "Employee reminder"
            db.add(EscalationLog(
                id=uid(),
                employee_id=goal.user_id,
                goal_id=goal.goal_id,
                risk_score=health["risk_score"],
                escalation_level=level,
                days_overdue=escalation_days(goal, q2),
                status=escalation_status(health["risk_score"]),
                reason=", ".join(dict.fromkeys(reasons)),
            ))
            count += 1
    return count
