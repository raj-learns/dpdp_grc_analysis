export function label(value: string | null | undefined): string {
  if (!value) return '—'
  return value
    .toLowerCase()
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return `${value}%`
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const DEADLINE_PHASE_LABEL: Record<string, string> = {
  ALREADY_EFFECTIVE: 'Already Effective (13 Nov 2025)',
  TWELVE_MONTH: '12-Month Phase (13 Nov 2026)',
  EIGHTEEN_MONTH: '18-Month Phase (13 May 2027)',
  ONGOING: 'Ongoing',
  CONDITIONAL: 'Conditional',
}

export const STATUS_STYLE: Record<string, string> = {
  NOT_STARTED: 'bg-stone-100 text-stone-600 border-stone-300',
  GAP_IDENTIFIED: 'bg-red-50 text-red-700 border-red-300',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-300',
  IMPLEMENTED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  EVIDENCE_VERIFIED: 'bg-emerald-600 text-white border-emerald-700',
  NOT_APPLICABLE: 'bg-stone-50 text-stone-400 border-stone-200',
  BLOCKED: 'bg-red-100 text-red-800 border-red-400',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-stone-50 text-stone-400 border-stone-200 line-through',
}

export const APPLICABILITY_STYLE: Record<string, string> = {
  APPLICABLE: 'bg-sky-50 text-sky-700 border-sky-300',
  NOT_APPLICABLE: 'bg-stone-50 text-stone-400 border-stone-200',
  TO_BE_DETERMINED: 'bg-violet-50 text-violet-700 border-violet-300',
}

export const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white border-red-700',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-stone-100 text-stone-500 border-stone-200',
}

export const VERIFICATION_STYLE: Record<string, string> = {
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  UNVERIFIED: 'bg-stone-100 text-stone-500 border-stone-300',
  REJECTED: 'bg-red-50 text-red-700 border-red-300',
}

export const CONFIDENCE_STYLE: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  UNCERTAIN: 'bg-amber-50 text-amber-700 border-amber-200',
  NOT_APPLICABLE: 'bg-stone-50 text-stone-400 border-stone-200',
  NEEDS_FOLLOWUP: 'bg-red-50 text-red-700 border-red-300',
}

export const QUESTIONNAIRE_SECTION_LABEL: Record<string, string> = {
  ENTERPRISE: 'Enterprise Threshold Questions',
  APPLICATION: 'Application / System Inventory',
  VENDOR: 'Vendor / Processor',
  DATAFLOW: 'Data Flow / Transfer',
  CONTROL: 'Control & Implementation',
  ACTION: 'Action / Remediation',
  EVIDENCE: 'Evidence Register',
}

export function badgeClass(map: Record<string, string>, value: string | null | undefined): string {
  const base = 'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap'
  if (!value) return `${base} bg-stone-50 text-stone-400 border-stone-200`
  return `${base} ${map[value] ?? 'bg-stone-100 text-stone-600 border-stone-300'}`
}
