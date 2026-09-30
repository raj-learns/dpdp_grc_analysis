import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import Base, BASE_DIR, engine, SessionLocal
from . import models  # noqa: F401 - ensure models are registered on Base before create_all
from . import migrations
from . import seed_data
from .routers import (
    kcas, owners, applications, requirements, controls, actions, evidence,
    dashboard, phases, gaps, reports, settings, questionnaire, news, auth
)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
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


@app.get("/api/health")
def health():
    return {"status": "ok"}
