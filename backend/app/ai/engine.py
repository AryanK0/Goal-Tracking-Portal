from __future__ import annotations

from collections import Counter


def smart_goal(prompt: str, department: str) -> dict:
    text = f"{prompt} {department}".lower()
    if any(word in text for word in ["customer", "support", "satisfaction", "response"]):
        return {
            "title": "Improve customer satisfaction response outcomes",
            "description": "Reduce priority-ticket response time while improving CSAT on resolved interactions.",
            "thrust_area": "Customer Excellence",
            "uom_type": "Timeline",
            "direction": "max",
            "target": 4,
            "target_label": "< 4 hours",
            "weightage": 20,
            "smart_score": 92,
            "breakdown": {
                "Specific": "Targets priority-ticket response outcomes.",
                "Measurable": "Tracked through response time and CSAT.",
                "Achievable": "Uses routing and ownership changes.",
                "Relevant": "Directly addresses customer experience.",
                "Time-bound": "Measured through quarterly check-ins.",
            },
        }
    if any(word in text for word in ["sales", "revenue", "lead", "pipeline"]):
        return {
            "title": "Increase enterprise revenue conversion",
            "description": "Improve qualified pipeline conversion into closed revenue for priority accounts.",
            "thrust_area": "Growth",
            "uom_type": "Numeric",
            "direction": "min",
            "target": 1500000,
            "target_label": "INR 15L",
            "weightage": 25,
            "smart_score": 89,
            "breakdown": {
                "Specific": "Focuses on qualified enterprise opportunities.",
                "Measurable": "Measured through closed revenue.",
                "Achievable": "Uses existing pipeline.",
                "Relevant": "Supports department revenue goal.",
                "Time-bound": "Quarterly milestones and Q4 target.",
            },
        }
    return {
        "title": f"Improve {department.lower()} execution quality",
        "description": "Convert the stated intent into a measurable quarterly business outcome with clear evidence.",
        "thrust_area": "Execution",
        "uom_type": "%",
        "direction": "min",
        "target": 90,
        "target_label": "90% completion",
        "weightage": 15,
        "smart_score": 82,
        "breakdown": {
            "Specific": "Defines one focused execution outcome.",
            "Measurable": "Measured through completion percentage.",
            "Achievable": "Fits quarterly operating cadence.",
            "Relevant": "Improves goal visibility.",
            "Time-bound": "Closed within current cycle.",
        },
    }


def recommendation_engine(department: str) -> list[dict]:
    library = {
        "Sales": ["Revenue conversion", "Lead ageing reduction", "Proposal turnaround time"],
        "Customer Success": ["CSAT improvement", "First response time", "Escalation closure"],
        "Technology": ["Zero incidents", "Deployment frequency", "Automation coverage"],
        "HR": ["Engagement action closure", "Training completion", "Attrition risk reduction"],
        "Marketing": ["Campaign-sourced pipeline", "Qualified lead volume", "Content conversion"],
        "Finance": ["Forecast accuracy", "Cost leakage reduction", "Close-cycle speed"],
    }
    return [{"title": item, "weightage": 20 if i == 0 else 15} for i, item in enumerate(library.get(department, library["HR"]))]


def manager_summary(employee: dict, goals: list[dict]) -> str:
    completed = len([goal for goal in goals if goal["status"] == "Completed"])
    avg_progress = round(sum(goal["progress"] for goal in goals) / max(len(goals), 1))
    risky = [goal["title"] for goal in goals if goal["risk_score"] >= 55]
    risk_text = f" Attention is needed on {', '.join(risky[:2])}." if risky else " Current execution is stable."
    return f"{employee['name']} completed {completed}/{len(goals)} goals with {avg_progress}% average progress.{risk_text}"


def copilot(query: str, users: list[dict], goals: list[dict], departments: list[dict]) -> str:
    q = query.lower()
    if "department" in q and ("risk" in q or "delay" in q):
        dept = max(departments, key=lambda item: item["risk"])
        return f"{dept['department']} has the highest delay risk at {dept['risk']}%, across {dept['goals']} active goals."
    if "miss" in q or "declining" in q:
        risky = sorted(goals, key=lambda item: item["risk_score"], reverse=True)[:4]
        names = ", ".join({item["owner"]["name"] for item in risky})
        return f"Employees likely to miss targets: {names}. Main drivers are delayed milestones, workload pressure, and weak update cadence."
    if "distribution" in q:
        counts = Counter(goal["uom_type"] for goal in goals)
        return "Goal distribution: " + ", ".join(f"{key}: {value}" for key, value in counts.items())
    return "Revenue conversion is the strongest completion category. Timeline goals have the highest risk and should be reviewed in the next manager check-in."
