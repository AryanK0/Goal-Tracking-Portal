from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass
class Health:
    progress: int
    risk: int
    probability: int
    label: str
    causes: list[str]
    escalation: str


def smart_goal(prompt: str, department: str = "General") -> dict:
    text = f"{prompt} {department}".lower()
    if any(word in text for word in ["support", "customer", "response", "ticket"]):
        return {
            "title": "Reduce support response time",
            "description": "Reduce average first-response time for priority customer tickets while keeping CSAT stable.",
            "thrust_area": "Customer Excellence",
            "uom": "Timeline",
            "direction": "max",
            "target": 4,
            "target_label": "< 4 hours",
            "weightage": 20,
            "smart_score": 91,
            "smart_breakdown": {
                "Specific": "Priority customer ticket response speed is clearly defined.",
                "Measurable": "Measured through average first-response hours.",
                "Achievable": "Target is aggressive but realistic with routing changes.",
                "Relevant": "Directly improves service experience and retention.",
                "Time-bound": "Tracked quarterly with final target by Q4."
            }
        }
    if any(word in text for word in ["revenue", "sales", "lead", "conversion"]):
        return {
            "title": "Increase qualified revenue conversion",
            "description": "Improve qualified pipeline conversion into closed revenue for strategic accounts.",
            "thrust_area": "Growth",
            "uom": "Numeric",
            "direction": "min",
            "target": 1500000,
            "target_label": "INR 15L",
            "weightage": 25,
            "smart_score": 88,
            "smart_breakdown": {
                "Specific": "Focuses on qualified pipeline conversion.",
                "Measurable": "Measured through closed revenue.",
                "Achievable": "Uses existing account pipeline.",
                "Relevant": "Supports department revenue goals.",
                "Time-bound": "Quarterly checkpoints and Q4 closure."
            }
        }
    if any(word in text for word in ["burnout", "workload", "training", "engagement", "hr"]):
        return {
            "title": "Improve employee engagement readiness",
            "description": "Increase completion of engagement actions and training follow-ups for at-risk teams.",
            "thrust_area": "People Excellence",
            "uom": "%",
            "direction": "min",
            "target": 92,
            "target_label": "92% completion",
            "weightage": 15,
            "smart_score": 84,
            "smart_breakdown": {
                "Specific": "Targets engagement actions and training follow-ups.",
                "Measurable": "Measured as completion percentage.",
                "Achievable": "Fits HR operating cadence.",
                "Relevant": "Reduces attrition and workload risk.",
                "Time-bound": "Tracked in quarterly check-ins."
            }
        }
    return {
        "title": "Improve strategic execution quality",
        "description": "Convert the stated intent into a measurable quarterly business outcome with clear evidence.",
        "thrust_area": "Execution",
        "uom": "Numeric",
        "direction": "min",
        "target": 100,
        "target_label": "100 units",
        "weightage": 15,
        "smart_score": 78,
        "smart_breakdown": {
            "Specific": "Needs one sharper outcome boundary.",
            "Measurable": "Can be tracked through a numeric target.",
            "Achievable": "Moderate target based on available capacity.",
            "Relevant": "Connects to execution visibility.",
            "Time-bound": "Quarterly cadence is defined."
        }
    }


def progress(goal: dict, quarter: str = "q2") -> int:
    actual = float(goal.get(f"{quarter}_actual", 0) or 0)
    planned = float(goal.get(f"{quarter}_plan", goal.get("target", 1)) or 1)
    direction = goal.get("direction")
    if direction == "zero":
        return 100 if actual == 0 else 0
    if direction == "max":
        return max(0, min(100, round((planned / max(actual, 0.1)) * 100)))
    return max(0, min(100, round((actual / max(planned, 1)) * 100)))


def health(goal: dict, user: dict, quarter_completion: int = 80) -> Health:
    p = progress(goal)
    workload = int(user.get("workload", 50))
    delay_penalty = 18 if goal.get("status") == "Not Started" else 8 if goal.get("status") == "On Track" and p < quarter_completion - 20 else 0
    workload_penalty = max(0, workload - 72)
    history_penalty = 12 if int(user.get("streak", 0)) <= 1 else 0
    risk = max(4, min(97, 100 - p + workload_penalty + delay_penalty + history_penalty))
    causes = []
    if p < quarter_completion - 20:
        causes.append("Delayed milestones")
    if workload > 80:
        causes.append("Resource shortage / high workload")
    if history_penalty:
        causes.append("Historical underperformance")
    if goal.get("status") == "Not Started":
        causes.append("No recent progress update")
    if not causes:
        causes.append("Execution trend is within expected range")
    label = "Critical" if risk >= 75 else "High Risk" if risk >= 58 else "Attention Needed" if risk >= 35 else "Healthy"
    escalation = "HR + skip-level" if risk >= 75 else "Manager alert" if risk >= 45 else "Email reminder"
    return Health(
        progress=p,
        risk=risk,
        probability=max(3, min(98, 100 - round(risk * 0.72))),
        label=label,
        causes=causes,
        escalation=escalation,
    )


def manager_summary(employee: dict, goals: Iterable[dict]) -> str:
    goals = list(goals)
    completed = len([g for g in goals if g.get("status") == "Completed"])
    avg = round(sum(progress(g) for g in goals) / max(len(goals), 1))
    risks = [g["title"] for g in goals if progress(g) < 65]
    risk_text = f" Watch {', '.join(risks[:2])}." if risks else " Current execution trend is stable."
    return f"{employee['name']} completed {completed}/{len(goals)} goals with {avg}% average Q2 progress.{risk_text}"


def copilot_answer(query: str, users: list[dict], goals: list[dict]) -> str:
    q = query.lower()
    if "declining" in q or "burnout" in q:
        ranked = sorted(users, key=lambda u: (u["workload"], -u["streak"]), reverse=True)[:3]
        names = ", ".join(u["name"] for u in ranked)
        return f"Employees needing attention: {names}. Signals include high workload, weak streaks, and delayed goal updates."
    if "department" in q or "delay risk" in q:
        risk_by_dept: dict[str, list[int]] = {}
        by_user = {u["id"]: u for u in users}
        for goal in goals:
            user = by_user[goal["owner_id"]]
            risk_by_dept.setdefault(user["department"], []).append(health(goal, user).risk)
        dept, scores = max(risk_by_dept.items(), key=lambda item: sum(item[1]) / len(item[1]))
        return f"{dept} has the highest delay risk at {round(sum(scores) / len(scores))}%. Main factors are workload pressure and below-plan timeline goals."
    if "recommend" in q:
        return "Recommended goals: Sales should focus on revenue conversion and lead ageing. HR should focus on engagement action closure and training completion. Tech should focus on incident prevention and deployment frequency."
    return "Timeline goals form the largest risk cluster. Revenue goals have the highest completion trend, while customer satisfaction goals are tracking lower than plan."
