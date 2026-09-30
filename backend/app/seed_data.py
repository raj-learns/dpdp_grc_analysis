"""
Seed data for the DPDP GRC Analysis tracker.

Legal requirement rows below are transcribed from the official texts at:
  - DPDP Act 2023:  https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf
  - DPDP Rules 2025: https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
  - Commencement notification G.S.R. 843(E), dated 13 Nov 2025:
    https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf

Per that notification:
  (a) immediate (13 Nov 2025): s.1(2), s.2, ss.18-26, ss.35,38-43, s.44(1)&(3)
  (b) +12 months (13 Nov 2026): s.6(9), s.27(1)(d)             -> "TWELVE_MONTH"
  (c) +18 months (13 May 2027): ss.3-5, s.6(1-8,10), ss.7-10,
      ss.11-17, s.27 (except (1)(d)), ss.28-34,36,37, s.44(2)  -> "EIGHTEEN_MONTH"
Rules commencement (Rule 1(2)-(4)): Rules 1,2,17-21 immediate; Rule 4 at
+12 months; Rules 3,5-16,22,23 at +18 months.

Wherever the organisation's factual status is not established (Significant
Data Fiduciary? statutory Consent Manager? processes children's data?
transfers data outside India? falls into a Third Schedule retention
class?) applicability is deliberately set to TO_BE_DETERMINED rather than
guessed, with a reason explaining what needs to be confirmed and by whom.
"""
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import date
from . import models
from . import questionnaire_seed_data

ACT_URL = "https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf"
RULES_URL = "https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf"

# ---------------------------------------------------------------------------
# 1. Internal KCAs (NOT a statutory list - see disclaimer in the UI)
# ---------------------------------------------------------------------------
KCAS = [
    ("KCA-01", "Governance & Accountability", "Roles, responsibilities, policies and compliance ownership.", 1),
    ("KCA-02", "Data Inventory & Mapping", "What personal data exists, where it exists, why it is processed and how it flows.", 2),
    ("KCA-03", "Notice & Transparency", "What Data Principals are informed about before/while their data is processed.", 3),
    ("KCA-04", "Consent Management", "Consent collection, recording, proof, purpose, review and withdrawal.", 4),
    ("KCA-05", "Purpose Limitation & Data Minimisation", "Processing only for defined purposes and limiting data to what is necessary.", 5),
    ("KCA-06", "Data Principal Rights", "Access, correction, erasure, withdrawal and grievance mechanisms.", 6),
    ("KCA-07", "Data Retention & Erasure", "Retention periods, deletion processes and lifecycle controls.", 7),
    ("KCA-08", "Security Safeguards", "Access control, encryption, logging, monitoring, backups, vulnerability management etc.", 8),
    ("KCA-09", "Personal Data Breach Management", "Detection, response, documentation and applicable notifications.", 9),
    ("KCA-10", "Children & Special Cases", "Children's data and other conditional/special obligations where applicable.", 10),
    ("KCA-11", "Data Processors, Vendors & Transfers", "Third parties, processor controls, contracts and applicable transfer requirements.", 11),
    ("KCA-12", "Assessment, Audit & Continuous Compliance", "Assessments, audits, evidence, remediation and continuous monitoring.", 12),
]

OWNERS = [
    ("Unassigned", "", ""),
    ("DPO / Compliance Lead", "Data Protection Officer (role placeholder)", ""),
    ("Legal & Compliance", "Legal review and applicability sign-off", ""),
    ("Consent Platform Team", "Owns the Centralised Consent Management Platform", ""),
    ("Security Team", "Owns technical security controls", ""),
    ("Application Owners", "DigiVarsity / CDMS engineering owners", ""),
]

APPLICATIONS = [
    dict(
        name="DigiVarsity Pre-Production",
        environment="Pre-Production",
        business_owner="TBD",
        technical_owner="TBD",
        personal_data_processed="Not yet catalogued in this tracker.",
        processing_purposes="Not yet catalogued in this tracker.",
        consent_integration_status="TESTING",
        dpdp_assessment_status="IN_PROGRESS",
        notes="First target environment for Consent Registry API integration testing.",
    ),
    dict(
        name="CDMS",
        environment="",
        business_owner="TBD",
        technical_owner="TBD",
        personal_data_processed="Not yet catalogued in this tracker.",
        processing_purposes="Not yet catalogued in this tracker.",
        consent_integration_status="TESTING",
        dpdp_assessment_status="IN_PROGRESS",
        notes="Second target environment for Consent Registry API integration testing. Environment (prod/pre-prod) not yet confirmed - update once known.",
    ),
]

