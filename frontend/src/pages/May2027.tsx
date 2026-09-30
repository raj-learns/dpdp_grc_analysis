import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMay2027Readiness } from '../lib/api'
import { Card, CardHeader, KpiCard, ApplicabilityBadge, ProgressBar, Disclaimer, EmptyState } from '../components/ui'
import { fmtDate, pct } from '../lib/format'

export default function May2027() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { getMay2027Readiness().then(setData) }, [])
  if (!data) return <div className="p-8 text-sm text-stone-400">Loading…</div>
  const s = data.summary

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">May 2027 Readiness</h1>
        <p className="text-xs text-stone-500">18-month statutory phase ({fmtDate(data.statutory_date)}) — the substantive Data Fiduciary obligations under the Act and associated Rules.</p>
      </div>
      <Disclaimer />

      <div className="rounded-lg border border-stone-300 bg-stone-50 p-4 text-sm text-stone-700">
        Per the commencement notification, Sections 3-5, 6(1)-(8) &amp; (10), 7-10, 11-17, 27 (except (1)(d)), 28-34, 36, 37
        and Section 44(2) of the Act — plus DPDP Rules 3, 5-16, 22 and 23 — come into force 18 months from the gazette date.
        This is where most substantive Data Fiduciary obligations (notice, consent, rights, retention, security, breach
        management, processors) actually land.
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Applicable Controls" value={s.applicable_controls} />
        <KpiCard label="Completed" value={s.implemented} />
        <KpiCard label="In Progress" value={s.in_progress} />
        <KpiCard label="May 2027 Readiness" value={pct(s.compliance_pct)} accent="orange" />
      </div>

      <Card>
        <CardHeader title="Applicable Requirements by KCA" subtitle="Grouped by internal reporting domain" />
        {data.kca_groups.length === 0 ? <EmptyState title="No 18-month phase requirements recorded." /> : (
          <div className="divide-y divide-stone-100">
            {data.kca_groups.map((g: any) => (
              <div key={g.kca_code} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-stone-800">{g.kca_code} — {g.kca_name}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-24"><ProgressBar pct={g.summary.compliance_pct ?? 0} /></div>
                    <span className="text-stone-600">{pct(g.summary.compliance_pct)}</span>
                    <span className="text-stone-400">({g.summary.implemented}/{g.summary.applicable_controls})</span>
                  </div>
                </div>
                <ul className="space-y-1">
                  {g.requirements.map((r: any) => (
                    <li key={r.requirement_id} className="flex items-center justify-between rounded border border-stone-100 px-3 py-1.5 text-xs">
                      <Link to="/requirements" className="text-stone-600 hover:text-orange-700">{r.title} <span className="text-stone-400">({r.section_reference})</span></Link>
                      <span className="flex items-center gap-2">
                        <ApplicabilityBadge value={r.applicability} />
                        <span className="text-stone-500">{r.control_ids.join(', ') || 'No control yet'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Conditional / To Be Determined" subtitle="Requires legal/compliance validation (e.g. Significant Data Fiduciary status, children's data, cross-border transfer)" />
        {data.to_be_determined_requirements.length === 0 ? <EmptyState title="Nothing pending determination." /> : (
          <div className="divide-y divide-stone-100">
            {data.to_be_determined_requirements.map((r: any) => (
              <div key={r.requirement_id} className="p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-800">{r.requirement_id} — {r.title}</span>
                  <ApplicabilityBadge value={r.applicability} />
                </div>
                <p className="mt-1 text-stone-500">{r.applicability_reason}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
