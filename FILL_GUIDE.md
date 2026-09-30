# DPDP GRC Tracker — Data Collection & Fill-In Guide

## How to use this document

Upload this file to ChatGPT along with the instruction: *"Interview me section by
section using this guide. Ask me one question at a time, in the order given. Once
I answer a section, tell me exactly which page in the app to open and which field(s)
to type my answer into, using the field names and allowed values given here — don't
invent status values that aren't in the enum lists."*

This app (`dpdp_grc_analysis`, run locally — backend at `127.0.0.1:8811`, frontend
at `127.0.0.1:5173`) is a control-centric DPDP (India's Digital Personal Data
Protection Act 2023 / Rules 2025) compliance tracker. It ships pre-seeded with:
transcribed statutory requirement text (do not edit these), 12 internal reporting
domains called KCAs (do not edit unless your org wants a different grouping), and
**placeholder** owners/applications/controls/actions that need to be replaced with
your organisation's real facts. This guide walks through exactly what real-world
information is needed and where it goes.

## What NOT to touch

- `LegalRequirement` rows (title, description, section reference, source URL,
  deadline phase, effective date) — these are transcribed directly from the Act/
  Rules/gazette notification. Don't edit the legal text itself.
- The compliance % formula and the 3 statutory phase dates (13 Nov 2025 / 13 Nov
  2026 / 13 May 2027) — fixed, not editable from the UI.
- KCA codes/names — only touch these if your org genuinely wants a different
  internal grouping than the 12 shipped ones (Settings page, "Add/Edit KCA").

## What DOES need your organisation's real data

In priority order, because items 1–5 below each unlock (resolve) several
`TO_BE_DETERMINED` requirements at once:

### Step 0 — Five threshold questions (answer these first)

| # | Question | Requirements it resolves | Page to update |
|---|---|---|---|
| 1 | Is the organisation a **statutory Consent Manager** (registered/intending to register with the Data Protection Board), or is the "Consent Registry" purely a Data-Fiduciary-side consent recorder? | REQ-ACT-S6-9, REQ-ACT-S27-1D, REQ-RULES-R4 | Requirements page → open each → set `applicability` (APPLICABLE/NOT_APPLICABLE) + `applicability_reason` |
| 2 | Does **any in-scope application** process personal data of **under-18s**? | REQ-ACT-S9, REQ-RULES-R10, REQ-RULES-R11, REQ-RULES-R12 | same |
| 3 | Has the organisation been (or will it be) **notified as a Significant Data Fiduciary** by the Central Government? | REQ-ACT-S10-DPO, REQ-ACT-S10-AUDIT, REQ-RULES-R13 | same |
| 4 | Does the organisation **transfer personal data outside India**, and to which countries? | REQ-ACT-S16, REQ-RULES-R15 | same |
| 5 | Does any application meet a **Third Schedule notified-class threshold** (e-commerce/gaming/social-media at a notified user-count) requiring fixed retention/inactivity periods? | REQ-RULES-R8 | same |