# ---------------------------------------------------------------------------
# 2. Legal requirements
#    Fields: code, title, description, source_type, section_ref, kca_code,
#            deadline_phase, applicability, applicability_reason
# ---------------------------------------------------------------------------
REQUIREMENTS = [
    dict(code="REQ-ACT-S18-26", title="Establishment & functioning of the Data Protection Board of India",
         description="Chapter V establishes the Data Protection Board of India and its composition, procedure and powers.",
         source_type="DPDP_ACT", section_ref="Sections 18-26", kca="KCA-01",
         effective_date="2025-11-13", deadline_phase="ALREADY_EFFECTIVE",
         applicability="NOT_APPLICABLE",
         reason="Institutional provision establishing the regulator itself; not an obligation on a Data Fiduciary."),

    dict(code="REQ-ACT-S8-1", title="General obligations of Data Fiduciary",
         description="A Data Fiduciary is responsible for compliance with the Act and rules for all processing done by it or on its behalf by a Data Processor, and must implement appropriate technical and organisational measures (s.8(1),(2),(4)).",
         source_type="DPDP_ACT", section_ref="Section 8(1), (2), (4)", kca="KCA-01",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH",
         applicability="APPLICABLE", reason="Applies to every Data Fiduciary; the organisation processes digital personal data of Data Principals in India."),

    dict(code="REQ-ACT-S8-9", title="Publish contact information for processing queries",
         description="A Data Fiduciary must publish the business contact information of its Data Protection Officer (if applicable) or another person able to answer questions about processing of personal data (s.8(9)); Rule 9 requires this to be prominent on the website/app and in every rights-related response.",
         source_type="DPDP_ACT", section_ref="Section 8(9)", kca="KCA-01",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-RULES-R9", title="Contact information of person to answer processing questions",
         description="Every Data Fiduciary shall prominently publish, on its website/app and in every response to a rights request, the business contact information of the DPO or a person able to answer questions about processing.",
         source_type="DPDP_RULES", section_ref="Rule 9", kca="KCA-01",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S10-DPO", title="Significant Data Fiduciary - appoint DPO & independent data auditor",
         description="A Significant Data Fiduciary must appoint an India-based Data Protection Officer reporting to the Board/governing body, and an independent data auditor (s.10(2)(a)-(b)).",
         source_type="DPDP_ACT", section_ref="Section 10(2)(a), (b)", kca="KCA-01",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="Applies only if the Central Government notifies the organisation (or its class) as a Significant Data Fiduciary under Section 10. No such notification has been confirmed. Requires legal/compliance validation."),

    dict(code="REQ-INT-DI-01", title="Maintain an inventory of personal data processing",
         description="Internal foundational requirement: without knowing what personal data is processed, where, and for what purpose, no other DPDP obligation (grounds for processing, notice, minimisation, retention, security, rights fulfilment) can be reliably met. The Act does not contain one dedicated 'data inventory' section; this is inferred as a practical prerequisite for Sections 4-8.",
         source_type="INTERNAL", section_ref="Supports Sections 4-8", kca="KCA-02",
         effective_date=None, deadline_phase="ONGOING", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S5", title="Notice to Data Principal",
         description="Every consent request must be accompanied/preceded by a notice describing the personal data and purpose of processing, how to exercise rights, and how to complain to the Board; also required (post-facto) for pre-Act consents (s.5(1),(2)); notice must offer English or an Eighth-Schedule language (s.5(3)).",
         source_type="DPDP_ACT", section_ref="Section 5", kca="KCA-03",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-RULES-R3", title="Content requirements for notice",
         description="Notice must be understandable independently of other information, give an itemised description of the personal data and specified purpose(s) in clear plain language, and provide the link/means to withdraw consent, exercise rights, and complain to the Board.",
         source_type="DPDP_RULES", section_ref="Rule 3", kca="KCA-03",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S6-CORE", title="Valid consent - free, specific, informed, unconditional, unambiguous",
         description="Consent must be free, specific, informed, unconditional and unambiguous with clear affirmative action, limited to personal data necessary for the specified purpose; invalid parts of consent (e.g. rights waivers) do not bind the Data Principal; requests must be in clear/plain language with DPO/contact details; consent is freely withdrawable with comparable ease (s.6(1)-(6)).",
         source_type="DPDP_ACT", section_ref="Section 6(1)-(6)", kca="KCA-04",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S6-CM-ACCESS", title="Enable consent via a registered Consent Manager, if the Data Principal chooses one",
         description="A Data Principal may give, manage, review or withdraw consent through a Consent Manager, who is accountable to her and acts on her behalf (s.6(7)-(8)). This is an obligation to accommodate a Consent Manager the Data Principal chooses to use - it does not require the organisation itself to become a Consent Manager.",
         source_type="DPDP_ACT", section_ref="Section 6(7), (8)", kca="KCA-04",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S6-9", title="Registration of Consent Manager with the Board",
         description="Every Consent Manager must be registered with the Board subject to prescribed technical, operational and financial conditions.",
         source_type="DPDP_ACT", section_ref="Section 6(9)", kca="KCA-04",
         effective_date="2026-11-13", deadline_phase="TWELVE_MONTH", applicability="TO_BE_DETERMINED",
         reason="Applies ONLY if the organisation operates as, or intends to register as, a statutory Consent Manager. The internal Consent Registry currently built is a Data-Fiduciary-side consent recording system, not automatically a registered Consent Manager under this definition. Requires an explicit legal/business decision on intended role before this can be marked Applicable or Not Applicable."),

    dict(code="REQ-ACT-S27-1D", title="Board's power over breach of Consent Manager registration conditions",
         description="On receipt of an intimation of breach of any condition of registration of a Consent Manager, the Board may inquire and impose a penalty.",
         source_type="DPDP_ACT", section_ref="Section 27(1)(d)", kca="KCA-04",
         effective_date="2026-11-13", deadline_phase="TWELVE_MONTH", applicability="TO_BE_DETERMINED",
         reason="A Board enforcement power that is only relevant if the organisation is a registered Consent Manager. Same determination as REQ-ACT-S6-9 applies."),

    dict(code="REQ-RULES-R4", title="Registration and obligations of a Consent Manager",
         description="Sets out the application process for registration as a Consent Manager (First Schedule Part A conditions, e.g. Indian-incorporated company, net worth not less than Rs 2 crore, sound financial/managerial standing) and ongoing obligations (First Schedule Part B: consent-record keeping, fiduciary duty to the Data Principal, conflict-of-interest avoidance, security safeguards, audit mechanisms, no change of control without Board approval, etc.).",
         source_type="DPDP_RULES", section_ref="Rule 4; First Schedule Parts A & B", kca="KCA-04",
         effective_date="2026-11-13", deadline_phase="TWELVE_MONTH", applicability="TO_BE_DETERMINED",
         reason="Same determination as REQ-ACT-S6-9: only applicable if the organisation seeks registration as a statutory Consent Manager."),

    dict(code="REQ-ACT-S6-10", title="Burden of proof of notice and consent",
         description="Where consent is the basis of processing and a question arises in a Board proceeding, the Data Fiduciary must be able to prove that notice was given and consent was validly obtained.",
         source_type="DPDP_ACT", section_ref="Section 6(10)", kca="KCA-04",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S4", title="Lawful grounds for processing personal data",
         description="Personal data may be processed only with the Data Principal's consent or for a certain legitimate use, and only for a lawful purpose.",
         source_type="DPDP_ACT", section_ref="Section 4", kca="KCA-05",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S7", title="Certain legitimate uses",
         description="Lists non-consent processing grounds: voluntarily provided data for a specified purpose with no indicated objection; State-provided subsidies/benefits/services; sovereign/State functions; legal disclosure obligations; compliance with judgments; medical emergencies; public health measures; disaster response; employment-related purposes (s.7(a)-(i)).",
         source_type="DPDP_ACT", section_ref="Section 7", kca="KCA-05",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S11", title="Right to access information about personal data",
         description="A Data Principal may request a summary of personal data processed and processing activities, the identities of other Data Fiduciaries/Processors it was shared with, and other prescribed information.",
         source_type="DPDP_ACT", section_ref="Section 11", kca="KCA-06",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S12", title="Right to correction and erasure",
         description="A Data Principal may request correction, completion, updating and erasure of her personal data; the Data Fiduciary must comply unless retention is necessary for the specified purpose or under law.",
         source_type="DPDP_ACT", section_ref="Section 12", kca="KCA-06",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S13", title="Right of grievance redressal",
         description="A Data Principal has the right to readily available means of grievance redressal from the Data Fiduciary or Consent Manager; she must exhaust this before approaching the Board.",
         source_type="DPDP_ACT", section_ref="Section 13", kca="KCA-06",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-RULES-R14", title="Rights of Data Principals - publication and grievance SLA",
         description="Data Fiduciaries/Consent Managers must prominently publish the means to exercise rights and any identifying particulars required, and must publish and operate a grievance redressal system responding within a period not exceeding 90 days.",
         source_type="DPDP_RULES", section_ref="Rule 14", kca="KCA-06",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S14", title="Right to nominate",
         description="A Data Principal may nominate another individual to exercise her rights in the event of her death or incapacity.",
         source_type="DPDP_ACT", section_ref="Section 14", kca="KCA-06",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S8-RET", title="Erasure of personal data when purpose is served / consent withdrawn",
         description="Unless retention is necessary for legal compliance, a Data Fiduciary must erase personal data on withdrawal of consent or once the specified purpose is no longer served, and must cause its Data Processors to do the same (s.8(7),(8),(11)).",
         source_type="DPDP_ACT", section_ref="Section 8(7), (8), (11)", kca="KCA-07",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-RULES-R8", title="Fixed retention/inactivity periods for specified classes (Third Schedule)",
         description="For Data Fiduciary classes and purposes listed in the Third Schedule (e.g. certain e-commerce, online gaming and social media entities meeting notified user thresholds), personal data must be erased after a specified inactivity period if the Data Principal has not approached the Data Fiduciary or exercised her rights, with 48-hour prior notice before deletion.",
         source_type="DPDP_RULES", section_ref="Rule 8; Third Schedule", kca="KCA-07",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="Only applies if an in-scope application falls within a notified Third Schedule class and threshold. Needs confirmation against the exact Third Schedule thresholds for each application."),

    dict(code="REQ-ACT-S8-5", title="Reasonable security safeguards",
         description="A Data Fiduciary must take reasonable security safeguards to prevent a personal data breach, for data in its possession/control and processing by its Data Processors.",
         source_type="DPDP_ACT", section_ref="Section 8(5)", kca="KCA-08",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-RULES-R6", title="Minimum reasonable security safeguards",
         description="Minimum measures: encryption/obfuscation/masking or virtual tokens; access controls over computer resources; logging/monitoring for detecting unauthorised access; backup/continuity measures; retention of logs and personal data for at least one year for detection/investigation; contractual security clauses with Data Processors; technical and organisational measures generally.",
         source_type="DPDP_RULES", section_ref="Rule 6", kca="KCA-08",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S8-6", title="Personal data breach intimation",
         description="On a personal data breach, the Data Fiduciary must intimate the Board and each affected Data Principal, in the prescribed form and manner.",
         source_type="DPDP_ACT", section_ref="Section 8(6)", kca="KCA-09",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-RULES-R7", title="Breach intimation timelines and content",
         description="On becoming aware of a breach: intimate affected Data Principals without delay with breach description, consequences, mitigation measures, safety steps and contact details; intimate the Board without delay with an initial description, and within 72 hours (or Board-extended period) with detailed information including root cause, remedial measures and a report on Data Principal intimations.",
         source_type="DPDP_RULES", section_ref="Rule 7", kca="KCA-09",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S9", title="Processing of children's personal data",
         description="Before processing a child's (or a lawful-guardian-dependent person with disability's) personal data, verifiable parental/guardian consent is required; no processing likely to harm a child's well-being; no tracking, behavioural monitoring or targeted advertising directed at children, subject to prescribed exemptions.",
         source_type="DPDP_ACT", section_ref="Section 9", kca="KCA-10",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="Applies only if an in-scope application processes personal data of individuals under 18 (or persons with disability with a lawful guardian). Given the education-sector context of the known applications, this needs urgent confirmation rather than assumption either way."),

    dict(code="REQ-RULES-R10", title="Verifiable parental consent mechanics",
         description="Technical/organisational measures and due-diligence checks (identity/age verification, including via authorised entities or Digital Locker) to obtain verifiable consent of a parent before processing a child's personal data.",
         source_type="DPDP_RULES", section_ref="Rule 10", kca="KCA-10",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="Same determination as REQ-ACT-S9."),

    dict(code="REQ-RULES-R11", title="Verifiable consent for a person with disability with a lawful guardian",
         description="Due diligence to verify that a person identifying as a lawful guardian of a person with disability is validly appointed as such under applicable guardianship law.",
         source_type="DPDP_RULES", section_ref="Rule 11", kca="KCA-10",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="Applies only if the organisation processes personal data of a person with disability via a lawful guardian."),

    dict(code="REQ-RULES-R12", title="Exemptions for certain child-data processing",
         description="Sub-sections (1) and (3) of Section 9 do not apply to specified classes of Data Fiduciaries / purposes listed in Fourth Schedule Parts A and B (e.g. certain clinical establishments, health professionals, educational institutions, subject to listed conditions).",
         source_type="DPDP_RULES", section_ref="Rule 12; Fourth Schedule", kca="KCA-10",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="Worth checking - if an in-scope application qualifies as an educational institution for a listed purpose, part of the Section 9 burden may be relieved. Needs legal review against the exact Fourth Schedule conditions."),

    dict(code="REQ-ACT-S8-2", title="Data Processor engagement only under valid contract",
         description="A Data Fiduciary may engage a Data Processor to process personal data on its behalf for goods/services activities only under a valid contract.",
         source_type="DPDP_ACT", section_ref="Section 8(2)", kca="KCA-11",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-S16", title="Restriction on cross-border transfer of personal data",
         description="The Central Government may, by notification, restrict transfer of personal data to specified countries/territories outside India.",
         source_type="DPDP_ACT", section_ref="Section 16", kca="KCA-11",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="No country-specific restriction list has been confirmed as notified. Whether any in-scope application transfers personal data outside India also needs confirmation."),

    dict(code="REQ-RULES-R15", title="Conditions on transfer of personal data outside India",
         description="Personal data may be transferred outside India subject to meeting requirements the Central Government may specify regarding making data available to a foreign State (or persons/agencies under its control).",
         source_type="DPDP_RULES", section_ref="Rule 15", kca="KCA-11",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="Same determination as REQ-ACT-S16."),

    dict(code="REQ-ACT-S10-AUDIT", title="Significant Data Fiduciary - periodic DPIA and audit",
         description="A Significant Data Fiduciary must undertake periodic Data Protection Impact Assessments and periodic audits, and other prescribed measures.",
         source_type="DPDP_ACT", section_ref="Section 10(2)(c)", kca="KCA-12",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="Same Significant-Data-Fiduciary determination as REQ-ACT-S10-DPO."),

    dict(code="REQ-RULES-R13", title="Additional obligations of Significant Data Fiduciary",
         description="Annual DPIA and audit with a report of significant observations furnished to the Board; due diligence that algorithmic/technical measures do not risk Data Principals' rights; data-localisation for personal data categories the Central Government notifies on a committee's recommendation.",
         source_type="DPDP_RULES", section_ref="Rule 13", kca="KCA-12",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="TO_BE_DETERMINED",
         reason="Same Significant-Data-Fiduciary determination as REQ-ACT-S10-DPO."),

    dict(code="REQ-INT-AUDIT-01", title="Maintain a continuous internal control register and remediation cycle",
         description="Internal governance requirement: maintain a living register of controls/actions/evidence against the applicable requirement universe, and periodically reassess status - the operating model this tracker implements.",
         source_type="INTERNAL", section_ref="Internal governance practice", kca="KCA-12",
         effective_date=None, deadline_phase="ONGOING", applicability="APPLICABLE", reason=""),

    dict(code="REQ-ACT-SCHEDULE", title="Financial penalties for non-compliance",
         description="The Schedule (see Section 33(1)) sets penalty ranges the Board may impose for breaches, up to Rs 250 crore for the most serious breach category (failure of reasonable security safeguards), Rs 200 crore for breach of children's/SDF-specific obligations, Rs 150 crore for breach of general Data Fiduciary obligations, Rs 50 crore for Consent Manager obligation breaches, and up to Rs 10,000 for breach of Data Principal duties.",
         source_type="SCHEDULE", section_ref="The Schedule [see Section 33(1)]", kca="KCA-12",
         effective_date=None, deadline_phase="EIGHTEEN_MONTH", applicability="APPLICABLE",
         reason="Informational: quantifies exposure once the underlying substantive obligations are in force. Board's general penalty-imposing power under Section 27 (other than clause (1)(d)) commences at the 18-month mark."),
]

