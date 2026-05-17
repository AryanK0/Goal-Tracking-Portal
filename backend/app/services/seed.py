from __future__ import annotations

import json

from sqlalchemy.orm import Session

from backend.app.auth.security import hash_password
from backend.app.models.entities import AuditLog, CycleConfig, Goal, Notification, QuarterUpdate, SharedGoal, SharedGoalMapping, UnlockHistory, User
from backend.app.services.calculations import progress_for
from backend.app.utils.ids import uid


def seed(db: Session) -> None:
    if db.query(User).count():
        backfill_demo_integrity(db)
        return
    users = [
        ("adm-1", "Rhea Menon", "admin@momentum.ai", "Admin", None, "HR", 55, 7, ["Governance Lead", "Audit Champion"]),
        ("mgr-1", "Meera Iyer", "meera@momentum.ai", "Manager", "adm-1", "Sales", 68, 5, ["Coach"]),
        ("mgr-2", "Kabir Sethi", "kabir@momentum.ai", "Manager", "adm-1", "Technology", 82, 3, ["Risk Spotter"]),
        ("mgr-3", "Aditi Rao", "aditi@momentum.ai", "Manager", "adm-1", "Customer Success", 72, 4, ["People Builder"]),
        ("emp-1", "Aryan Mehta", "aryan@momentum.ai", "Employee", "mgr-1", "Sales", 76, 3, ["Goal Master", "3Q Streak"]),
        ("emp-2", "Naina Kapoor", "naina@momentum.ai", "Employee", "mgr-3", "Customer Success", 83, 1, ["Customer Lens"]),
        ("emp-3", "Dev Rao", "dev@momentum.ai", "Employee", "mgr-2", "Technology", 92, 1, ["Release Builder"]),
        ("emp-4", "Sara Thomas", "sara@momentum.ai", "Employee", "mgr-1", "Marketing", 64, 4, ["Campaign Ace"]),
        ("emp-5", "Ishaan Verma", "ishaan@momentum.ai", "Employee", "adm-1", "HR", 58, 5, ["People Champion"]),
        ("emp-6", "Tara Singh", "tara@momentum.ai", "Employee", "mgr-2", "Technology", 79, 2, ["Automation Pro"]),
        ("emp-7", "Omar Khan", "omar@momentum.ai", "Employee", "mgr-1", "Finance", 61, 6, ["Accuracy Star"]),
        ("emp-8", "Priya Shah", "priya@momentum.ai", "Employee", "mgr-3", "Customer Success", 73, 3, ["SLA Guardian"]),
        ("emp-9", "Neel Joshi", "neel@momentum.ai", "Employee", "mgr-1", "Sales", 88, 1, ["Pipeline Builder"]),
        ("emp-10", "Maya Nair", "maya@momentum.ai", "Employee", "mgr-2", "Technology", 69, 4, ["Zero Incident"]),
    ]
    for user_id, name, email, role, manager_id, department, workload, streak, badges in users:
        db.add(User(id=user_id, name=name, email=email, password_hash=hash_password("Momentum@123"), role=role, manager_id=manager_id, department=department, workload=workload, streak=streak, badges=json.dumps(badges)))
    db.flush()
    shared = SharedGoal(shared_goal_id="sg-revenue", title="Department Revenue Goal", description="Shared KPI for account demand to revenue conversion.", thrust_area="Growth", uom_type="Numeric", target=5000000, target_label="INR 50L", primary_owner="emp-1", linked_users=json.dumps(["emp-1", "emp-4", "emp-9"]))
    db.add(shared)
    goal_specs = {
        "emp-1": [("Increase enterprise revenue", "Growth", "Numeric", "min", 1500000, "INR 15L", 30, "Approved", True, "On Track", "sg-revenue", True), ("Reduce proposal turnaround time", "Customer Excellence", "Timeline", "max", 5, "< 5 days", 20, "Approved", True, "On Track", None, False), ("Improve CRM hygiene", "Execution", "%", "min", 96, "96%", 25, "Pending Approval", False, "On Track", None, False), ("Complete compliance training", "Compliance", "%", "min", 100, "100%", 25, "Approved", True, "Completed", None, False)],
        "emp-2": [("Reduce support response time", "Customer Excellence", "Timeline", "max", 4, "< 4 hours", 25, "Pending Approval", False, "On Track", None, False), ("Increase customer satisfaction", "Customer Excellence", "%", "min", 92, "92% CSAT", 30, "Approved", True, "On Track", None, False), ("Close escalated cases", "Execution", "%", "min", 90, "90%", 25, "Approved", True, "On Track", None, False), ("Update knowledge base", "Learning", "Numeric", "min", 20, "20 articles", 20, "Draft", False, "Not Started", None, False)],
        "emp-3": [("Maintain zero P1 incidents", "Operational Resilience", "Zero-based", "zero", 0, "0 incidents", 25, "Returned", False, "Not Started", None, False), ("Improve deployment frequency", "Execution", "Numeric", "min", 12, "12 releases", 30, "Approved", True, "On Track", None, False), ("Automate regression suite", "Quality", "%", "min", 85, "85%", 25, "Approved", True, "On Track", None, False), ("Reduce cloud cost leakage", "Cost", "%", "min", 12, "12%", 20, "Draft", False, "Not Started", None, False)],
    }
    departments = ["Marketing", "HR", "Technology", "Finance", "Customer Success", "Sales", "Technology"]
    for index, employee_id in enumerate(["emp-4", "emp-5", "emp-6", "emp-7", "emp-8", "emp-9", "emp-10"]):
        dept = departments[index]
        goal_specs[employee_id] = [
            (f"Improve {dept.lower()} operating metric", "Execution", "%", "min", 90, "90%", 35, "Approved", True, "On Track", "sg-revenue" if employee_id in {"emp-4", "emp-9"} else None, False),
            (f"Deliver {dept.lower()} quarterly initiative", "Strategic Initiative", "Timeline", "max", 30, "< 30 days", 30, "Approved", True, "On Track", None, False),
            (f"Increase {dept.lower()} evidence quality", "Governance", "%", "min", 95, "95%", 20, "Pending Approval", False, "Not Started", None, False),
            (f"Complete {dept.lower()} learning plan", "Learning", "%", "min", 100, "100%", 15, "Approved", True, "Completed", None, False),
        ]
    shared_created_goals = []
    for employee_id, specs in goal_specs.items():
        for spec in specs:
            title, thrust, uom, direction, target, label, weight, approval, locked, status, shared_id, primary = spec
            goal_id = uid()
            goal = Goal(goal_id=goal_id, user_id=employee_id, title=title, description=f"{title} with quarterly evidence and manager check-in documentation.", thrust_area=thrust, uom_type=uom, direction=direction, target=target, target_label=label, weightage=weight, approval_status=approval, locked=locked, status=status, shared_goal_id=shared_id, primary_owner=primary, evidence_files=json.dumps(["evidence-report.pdf"] if status == "Completed" else []))
            db.add(goal)
            if shared_id == "sg-revenue":
                shared_created_goals.append(goal)
            db.flush()
            plans = [target * 0.25, target * 0.5, target * 0.75, target]
            if direction in {"max", "timeline"}:
                plans = [target * 1.5, target * 1.25, target * 1.1, target]
            if direction == "zero":
                plans = [0, 0, 0, 0]
            achievements = [plans[0] * 0.95 if direction != "zero" else 1, plans[1] * (1.08 if status == "Completed" else 0.78 if status == "Not Started" else 0.92), 0, 0]
            for quarter, planned, achievement in zip(["Q1", "Q2", "Q3", "Q4"], plans, achievements):
                update = QuarterUpdate(id=uid(), goal_id=goal_id, quarter=quarter, planned=planned, achievement=achievement, status=status if quarter == "Q2" else "Not Started")
                update.progress = progress_for(goal, update)
                db.add(update)
    primary_shared_goal = next((goal for goal in shared_created_goals if goal.primary_owner), shared_created_goals[0])
    for goal in shared_created_goals:
        db.add(SharedGoalMapping(id=uid(), primary_goal_id=primary_shared_goal.goal_id, linked_goal_id=goal.goal_id, owner_id=goal.user_id, sync_enabled=True))
    for period, opens, action in [
        ("Phase 1 - Goal Setting", "1 May", "Goal Creation, Submission & Approval"),
        ("Q1 Check-in", "July", "Progress Update - Planned vs Actual"),
        ("Q2 Check-in", "October", "Progress Update - Planned vs Actual"),
        ("Q3 Check-in", "January", "Progress Update - Planned vs Actual"),
        ("Q4 / Annual", "March / April", "Final Achievement Capture"),
    ]:
        db.add(CycleConfig(id=uid(), period=period, window_opens=opens, action=action, active=True))
    db.add(Notification(id=uid(), user_id="mgr-1", type="Teams", message="Aryan submitted Q2 goals. Approve, return, or open goal sheet."))
    db.add(Notification(id=uid(), user_id="adm-1", type="AI Alert", message="3 employees are at burnout risk based on workload and delayed milestones."))
    db.add(UnlockHistory(id=uid(), goal_id=primary_shared_goal.goal_id, admin_id="adm-1", admin_name="Rhea Menon", action="Unlocked", reason="Demo exception showing admin governance flow"))
    db.add(AuditLog(id=uid(), changed_by="adm-1", actor_name="Rhea Menon", field_changed="Seed", old_value="", new_value="Momentum AI demo data initialized", reason="Demo data", affected_entity="System", entity_id="seed"))
    db.commit()


