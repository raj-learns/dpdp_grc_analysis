export interface Kca {
  id: number
  code: string
  name: string
  description: string
  sort_order: number
}

export interface Owner {
  id: number
  name: string
  role: string
  email: string
}

export interface Application {
  id: number
  name: string
  environment: string
  business_owner: string
  technical_owner: string
  personal_data_processed: string
  processing_purposes: string
  consent_integration_status: string
  dpdp_assessment_status: string
  notes: string
  created_at: string
  updated_at: string
}

export interface LegalRequirement {
  id: number
  requirement_id: string
  title: string
  description: string
  source_type: string
  section_reference: string
  source_url: string
  kca_id: number
  kca?: Kca
  effective_date: string | null
  deadline_phase: string
  applicability: string
  applicability_reason: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Control {
  id: number
  control_id: string
  name: string
  description: string
  kca_id: number
  kca?: Kca
  applicability: string
  owner_id: number | null
  owner?: Owner
  status: string
  priority: string
  effective_date: string | null
  target_date: string | null
  deadline_phase: string
  completion_pct: number
  evidence_required: boolean
  notes: string
  requirements: LegalRequirement[]
  created_at: string
  updated_at: string
}

export interface Action {
  id: number
  action_id: string
  name: string
  description: string
  control_id: number | null
  kca_id: number
  kca?: Kca
  application_id: number | null
  application?: Application
  owner_id: number | null
  owner?: Owner
  owner_person: string
  priority: string
  start_date: string | null
  target_date: string | null
  status: string
  completion_pct: number
  notes: string
  blocker: string
  dependency: string
  evidence: EvidenceSummary[]
  created_at: string
  updated_at: string
}

export interface EvidenceSummary {
  id: number
  evidence_id: string
  name: string
  evidence_type: string
  verification_status: string
  file_url: string
}

export interface Evidence {
  id: number
  evidence_id: string
  name: string
  evidence_type: string
  requirement_id: number | null
  application_id: number | null
  application?: Application
  date: string | null
  owner_id: number | null
  owner?: Owner
  description: string
  file_url: string
  verification_status: string
  notes: string
  controls: Control[]
  actions: Action[]
  created_at: string
}

export interface ControlSummary {
  total_controls: number
  applicable_controls: number
  implemented: number
  in_progress: number
  not_started: number
  gap_identified: number
  not_applicable: number
  to_be_determined: number
  compliance_pct: number | null
}

export interface ActionSummary {
  total_actions: number
  completed: number
  in_progress: number
  blocked: number
  not_started: number
  overdue: number
  completion_pct: number | null
}

export interface KcaScoreRow extends ControlSummary {
  kca_id: number
  kca_code: string
  kca_name: string
  critical_open_actions: number
}

export interface OverallSummary extends ControlSummary {
  action_completion_pct: number | null
  actions_completed: number
  actions_total: number
  open_gaps: number
  critical_actions: number
  overdue_actions: number
  november_2026_scope_pct: number | null
  may_2027_scope_pct: number | null
}

export interface Options {
  source_types: string[]
  deadline_phases: string[]
  applicability: string[]
  control_statuses: string[]
  control_complete_statuses: string[]
  action_statuses: string[]
  priorities: string[]
  evidence_types: string[]
  verification_statuses: string[]
  consent_integration_statuses: string[]
  application_assessment_statuses: string[]
  environments: string[]
  questionnaire_sections: string[]
  response_confidence: string[]
  gazette_date: string
  twelve_month_date: string
  eighteen_month_date: string
}

export interface QuestionnaireQuestion {
  id: number
  question_id: string
  section: string
  kca_id: number | null
  kca?: Kca
  topic: string
  question_text: string
  why: string
  answer_type: string
  options: string
  evidence_hint: string
  who_should_answer: string
  grc_fields: string
  followup: string
  notes: string
  repeatable: boolean
  sort_order: number
}

export interface QuestionnaireResponse {
  id: number
  question_id: number
  question?: QuestionnaireQuestion
  instance_label: string
  respondent_name: string
  respondent_department: string
  answer_text: string
  evidence_note: string
  confidence: string
  answered_date: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface QuestionnaireProgressRow {
  section: string
  kca_id: number | null
  total: number
  answered: number
}

export interface Suggestion {
  target_key: string
  entity_type: string
  entity_code: string | null
  field_name: string
  current_value: string | null
  proposed_value: string
  source_clause: string
  already_applied: boolean
  already_applied_value: string | null
  already_applied_at: string | null
  requires_extra_input: boolean
}

export interface ApplySuggestionResult {
  target_key: string
  success: boolean
  message: string
  entity_type: string
  entity_id: number | null
}

export interface NewsItem {
  title: string
  link: string
  source: string | null
  published_at: string | null
}

export interface NewsFeed {
  items: NewsItem[]
  fetched_at: string | null
  error: string | null
  disclaimer: string
}

export interface CurrentUser {
  id: number
  username: string
  is_active: boolean
  created_at: string
}