for r in REQUIREMENTS:
    r["source_url"] = ACT_URL if r["source_type"] in ("DPDP_ACT", "SCHEDULE") else RULES_URL

# ---------------------------------------------------------------------------
# 3. Controls (control_id, name, kca, requirement_codes[], status, priority,
#    completion_pct, deadline_phase, applicability, owner_name, notes)
# ---------------------------------------------------------------------------
CONTROLS = [
    dict(cid="CTL-GOV-01", name="Establish internal DPDP control register and control ownership", kca="KCA-01",
         reqs=["REQ-INT-DI-01"], status="IN_PROGRESS", priority="CRITICAL", pct=40, phase="ONGOING",
         owner="DPO / Compliance Lead", notes="This tracker is the control register referred to here."),
    dict(cid="CTL-GOV-02", name="Publish DPO/grievance contact information on website and app", kca="KCA-01",
         reqs=["REQ-ACT-S8-9", "REQ-RULES-R9"], status="NOT_STARTED", priority="HIGH", pct=0, phase="EIGHTEEN_MONTH",
         owner="Legal & Compliance", notes=""),
    dict(cid="CTL-GOV-03", name="Determine Significant Data Fiduciary status and, if applicable, appoint DPO", kca="KCA-01",
         reqs=["REQ-ACT-S10-DPO"], status="NOT_STARTED", priority="MEDIUM", pct=0, phase="EIGHTEEN_MONTH",
         applicability="TO_BE_DETERMINED", owner="Legal & Compliance", notes=""),

    dict(cid="CTL-DI-01", name="Identify all applications and systems processing personal data", kca="KCA-02",
         reqs=["REQ-INT-DI-01"], status="IN_PROGRESS", priority="CRITICAL", pct=30, phase="ONGOING",
         owner="Application Owners", notes="DigiVarsity Pre-Production and CDMS identified to date; full inventory pending."),
    dict(cid="CTL-DI-02", name="Map personal data categories and processing purposes per application", kca="KCA-02",
         reqs=["REQ-INT-DI-01"], status="NOT_STARTED", priority="HIGH", pct=0, phase="ONGOING",
         owner="Application Owners", notes=""),
    dict(cid="CTL-DI-03", name="Map end-to-end personal data flows for identified applications", kca="KCA-02",
         reqs=["REQ-INT-DI-01"], status="NOT_STARTED", priority="MEDIUM", pct=0, phase="ONGOING",
         owner="Application Owners", notes=""),

    dict(cid="CTL-NT-01", name="Review Privacy Policy notice content against Rule 3 requirements", kca="KCA-03",
         reqs=["REQ-ACT-S5", "REQ-RULES-R3"], status="NOT_STARTED", priority="HIGH", pct=0, phase="EIGHTEEN_MONTH",
         owner="Legal & Compliance", notes=""),
    dict(cid="CTL-NT-02", name="Review Terms & Conditions consent/notice flows", kca="KCA-03",
         reqs=["REQ-ACT-S5"], status="NOT_STARTED", priority="MEDIUM", pct=0, phase="EIGHTEEN_MONTH",
         owner="Legal & Compliance", notes=""),
    dict(cid="CTL-NT-03", name="Offer notice in an Eighth Schedule language option", kca="KCA-03",
         reqs=["REQ-ACT-S5"], status="NOT_STARTED", priority="LOW", pct=0, phase="EIGHTEEN_MONTH",
         owner="Application Owners", notes=""),

    dict(cid="CTL-CM-01", name="Centralised Consent Registry", kca="KCA-04",
         reqs=["REQ-ACT-S6-CORE"], status="IMPLEMENTED", priority="CRITICAL", pct=100, phase="EIGHTEEN_MONTH",
         owner="Consent Platform Team", notes="Platform built. No verified evidence logged in this tracker yet."),
    dict(cid="CTL-CM-02", name="Consent Recording API", kca="KCA-04",
         reqs=["REQ-ACT-S6-10"], status="IMPLEMENTED", priority="CRITICAL", pct=100, phase="EIGHTEEN_MONTH",
         owner="Consent Platform Team", notes="API built; production integration/testing tracked separately under CTL-CM-05."),
    dict(cid="CTL-CM-03", name="Purpose-Based Consent Verification API", kca="KCA-04",
         reqs=["REQ-ACT-S6-CORE"], status="IMPLEMENTED", priority="HIGH", pct=100, phase="EIGHTEEN_MONTH",
         owner="Consent Platform Team", notes=""),
    dict(cid="CTL-CM-04", name="Consent History & Audit Trail", kca="KCA-04",
         reqs=["REQ-ACT-S6-10"], status="IMPLEMENTED", priority="HIGH", pct=100, phase="EIGHTEEN_MONTH",
         owner="Consent Platform Team", notes=""),
    dict(cid="CTL-CM-05", name="Production rollout and application integration of the Consent Registry", kca="KCA-04",
         reqs=["REQ-ACT-S6-CORE", "REQ-ACT-S6-CM-ACCESS"], status="IN_PROGRESS", priority="CRITICAL", pct=15, phase="EIGHTEEN_MONTH",
         owner="Consent Platform Team", notes="Covers API testing, mechanism review and mapping actions - see Action Tracker."),
    dict(cid="CTL-CM-06", name="Determine statutory Consent Manager status and registration need", kca="KCA-04",
         reqs=["REQ-ACT-S6-9", "REQ-ACT-S27-1D", "REQ-RULES-R4"], status="NOT_STARTED", priority="HIGH", pct=0, phase="TWELVE_MONTH",
         applicability="TO_BE_DETERMINED", owner="Legal & Compliance",
         notes="Internal Consent Registry does not by itself make the organisation a statutory Consent Manager - see requirement notes."),

    dict(cid="CTL-PL-01", name="Map each processing activity to a specific purpose and lawful ground", kca="KCA-05",
         reqs=["REQ-ACT-S4", "REQ-ACT-S7"], status="NOT_STARTED", priority="HIGH", pct=0, phase="EIGHTEEN_MONTH",
         owner="Application Owners", notes=""),
    dict(cid="CTL-PL-02", name="Review data collection forms for field-level minimisation", kca="KCA-05",
         reqs=["REQ-ACT-S4"], status="NOT_STARTED", priority="MEDIUM", pct=0, phase="EIGHTEEN_MONTH",
         owner="Application Owners", notes=""),

    dict(cid="CTL-DPR-01", name="Define access / correction / erasure request workflow", kca="KCA-06",
         reqs=["REQ-ACT-S11", "REQ-ACT-S12"], status="NOT_STARTED", priority="HIGH", pct=0, phase="EIGHTEEN_MONTH",
         owner="DPO / Compliance Lead", notes=""),
    dict(cid="CTL-DPR-02", name="Define grievance redressal workflow with a bounded response SLA", kca="KCA-06",
         reqs=["REQ-ACT-S13", "REQ-RULES-R14"], status="NOT_STARTED", priority="CRITICAL", pct=0, phase="EIGHTEEN_MONTH",
         owner="DPO / Compliance Lead", notes="Rule 14(3) caps the published SLA at 90 days."),
    dict(cid="CTL-DPR-03", name="Define nomination workflow (death / incapacity)", kca="KCA-06",
         reqs=["REQ-ACT-S14"], status="NOT_STARTED", priority="LOW", pct=0, phase="EIGHTEEN_MONTH",
         owner="DPO / Compliance Lead", notes=""),

    dict(cid="CTL-RET-01", name="Define retention periods and deletion triggers per data category/application", kca="KCA-07",
         reqs=["REQ-ACT-S8-RET"], status="NOT_STARTED", priority="HIGH", pct=0, phase="EIGHTEEN_MONTH",
         owner="Application Owners", notes=""),
    dict(cid="CTL-RET-02", name="Assess applicability of Third Schedule fixed retention/inactivity periods", kca="KCA-07",
         reqs=["REQ-RULES-R8"], status="NOT_STARTED", priority="MEDIUM", pct=0, phase="EIGHTEEN_MONTH",
         applicability="TO_BE_DETERMINED", owner="Legal & Compliance", notes=""),

    dict(cid="CTL-SEC-01", name="Map existing security controls to Rule 6 minimum safeguards", kca="KCA-08",
         reqs=["REQ-ACT-S8-5", "REQ-RULES-R6"], status="IN_PROGRESS", priority="CRITICAL", pct=25, phase="EIGHTEEN_MONTH",
         owner="Security Team", notes=""),
    dict(cid="CTL-SEC-02", name="Conduct VAPT on in-scope applications and track remediation", kca="KCA-08",
         reqs=["REQ-RULES-R6"], status="NOT_STARTED", priority="HIGH", pct=0, phase="EIGHTEEN_MONTH",
         owner="Security Team", notes=""),
    dict(cid="CTL-SEC-03", name="Retain access and security logs for at least one year", kca="KCA-08",
         reqs=["REQ-RULES-R6"], status="NOT_STARTED", priority="MEDIUM", pct=0, phase="EIGHTEEN_MONTH",
         owner="Security Team", notes="Rule 6(1)(e)."),

    dict(cid="CTL-PDB-01", name="Define breach detection, escalation and notification workflow", kca="KCA-09",
         reqs=["REQ-ACT-S8-6", "REQ-RULES-R7"], status="NOT_STARTED", priority="CRITICAL", pct=0, phase="EIGHTEEN_MONTH",
         owner="Security Team", notes="Rule 7(2)(b): detailed report to Board due within 72 hours of awareness."),
    dict(cid="CTL-PDB-02", name="Test the incident response / breach notification workflow", kca="KCA-09",
         reqs=["REQ-RULES-R7"], status="NOT_STARTED", priority="HIGH", pct=0, phase="EIGHTEEN_MONTH",
         owner="Security Team", notes=""),

    dict(cid="CTL-CHD-01", name="Determine whether any in-scope application processes children's personal data", kca="KCA-10",
         reqs=["REQ-ACT-S9"], status="NOT_STARTED", priority="CRITICAL", pct=0, phase="EIGHTEEN_MONTH",
         applicability="TO_BE_DETERMINED", owner="Legal & Compliance",
         notes="High priority given the education-sector context of known applications."),
    dict(cid="CTL-CHD-02", name="Implement verifiable parental/guardian consent mechanism, if applicable", kca="KCA-10",
         reqs=["REQ-RULES-R10", "REQ-RULES-R11"], status="NOT_STARTED", priority="HIGH", pct=0, phase="EIGHTEEN_MONTH",
         applicability="TO_BE_DETERMINED", owner="Application Owners", notes=""),

    dict(cid="CTL-VEN-01", name="Inventory Data Processors/vendors with personal data access and review contracts", kca="KCA-11",
         reqs=["REQ-ACT-S8-2"], status="NOT_STARTED", priority="HIGH", pct=0, phase="EIGHTEEN_MONTH",
         owner="Legal & Compliance", notes=""),
    dict(cid="CTL-VEN-02", name="Assess cross-border data transfer exposure and applicable restrictions", kca="KCA-11",
         reqs=["REQ-ACT-S16", "REQ-RULES-R15"], status="NOT_STARTED", priority="MEDIUM", pct=0, phase="EIGHTEEN_MONTH",
         applicability="TO_BE_DETERMINED", owner="Legal & Compliance", notes=""),

    dict(cid="CTL-AUD-01", name="Establish DPDP control register, ownership model and evidence repository", kca="KCA-12",
         reqs=["REQ-INT-AUDIT-01"], status="IN_PROGRESS", priority="CRITICAL", pct=35, phase="ONGOING",
         owner="DPO / Compliance Lead", notes="This application is that register/repository."),
    dict(cid="CTL-AUD-02", name="Conduct baseline gap assessment across all 12 internal KCAs", kca="KCA-12",
         reqs=["REQ-INT-AUDIT-01"], status="NOT_STARTED", priority="HIGH", pct=0, phase="ONGOING",
         owner="DPO / Compliance Lead", notes=""),
    dict(cid="CTL-AUD-03", name="Assess Significant Data Fiduciary status and resulting DPIA/audit obligations", kca="KCA-12",
         reqs=["REQ-ACT-S10-AUDIT", "REQ-RULES-R13"], status="NOT_STARTED", priority="MEDIUM", pct=0, phase="EIGHTEEN_MONTH",
         applicability="TO_BE_DETERMINED", owner="Legal & Compliance", notes=""),
]

