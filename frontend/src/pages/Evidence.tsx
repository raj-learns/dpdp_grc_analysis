import { useEffect, useState } from 'react'
import { evidenceApi, applicationsApi, controlsApi, actionsApi, ownersApi, getOptions, getEvidenceCoverage, exportUrl, uploadEvidenceFile } from '../lib/api'
import { Card, Select, VerificationBadge, Button, Modal, Field, inputClass, KpiCard, Disclaimer, EmptyState } from '../components/ui'
import { label, fmtDate, pct } from '../lib/format'
import type { Evidence, Application, Control, Action, Owner, Options } from '../lib/types'

export default function EvidencePage() {
  const [rows, setRows] = useState<Evidence[]>([])
  const [apps, setApps] = useState<Application[]>([])
  const [controls, setControls] = useState<Control[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [options, setOptions] = useState<Options | null>(null)
  const [coverage, setCoverage] = useState<any>(null)
  const [filters, setFilters] = useState({ application_id: '', evidence_type: '', verification_status: '' })
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Evidence | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applicationsApi.list().then(setApps)
    controlsApi.list().then(setControls)
    actionsApi.list().then(setActions)
    ownersApi.list().then(setOwners)
    getOptions().then(setOptions)
    getEvidenceCoverage().then(setCoverage)
  }, [])

  const load = () => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    evidenceApi.list(params).then(setRows).finally(() => setLoading(false))
  }
  useEffect(load, [filters])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Evidence Register</h1>
          <p className="text-xs text-stone-500">Proof that a control/action was actually carried out. Nothing here is assumed — only what has been logged.</p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl('evidence')}><Button>Export CSV</Button></a>
          <Button variant="primary" onClick={() => setCreating(true)}>Add Evidence</Button>
        </div>
      </div>
      <Disclaimer />

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Implemented Controls" value={coverage?.implemented_controls ?? '—'} />
        <KpiCard label="With Verified Evidence" value={coverage?.controls_with_verified_evidence ?? '—'} />
        <KpiCard label="Evidence Coverage" value={pct(coverage?.coverage_pct)} accent="orange" sub="Verified evidence ÷ implemented controls" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-3">
          <Select value={filters.application_id} onChange={v => setFilters(f => ({ ...f, application_id: v }))} placeholder="All Applications"
                  options={apps.map(a => ({ value: String(a.id), label: a.name }))} />
          <Select value={filters.evidence_type} onChange={v => setFilters(f => ({ ...f, evidence_type: v }))} placeholder="All Types"
                  options={(options?.evidence_types ?? []).map(s => ({ value: s, label: label(s) }))} />
          <Select value={filters.verification_status} onChange={v => setFilters(f => ({ ...f, verification_status: v }))} placeholder="All Verification"
                  options={(options?.verification_statuses ?? []).map(s => ({ value: s, label: label(s) }))} />
          <span className="ml-auto text-xs text-stone-400">{rows.length} evidence item(s)</span>
        </div>
        {!loading && rows.length === 0 ? (
          <EmptyState title="No evidence logged yet" body="Evidence is never assumed. Add it here once a control/action has real proof (a policy doc, screenshot, API test log, VAPT report, etc.)." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Evidence</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Application</th>
                  <th className="px-3 py-2 text-left font-medium">Linked Controls</th>
                  <th className="px-3 py-2 text-left font-medium">Owner</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Verification</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => (
                  <tr key={e.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2">
                      <div className="font-mono text-[11px] text-stone-400">{e.evidence_id}</div>
                      <div className="text-stone-700">{e.name}</div>
                      {e.file_url && <a href={e.file_url} target="_blank" rel="noreferrer" className="text-[11px] text-sky-700 underline">reference link</a>}
                    </td>
                    <td className="px-3 py-2 text-stone-500">{label(e.evidence_type)}</td>
                    <td className="px-3 py-2 text-stone-500">{e.application?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-stone-500">{e.controls.map(c => c.control_id).join(', ') || '—'}</td>
                    <td className="px-3 py-2 text-stone-500">{e.owner?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-stone-500">{fmtDate(e.date)}</td>
                    <td className="px-3 py-2"><VerificationBadge value={e.verification_status} /></td>
                    <td className="px-3 py-2 text-right"><Button onClick={() => setEditing(e)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {(creating || editing) && options && (
        <EvidenceFormModal
          apps={apps} controls={controls} actions={actions} owners={owners} options={options}
          initial={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load(); getEvidenceCoverage().then(setCoverage) }}
        />
      )}
    </div>
  )
}

function EvidenceFormModal({ apps, controls, actions, owners, options, initial, onClose, onSaved }: {
  apps: Application[]; controls: Control[]; actions: Action[]; owners: Owner[]; options: Options
  initial?: Evidence; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<any>(initial ? {
    ...initial, control_ids: initial.controls.map(c => c.id), action_ids: initial.actions.map(a => a.id),
  } : {
    evidence_id: '', name: '', evidence_type: 'OTHER', application_id: null, date: null,
    owner_id: owners[0]?.id ?? null, description: '', file_url: '', verification_status: 'UNVERIFIED',
    notes: '', control_ids: [] as number[], action_ids: [] as number[],
  })
  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))
  const toggle = (key: 'control_ids' | 'action_ids', id: number) => {
    setForm((f: any) => ({ ...f, [key]: f[key].includes(id) ? f[key].filter((x: number) => x !== id) : [...f[key], id] }))
  }
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await uploadEvidenceFile(file)
      set('file_url', result.file_url)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setUploadError(detail ?? 'Upload failed - please try again.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    if (initial) await evidenceApi.update(initial.id, form)
    else await evidenceApi.create(form)
    onSaved()
  }

  return (
    <Modal title={initial ? `Edit ${initial.evidence_id}` : 'Add Evidence'} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Evidence ID"><input readOnly disabled className={inputClass} placeholder="Auto-generated on save" value={form.evidence_id} /></Field>
        <Field label="Type">
          <select className={inputClass} value={form.evidence_type} onChange={e => set('evidence_type', e.target.value)}>
            {options.evidence_types.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <div className="col-span-2"><Field label="Name"><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field></div>
        <div className="col-span-2"><Field label="Description"><textarea className={inputClass} rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} /></Field></div>
        <Field label="Application">
          <select className={inputClass} value={form.application_id ?? ''} onChange={e => set('application_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">None</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Owner">
          <select className={inputClass} value={form.owner_id ?? ''} onChange={e => set('owner_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">Unassigned</option>
            {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" className={inputClass} value={form.date ?? ''} onChange={e => set('date', e.target.value || null)} /></Field>
        <Field label="Verification Status">
          <select className={inputClass} value={form.verification_status} onChange={e => set('verification_status', e.target.value)}>
            {options.verification_statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="File / URL Reference">
            <div className="flex items-center gap-2">
              <input className={inputClass} placeholder="Paste a URL/path…" value={form.file_url ?? ''} onChange={e => set('file_url', e.target.value)} />
              <label className="shrink-0 cursor-pointer rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
                {uploading ? 'Uploading…' : 'Upload file'}
                <input type="file" className="hidden" disabled={uploading} onChange={e => handleUpload(e.target.files?.[0])} />
              </label>
            </div>
          </Field>
          {uploadError && <div className="mt-1 text-[11px] text-red-600">{uploadError}</div>}
          {form.file_url && <div className="mt-1 text-[11px] text-stone-400">Current: {form.file_url}</div>}
        </div>
        <div className="col-span-2"><Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></Field></div>
        <div>
          <div className="mb-1 text-xs font-medium text-stone-600">Linked Controls</div>
          <div className="max-h-32 overflow-y-auto rounded border border-stone-200 p-2">
            {controls.map(c => (
              <label key={c.id} className="flex items-center gap-2 py-0.5 text-xs text-stone-600">
                <input type="checkbox" checked={form.control_ids.includes(c.id)} onChange={() => toggle('control_ids', c.id)} />
                {c.control_id} — {c.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-stone-600">Linked Actions</div>
          <div className="max-h-32 overflow-y-auto rounded border border-stone-200 p-2">
            {actions.map(a => (
              <label key={a.id} className="flex items-center gap-2 py-0.5 text-xs text-stone-600">
                <input type="checkbox" checked={form.action_ids.includes(a.id)} onChange={() => toggle('action_ids', a.id)} />
                {a.action_id} — {a.name}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => !uploading && submit()}>{uploading ? 'Uploading…' : 'Save'}</Button>
      </div>
    </Modal>
  )
}
