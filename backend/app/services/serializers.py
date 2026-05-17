from __future__ import annotations

import json

from backend.app.models.entities import Goal, QuarterUpdate, User
from backend.app.services.calculations import health_for


def user_out(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "manager_id": user.manager_id,
        "department": user.department,
        "profile_image": user.profile_image,
        "workload": user.workload,
        "streak": user.streak,
        "badges": json.loads(user.badges or "[]"),
    }


def goal_out(goal: Goal, owner: User, updates: list[QuarterUpdate], shared_impact_count: int = 0) -> dict:
    q2 = next((item for item in updates if item.quarter == "Q2"), updates[-1] if updates else None)
    health = health_for(goal, owner, q2)
    visual_state = "Locked" if goal.locked else "Pending" if goal.approval_status in {"Pending", "Pending Approval", "Submitted"} else goal.approval_status
    return {
        "goal_id": goal.goal_id,
        "user_id": goal.user_id,
        "owner": user_out(owner),
        "title": goal.title,
        "description": goal.description,
        "thrust_area": goal.thrust_area,
        "uom_type": goal.uom_type,
        "direction": goal.direction,
        "target": goal.target,
        "target_label": goal.target_label,
        "weightage": goal.weightage,
        "status": goal.status,
        "approval_status": goal.approval_status,
        "visual_state": visual_state,
        "locked": goal.locked,
        "shared_goal_id": goal.shared_goal_id,
        "shared_impact_count": shared_impact_count,
        "primary_owner": goal.primary_owner,
        "evidence_files": json.loads(goal.evidence_files or "[]"),
        "updates": [
            {
                "id": update.id,
                "quarter": update.quarter,
                "planned": update.planned,
                "achievement": update.achievement,
                "progress": update.progress,
                "status": update.status,
                "updated_at": update.updated_at.isoformat(),
            }
            for update in updates
        ],
        **health,
    }
