# HMS — Module 1: Accounts & Authentication

This is the foundation module of the Enterprise Hospital Management System.
Every other module (Patients, Doctors, Appointments, Billing, Pharmacy, …)
builds on the `User`, `Hospital`, `Branch`, and RBAC primitives defined here.

Verified in this environment: Django system checks pass, migrations apply
cleanly, and the full auth test suite (12 tests: registration, login,
lockout, OTP, profile) passes against a real database. The Next.js frontend
type-checks and builds all 9 routes successfully.

## What's included

**Backend (Django + DRF)**
- Custom `User` model (email login, UUID pk, 9 roles, multi-hospital/branch scoping)
- JWT auth with refresh-token rotation & blacklisting (`simplejwt`)
- Register → email OTP verification → login flow
- Forgot / reset / change password (opaque single-use tokens, Celery email)
- Login lockout after 5 failed attempts (15 min)
- Optional TOTP-based 2FA (Google Authenticator compatible) + email-OTP 2FA fallback
- Session management: list & force-revoke active devices
- RBAC permission classes (`IsSuperAdmin`, `IsHospitalAdmin`, `HasRole`, `IsSameHospital`, …) for reuse by every future module
- Audit log middleware capturing every write request
- Swagger/OpenAPI docs via drf-spectacular
- Scoped rate limiting (login/otp/password-reset/register)
- Consistent `{success, message, data}` response envelope + global exception handler
- Pytest suite with factory-boy fixtures
- Docker Compose (Postgres, Redis, Django, Celery worker, Celery beat)

**Frontend (Next.js 15 App Router + TypeScript)**
- Pages: `/login`, `/register`, `/verify-otp`, `/verify-2fa`, `/forgot-password`, `/reset-password`, `/dashboard`
- React Hook Form + Zod validation matching backend rules exactly
- Zustand store (persisted session) + Axios instance with automatic silent token refresh on 401
- Middleware-based route protection
- Tailwind design system: clinical teal / warm amber palette, Fraunces + Public Sans + IBM Plex Mono, a signature animated pulse-line motif on the auth screens (deliberately not the generic cream/terracotta AI look)

## Running it locally

### Backend
```bash
cd backend
cp .env.example .env        # edit DB_* and SECRET_KEY
docker compose up --build   # Postgres + Redis + Django + Celery
# or, without Docker:
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
API docs: `http://localhost:8000/api/docs/`

### Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Open `http://localhost:3000`

### Tests
```bash
cd backend
pytest
```

## API surface (Module 1)

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/v1/accounts/register/` | Public |
| POST | `/api/v1/accounts/login/` | Public |
| POST | `/api/v1/accounts/2fa/verify/` | Public |
| POST | `/api/v1/accounts/verify-otp/` | Public |
| POST | `/api/v1/accounts/resend-otp/` | Public |
| POST | `/api/v1/accounts/forgot-password/` | Public |
| POST | `/api/v1/accounts/reset-password/` | Public |
| POST | `/api/v1/accounts/token/refresh/` | Public (refresh token) |
| POST | `/api/v1/accounts/logout/` | Authenticated |
| POST | `/api/v1/accounts/change-password/` | Authenticated |
| GET/PATCH | `/api/v1/accounts/me/` | Authenticated |
| POST | `/api/v1/accounts/2fa/enable/` `/confirm/` `/disable/` | Authenticated |
| GET | `/api/v1/accounts/sessions/` | Authenticated |
| POST | `/api/v1/accounts/sessions/<id>/revoke/` | Authenticated |

## Next module

**Module 2 — Hospital & Department Management**, followed by **Patient
Management**, then **Doctor Management**, **Appointment Scheduling**, etc.,
in the order listed in the spec — each delivered with the same 15
deliverables (models → serializers → views → URLs → permissions → services →
frontend pages → integration → tests → docs) once you approve this one.