# ---------------------------------------------------------------------------
# 4. Actions
# ---------------------------------------------------------------------------
ACTIONS = [
    # Consent Management - concrete rollout/testing actions (spec section 5)
    dict(aid="ACT-CM-001", name="Test Consent Recording API in DigiVarsity Pre-Production", control="CTL-CM-05", kca="KCA-04", app="DigiVarsity Pre-Production", priority="CRITICAL"),
    dict(aid="ACT-CM-002", name="Test Consent Verification API in DigiVarsity Pre-Production", control="CTL-CM-05", kca="KCA-04", app="DigiVarsity Pre-Production", priority="CRITICAL"),
    dict(aid="ACT-CM-003", name="Test Consent Recording API in CDMS", control="CTL-CM-05", kca="KCA-04", app="CDMS", priority="CRITICAL"),
    dict(aid="ACT-CM-004", name="Test Consent Verification API in CDMS", control="CTL-CM-05", kca="KCA-04", app="CDMS", priority="CRITICAL"),
    dict(aid="ACT-CM-005", name="Validate purpose mapping between application consent captures and the registry", control="CTL-CM-05", kca="KCA-04", priority="HIGH"),
    dict(aid="ACT-CM-006", name="Validate consent history records for accuracy and completeness", control="CTL-CM-05", kca="KCA-04", priority="HIGH"),
    dict(aid="ACT-CM-007", name="Validate audit trail records for consent actions", control="CTL-CM-05", kca="KCA-04", priority="HIGH"),
    dict(aid="ACT-CM-008", name="Document API test results for DigiVarsity Pre-Production and CDMS", control="CTL-CM-05", kca="KCA-04", priority="MEDIUM"),
    dict(aid="ACT-CM-009", name="Review current consent mechanisms on application signup pages", control="CTL-CM-05", kca="KCA-04", priority="MEDIUM"),
    dict(aid="ACT-CM-010", name="Review Privacy Policy consent/notice flows", control="CTL-CM-05", kca="KCA-04", priority="MEDIUM"),
    dict(aid="ACT-CM-011", name="Review Terms & Conditions consent flows", control="CTL-CM-05", kca="KCA-04", priority="MEDIUM"),
    dict(aid="ACT-CM-012", name="Identify which consent/notice is being collected for which purpose", control="CTL-CM-05", kca="KCA-04", priority="HIGH"),
    dict(aid="ACT-CM-013", name="Map existing consent mechanisms to the central Consent Registry", control="CTL-CM-05", kca="KCA-04", priority="HIGH"),
    dict(aid="ACT-CM-014", name="Make the Consent Registry production-ready", control="CTL-CM-05", kca="KCA-04", priority="CRITICAL"),
    dict(aid="ACT-CM-015", name="Integrate the Consent Registry into DigiVarsity Pre-Production and CDMS", control="CTL-CM-05", kca="KCA-04", priority="CRITICAL"),
    dict(aid="ACT-CM-016", name="Standardise consent implementation across applications", control="CTL-CM-05", kca="KCA-04", priority="MEDIUM"),
    dict(aid="ACT-CM-017", name="Establish central monitoring of consent capture and verification", control="CTL-CM-05", kca="KCA-04", priority="MEDIUM"),
    dict(aid="ACT-CM-018", name="Obtain legal opinion on whether the Consent Registry constitutes a statutory Consent Manager under Section 6(9)", control="CTL-CM-06", kca="KCA-04", priority="HIGH"),

    # Governance
    dict(aid="ACT-GOV-001", name="Draft and circulate the internal DPDP control register for owner sign-off", control="CTL-GOV-01", kca="KCA-01", priority="CRITICAL"),
    dict(aid="ACT-GOV-002", name="Assign named owners to each of the 12 KCAs", control="CTL-GOV-01", kca="KCA-01", priority="HIGH"),
    dict(aid="ACT-GOV-003", name="Publish DPO/grievance-contact block on the corporate website footer", control="CTL-GOV-02", kca="KCA-01", priority="HIGH"),
    dict(aid="ACT-GOV-004", name="Confirm Significant Data Fiduciary status with legal counsel", control="CTL-GOV-03", kca="KCA-01", priority="MEDIUM"),

    # Data Inventory
    dict(aid="ACT-DI-001", name="List all applications and databases processing personal data beyond DigiVarsity and CDMS", control="CTL-DI-01", kca="KCA-02", priority="CRITICAL"),
    dict(aid="ACT-DI-002", name="Catalogue personal data categories processed by DigiVarsity Pre-Production", control="CTL-DI-02", kca="KCA-02", app="DigiVarsity Pre-Production", priority="HIGH"),
    dict(aid="ACT-DI-003", name="Catalogue personal data categories processed by CDMS", control="CTL-DI-02", kca="KCA-02", app="CDMS", priority="HIGH"),
    dict(aid="ACT-DI-004", name="Diagram data flows between identified applications and third parties", control="CTL-DI-03", kca="KCA-02", priority="MEDIUM"),

    # Notice
    dict(aid="ACT-NT-001", name="Redline Privacy Policy against Rule 3 minimum notice content", control="CTL-NT-01", kca="KCA-03", priority="HIGH"),
    dict(aid="ACT-NT-002", name="Redline Terms & Conditions consent/notice clauses", control="CTL-NT-02", kca="KCA-03", priority="MEDIUM"),
    dict(aid="ACT-NT-003", name="Assess feasibility of an Eighth Schedule regional-language notice option", control="CTL-NT-03", kca="KCA-03", priority="LOW"),

    # Purpose limitation
    dict(aid="ACT-PL-001", name="Build a processing-activity-to-purpose mapping sheet for each application", control="CTL-PL-01", kca="KCA-05", priority="HIGH"),
    dict(aid="ACT-PL-002", name="Review DigiVarsity/CDMS signup forms for unnecessary optional fields", control="CTL-PL-02", kca="KCA-05", priority="MEDIUM"),

    # Data Principal Rights
    dict(aid="ACT-DPR-001", name="Draft access/correction/erasure request intake process", control="CTL-DPR-01", kca="KCA-06", priority="HIGH"),
    dict(aid="ACT-DPR-002", name="Define grievance redressal SLA tracking and escalation path", control="CTL-DPR-02", kca="KCA-06", priority="CRITICAL"),
    dict(aid="ACT-DPR-003", name="Design the nomination capture flow", control="CTL-DPR-03", kca="KCA-06", priority="LOW"),

    # Retention
    dict(aid="ACT-RET-001", name="Define retention periods per data category for DigiVarsity and CDMS", control="CTL-RET-01", kca="KCA-07", priority="HIGH"),
    dict(aid="ACT-RET-002", name="Check whether any application meets a Third Schedule notified-entity threshold", control="CTL-RET-02", kca="KCA-07", priority="MEDIUM"),

    # Security
    dict(aid="ACT-SEC-001", name="Review privileged database access on DigiVarsity Pre-Production and CDMS", control="CTL-SEC-01", kca="KCA-08", priority="CRITICAL"),
    dict(aid="ACT-SEC-002", name="Review encryption-at-rest and in-transit configuration for personal data stores", control="CTL-SEC-01", kca="KCA-08", priority="HIGH"),
    dict(aid="ACT-SEC-003", name="Schedule VAPT for DigiVarsity Pre-Production and CDMS", control="CTL-SEC-02", kca="KCA-08", priority="HIGH"),
    dict(aid="ACT-SEC-004", name="Confirm access/security log retention meets the one-year minimum", control="CTL-SEC-03", kca="KCA-08", priority="MEDIUM"),

    # Breach management
    dict(aid="ACT-PDB-001", name="Draft the breach detection-to-Board-notification runbook (72-hour timeline)", control="CTL-PDB-01", kca="KCA-09", priority="CRITICAL"),
    dict(aid="ACT-PDB-002", name="Run a tabletop breach-notification exercise", control="CTL-PDB-02", kca="KCA-09", priority="HIGH"),

    # Children & special cases
    dict(aid="ACT-CHD-001", name="Confirm with product/legal whether DigiVarsity serves users under 18", control="CTL-CHD-01", kca="KCA-10", priority="CRITICAL"),
    dict(aid="ACT-CHD-002", name="Scope a verifiable-parental-consent mechanism pending the applicability determination", control="CTL-CHD-02", kca="KCA-10", priority="HIGH"),

    # Vendors / transfers
    dict(aid="ACT-VEN-001", name="Compile a list of all Data Processors/vendors with access to personal data", control="CTL-VEN-01", kca="KCA-11", priority="HIGH"),
    dict(aid="ACT-VEN-002", name="Confirm whether any vendor hosts or transfers personal data outside India", control="CTL-VEN-02", kca="KCA-11", priority="MEDIUM"),

    # Assessment & audit
    dict(aid="ACT-AUD-001", name="Populate this control register with baseline status for every KCA", control="CTL-AUD-01", kca="KCA-12", priority="CRITICAL"),
    dict(aid="ACT-AUD-002", name="Set up the evidence repository structure (folder/link conventions per control)", control="CTL-AUD-01", kca="KCA-12", priority="HIGH"),
    dict(aid="ACT-AUD-003", name="Run the first cross-KCA gap assessment workshop", control="CTL-AUD-02", kca="KCA-12", priority="HIGH"),
    dict(aid="ACT-AUD-004", name="Confirm Significant Data Fiduciary status to close out DPIA/audit applicability", control="CTL-AUD-03", kca="KCA-12", priority="MEDIUM"),
]


