import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getApplicationDetail, getOptions } from '../lib/api'
import { Card, CardHeader, StatusBadge, PriorityBadge, VerificationBadge, ProgressBar, Button, Disclaimer, EmptyState } from '../components/ui'
import { fmtDate, pct, label } from '../lib/format'
import { ApplicationFormModal } from './Applications'
import type { Options } from '../lib/types'

export default function ApplicationDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [options, setOptions] = useState<Options | null>(null)
  const [editing, setEditing] = useState(false)

  const load = () => getApplicationDetail(Number(id)).then(setData)
  useEffect(() => { load(); getOptions().then(setOptions) }, [id])

  if (!data) return <div className="p-8 text-sm text-stone-400">Loading…</div>
  const app = data.application

  return (
    <div className="space-y-4">
      <button onClick={() => nav(-1)} className="text-xs text-stone-500 hover:text-orange-700">← Back</button>
      <Disclaimer />

      <Card>
        <CardHeader title={app.name} subtitle={app.environment || 'Environment not specified'} right={<Button onClick={() => setEditing(true)}>Edit</Button>} />
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <div className="space-y-1 text-xs text-stone-600">
            <p><span className="text-stone-400">Business owner:</span> {app.business_owner || 'TBD'}</p>
            <p><span className="text-stone-400">Technical owner:</span> {app.technical_owner || 'TBD'}</p>
            <p><span className="text-stone-400">Personal data processed:</span> {app.personal_data_processed || 'Not yet catalogued.'}</p>
            <p><span className="text-stone-400">Processing purposes:</span> {app.processing_purposes || 'Not yet catalogued.'}</p>
            {app.notes && <p><span className="text-stone-400">Notes:</span> {app.notes}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-stone-100 bg-stone-50 p-3">
              <div className="text-[11px] text-stone-400">Consent Integration</div>
              <div className="mt-1 text-sm font-medium text-stone-700">{label(app.consent_integration_status)}</div>
            </div>
            <div className="rounded border border-stone-100 bg-stone-50 p-3">
              <div className="text-[11px] text-stone-400">DPDP Assessment</div>
              <div className="mt-1 text-sm font-medium text-stone-700">{label(app.dpdp_assessment_status)}</div>
            </div>
            <div className="col-span-2 rounded border border-orange-100 bg-orange-50 p-3">
              <div className="text-[11px] text-orange-600">Action Completion (this application)</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1"><ProgressBar pct={data.action_summary.completion_pct ?? 0} /></div>
                <span className="text-sm font-semibold text-orange-700">{pct(data.action_summary.completion_pct)}</span>
              </div>
              <div className="mt-1 text-[11px] text-orange-500">{data.action_summary.completed}/{data.action_summary.total_actions} actions completed</div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Action completion by KCA" subtitle="Only KCAs with at least one action scoped to this application" />
        {data.kca_breakdown.length === 0 ? <EmptyState title="No actions scoped to this application yet." /> : (
          <div className="divide-y divide-stone-100">
            {data.kca_breakdown.map((k: any) => (
              <div key={k.kca_code} className="flex items-center justify-between px-4 py-2 text-xs">
                <span className="text-stone-600">{k.kca_code} — {k.kca_name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24"><ProgressBar pct={k.completion_pct ?? 0} /></div>
                  <span className="w-10 text-stone-700">{pct(k.completion_pct)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Actions" subtitle={`${data.actions.length} action(s)`} />
          {data.actions.length === 0 ? <EmptyState title="No actions yet." /> : (
            <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
              {data.actions.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2 text-xs">
                  <div>
                    <div className="text-stone-700">{a.name}</div>
                    <div className="text-stone-400">Target: {fmtDate(a.target_date)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge value={a.priority} />
                    <StatusBadge value={a.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Evidence" subtitle={`${data.evidence.length} item(s)`} />
          {data.evidence.length === 0 ? <EmptyState title="No evidence logged for this application yet." /> : (
            <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
              {data.evidence.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-2 text-xs">
                  <span className="text-stone-700">{e.name}</span>
                  <VerificationBadge value={e.verification_status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {editing && options && (
        <ApplicationFormModal options={options} initial={app} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />
      )}
    </div>
  )
}
