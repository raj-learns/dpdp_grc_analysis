# Auth Implementation Brief — for ChatGPT

## How to use this document

Paste this whole file into ChatGPT with the instruction: *"Interview me one
decision at a time, in the order listed under 'Decisions to make', explain
the trade-off and give me your recommendation for our situation, then once
I've answered all of them, give me a concrete step-by-step implementation
plan with code for both the FastAPI backend and the React frontend, matching
the existing code patterns described below."*

I (the developer) am implementing this myself — I want guidance and code
review, not just a generic auth tutorial. Please point out anywhere my
answers below create a security problem before writing any code.

---

## 1. What this app is

An internal DPDP (India's Digital Personal Data Protection Act) compliance
tracker. FastAPI + SQLAlchemy + SQLite backend, React + TypeScript frontend.
It has been running as a **fully open, unauthenticated internal tool** —
anyone who can reach the URL can read and edit everything. That was a
deliberate simplicity choice while it was local-only; now it's being
deployed (a real server, reachable by a small internal team), so real auth
is needed for the first time.

**Stack versions** (so any code you give me actually works with what I have):
- Backend: `fastapi==0.141.1`, `sqlalchemy==2.0.54`, `pydantic==2.13.5`,
  `python-multipart==0.0.32`, Python 3.12, `uvicorn[standard]==0.53.0`.
- Frontend: `react==19.2.8`, `react-router-dom==7.18.4`, `axios==1.20.0`,
  TypeScript `~6.0.2`, Vite `^8.3.0`, Tailwind v4.

## 2. Current architecture (relevant parts only)

**Backend** (`backend/app/`):
- `main.py` — creates the FastAPI `app`, sets up CORS
  (`allow_origins=["*"], allow_credentials=True, allow_methods=["*"],
  allow_headers=["*"]` — this will need to change once there's a real
  frontend origin and credentialed requests), registers every router, and
  serves uploaded evidence files from `/api/uploads` via `StaticFiles`.
- `database.py` — SQLite (`backend/dpdp_grc.db`, a single file), a
  `SessionLocal` sessionmaker, and a `get_db()` FastAPI dependency
  (`Depends(get_db)`) that every route handler already uses to get a DB
  session. Any new auth dependency should follow this exact same
  `Depends(...)` pattern — it's the one dependency-injection convention
  already used everywhere in this codebase.
- `models.py` — SQLAlchemy models. Relevant one: `Owner` (`id`, `name`,
  `role`, `email`) — **this is NOT a login-capable user account**, it's just
  a display/attribution record (e.g. "Security Team", "Legal & Compliance",
  a person's name) referenced by Controls/Actions/Evidence as an "owner"
  field. Don't confuse it with whatever new auth-user concept gets added —
  they're different entities that may or may not end up related.
- `routers/` — one file per resource, **all currently unauthenticated**:
  `kcas.py`, `owners.py`, `applications.py`, `requirements.py`,
  `controls.py`, `actions.py`, `evidence.py`, `dashboard.py`, `phases.py`,
  `gaps.py`, `reports.py`, `settings.py`, `questionnaire.py`, `news.py`.
  Every router does `router = APIRouter(prefix="/api/...", tags=[...])` and
  is registered in `main.py` via a loop over `app.include_router(r)`.
- No password hashing library, no session/JWT library, no `User` model, no
  login endpoint currently exist anywhere in this codebase.

**Frontend** (`frontend/src/`):
- `lib/api.ts` — a single shared `axios.create({ baseURL: '/api' })`
  instance (`export const api`), plus typed wrapper functions per resource.
  Any auth header/cookie/interceptor logic should hook into this one shared
  instance, not be repeated per-call.
- `App.tsx` — `react-router-dom` v7 routes, all nested under one `<Layout />`
  route element (sidebar + top bar), no route currently checks
  authentication state.
- `components/Layout.tsx` — the sidebar/nav shell every page renders inside.
- `vite.config.ts` — dev server proxies `/api/*` to
  `http://127.0.0.1:8811` (the backend). In production the built static
  files and the API would typically be served from the same origin/domain,
  which simplifies cookie-based auth (no cross-origin credential issues) —
  worth confirming this is still the deployment shape before picking a
  session mechanism.

## 3. Constraints to respect

- **Keep it proportionate.** This is a small internal team's compliance
  tracker, not a public SaaS product. Don't recommend enterprise-grade
  infrastructure (a separate auth microservice, external identity provider
  integration, etc.) unless I specifically ask for it below.
- **Single SQLite file, single server process.** Whatever auth storage is
  added should be a normal table in the same `dpdp_grc.db`, following the
  same SQLAlchemy model conventions as everything else in `models.py`.
- **Match existing patterns, don't introduce a parallel style.** Use
  FastAPI's `Depends(...)` dependency pattern (already used for `get_db`)
  for auth checks, not decorators or middleware unless there's a strong
  reason.
- **This app currently has zero external secrets/credentials anywhere** (no
  `.env`, no API keys). Whatever gets added (a `SECRET_KEY` for signing
  sessions/JWTs, etc.) is the *first* secret this app will have — flag
  clearly where it needs to live (env var, not committed to the repo) and
  update the deployment notes accordingly.

## 4. Decisions to make (interview me on these, in order)

1. **Auth model**: a single shared password for the whole team (simplest,
   but no per-user accountability/audit trail — notable given this is a
   *compliance* tool where "who changed this control's status" has real
   value), vs. individual username+password accounts, vs. SSO against
   something the org already uses (Google Workspace / Microsoft 365, if
   the org has one) via OAuth.
2. **Session mechanism**: server-side session behind an HttpOnly cookie
   (simplest to reason about, no token storage on the client, but needs
   session storage — could just be a DB table given we're already
   SQLite-based) vs. a signed JWT (stateless, but needs careful handling of
   expiry/refresh and where the frontend stores it — `localStorage` is
   vulnerable to XSS, a cookie needs the CSRF conversation).
3. **User storage**: a new `User` table (username, hashed password, maybe
   `owner_id` FK linking a login to an existing `Owner` display record for
   attribution) — confirm this relationship (or lack of one) explicitly
   rather than conflating "Owner" and "User".
4. **Granularity**: does every logged-in user get the same access (simplest,
   matches "small internal team" reality), or do we need roles (e.g.
   read-only viewer vs. editor)? Don't build roles speculatively if nobody
   actually needs a read-only user yet.
5. **Where to enforce**: a single reusable `Depends(require_auth)` added to
   every router's `APIRouter(..., dependencies=[Depends(require_auth)])` —
   confirm whether *every* endpoint needs auth or if a few (e.g. `/api/health`)
   should stay open.
6. **Frontend gating**: a login page/route, storing session state (cookie
   is automatic; a JWT needs a small auth-context/store), redirecting
   unauthenticated users, and handling a 401 response from any existing
   `api.*` call by redirecting to login rather than silently failing.
7. **Account lifecycle**: do you need self-service signup, an admin
   "create user" flow, and/or password reset — or, given a handful of known
   internal people, is it fine for someone to just insert rows directly /
   via a small script the first time? Don't build a full self-service flow
   for 3-5 known users if it's not needed.
8. **CORS tightening**: once there's real auth with cookies/credentials,
   `allow_origins=["*"]` in `main.py` needs to become the actual specific
   frontend origin(s) — confirm what that origin will be in the deployment
   (same-origin reverse proxy vs. a separate frontend domain) since it
   changes both the CORS config and which session mechanism is simplest.

## 5. What I want back

Once I've answered the above: a concrete, ordered implementation plan
(backend model → schema → dependency → router wiring → frontend login
page/guard → CORS update), plus the actual code for each piece, written to
match the conventions described in Section 2 rather than a generic
boilerplate example.


-----My Plan-------------------
AUTHENTICATION
Individual username + password
        ↓
Argon2id password hash
        ↓
Server-side random session
        ↓
SQLite Session table
        ↓
HttpOnly + Secure + SameSite=Lax cookie


BACKEND
/api/auth/login       public
/api/auth/logout      authenticated
/api/auth/me          authenticated

/api/kcas/*           authenticated
/api/controls/*       authenticated
/api/evidence/*       authenticated
...                   authenticated

/api/health           public (if you actually have/need it)

Static /api/uploads   ← NOT directly exposed
                         authenticated file endpoint instead


FRONTEND
/login                public
/app/*                protected
        ↓
GET /api/auth/me
        ↓
401 → /login
200 → application

Axios interceptor
        ↓
401 → clear auth state + redirect


USER MODEL
User ≠ Owner

User
├── id
├── username
├── password_hash
├── is_active
└── created_at

Owner remains completely independent.


ACCESS
All authenticated users = same permissions for now.
Role-based authorization can be added later.


ACCOUNT LIFECYCLE
No public signup.
No password-reset system initially.
Users created through a controlled CLI/script.


DEPLOYMENT
Same-origin frontend + API
        ↓
No wildcard credentialed CORS
        ↓
Production cookie: Secure + HttpOnly + SameSite=Lax


SECRET
AUTH_SECRET / SESSION_SECRET
        ↓
environment variable
        ↓
never committed to Git