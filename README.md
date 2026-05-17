# Momentum AI

**Intelligent Goal Alignment & Performance Tracking Platform**

Momentum AI is a full-stack enterprise goal lifecycle portal for hackathon demos and internal performance governance. It covers employee goal sheets, SMART goal assistance, manager approval, shared KPI cascades, quarterly check-ins, evidence capture, AI risk scoring, HR Copilot, escalations, reporting, audit trails, and role-based dashboards.

## Architecture

```mermaid
flowchart LR
  UI[React + Vite + Tailwind UI] --> API[FastAPI API]
  UI --> Auth[JWT Auth Context]
  API --> DB[(SQLAlchemy / MySQL)]
  API --> AI[AI Rules Engine]
  API --> Reports[CSV / Excel Export]
  API --> Audit[Audit + Notification Logs]
  DB --> Goals[Goals + Quarter Updates]
  DB --> Users[Users + Hierarchy]
  DB --> Shared[Shared KPI Goals + Mapping Sync]
```

```text
frontend/
  src/components/      reusable UI, charts, forms, voice input, tables
  src/pages/           auth, employee, manager, admin, analytics, reports
  src/services/        Axios API client with JWT
  src/context/         auth provider
  src/routes/          protected route guards

backend/
  app/models/          SQLAlchemy models, shared mappings, unlock history, DB constraints
  app/routes/          auth, goals, dashboard, AI, admin, comments, reports
  app/schemas/         Pydantic request validation
  app/services/        seed, calculations, serializers
  app/auth/            JWT auth and password hashing
  app/database/        SQLAlchemy session and DATABASE_URL support

database/
  schema.sql           MySQL-compatible schema plus validation view
```

## Demo Credentials

All demo users use:

```text
Password: Momentum@123
```

```text
Admin:    admin@momentum.ai
Manager:  meera@momentum.ai
Manager:  kabir@momentum.ai
Manager:  aditi@momentum.ai
Employee: aryan@momentum.ai
Employee: naina@momentum.ai
```

The seed contains 10 employees, 3 managers, 1 admin, realistic goals, quarter progress, notifications, audit logs, shared goals, and analytics-ready data.

## Live Submission URLs

```text
Frontend: https://momentum-ai-mu.vercel.app
Backend:  https://momentum-ai-api.vercel.app
Health:   https://momentum-ai-api.vercel.app/health
```

## Run Locally

Use two terminals.

Terminal 1:

```powershell
cd "C:\Users\FRIDAY\OneDrive\Desktop\Momentum"
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
cd "C:\Users\FRIDAY\OneDrive\Desktop\Momentum"
npm --prefix frontend install
npm --prefix frontend run dev -- --port 5173 --strictPort
```

Open:

```text
http://127.0.0.1:5173
```

## Deployment Guide

Frontend on Vercel:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Environment: VITE_API_URL=https://your-backend.example.com
```

Backend on Render/Railway:

```text
Start Command: python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
Environment:
  DATABASE_URL=mysql+pymysql://user:password@host:3306/momentum_ai
  JWT_SECRET=<strong-secret>
```

For MySQL, load `database/schema.sql`. Local development defaults to SQLite at `database/momentum_ai.db`.

## BRD Coverage Checklist

Completed:

- Employee goal sheet fields, frontend validation, backend validation, and MySQL constraints.
- Total weightage submit validation, minimum 10% goal weightage, and maximum 8 goals.
- Dynamic weight ring, live warning cards, SMART score card, and AI SMART goal generation.
- Employee submit -> manager review -> inline edit -> approve/return -> lock workflow.
- Admin unlock workflow with audit trail.
- Visual states for Draft, Pending, Approved, Returned, and Locked.
- Shared KPI goal push UI/API with recipient weightage-only edit rule and linked update sync.
- First-class `SharedGoalMappings` persistence with `primary_goal_id`, `linked_goal_id`, `owner_id`, and `sync_enabled`.
- Dependency graph and linked-goal impact warnings.
- Q1/Q2/Q3/Q4 quarter tabs with planned, actual, status, progress, risk, and trends.
- Manager check-in comments, discussion history, activity/audit history, and evidence upload for PDF/CSV/images.
- Cycle schedule enforcement with Admin override.
- Employee, Manager, and Admin role dashboards.
- CSV export, Excel export, completion metrics, achievement reports, QoQ charts, heatmaps, manager view, audit dashboard, and trend charts.
- Escalation recompute, escalation history, and risk score categories.
- Role-aware `DashboardRedirect` for Admin, Manager, and Employee unknown-route protection.
- AI health predictor, manager summary, HR Copilot, recommendation engine, and burnout/workload risk signals.
- Dedicated SpeechRecognition voice input for goal creation, quarter updates, and AI prompts with support detection, permission handling, transcript preview, stop control, and Idle/Listening/Processing/Captured/Error states.
- Premium animated authentication UI with role cards, password visibility, remember me, loading, and error states.
- Command palette, theme toggle, notification center, profile/settings pages, loading/empty/error states, and toast notifications.

## Cost Optimization Notes

- Dashboard data is loaded lazily per route through a single optimized API call and memoized refresh handlers.
- Analytics and reports use client-side filters, audit search filters, paginated/windowed report tables, and split frontend chunks for lower initial load cost.
- The backend dashboard payload is Redis-ready: deterministic by authenticated user scope and safe to cache with a short TTL, then invalidate on goal, quarter, approval, unlock, notification, audit, or comment writes.
- Chart exports, CSV/Excel reports, and table windows avoid repeatedly fetching the same data during demos.

External integrations:

- Email, Teams, and Entra are represented by internal notification/audit/demo hooks. Live tenant SSO, Teams adaptive cards, and email delivery require provider credentials and tenant configuration.

## Verification

Validated locally:

```powershell
python -m compileall backend\app
npm --prefix frontend run build
```

Runtime smoke:

```text
Backend health: OK
Admin login: OK
Dashboard API: returned 40 goals
Shared mappings: OK
Unlock / re-lock flow: OK
Primary-owner shared-goal sync: affected linked goals OK
Browser runtime: login and admin dashboard rendered with no Vite overlay or console errors
```
