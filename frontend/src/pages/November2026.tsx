import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNovemberReadiness } from '../lib/api'
import { Card, CardHeader, KpiCard, StatusBadge, ApplicabilityBadge, Disclaimer, EmptyState } from '../components/ui'
import { fmtDate, pct } from '../lib/format'

export default function November2026() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { getNovemberReadiness().then(setData) }, [])
  if (!data) return <div className="p-8 text-sm text-stone-400">Loading…</div>

  const s = data.summary
  const ri = data.internal_readiness_summary

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">November 2026 — What Actually Becomes Applicable?</h1>
        <p className="text-xs text-stone-500">12-month statutory commencement phase ({fmtDate(data.statutory_date)}) vs internal readiness actions.</p>
      </div>
      <Disclaimer />

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>November 2026 is NOT the blanket DPDP compliance deadline.</strong> Per the official commencement notification
        (G.S.R. 843(E), 13 Nov 2025), only Section 6(9), Section 27(1)(d) of the Act and Rule 4 of the DPDP Rules 2025 —
        all concerning registration/oversight of <em>Consent Managers</em> — commence 12 months after the gazette date.
        The substantive Data Fiduciary obligations commence 18 months out, in May 2027 (see the May 2027 page).
      </div>

      <ApplicabilityCheck requirements={[...data.applicable_requirements, ...data.to_be_determined_requirements]} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Applicable Nov Controls" value={s.applicable_controls} />
        <KpiCard label="Completed" value={s.implemented} />
        <KpiCard label="In Progress" value={s.in_progress} />
        <KpiCard label="Not Started" value={s.not_started} />
        <KpiCard label="November Readiness" value={pct(s.compliance_pct)} accent="orange" />
      </div>
      {s.applicable_controls === 0 && (
        <p className="text-xs text-stone-500">
          No controls are currently marked <strong>Applicable</strong> for the 12-month phase — every statutory item in this
          phase depends on first resolving the Consent Manager applicability question below. This is expected, not a data gap.
        </p>
      )}

      <Card>
        <CardHeader title="Section A — Statutory November Scope" subtitle="Only requirements the Act/Rules actually place in the 12-month phase" />
        {data.applicable_requirements.length === 0 && data.to_be_determined_requirements.length === 0 ? (
          <EmptyState title="No 12-month phase requirements recorded." />
        ) : (
          <RequirementTable rows={[...data.applicable_requirements, ...data.to_be_determined_requirements]} />
        )}
      </Card>

      <Card>
        <CardHeader title="Section B — Internal Readiness Actions Targeted Before November" subtitle="Operational actions the team is targeting ahead of the date — not themselves statutory deadlines" />
        {data.internal_readiness_actions.length === 0 ? (
          <EmptyState title="No actions currently have a target date on or before 13 Nov 2026." body="Set a target date on an action to have it appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-left font-medium">KCA</th>
                  <th className="px-3 py-2 text-left font-medium">Application</th>
                  <th className="px-3 py-2 text-left font-medium">Owner</th>
                  <th className="px-3 py-2 text-left font-medium">Target</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.internal_readiness_actions.map((a: any) => (
                  <tr key={a.action_id} className="border-t border-stone-100">
                    <td className="px-3 py-2 text-stone-700">{a.name}</td>
                    <td className="px-3 py-2 text-stone-500">{a.kca_code}</td>
                    <td className="px-3 py-2 text-stone-500">{a.application ?? '—'}</td>
                    <td className="px-3 py-2 text-stone-500">{a.owner ?? 'Unassigned'}</td>
                    <td className="px-3 py-2 text-stone-500">{fmtDate(a.target_date)}</td>
                    <td className="px-3 py-2"><StatusBadge value={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-stone-100 px-4 py-3 text-xs text-stone-500">
          Internal readiness actions completed: <strong>{ri.completed} / {ri.total_actions}</strong> ({pct(ri.completion_pct)}) — a separate number from statutory compliance above.
        </div>
      </Card>

      <Card>
        <CardHeader title="Section C — Conditional / Applicability To Be Determined" subtitle="Flagged for legal/compliance validation before they can count toward, or be excluded from, November scope" />
        {data.to_be_determined_requirements.length === 0 ? (
          <EmptyState title="Nothing pending determination." />
        ) : (
          <div className="divide-y divide-stone-100">
            {data.to_be_determined_requirements.map((r: any) => (
              <div key={r.requirement_id} className="p-4 text-xs">
                <div className="flex items-center justify-between">
                  <Link to="/requirements" className="font-medium text-stone-800 hover:text-orange-700">{r.requirement_id} — {r.title}</Link>
                  <ApplicabilityBadge value={r.applicability} />
                </div>
                <p className="mt-1 text-stone-500">{r.applicability_reason}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="November Readiness Funnel" />
        <div className="flex flex-wrap items-center gap-2 p-4 text-xs">
          <FunnelStep label="Applicable Requirements" value={data.applicable_requirements.length} />
          <Arrow />
          <FunnelStep label="Controls" value={s.applicable_controls} />
          <Arrow />
          <FunnelStep label="Actions" value={ri.total_actions} />
          <Arrow />
          <FunnelStep label="Evidence" value={data.applicable_requirements.reduce((sum: number, r: any) => sum + r.evidence_count, 0)} />
          <Arrow />
          <FunnelStep label="Verified" value={s.implemented} highlight />
        </div>
      </Card>
    </div>
  )
}

function ApplicabilityCheck({ requirements }: { requirements: any[] }) {
  const consentManagerReqs = requirements.filter((r: any) => r.requirement_id.includes('S6-9') || r.requirement_id.includes('R4') || r.requirement_id.includes('27-1D'))
  const anyTbd = consentManagerReqs.some((r: any) => r.applicability === 'TO_BE_DETERMINED')
  const anyApplicable = consentManagerReqs.some((r: any) => r.applicability === 'APPLICABLE')
  const verdict = anyApplicable ? 'YES' : anyTbd ? 'TO BE DETERMINED' : 'NO'
  const style = verdict === 'YES' ? 'border-sky-300 bg-sky-50 text-sky-800'
    : verdict === 'NO' ? 'border-stone-300 bg-stone-50 text-stone-600'
    : 'border-violet-300 bg-violet-50 text-violet-800'

  return (
    <Card>
      <CardHeader title="Applicability Check" subtitle="Are we operating as a statutory Consent Manager?" />
      <div className={`m-4 rounded-md border p-4 text-sm ${style}`}>
        <div className="text-lg font-semibold">{verdict}</div>
        <p className="mt-2 text-xs">
          {verdict === 'TO BE DETERMINED' && (
            <>The internal Consent Registry built for the organisation is a Data-Fiduciary-side consent recording system.
            It does <strong>not</strong> automatically mean the organisation is legally operating as a "Consent Manager"
            under Section 2(g) of the Act. This has been flagged for legal/compliance validation — see Section C below.
            Until resolved, Section 6(9), Section 27(1)(d) and Rule 4 obligations are not counted as applicable organisational obligations.</>
          )}
          {verdict === 'NO' && 'Consent Manager-specific statutory requirements are not counted as organisational obligations.'}
          {verdict === 'YES' && 'Consent Manager-specific statutory requirements under Section 6(9), Section 27(1)(d) and Rule 4 apply and are counted in the November scope above.'}
        </p>
      </div>
    </Card>
  )
}

function RequirementTable({ rows }: { rows: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-stone-50 text-stone-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Requirement</th>
            <th className="px-3 py-2 text-left font-medium">Legal Reference</th>
            <th className="px-3 py-2 text-left font-medium">Applicable?</th>
            <th className="px-3 py-2 text-left font-medium">KCA</th>
            <th className="px-3 py-2 text-left font-medium">Controls</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Evidence</th>
            <th className="px-3 py-2 text-left font-medium">Completion %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.requirement_id} className="border-t border-stone-100">
              <td className="px-3 py-2 text-stone-700">{r.title}</td>
              <td className="px-3 py-2 text-stone-500">{r.section_reference}</td>
              <td className="px-3 py-2"><ApplicabilityBadge value={r.applicability} /></td>
              <td className="px-3 py-2 text-stone-500">{r.kca_code}</td>
              <td className="px-3 py-2 text-stone-500">{r.control_ids.join(', ') || '—'}</td>
              <td className="px-3 py-2 text-stone-500">
                {r.status_breakdown.applicable_controls > 0
                  ? `${r.status_breakdown.implemented}/${r.status_breakdown.applicable_controls} implemented`
                  : '—'}
              </td>
              <td className="px-3 py-2 text-stone-500">{r.evidence_count}</td>
              <td className="px-3 py-2 text-stone-700">{pct(r.compliance_pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FunnelStep({ label: l, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 text-center ${highlight ? 'border-orange-300 bg-orange-50' : 'border-stone-200 bg-stone-50'}`}>
      <div className={`text-lg font-semibold ${highlight ? 'text-orange-700' : 'text-stone-800'}`}>{value}</div>
      <div className="text-[11px] text-stone-500">{l}</div>
    </div>
  )
}
function Arrow() { return <span className="text-stone-300">→</span> }
