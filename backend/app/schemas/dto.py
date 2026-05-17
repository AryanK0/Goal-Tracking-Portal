from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

ALLOWED_DIRECTIONS = {"min", "max", "timeline", "zero"}
ALLOWED_STATUSES = {"Not Started", "On Track", "Completed"}
ALLOWED_QUARTERS = {"Q1", "Q2", "Q3", "Q4"}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoalCreate(BaseModel):
    title: str = Field(min_length=5, max_length=180)
    description: str = Field(min_length=10)
    thrust_area: str = Field(min_length=2, max_length=100)
    uom_type: str = Field(min_length=1, max_length=40)
    direction: str = "min"
    target: float = Field(ge=0)
    target_label: str = Field(min_length=1, max_length=80)
    weightage: int = Field(ge=10, le=100)

    @field_validator("direction")
    @classmethod
    def valid_direction(cls, value: str) -> str:
        if value not in ALLOWED_DIRECTIONS:
            raise ValueError("Direction must be min, max, timeline, or zero")
        return value

    @model_validator(mode="after")
    def target_matches_formula(self):
        if self.direction != "zero" and self.target <= 0:
            raise ValueError("Target must be greater than 0 unless zero is success")
        if self.direction == "zero" and self.target != 0:
            raise ValueError("Zero-based goals must use target 0")
        return self


class GoalPatch(BaseModel):
    title: str | None = Field(default=None, min_length=5, max_length=180)
    description: str | None = Field(default=None, min_length=10)
    thrust_area: str | None = Field(default=None, min_length=2, max_length=100)
    uom_type: str | None = Field(default=None, min_length=1, max_length=40)
    direction: str | None = None
    target: float | None = Field(default=None, ge=0)
    target_label: str | None = Field(default=None, min_length=1, max_length=80)
    weightage: int | None = Field(default=None, ge=10, le=100)
    status: str | None = None

    @field_validator("direction")
    @classmethod
    def valid_patch_direction(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWED_DIRECTIONS:
            raise ValueError("Direction must be min, max, timeline, or zero")
        return value

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWED_STATUSES:
            raise ValueError("Status must be Not Started, On Track, or Completed")
        return value


class QuarterUpdateIn(BaseModel):
    quarter: str
    planned: float = Field(ge=0)
    achievement: float = Field(ge=0)
    status: str

    @field_validator("quarter")
    @classmethod
    def valid_quarter(cls, value: str) -> str:
        if value not in ALLOWED_QUARTERS:
            raise ValueError("Quarter must be Q1, Q2, Q3, or Q4")
        return value

    @field_validator("status")
    @classmethod
    def valid_update_status(cls, value: str) -> str:
        if value not in ALLOWED_STATUSES:
            raise ValueError("Status must be Not Started, On Track, or Completed")
        return value


class ApprovalIn(BaseModel):
    reason: str | None = None


class UnlockIn(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class CommentIn(BaseModel):
    employee_id: str
    goal_id: str
    text: str


class SmartPrompt(BaseModel):
    prompt: str
    department: str = "General"


class CopilotPrompt(BaseModel):
    query: str


class SharedGoalIn(BaseModel):
    title: str = Field(min_length=5, max_length=180)
    description: str = Field(min_length=10)
    thrust_area: str = Field(min_length=2, max_length=100)
    uom_type: str = Field(min_length=1, max_length=40)
    target: float = Field(gt=0)
    target_label: str = Field(min_length=1, max_length=80)
    primary_owner: str
    linked_users: list[str] = Field(min_length=1)
    weightage: int = Field(default=20, ge=10, le=100)


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = "Momentum@123"
    role: str
    manager_id: str | None = None
    department: str
    profile_image: str = ""
    workload: int = 55


class CycleIn(BaseModel):
    period: str
    window_opens: str
    action: str
    active: bool = True
