from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.session import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role in ('Employee', 'Manager', 'Admin')", name="ck_users_role"),
        CheckConstraint("workload >= 0 and workload <= 100", name="ck_users_workload"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    manager_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("users.id"), nullable=True)
    department: Mapped[str] = mapped_column(String(80), nullable=False)
    profile_image: Mapped[str] = mapped_column(String(255), default="")
    workload: Mapped[int] = mapped_column(Integer, default=50)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    badges: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    manager: Mapped["User | None"] = relationship(remote_side=[id])


class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint("weightage >= 10 and weightage <= 100", name="ck_goals_weightage_range"),
        CheckConstraint("target >= 0", name="ck_goals_target_non_negative"),
        CheckConstraint("direction in ('min', 'max', 'timeline', 'zero')", name="ck_goals_direction"),
        CheckConstraint("status in ('Not Started', 'On Track', 'Completed')", name="ck_goals_status"),
        CheckConstraint("uom_type in ('Numeric', 'Percentage', '%', 'Timeline', 'Zero', 'Zero-based')", name="ck_goals_uom_type"),
        CheckConstraint("approval_status in ('Draft', 'Submitted', 'Pending', 'Pending Approval', 'Returned', 'Approved', 'Locked', 'Unlocked')", name="ck_goals_approval_status"),
    )

    goal_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    thrust_area: Mapped[str] = mapped_column(String(100), nullable=False)
    uom_type: Mapped[str] = mapped_column(String(40), nullable=False)
    direction: Mapped[str] = mapped_column(String(16), default="min")
    target: Mapped[float] = mapped_column(Float, nullable=False)
    target_label: Mapped[str] = mapped_column(String(80), nullable=False)
    weightage: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="Not Started")
    approval_status: Mapped[str] = mapped_column(String(40), default="Draft")
    locked: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_goal_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("shared_goals.shared_goal_id"), nullable=True)
    primary_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_files: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped[User] = relationship()


class SharedGoal(Base):
    __tablename__ = "shared_goals"

    shared_goal_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    thrust_area: Mapped[str] = mapped_column(String(100), nullable=False)
    uom_type: Mapped[str] = mapped_column(String(40), nullable=False)
    target: Mapped[float] = mapped_column(Float, nullable=False)
    target_label: Mapped[str] = mapped_column(String(80), nullable=False)
    primary_owner: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"))
    linked_users: Mapped[str] = mapped_column(Text, default="[]")


class SharedGoalMapping(Base):
    __tablename__ = "shared_goal_mappings"
    __table_args__ = (UniqueConstraint("primary_goal_id", "linked_goal_id", name="uq_shared_goal_mapping"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    primary_goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("goals.goal_id"), index=True)
    linked_goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("goals.goal_id"), index=True)
    owner_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), index=True)
    sync_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class QuarterUpdate(Base):
    __tablename__ = "quarter_updates"
    __table_args__ = (
        UniqueConstraint("goal_id", "quarter", name="uq_quarter_updates_goal_quarter"),
        CheckConstraint("quarter in ('Q1', 'Q2', 'Q3', 'Q4')", name="ck_quarter_updates_quarter"),
        CheckConstraint("status in ('Not Started', 'On Track', 'Completed')", name="ck_quarter_updates_status"),
        CheckConstraint("planned >= 0 and achievement >= 0 and progress >= 0 and progress <= 100", name="ck_quarter_updates_numbers"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("goals.goal_id"), index=True)
    quarter: Mapped[str] = mapped_column(String(8), nullable=False)
    planned: Mapped[float] = mapped_column(Float, nullable=False)
    achievement: Mapped[float] = mapped_column(Float, default=0)
    progress: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(40), default="Not Started")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    goal: Mapped[Goal] = relationship()


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    manager_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"))
    employee_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"))
    goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("goals.goal_id"))
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    changed_by: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"))
    actor_name: Mapped[str] = mapped_column(String(120), nullable=False)
    field_changed: Mapped[str] = mapped_column(String(120), nullable=False)
    old_value: Mapped[str] = mapped_column(Text, default="")
    new_value: Mapped[str] = mapped_column(Text, default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    affected_entity: Mapped[str] = mapped_column(String(120), default="")
    entity_id: Mapped[str] = mapped_column(String(32), default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UnlockHistory(Base):
    __tablename__ = "unlock_history"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    goal_id: Mapped[str] = mapped_column(String(32), ForeignKey("goals.goal_id"), index=True)
    admin_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), index=True)
    admin_name: Mapped[str] = mapped_column(String(120), nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(60), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"))
    goal_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("goals.goal_id"), nullable=True)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    escalation_level: Mapped[str] = mapped_column(String(60), nullable=False)
    days_overdue: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), default="Open")
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"))
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    risk_prediction: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CycleConfig(Base):
    __tablename__ = "cycle_configs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    period: Mapped[str] = mapped_column(String(80), nullable=False)
    window_opens: Mapped[str] = mapped_column(String(80), nullable=False)
    action: Mapped[str] = mapped_column(String(180), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
