from __future__ import annotations

from datetime import date

from fastapi import HTTPException

WINDOWS = {
    "Goal Setting": {"months": {5}, "opens": "May"},
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
            "notice": "" if active else f"{key} opens {config['opens']}",
        }
    if period:
        return states.get(period, {"active": False, "opens": "", "notice": "Cycle window is closed"})
    return {"today": today.isoformat(), "windows": states}


def require_cycle_open(period: str, role: str) -> None:
    state = cycle_state(period)
    if role != "Admin" and not state["active"]:
        raise HTTPException(403, state["notice"])
