from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.database.session import Base, engine
from backend.app.database.schema_guard import ensure_schema
from backend.app.routes import admin, ai, auth, comments, dashboard, goals, reports
from backend.app.services.seed import seed
from backend.app.database.session import SessionLocal

Base.metadata.create_all(bind=engine)
ensure_schema()
db = SessionLocal()
try:
    seed(db)
finally:
    db.close()

app = FastAPI(title="Momentum AI API", version="2.0.0")

configured_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins,
    allow_origin_regex=r"^(http://(127\.0\.0\.1|localhost):517[0-9]|https://[a-zA-Z0-9-]+\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(goals.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(comments.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Momentum AI API"}
