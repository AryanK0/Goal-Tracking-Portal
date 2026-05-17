from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, Response
from openpyxl import Workbook
from sqlalchemy.orm import Session

from backend.app.auth.security import require_roles
from backend.app.database.session import get_db
from backend.app.models.entities import Goal, QuarterUpdate, User
from backend.app.services.serializers import goal_out

router = APIRouter(prefix="/api/reports", tags=["reports"])


def scoped_goals(db: Session, user: User):
    goals = db.query(Goal).all()
    if user.role == "Employee":
        return [goal for goal in goals if goal.user_id == user.id]
    if user.role == "Manager":
        team = {member.id for member in db.query(User).filter(User.manager_id == user.id).all()}
        return [goal for goal in goals if goal.user_id in team]
    return goals


def report_rows(db: Session, user: User):
    updates = db.query(QuarterUpdate).all()
    rows = []
    for goal in scoped_goals(db, user):
        payload = goal_out(goal, goal.owner, [update for update in updates if update.goal_id == goal.goal_id])
        q2 = next((update for update in payload["updates"] if update["quarter"] == "Q2"), {})
        rows.append([payload["owner"]["name"], payload["owner"]["department"], payload["title"], payload["target_label"], q2.get("planned", 0), q2.get("achievement", 0), payload["progress"], payload["risk_score"], payload["approval_status"]])
    return rows


@router.get("/achievement.csv")
def csv_report(db: Session = Depends(get_db), user: User = Depends(require_roles("Admin", "Manager", "Employee"))):
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["Employee", "Department", "Goal", "Target", "Q2 Planned", "Q2 Actual", "Progress", "Risk", "Approval"])
    writer.writerows(report_rows(db, user))
    return Response(stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=momentum-ai-achievement.csv"})


@router.get("/achievement.xlsx")
def excel_report(db: Session = Depends(get_db), user: User = Depends(require_roles("Admin", "Manager", "Employee"))):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Achievement Report"
    sheet.append(["Employee", "Department", "Goal", "Target", "Q2 Planned", "Q2 Actual", "Progress", "Risk", "Approval"])
    for row in report_rows(db, user):
        sheet.append(row)
    stream = io.BytesIO()
    workbook.save(stream)
    return Response(stream.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=momentum-ai-achievement.xlsx"})
