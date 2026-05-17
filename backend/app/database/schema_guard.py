from __future__ import annotations

from sqlalchemy import inspect, text

from backend.app.database.session import engine


def ensure_schema() -> None:
    inspector = inspect(engine)
    if "audit_logs" in inspector.get_table_names():
        audit_columns = {column["name"] for column in inspector.get_columns("audit_logs")}
        with engine.begin() as connection:
            if "reason" not in audit_columns:
                connection.execute(text("ALTER TABLE audit_logs ADD COLUMN reason TEXT DEFAULT ''"))
            if "affected_entity" not in audit_columns:
                connection.execute(text("ALTER TABLE audit_logs ADD COLUMN affected_entity VARCHAR(120) DEFAULT ''"))
            if "entity_id" not in audit_columns:
                connection.execute(text("ALTER TABLE audit_logs ADD COLUMN entity_id VARCHAR(32) DEFAULT ''"))
    if "escalation_logs" in inspector.get_table_names():
        escalation_columns = {column["name"] for column in inspector.get_columns("escalation_logs")}
        with engine.begin() as connection:
            if "days_overdue" not in escalation_columns:
                connection.execute(text("ALTER TABLE escalation_logs ADD COLUMN days_overdue INTEGER DEFAULT 1"))
            if "status" not in escalation_columns:
                connection.execute(text("ALTER TABLE escalation_logs ADD COLUMN status VARCHAR(32) DEFAULT 'Open'"))
