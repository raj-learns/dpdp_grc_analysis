import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../lib/api'
import { Card, CardHeader, KpiCard, Disclaimer, EmptyState } from '../components/ui'
import { StatusDonut, HorizontalBar, COLORS } from '../components/charts'
import { fmtDate, pct, DEADLINE_PHASE_LABEL, PRIORITY_STYLE, badgeClass, label } from '../lib/format'

export default function Dashboard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => { getDashboard().then(setData) }, [])

  if (!data) return <div className="p-8 text-sm text-stone-400">Loading…</div>

  const o = data.overall
  const statusData = [
    { name: 'Implemented / Evidence Verified', value: o.implemented, color: COLORS.implemented },
    { name: 'In Progress', value: o.in_progress, color: COLORS.inProgress },
    { name: 'Gap / Not Started', value: o.not_started, color: COLORS.gap },
    { name: 'Not Applicable', value: o.not_applicable, color: COLORS.notApplicable },
    { name: 'To Be Determined', value: o.to_be_determined, color: COLORS.tbd },
  ]
  const kcaBar = [...data.kca_scorecard]
    .sort((a, b) => a.kca_code.localeCompare(b.kca_code))
    .map((k: any) => ({ name: `${k.kca_code} · ${k.kca_name}`, value: k.compliance_pct ?? 0 }))

  const ab = data.action_status_breakdown
  const actionStatusData = [
    { name: 'Completed', value: ab.completed, color: COLORS.implemented },
    { name: 'In Progress', value: ab.in_progress, color: COLORS.inProgress },
    { name: 'Blocked', value: ab.blocked, color: COLORS.gap },
    { name: 'Not Started', value: ab.not_started, color: COLORS.notApplicable },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Executive Dashboard</h1>
        <p className="text-xs text-stone-500">Every number below is calculated live from the control register — nothing is hardcoded.</p>
      </div>
      <Disclaimer />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="Overall Compliance" value={pct(o.compliance_pct)} sub={`${o.implemented}/${o.applicable_controls} applicable controls`} accent="orange" />
        <KpiCard label="Applicable Controls" value={o.applicable_controls} sub={`${o.total_controls} total`} />
        <KpiCard label="Implemented / Verified" value={o.implemented} />
        <KpiCard label="Open Gaps" value={o.open_gaps} accent={o.open_gaps > 0 ? 'red' : 'default'} />
        <KpiCard label="Critical Actions" value={o.critical_actions} accent={o.critical_actions > 0 ? 'red' : 'default'} />
        <KpiCard label="Overdue Actions" value={o.overdue_actions} accent={o.overdue_actions > 0 ? 'red' : 'default'} />
        <KpiCard label="Nov 2026 Scope" value={pct(o.november_2026_scope_pct)} sub="Applicable 12-month controls" />
        <KpiCard label="May 2027 Scope" value={pct(o.may_2027_scope_pct)} sub="Applicable 18-month controls" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="KCA Compliance Distribution" subtitle="Compliance % per internal domain — all 12 shown, none excluded" />
          <div className="p-3"><HorizontalBar data={kcaBar} height={360} /></div>
        </Card>
        <Card>
          <CardHeader title="Control Status Distribution" subtitle="All controls, all statuses" />
          <div className="p-3"><StatusDonut data={statusData} /></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Action Status Distribution" subtitle="All actions across every KCA" />
          <div className="p-3"><StatusDonut data={actionStatusData} /></div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Compliance by Deadline Phase" subtitle="Applicable-control compliance % grouped by statutory phase" />
          <div className="p-3 space-y-3">
            {data.compliance_by_deadline_phase.length === 0 && <EmptyState title="No phase data yet" />}
            {data.compliance_by_deadline_phase.map((p: any) => (
              <div key={p.phase} className="flex items-center justify-between rounded border border-stone-100 px-3 py-2">
                <div>
                  <div className="text-xs font-medium text-stone-700">{DEADLINE_PHASE_LABEL[p.phase] ?? p.phase}</div>
                  <div className="text-[11px] text-stone-400">{p.implemented}/{p.applicable_controls} applicable implemented · {p.to_be_determined} TBD · {p.not_applicable} N/A</div>
                </div>
                <div className="text-sm font-semibold text-stone-800">{pct(p.compliance_pct)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader title="Compliance by Application" subtitle="Action completion scoped to each application" />
          <div className="p-3 space-y-3">
            {data.compliance_by_application.length === 0 && <EmptyState title="No applications yet" />}
            {data.compliance_by_application.map((a: any) => (
              <div key={a.application} className="flex items-center justify-between rounded border border-stone-100 px-3 py-2">
                <div>
                  <div className="text-xs font-medium text-stone-700">{a.application}</div>
                  <div className="text-[11px] text-stone-400">
                    Consent: {label(a.consent_integration_status)} · DPDP assessment: {label(a.dpdp_assessment_status)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-stone-800">{pct(a.completion_pct)} <span className="text-[11px] font-normal text-stone-400">actions</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Overdue Actions" subtitle={`${data.overdue_actions.length} action(s) past target date`} />
          <ActionMiniTable rows={data.overdue_actions} empty="No overdue actions." />
        </Card>
        <Card>
          <CardHeader title="Upcoming Deadlines (30 days)" subtitle={`${data.upcoming_deadlines.length} action(s) due soon`} />
          <ActionMiniTable rows={data.upcoming_deadlines} empty="Nothing due in the next 30 days." />
        </Card>
      </div>

      <Card>
        <CardHeader title="Readiness Timeline" subtitle="Statutory commencement per official MeitY notification G.S.R. 843(E)" />
        <div className="flex flex-wrap items-center gap-2 p-4 text-xs">
          <TimelineStep title="Today" date={fmtDate(new Date().toISOString().slice(0, 10))} active />
          <Arrow />
          <TimelineStep title="12-Month Phase" date={fmtDate(data.readiness_timeline.twelve_month_date)} note="Consent Manager provisions" />
          <Arrow />
          <TimelineStep title="18-Month Phase" date={fmtDate(data.readiness_timeline.eighteen_month_date)} note="Substantive Data Fiduciary obligations" />
        </div>
      </Card>
    </div>
  )
}

function TimelineStep({ title, date, note, active }: { title: string; date: string; note?: string; active?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${active ? 'border-orange-300 bg-orange-50' : 'border-stone-200 bg-stone-50'}`}>
      <div className="font-semibold text-stone-800">{title}</div>
      <div className="text-stone-500">{date}</div>
      {note && <div className="mt-0.5 text-[11px] text-stone-400">{note}</div>}
    </div>
  )
}
function Arrow() { return <span className="text-stone-300">→</span> }

function ActionMiniTable({ rows, empty }: { rows: any[]; empty: string }) {
  if (rows.length === 0) return <EmptyState title={empty} />
  return (
    <div className="max-h-64 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-stone-50 text-stone-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Action</th>
            <th className="px-3 py-2 text-left font-medium">Owner</th>
            <th className="px-3 py-2 text-left font-medium">Target</th>
            <th className="px-3 py-2 text-left font-medium">Priority</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a: any) => (
            <tr key={a.action_id} className="border-t border-stone-100">
              <td className="px-3 py-2">
                <Link to="/actions" className="text-stone-700 hover:text-orange-700">{a.name}</Link>
              </td>
              <td className="px-3 py-2 text-stone-500">{a.owner ?? '—'}</td>
              <td className="px-3 py-2 text-stone-500">{fmtDate(a.target_date)}</td>
              <td className="px-3 py-2"><span className={badgeClass(PRIORITY_STYLE, a.priority)}>{label(a.priority)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