def _get_or_none(db, model, **kwargs):
    return db.scalars(select(model).filter_by(**kwargs)).first()


def is_seeded(db: Session) -> bool:
    return db.scalar(select(models.KCA).limit(1)) is not None


def seed(db: Session, force: bool = False):
    """Populate the database with the reference/legal/demo dataset.

    Idempotent unless force=True (caller is responsible for wiping tables
    first when force-reseeding via the Settings 'Reset Demo Data' action).
    """
    if is_seeded(db) and not force:
        return

    kca_by_code: dict[str, models.KCA] = {}
    for code, name, desc, order in KCAS:
        kca = models.KCA(code=code, name=name, description=desc, sort_order=order)
        db.add(kca)
        kca_by_code[code] = kca
    db.flush()

    owner_by_name: dict[str, models.Owner] = {}
    for name, role, email in OWNERS:
        owner = models.Owner(name=name, role=role, email=email)
        db.add(owner)
        owner_by_name[name] = owner
    db.flush()

    app_by_name: dict[str, models.Application] = {}
    for a in APPLICATIONS:
        application = models.Application(**a)
        db.add(application)
        app_by_name[a["name"]] = application
    db.flush()

    req_by_code: dict[str, models.LegalRequirement] = {}
    for r in REQUIREMENTS:
        eff = date.fromisoformat(r["effective_date"]) if r.get("effective_date") else None
        req = models.LegalRequirement(
            requirement_id=r["code"],
            title=r["title"],
            description=r["description"],
            source_type=r["source_type"],
            section_reference=r["section_ref"],
            source_url=r["source_url"],
            kca_id=kca_by_code[r["kca"]].id,
            effective_date=eff,
            deadline_phase=r["deadline_phase"],
            applicability=r["applicability"],
            applicability_reason=r.get("reason", ""),
        )
        db.add(req)
        req_by_code[r["code"]] = req
    db.flush()

    control_by_id: dict[str, models.Control] = {}
    for c in CONTROLS:
        owner = owner_by_name.get(c.get("owner", "Unassigned"), owner_by_name["Unassigned"])
        control = models.Control(
            control_id=c["cid"],
            name=c["name"],
            kca_id=kca_by_code[c["kca"]].id,
            applicability=c.get("applicability", "APPLICABLE"),
            owner_id=owner.id,
            status=c["status"],
            priority=c["priority"],
            target_date=None,
            deadline_phase=c["phase"],
            completion_pct=c["pct"],
            evidence_required=True,
            notes=c.get("notes", ""),
            requirements=[req_by_code[code] for code in c["reqs"]],
        )
        db.add(control)
        control_by_id[c["cid"]] = control
    db.flush()

    for a in ACTIONS:
        owner = owner_by_name.get(a.get("owner", "Unassigned"), owner_by_name["Unassigned"])
        control = control_by_id.get(a.get("control"))
        application = app_by_name.get(a.get("app")) if a.get("app") else None
        action = models.Action(
            action_id=a["aid"],
            name=a["name"],
            control_id=control.id if control else None,
            kca_id=kca_by_code[a["kca"]].id,
            application_id=application.id if application else None,
            owner_id=owner.id,
            priority=a["priority"],
            status="NOT_STARTED",
            completion_pct=0,
        )
        db.add(action)

    db.commit()