def backfill_demo_integrity(db: Session) -> None:
    shared_goals = db.query(Goal).filter(Goal.shared_goal_id.isnot(None)).all()
    if shared_goals and not db.query(SharedGoalMapping).count():
        groups = {}
        for goal in shared_goals:
            groups.setdefault(goal.shared_goal_id, []).append(goal)
        for goals in groups.values():
            primary = next((goal for goal in goals if goal.primary_owner), goals[0])
            for goal in goals:
                db.add(SharedGoalMapping(id=uid(), primary_goal_id=primary.goal_id, linked_goal_id=goal.goal_id, owner_id=goal.user_id, sync_enabled=True))
    if not db.query(UnlockHistory).count():
        locked_goal = db.query(Goal).filter(Goal.locked.is_(True)).first()
        admin = db.query(User).filter(User.role == "Admin").first()
        if locked_goal and admin:
            db.add(UnlockHistory(id=uid(), goal_id=locked_goal.goal_id, admin_id=admin.id, admin_name=admin.name, action="Unlocked", reason="Demo exception showing admin governance flow"))
    admin = db.query(User).filter(User.role == "Admin").first()
    if admin and not db.query(Notification).filter(Notification.user_id == admin.id, Notification.type == "AI Alert").first():
        db.add(Notification(id=uid(), user_id=admin.id, type="AI Alert", message="3 employees are at burnout risk based on workload and delayed milestones."))
    if admin and not db.query(AuditLog).filter(AuditLog.field_changed == "Demo Backfill").first():
        db.add(AuditLog(id=uid(), changed_by=admin.id, actor_name=admin.name, field_changed="Demo Backfill", old_value="", new_value="Shared mappings and unlock history verified", reason="Existing local database upgrade", affected_entity="System", entity_id="backfill"))
    db.commit()