For each: go to the **Requirements** page, open the requirement, set
`applicability` to `APPLICABLE` / `NOT_APPLICABLE` (never leave it
`TO_BE_DETERMINED` once you know the answer), and write the real-world reason
in `applicability_reason` (e.g. "Confirmed by Legal on 2026-09-22: org is not a
registered Consent Manager").

### Step 1 — Owners (Settings page → "Owners")

Replace the placeholder rows (`Unassigned`, `DPO / Compliance Lead`, `Legal &
Compliance`, `Consent Platform Team`, `Security Team`, `Application Owners`)
with real people or keep them as role placeholders if you don't want to name
individuals yet.

Fields per owner: `name` (required), `role` (free text, e.g. "DPO"), `email`
(free text).

Ask the org: *Who is the actual DPO / compliance lead? Who owns security
controls? Who owns each application technically and from the business side?*

### Step 2 — Applications (Applications page)

Two placeholders exist: **DigiVarsity Pre-Production** and **CDMS** (CDMS's
environment is explicitly unconfirmed in the seed data). Add every real
application/system that processes personal data.

| Field | What to ask | Allowed values |
|---|---|---|
| `name` | System/application name | free text |
| `environment` | Which environment is this record? | `Production`, `Pre-Production`, `Staging`, `Development` |
| `business_owner` | Who owns it on the business side? | free text (name from Step 1) |
| `technical_owner` | Who owns it on the engineering side? | free text |
| `personal_data_processed` | What personal data fields does it hold (name, email, phone, biometric, financial, etc.)? | free text |
| `processing_purposes` | Why is that data processed? | free text |
| `consent_integration_status` | Has it been integrated with the consent platform? | `NOT_STARTED`, `TESTING`, `INTEGRATED`, `PRODUCTION` |
| `dpdp_assessment_status` | Has a DPDP gap assessment been done on it? | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` |
| `notes` | Anything else worth flagging | free text |

If an app might process under-18 users' data, flag it — it feeds Step 0 Q2.
If it transfers data to a vendor/server outside India, flag it — Step 0 Q4.

### Step 3 — Controls (Controls page)

For every seeded control (or a new one your org needs), fill in:

| Field | What to ask | Allowed values |
|---|---|---|
| `owner_id` | Who is accountable for this control? | pick from Step 1 owners |
| `status` | Real current state | `NOT_STARTED`, `GAP_IDENTIFIED`, `IN_PROGRESS`, `IMPLEMENTED`, `EVIDENCE_VERIFIED`, `NOT_APPLICABLE` |
| `priority` | How urgent? | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `applicability` | Does this control even apply to us? | `APPLICABLE`, `NOT_APPLICABLE`, `TO_BE_DETERMINED` |
| `target_date` | Realistic completion date | date |
| `completion_pct` | Rough % done (0–100) | integer |
| `evidence_required` | Does this control need documented proof? | true/false |
| `notes` | Context, blockers, decisions | free text |

Note the compliance-% math: only `IMPLEMENTED` or `EVIDENCE_VERIFIED` count as
"done", and `NOT_APPLICABLE`/`TO_BE_DETERMINED` controls are excluded from the
denominator entirely — so an honest `status` matters more than a high
`completion_pct`.

### Step 4 — Actions (Actions page)

Break each control's remaining work into concrete, assignable actions.

| Field | What to ask | Allowed values |
|---|---|---|
| `owner_id` | Who is doing this specific piece of work? | pick from Step 1 |
| `application_id` | Which application does this apply to, if any? | pick from Step 2 |
| `status` | Current state | `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED` |
| `priority` | | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `start_date` / `target_date` | Real dates | date |
| `blocker` | What's stopping progress, if anything | free text |
| `dependency` | What this depends on | free text |

The seeded action list for Consent Management (17 actions) is real/verbatim
from the original brief; the other 11 KCAs only have 2–3 illustrative starter
actions each — expect to add more once you know the real work involved.

### Step 5 — Evidence (Evidence page)

Once something is actually done, log proof — this is what moves a control
from `IMPLEMENTED` to `EVIDENCE_VERIFIED`.

| Field | What to ask | Allowed values |
|---|---|---|
| `evidence_type` | What kind of proof is it? | `POLICY`, `CONFIGURATION`, `SCREENSHOT`, `API_TEST`, `VAPT_REPORT`, `AUDIT_REPORT`, `LOG`, `ARCHITECTURE_DOC`, `CONTRACT`, `PROCEDURE`, `MEETING_RECORD`, `OTHER` |
| `file_url` | Where can it be found? (this app stores a link/path, not the file itself) | URL or path string |
| `verification_status` | Has someone checked it's actually valid proof? | `UNVERIFIED`, `VERIFIED`, `REJECTED` |
| linked control(s) / action(s) | Which control or action does this prove? | pick from Steps 3/4 |
| `date` | When was it produced/collected? | date |

The Evidence register starts **empty on purpose** — nothing was fabricated.
Zero evidence coverage on an `IMPLEMENTED` control is expected until you log
real proof; that's not a bug.

## Interview order suggestion (for ChatGPT to follow)

1. Ask the 5 threshold questions in Step 0, one at a time.
2. Go domain by domain through the 12 KCAs (Governance, Data Inventory,
   Notice, Consent, Purpose Limitation, Rights, Retention, Security, Breach
   Management, Children/Special Cases, Vendors/Transfers, Assessment/Audit) —
   for each, ask who owns it, what's actually been done, and what evidence
   exists.
3. Only after the domain interview, go through Applications (Step 2) since
   "which apps process what data" is usually easier to answer once the org
   has already thought through the KCAs.
4. Summarise answers back grouped by page (Requirements / Owners /
   Applications / Controls / Actions / Evidence) so they can be typed into
   the app in one pass per page.

There is no bulk-import — every record above is entered by hand through its
page's "Add"/"Edit" form in the running app (`http://127.0.0.1:5173`).
