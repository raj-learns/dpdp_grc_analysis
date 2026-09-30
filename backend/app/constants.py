"""
Canonical option lists. Kept centrally so the API, seed data and frontend
dropdowns can never drift apart. These are deliberately plain Python lists
(not DB tables) per the "intentionally simple" brief - Settings lets you
see/manage the entities that DO need to be dynamic (KCAs, Owners,
Applications); these fixed vocabularies are edited here in code.
"""

SOURCE_TYPES = ["DPDP_ACT", "DPDP_RULES", "SCHEDULE", "OTHER_GUIDANCE", "INTERNAL"]

DEADLINE_PHASES = [
    "ALREADY_EFFECTIVE",   # in force from 13 Nov 2025 (gazette date)
    "TWELVE_MONTH",        # commences 13 Nov 2026
    "EIGHTEEN_MONTH",      # commences 13 May 2027
    "ONGOING",             # no fixed statutory date / continuous obligation
    "CONDITIONAL",         # depends on org's status (SDF / Consent Manager / children's data etc.)
]

APPLICABILITY = ["APPLICABLE", "NOT_APPLICABLE", "TO_BE_DETERMINED"]

CONTROL_STATUSES = [
    "NOT_STARTED",
    "GAP_IDENTIFIED",
    "IN_PROGRESS",
    "IMPLEMENTED",
    "EVIDENCE_VERIFIED",
    "NOT_APPLICABLE",
]
# Statuses that count as "compliant" in the compliance % numerator
CONTROL_COMPLETE_STATUSES = ["IMPLEMENTED", "EVIDENCE_VERIFIED"]

ACTION_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]

PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

EVIDENCE_TYPES = [
    "POLICY", "CONFIGURATION", "SCREENSHOT", "API_TEST", "VAPT_REPORT",
    "AUDIT_REPORT", "LOG", "ARCHITECTURE_DOC", "CONTRACT", "PROCEDURE",
    "MEETING_RECORD", "OTHER",
]

VERIFICATION_STATUSES = ["UNVERIFIED", "VERIFIED", "REJECTED"]

CONSENT_INTEGRATION_STATUSES = ["NOT_STARTED", "TESTING", "INTEGRATED", "PRODUCTION"]

APPLICATION_ASSESSMENT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]

ENVIRONMENTS = ["Production", "Pre-Production", "Staging", "Development"]

# Stakeholder questionnaire (docs/DPDP_Compliance_Questionnaire.docx)
QUESTIONNAIRE_SECTIONS = [
    "ENTERPRISE",
    "KCA-01", "KCA-02", "KCA-03", "KCA-04", "KCA-05", "KCA-06",
    "KCA-07", "KCA-08", "KCA-09", "KCA-10", "KCA-11", "KCA-12",
    "APPLICATION", "VENDOR", "DATAFLOW", "CONTROL", "ACTION", "EVIDENCE",
]
RESPONSE_CONFIDENCE = ["CONFIRMED", "UNCERTAIN", "NOT_APPLICABLE", "NEEDS_FOLLOWUP"]

# Statutory commencement dates, from the official MeitY notification
# G.S.R. 843(E) dated 13 November 2025 (gazette: CG-DL-E-14112025-267647):
#   (a) immediate on gazette date  -> ss.1(2),2,18-26,35,38-43,44(1)&(3)
#   (b) 12 months from gazette      -> s.6(9), s.27(1)(d)                => 13 Nov 2026
#   (c) 18 months from gazette      -> ss.3-5,6(1-8,10),7-10,11-17,
#                                       27 (except (1)(d)),28-34,36,37,44(2) => 13 May 2027
# Rules 2025 (notified same gazette): Rule 1,2,17-21 immediate;
#   Rule 4 (Consent Manager registration/obligations) at 12 months;
#   Rules 3,5-16,22,23 at 18 months.
GAZETTE_DATE = "2025-11-13"
TWELVE_MONTH_DATE = "2026-11-13"
EIGHTEEN_MONTH_DATE = "2027-05-13"

# Evidence file upload (local disk storage - see routers/evidence.py)
EVIDENCE_UPLOAD_EXTENSIONS = [
    ".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".txt", ".csv", ".log", ".zip",
]
EVIDENCE_UPLOAD_MAX_BYTES = 20 * 1024 * 1024  # 20MB
