import type { ReactNode } from 'react'
import { badgeClass, STATUS_STYLE, APPLICABILITY_STYLE, PRIORITY_STYLE, VERIFICATION_STYLE, CONFIDENCE_STYLE, label } from '../lib/format'

export function Badge({ value, map }: { value: string | null | undefined; map: Record<string, string> }) {
  return <span className={badgeClass(map, value)}>{label(value)}</span>
}

export const StatusBadge = ({ value }: { value: string }) => <Badge value={value} map={STATUS_STYLE} />
export const ApplicabilityBadge = ({ value }: { value: string }) => <Badge value={value} map={APPLICABILITY_STYLE} />
export const PriorityBadge = ({ value }: { value: string }) => <Badge value={value} map={PRIORITY_STYLE} />
export const VerificationBadge = ({ value }: { value: string }) => <Badge value={value} map={VERIFICATION_STYLE} />
export const ConfidenceBadge = ({ value }: { value: string }) => <Badge value={value} map={CONFIDENCE_STYLE} />

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-stone-200 bg-white ${className}`}>{children}</div>
}

export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function KpiCard({ label: l, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: 'orange' | 'red' | 'default' }) {
  const accentClass = accent === 'orange' ? 'text-orange-600' : accent === 'red' ? 'text-red-600' : 'text-stone-900'
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-stone-500">{l}</div>
      <div className={`mt-1 text-2xl font-semibold ${accentClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-400">{sub}</div>}
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center text-stone-400">
      <div className="text-sm font-medium text-stone-500">{title}</div>
      {body && <div className="max-w-sm text-xs">{body}</div>}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{children}</div>
}

export function Select({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-orange-500 focus:outline-none"
    >
      <option value="">{placeholder ?? 'All'}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export function Disclaimer() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Internal compliance assessment framework. This tool does not constitute legal advice.
      Statutory applicability should be validated with the organisation's legal/compliance function.
    </div>
  )
}

export function SourceLink({ url, children }: { url: string; children: ReactNode }) {
  if (!url) return <>{children}</>
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sky-700 underline decoration-dotted hover:text-sky-900">
      {children}
    </a>
  )
}

export function Button({ children, onClick, variant = 'default', type = 'button', className = '' }: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
  className?: string
}) {
  const styles: Record<string, string> = {
    default: 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50',
    primary: 'bg-orange-600 border border-orange-600 text-white hover:bg-orange-700',
    danger: 'bg-white border border-red-300 text-red-700 hover:bg-red-50',
    ghost: 'border border-transparent text-stone-500 hover:bg-stone-100',
  }
  return (
    <button type={type} onClick={onClick} className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${styles[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/40 p-4 pt-12">
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-lg bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">✕</button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label: l, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-stone-600">{l}</span>
      {children}
    </label>
  )
}

export const inputClass = 'w-full rounded border border-stone-300 px-2 py-1.5 text-xs focus:border-orange-500 focus:outline-none'
