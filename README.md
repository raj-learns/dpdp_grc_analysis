# DPDP GRC Analysis

An internal DPDP (India's Digital Personal Data Protection Act, 2023 and DPDP Rules,
2025) compliance tracking and analysis application. It is control-centric: the
control register is the source of truth, and every dashboard number is calculated
live from it — nothing is hardcoded.

> **Disclaimer.** Internal compliance assessment framework. This tool does not
> constitute legal advice. Statutory applicability should be validated with the
> organisation's legal/compliance function. The 12 "KCAs" used throughout are an
> **internal** reporting grouping invented for this tracker — they are not an
> official government-defined classification under the DPDP Act/Rules.

## 1. Running it locally

### Backend (FastAPI + SQLite, Python 3.12)

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/uvicorn app.main:app --port 8811 --reload
```

On first startup it creates `backend/dpdp_grc.db` (SQLite) and seeds it automatically
(idempotent — running again does not duplicate data). API docs: `http://127.0.0.1:8811/docs`.

### Frontend (React 19 + TypeScript + Tailwind v4 + Recharts, Vite)

```bash
cd frontend
npm install
npm run dev
```

Open the printed local URL (default `http://127.0.0.1:5173`, or the next free port).
The Vite dev server proxies `/api/*` to `http://127.0.0.1:8811`, so start the backend
first. For a production build: `npm run build` (output in `frontend/dist/`, a static
bundle you can serve with any web server — point its API base at wherever you run
the FastAPI app).

## 2. Architecture

```
backend/
  app/
    models.py       SQLAlchemy models: KCA, Owner, Application, LegalRequirement,
                     Control, Action, Evidence + 3 many-to-many link tables
    schemas.py       Pydantic request/response schemas
    constants.py     Fixed vocabularies (statuses, priorities, phases...) +
                      the statutory commencement dates, sourced from the gazette
    compliance.py    THE compliance calculation engine — every % shown anywhere
                      in the UI is computed here from live DB rows, on request
    seed_data.py     Reference dataset: 12 KCAs, legal requirements transcribed
                      from the Act/Rules text, controls, actions, applications
    routers/         One router per resource (REST, CRUD) + dashboard/november/
                      may-2027/gaps/reports/settings aggregation endpoints
    main.py          FastAPI app, CORS, startup seeding
frontend/
  src/
    lib/             api.ts (typed API client), types.ts, format.ts (labels/colors)
    components/      Layout (sidebar/topbar), ui.tsx (badges/cards/modals/tables),
                      charts.tsx (Recharts donut + horizontal bar)
    pages/           Dashboard, Requirements(+Detail), KcaScorecard, Controls,
                      Actions, Evidence, Applications(+Detail), November2026,
                      May2027, GapAnalysis, Reports, Settings
```

**Data model / traceability chain** (exactly as specified):

```
LegalRequirement  →  KCA (reporting label only)
LegalRequirement  ←→  Control   (many-to-many)
Control           →  Action     (one-to-many)
Control / Action  ←→  Evidence  (many-to-many)
```

Every page that shows a percentage lets you drill down: Dashboard → KCA Scorecard →
Requirements (filtered by KCA) → Requirement Detail (its Controls) → each Control's
Actions and Evidence, inline on the same page.

**Compliance formula** (`app/compliance.py::summarize_controls`), used identically
everywhere — dashboard, KCA scorecard, November/May pages, per-application view:

```
Compliance % = (Applicable controls with status IMPLEMENTED or EVIDENCE_VERIFIED)
               ÷ (Applicable controls)
```

`NOT_APPLICABLE` and `TO_BE_DETERMINED` controls are **never** in the denominator;
they're reported as separate counts. Action completion is a distinct number
(`completed actions ÷ total non-cancelled actions`) — never mixed into control
compliance.

## 3. Legal source of truth

Requirement rows were transcribed directly from the official texts (fetched and
read in full, not from memory):

- DPDP Act, 2023 — https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf
- DPDP Rules, 2025 — https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
- Commencement notification G.S.R. 843(E), dated **13 November 2025** —
  https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf

**Correction to note:** the gazette notification is dated 13 November 2025, not 14
November as sometimes cited. The phased dates used throughout the app are therefore:

| Phase | Date | What commences |
|---|---|---|
| Immediate | 13 Nov 2025 | s.1(2), s.2, ss.18–26 (Board), ss.35,38–43, s.44(1)&(3); Rules 1,2,17–21 |
| 12-month phase | **13 Nov 2026** | Act s.6(9) & s.27(1)(d) — Consent Manager registration/oversight only; Rule 4 |
| 18-month phase | **13 May 2027** | ss.3–5, 6(1)-(8)&(10), 7–10, 11–17, 27 (except (1)(d)), 28–34,36,37, s.44(2); Rules 3,5–16,22,23 — the substantive Data Fiduciary obligations |