def is_questionnaire_seeded(db: Session) -> bool:
    return db.scalar(select(models.QuestionnaireQuestion).limit(1)) is not None


def seed_questionnaire(db: Session, force: bool = False):
    """Populate the stakeholder questionnaire question bank.

    Separate from seed()/is_seeded() because the KCA/Owner/Application/
    Control/Action tables are typically already seeded (and possibly
    hand-edited) by the time this questionnaire feature is added - this
    must not be gated behind the same "is anything seeded yet" check.
    """
    if is_questionnaire_seeded(db) and not force:
        return
    if force:
        db.query(models.QuestionnaireResponse).delete()
        db.query(models.QuestionnaireQuestion).delete()

    kca_by_code = {k.code: k for k in db.scalars(select(models.KCA)).all()}
    for q in questionnaire_seed_data.QUESTIONS:
        kca = kca_by_code.get(q["kca_code"]) if q["kca_code"] else None
        db.add(models.QuestionnaireQuestion(
            question_id=q["question_id"],
            section=q["section"],
            kca_id=kca.id if kca else None,
            topic=q["topic"],
            question_text=q["question_text"],
            why=q["why"],
            answer_type=q["answer_type"],
            options=q["options"],
            evidence_hint=q["evidence_hint"],
            who_should_answer=q["who_should_answer"],
            grc_fields=q["grc_fields"],
            followup=q["followup"],
            notes=q["notes"],
            repeatable=bool(q["repeatable"]),
            sort_order=q["sort_order"],
        ))
    db.commit()


def wipe_all(db: Session):
    """Delete all data (used by 'Reset Demo Data'). Order matters for FKs."""
    for model in (models.QuestionnaireResponse, models.QuestionnaireQuestion,
                  models.Evidence, models.Action, models.Control, models.LegalRequirement,
                  models.Application, models.Owner, models.KCA):
        db.query(model).delete()
    db.commit()
