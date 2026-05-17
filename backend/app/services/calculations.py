from __future__ import annotations

from collections import defaultdict
from datetime import date

from backend.app.models.entities import Goal, QuarterUpdate, User


def progress_for(goal: Goal, update: QuarterUpdate | None = None) -> int:
    actual = float(update.achievement if update else 0)
    target = float(update.planned if update else goal.target)
    if goal.direction == "zero":
        return 100 if actual == 0 else 0
    if goal.direction in {"max", "timeline"}:
        return max(0, min(100, round((target / max(actual, 0.1)) * 100)))
    return max(0, min(100, round((actual / max(target, 1)) * 100)))


WINDOWS = {
    "Goal Setting": {"months": {5}, "opens": "May 1"},
    "Q1": {"months": {7}, "opens": "July"},
    "Q2": {"months": {10}, "opens": "October"},
    "Q3": {"months": {1}, "opens": "January"},
    "Q4": {"months": {3, 4}, "opens": "March-April"},
}


def cycle_state(period: str | None = None, today: date | None = None) -> dict:
    today = today or date.today()
    states = {}
    for key, config in WINDOWS.items():
        active = today.month in config["months"]
        states[key] = {
            "active": active,
            "opens": config["opens"],
            "notice": "" if active else f"{key} check-in opens {config['opens']}" if key.startswith("Q") else f"Goal setting opens {config['opens']}",
        }
    if period:
        return states.get(period, {"active": False, "opens": "", "notice": "Cycle window is closed"})
    return {"today": today.isoformat(), "windows": states}


def health_for(goal: Goal, user: User, update: QuarterUpdate | None = None, quarter_completion: int = 80) -> dict:
    progress = progress_for(goal, update)
    late = progress < quarter_completion - 20
    workload_penalty = max(0, user.workload - 72)
    delay_penalty = 20 if late else 0
    status_penalty = 18 if goal.status == "Not Started" else 0
    risk = max(3, min(98, 100 - progress + workload_penalty + delay_penalty + status_penalty - user.streak * 2))
    causes = []
    if late:
        causes.append("Delayed milestones")
    if user.workload > 80:
        causes.append("Resource shortage / high workload")
    if user.streak <= 1:
        causes.append("Historical underperformance")
    if goal.status == "Not Started":
        causes.append("No recent update")
    if not causes:
        causes.append("Execution trend is stable")
    return {
        "progress": progress,
        "risk_score": risk,
        "completion_probability": max(2, min(98, 100 - round(risk * 0.7))),
        "health": "Red" if risk >= 75 else "Yellow" if risk >= 45 else "Green",
        "causes": causes,
        "escalation_level": "HR + skip-level" if risk >= 75 else "Manager" if risk >= 45 else "Employee reminder",
    }


def department_metrics(users: list[User], goals: list[Goal], updates_by_goal: dict[str, QuarterUpdate]) -> list[dict]:
    by_user = {u.id: u for u in users}
    groups = defaultdict(list)
    for goal in goals:
        groups[by_user[goal.user_id].department].append(health_for(goal, by_user[goal.user_id], updates_by_goal.get(goal.goal_id)))
    return [
        {
            "department": department,
            "completion": round(sum(item["progress"] for item in items) / len(items)),
            "risk": round(sum(item["risk_score"] for item in items) / len(items)),
            "goals": len(items),
        }
        for department, items in groups.items()
    ]