The app enforces the distinction the brief insisted on: **November 2026 is not a
blanket compliance deadline** — it's scoped to Consent Manager provisions only, and
the November 2026 page includes an explicit "Applicability Check" (are we operating
as a statutory Consent Manager? Yes / No / To Be Determined) before counting anything
in that phase as an organisational obligation.

## 4. Assumptions made

1. **No real evidence was seeded.** The Evidence register starts empty on purpose —
   nothing was fabricated. This means Controls marked `IMPLEMENTED` (the built
   Consent Platform capabilities) currently show 0% "evidence coverage" until real
   evidence is logged — that's intentional, not a bug.
2. **Owners are role placeholders** ("DPO / Compliance Lead", "Security Team",
   "Legal & Compliance", "Consent Platform Team", "Application Owners"), not named
   individuals, since no real names were provided.
3. **CDMS's environment (Production vs Pre-Production) is unconfirmed** — left blank
   with a note; update it once known.
4. Where the Act/Rules don't have one dedicated "maintain a data inventory" clause,
   two requirements are marked `source_type: INTERNAL` (KCA-02's inventory
   requirement, KCA-12's continuous-register requirement) — these are practical
   prerequisites the tool infers, not literal statutory text, and are labelled as such.
5. The seed action list for Consent Management (17 actions) is taken verbatim from
   the brief; none are pre-marked completed. A representative (not exhaustive) set
   of 2–3 concrete actions was added per control in the other 11 KCAs so the Action
   Tracker / Gap Analysis / dashboards have real substance across the whole
   programme, not just consent — these are illustrative starting points, not a
   claim that they're the only actions needed.
6. Financial-penalty figures (the Schedule) are quoted from the Act's own Schedule
   text and shown as an informational requirement, not a control.

## 5. Requirements currently marked "To Be Determined"

These are flagged for legal/compliance validation rather than guessed — the tool
will not count them in any compliance percentage until resolved:

- **REQ-ACT-S6-9** (Section 6(9)) — Registration of Consent Manager with the Board
- **REQ-ACT-S27-1D** (Section 27(1)(d)) — Board's power over breach of Consent Manager registration conditions
- **REQ-RULES-R4** (Rule 4; First Schedule) — Registration and obligations of a Consent Manager
  — *(these three turn on one question: is the organisation's Consent Registry a statutory Consent Manager? See the November 2026 page's Applicability Check.)*
- **REQ-ACT-S10-DPO** (Section 10(2)(a),(b)) — Significant Data Fiduciary: appoint DPO & independent auditor
- **REQ-ACT-S10-AUDIT** (Section 10(2)(c)) — Significant Data Fiduciary: periodic DPIA and audit
- **REQ-RULES-R13** (Rule 13) — Additional obligations of Significant Data Fiduciary
  — *(turns on: has the organisation been notified as a Significant Data Fiduciary?)*
- **REQ-ACT-S9** (Section 9) — Processing of children's personal data
- **REQ-RULES-R10** (Rule 10) — Verifiable parental consent mechanics
- **REQ-RULES-R11** (Rule 11) — Verifiable consent for a person with disability with a lawful guardian
- **REQ-RULES-R12** (Rule 12; Fourth Schedule) — Exemptions for certain child-data processing
  — *(turns on: does any in-scope application process personal data of under-18s? Flagged high-priority given the education-sector context of DigiVarsity.)*
- **REQ-ACT-S16** (Section 16) — Restriction on cross-border transfer of personal data
- **REQ-RULES-R15** (Rule 15) — Conditions on transfer of personal data outside India
  — *(turns on: does any application transfer personal data outside India?)*
- **REQ-RULES-R8** (Rule 8; Third Schedule) — Fixed retention/inactivity periods for specified classes
  — *(turns on: does any application fall into a notified e-commerce/gaming/social-media class and threshold?)*

## 6. Areas requiring legal/compliance validation (priority order)

1. **Is the organisation a statutory Consent Manager**, or does it intend to become
   one? This single determination resolves 3 requirements and is the entire
   substance of the 12-month (Nov 2026) statutory phase.
2. **Does any in-scope application process children's (under-18) personal data?**
   Flagged urgent given the education-sector naming of the known applications.
3. **Has / will the organisation be notified as a Significant Data Fiduciary?**
   Resolves 3 requirements (DPO appointment, independent audit, annual DPIA).
4. **Does the organisation transfer personal data outside India**, and if so, to
   which countries (relevant once/if Section 16 restrictions are notified)?
5. **Does any application meet a Third Schedule notified-class threshold** for
   fixed data-retention/inactivity periods (e-commerce/gaming/social-media)?

## 7. Notes on scope simplifications (kept deliberately simple, per the brief)

- No authentication — this is an internal/local tool.
- Evidence is a URL/path/description reference, not binary file upload.
- Fixed vocabularies (statuses/priorities/evidence types/etc.) are defined in
  `app/constants.py` rather than editable DB tables — KCAs, Owners and Applications
  *are* fully CRUD-editable from Settings/their own pages, per the brief's emphasis.
- "Reset Demo Data" (Settings page) wipes and reseeds everything, gated behind an
  explicit confirmation dialog.
