import { useEffect, useState } from 'react'
import { getManagementReport, exportUrl } from '../lib/api'
import { Card, CardHeader, StatusBadge, PriorityBadge, Button, ProgressBar } from '../components/ui'
import { StatusDonut, HorizontalBar, COLORS } from '../components/charts'
import { pct, fmtDate, label } from '../lib/format'

export default function Reports() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { getManagementReport().then(setData) }, [])
  if (!data) return <div className="p-8 text-sm text-stone-400">Loading…</div>
  const o = data.overall_compliance

  const kcaBar = [...data.kca_summary]
    .sort((a: any, b: any) => a.kca_code.localeCompare(b.kca_code))
    .map((k: any) => ({ name: `${k.kca_code} · ${k.kca_name}`, value: k.compliance_pct ?? 0 }))

  const statusData = [
    { name: 'Implemented / Evidence Verified', value: o.implemented, color: COLORS.implemented },
    { name: 'In Progress', value: o.in_progress, color: COLORS.inProgress },
    { name: 'Gap / Not Started', value: o.not_started, color: COLORS.gap },
    { name: 'Not Applicable', value: o.not_applicable, color: COLORS.notApplicable },
    { name: 'To Be Determined', value: o.to_be_determined, color: COLORS.tbd },
  ]

  const ab = data.action_status_breakdown
  const actionStatusData = [
    { name: 'Completed', value: ab.completed, color: COLORS.implemented },
    { name: 'In Progress', value: ab.in_progress, color: COLORS.inProgress },
    { name: 'Blocked', value: ab.blocked, color: COLORS.gap },
    { name: 'Not Started', value: ab.not_started, color: COLORS.notApplicable },
  ]

  const phaseBar = [
    { name: 'November 2026 (Consent Manager scope)', value: data.november_2026_readiness.compliance_pct ?? 0 },
    { name: 'May 2027 (substantive obligations)', value: data.may_2027_readiness.compliance_pct ?? 0 },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Management Report</h1>
          <p className="text-xs text-stone-500">A print-ready summary generated live from the control register.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={exportUrl('requirements')}><Button>Requirements CSV</Button></a>
          <a href={exportUrl('controls')}><Button>Controls CSV</Button></a>
          <a href={exportUrl('actions')}><Button>Actions CSV</Button></a>
          <a href={exportUrl('gaps')}><Button>Gaps CSV</Button></a>
          <Button variant="primary" onClick={() => window.print()}>Print / Save as PDF</Button>
        </div>
      </div>

      <div id="report" className="space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">DPDP Compliance Overview</h2>
          <p className="text-xs text-stone-500">As of {new Date(data.as_of).toLocaleString('en-IN')}</p>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{data.disclaimer}</div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Overall Compliance" value={pct(o.compliance_pct)} />
          <Stat label="Controls Completed" value={`${o.implemented} / ${o.applicable_controls}`} />
          <Stat label="Actions Completed" value={`${o.actions_completed} / ${o.actions_total}`} />
          <Stat label="Open Gaps" value={o.open_gaps} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="KCA Compliance Distribution" subtitle="Compliance % per internal domain" />
            <div className="p-3"><HorizontalBar data={kcaBar} height={360} /></div>
          </Card>
          <Card>
            <CardHeader title="Control Status Distribution" subtitle="All controls, all statuses" />
            <div className="p-3"><StatusDonut data={statusData} /></div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Action Status Distribution" subtitle="All actions across every KCA" />
            <div className="p-3"><StatusDonut data={actionStatusData} /></div>
          </Card>
          <Card>
            <CardHeader title="Phase Readiness" subtitle="Applicable-control compliance % per statutory phase" />
            <div className="p-3"><HorizontalBar data={phaseBar} height={140} /></div>
          </Card>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-stone-800">KCA Summary</h3>
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-2 py-1.5 text-left">KCA</th>
                <th className="px-2 py-1.5 text-right">Applicable</th>
                <th className="px-2 py-1.5 text-right">Implemented</th>
                <th className="px-2 py-1.5 text-right">In Progress</th>
                <th className="px-2 py-1.5 text-right">Not Started</th>
                <th className="px-2 py-1.5 text-left">Compliance %</th>
              </tr>
            </thead>
            <tbody>
              {data.kca_summary.map((k: any) => (
                <tr key={k.kca_code} className="border-t border-stone-100">
                  <td className="px-2 py-1.5">{k.kca_code} — {k.kca_name}</td>
                  <td className="px-2 py-1.5 text-right">{k.applicable_controls}</td>
                  <td className="px-2 py-1.5 text-right">{k.implemented}</td>
                  <td className="px-2 py-1.5 text-right">{k.in_progress}</td>
                  <td className="px-2 py-1.5 text-right">{k.not_started}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2"><div className="w-20"><ProgressBar pct={k.compliance_pct ?? 0} /></div>{pct(k.compliance_pct)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-800">Top 5 Gaps</h3>
            <ul className="space-y-1.5">
              {data.top_gaps.map((g: any) => (
                <li key={g.control_id} className="rounded border border-stone-100 px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-700">{g.gap}</span>
                    <PriorityBadge value={g.severity} />
                  </div>
                  <div className="text-stone-400">{g.kca_code} · {g.legal_reference}</div>
                </li>
              ))}
              {data.top_gaps.length === 0 && <li className="text-xs text-stone-400">No open gaps.</li>}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-800">Critical Actions</h3>
            <ul className="space-y-1.5">
              {data.critical_actions.map((a: any) => (
                <li key={a.action_id} className="rounded border border-stone-100 px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-700">{a.name}</span>
                    <StatusBadge value={a.status} />
                  </div>
                  <div className="text-stone-400">{a.owner ?? 'Unassigned'} · Target: {fmtDate(a.target_date)}</div>
                </li>
              ))}
              {data.critical_actions.length === 0 && <li className="text-xs text-stone-400">No open critical actions.</li>}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Stat label="November 2026 Readiness" value={pct(data.november_2026_readiness.compliance_pct)} />
          <Stat label="May 2027 Readiness" value={pct(data.may_2027_readiness.compliance_pct)} />
        </div>

        {data.consent_management && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-800">Consent Management (KCA-04)</h3>
            <p className="text-xs text-stone-600">
              {data.consent_management.implemented}/{data.consent_management.applicable_controls} applicable controls implemented
              — {pct(data.consent_management.compliance_pct)} compliance. {data.consent_management.to_be_determined} requirement(s)
              pending applicability determination (statutory Consent Manager status).
            </p>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-stone-800">Application Status</h3>
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr><th className="px-2 py-1.5 text-left">Application</th><th className="px-2 py-1.5 text-left">Environment</th><th className="px-2 py-1.5 text-left">Consent Integration</th><th className="px-2 py-1.5 text-left">DPDP Assessment</th></tr>
            </thead>
            <tbody>
              {data.application_status.map((a: any) => (
                <tr key={a.name} className="border-t border-stone-100">
                  <td className="px-2 py-1.5">{a.name}</td>
                  <td className="px-2 py-1.5 text-stone-500">{a.environment || '—'}</td>
                  <td className="px-2 py-1.5 text-stone-500">{label(a.consent_integration_status)}</td>
                  <td className="px-2 py-1.5 text-stone-500">{label(a.dpdp_assessment_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({ label: l, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-stone-100 bg-stone-50 p-3">
      <div className="text-[11px] uppercase tracking-wide text-stone-400">{l}</div>
      <div className="mt-1 text-lg font-semibold text-stone-800">{value}</div>
    </div>
  )
}
