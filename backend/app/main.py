import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import Base, DATA_DIR, engine, SessionLocal
from . import models  # noqa: F401 - ensure models are registered on Base before create_all
from . import migrations
from . import seed_data
from .routers import (
    kcas, owners, applications, requirements, controls, actions, evidence,
    dashboard, phases, gaps, reports, settings, questionnaire, news, auth
)

UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)  # StaticFiles below needs this to exist at import time

app = FastAPI(
    title="DPDP GRC Analysis",
    description=(
        "Internal DPDP (India's Digital Personal Data Protection Act, 2023 and "
        "DPDP Rules, 2025) compliance tracking API. Internal assessment "
        "framework - not legal advice."
    ),
    version="1.0.0",
)

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    # "*" is invalid together with allow_credentials=True (needed for the
    # session cookie) - browsers reject wildcard-origin credentialed requests.
    # Set FRONTEND_ORIGIN in the environment if the deployed frontend runs on
    # a different origin than the Vite dev server.
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    migrations.run_lightweight_migrations(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data.seed(db)
        seed_data.seed_questionnaire(db)
    finally:
        db.close()


app.include_router(auth.router)
for r in (kcas.router, owners.router, applications.router, requirements.router,
          controls.router, actions.router, evidence.router, dashboard.router,
          phases.router, gaps.router, reports.router, settings.router, questionnaire.router,
          news.router):
    app.include_router(r)

app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}


# Production: serve the built React app from this same process (no Vite proxy,
# no CORS). Only active when the build output exists (i.e. inside the Docker image).
FRONTEND_DIST = os.environ.get("FRONTEND_DIST", "")
if FRONTEND_DIST and os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        # Unknown /api paths must stay real 404s, not index.html.
        if full_path.startswith("api/"):
            raise HTTPException(404, "Not found")
        candidate = os.path.realpath(os.path.join(FRONTEND_DIST, full_path))
        if candidate.startswith(os.path.realpath(FRONTEND_DIST) + os.sep) and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
