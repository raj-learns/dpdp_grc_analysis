import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getRequirementDetail, kcasApi, getOptions } from '../lib/api'
import { Card, CardHeader, ApplicabilityBadge, StatusBadge, PriorityBadge, VerificationBadge, Button, SourceLink, EmptyState, Disclaimer } from '../components/ui'
import { DEADLINE_PHASE_LABEL, fmtDate, pct, label } from '../lib/format'
import { RequirementFormModal } from './Requirements'
import type { Kca, Options } from '../lib/types'

export default function RequirementDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [kcas, setKcas] = useState<Kca[]>([])
  const [options, setOptions] = useState<Options | null>(null)
  const [editing, setEditing] = useState(false)

  const load = () => getRequirementDetail(Number(id)).then(setData)
  useEffect(() => { load(); kcasApi.list().then(setKcas); getOptions().then(setOptions) }, [id])

  if (!data) return <div className="p-8 text-sm text-stone-400">Loading…</div>
  const req = data.requirement

  return (
    <div className="space-y-4">
      <button onClick={() => nav(-1)} className="text-xs text-stone-500 hover:text-orange-700">← Back</button>
      <Disclaimer />

      <Card>
        <CardHeader
          title={`${req.requirement_id} — ${req.title}`}
          subtitle={`${req.kca?.code} · ${req.kca?.name}`}
          right={<Button onClick={() => setEditing(true)}>Edit</Button>}
        />
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3">
            <p className="text-sm text-stone-700">{req.description}</p>
            {req.applicability === 'TO_BE_DETERMINED' && req.applicability_reason && (
              <div className="rounded border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">
                <strong>Why this is To Be Determined:</strong> {req.applicability_reason}
              </div>
            )}
            {req.applicability === 'NOT_APPLICABLE' && req.applicability_reason && (
              <div className="rounded border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                <strong>Why Not Applicable:</strong> {req.applicability_reason}
              </div>
            )}
            {req.notes && <p className="text-xs text-stone-500">Notes: {req.notes}</p>}
          </div>
          <div className="space-y-2 rounded-md border border-stone-100 bg-stone-50 p-3 text-xs">
            <Row k="Source"><SourceLink url={req.source_url}>{label(req.source_type)}</SourceLink></Row>
            <Row k="Reference">{req.section_reference || '—'}</Row>
            <Row k="Deadline Phase">{DEADLINE_PHASE_LABEL[req.deadline_phase] ?? label(req.deadline_phase)}</Row>
            <Row k="Applicability"><ApplicabilityBadge value={req.applicability} /></Row>
            <Row k="Effective Date">{fmtDate(req.effective_date)}</Row>
            <Row k="Compliance %">{pct(data.summary_row.compliance_pct)}</Row>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Controls implementing this requirement" subtitle={`${data.controls.length} control(s) — click through for its actions & evidence`} />
        {data.controls.length === 0 && <EmptyState title="No control mapped to this requirement yet." />}
        <div className="divide-y divide-stone-100">
          {data.controls.map((c: any) => (
            <div key={c.control.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link to="/controls" className="text-sm font-medium text-stone-800 hover:text-orange-700">{c.control.control_id} — {c.control.name}</Link>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <StatusBadge value={c.control.status} />
                    <PriorityBadge value={c.control.priority} />
                    <ApplicabilityBadge value={c.control.applicability} />
                  </div>
                </div>
                <div className="text-xs text-stone-500">Owner: {c.control.owner?.name ?? 'Unassigned'} · {c.control.completion_pct}% complete</div>
              </div>

              {c.actions.length > 0 && (
                <div className="mt-3 pl-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Actions ({c.actions.length})</div>
                  <ul className="space-y-1">
                    {c.actions.map((a: any) => (
                      <li key={a.id} className="flex items-center justify-between rounded border border-stone-100 px-2 py-1 text-xs">
                        <span className="text-stone-600">{a.name}</span>
                        <StatusBadge value={a.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {c.evidence.length > 0 && (
                <div className="mt-2 pl-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Evidence ({c.evidence.length})</div>
                  <ul className="space-y-1">
                    {c.evidence.map((e: any) => (
                      <li key={e.id} className="flex items-center justify-between rounded border border-stone-100 px-2 py-1 text-xs">
                        <span className="text-stone-600">{e.name}</span>
                        <VerificationBadge value={e.verification_status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {c.actions.length === 0 && c.evidence.length === 0 && (
                <div className="mt-2 pl-3 text-[11px] text-stone-400">No actions or evidence linked yet.</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {editing && options && (
        <RequirementFormModal kcas={kcas} options={options} initial={req} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />
      )}
    </div>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-stone-400">{k}</span>
      <span className="text-right text-stone-700">{children}</span>
    </div>
  )
}
