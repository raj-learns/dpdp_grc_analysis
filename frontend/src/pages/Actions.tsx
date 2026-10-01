import { useEffect, useMemo, useState } from 'react'
import { actionsApi, kcasApi, ownersApi, controlsApi, applicationsApi, evidenceApi, uploadEvidenceFile, getOptions, exportUrl } from '../lib/api'
import { Card, Select, PriorityBadge, Button, Modal, Field, inputClass, Disclaimer } from '../components/ui'
import { label, fmtDate } from '../lib/format'
import type { Action, Kca, Owner, Control, Application, Options, EvidenceSummary } from '../lib/types'

function errorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return detail ?? 'Something went wrong - please try again.'
}

const DUE_VIEWS = [
  { value: '', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: '7', label: 'Due in 7 days' },
  { value: '30', label: 'Due in 30 days' },
]

export default function Actions() {
  const [rows, setRows] = useState<Action[]>([])
  const [kcas, setKcas] = useState<Kca[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [controls, setControls] = useState<Control[]>([])
  const [apps, setApps] = useState<Application[]>([])
  const [options, setOptions] = useState<Options | null>(null)
  const [filters, setFilters] = useState({ kca_id: '', application_id: '', owner_id: '', status: '', priority: '', due: '' })
  const [editing, setEditing] = useState<Action | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    kcasApi.list().then(setKcas)
    ownersApi.list().then(setOwners)
    controlsApi.list().then(setControls)
    applicationsApi.list().then(setApps)
    getOptions().then(setOptions)
  }, [])

  const load = () => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    actionsApi.list(params).then(setRows).finally(() => setLoading(false))
  }
  useEffect(load, [filters])

  const kcaMap = useMemo(() => Object.fromEntries(kcas.map(k => [k.id, k])), [kcas])
  const controlMap = useMemo(() => Object.fromEntries(controls.map(c => [c.id, c])), [controls])
  const [statusError, setStatusError] = useState<string | null>(null)

  const quickStatus = async (a: Action, status: string) => {
    setStatusError(null)
    try {
      await actionsApi.update(a.id, { status })
      load()
    } catch (err) {
      setStatusError(`${a.action_id}: ${errorMessage(err)}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Action Tracker</h1>
          <p className="text-xs text-stone-500">Concrete, assignable units of work implementing controls.</p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl('actions')}><Button>Export CSV</Button></a>
          <Button variant="primary" onClick={() => setCreating(true)}>Add Action</Button>
        </div>
      </div>
      <Disclaimer />
      {statusError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{statusError}</div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-3">
          <div className="flex gap-1 rounded border border-stone-200 p-0.5">
            {DUE_VIEWS.map(v => (
              <button key={v.value} onClick={() => setFilters(f => ({ ...f, due: v.value }))}
                      className={`rounded px-2 py-1 text-xs ${filters.due === v.value ? 'bg-orange-600 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <Select value={filters.kca_id} onChange={v => setFilters(f => ({ ...f, kca_id: v }))} placeholder="All KCAs"
                  options={kcas.map(k => ({ value: String(k.id), label: k.code }))} />
          <Select value={filters.application_id} onChange={v => setFilters(f => ({ ...f, application_id: v }))} placeholder="All Applications"
                  options={apps.map(a => ({ value: String(a.id), label: a.name }))} />
          <Select value={filters.owner_id} onChange={v => setFilters(f => ({ ...f, owner_id: v }))} placeholder="All Owners"
                  options={owners.map(o => ({ value: String(o.id), label: o.name }))} />
          <Select value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))} placeholder="All Statuses"
                  options={(options?.action_statuses ?? []).map(s => ({ value: s, label: label(s) }))} />
          <Select value={filters.priority} onChange={v => setFilters(f => ({ ...f, priority: v }))} placeholder="All Priorities"
                  options={(options?.priorities ?? []).map(s => ({ value: s, label: label(s) }))} />
          <span className="ml-auto text-xs text-stone-400">{rows.length} action(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">KCA</th>
                <th className="px-3 py-2 text-left font-medium">Control</th>
                <th className="px-3 py-2 text-left font-medium">Application</th>
                <th className="px-3 py-2 text-left font-medium">Owning Dept.</th>
                <th className="px-3 py-2 text-left font-medium">Person</th>
                <th className="px-3 py-2 text-left font-medium">Priority</th>
                <th className="px-3 py-2 text-left font-medium">Target</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Completion %</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="px-3 py-6 text-stone-400">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-stone-400">No actions match these filters.</td></tr>}
              {rows.map(a => {
                const hasEvidence = (a.evidence ?? []).length > 0
                return (
                <tr key={a.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2">
                    <div className="font-mono text-[11px] text-stone-400">{a.action_id}</div>
                    <div className="text-stone-700">{a.name}</div>
                    {a.blocker && <div className="mt-0.5 text-[11px] text-red-500">Blocked: {a.blocker}</div>}
                  </td>
                  <td className="px-3 py-2 text-stone-500">{kcaMap[a.kca_id]?.code}</td>
                  <td className="px-3 py-2 text-stone-500">{a.control_id ? controlMap[a.control_id]?.control_id ?? '—' : '—'}</td>
                  <td className="px-3 py-2 text-stone-500">{a.application?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-stone-500">{a.owner?.name ?? 'Unassigned'}</td>
                  <td className="px-3 py-2 text-stone-500">{a.owner_person || '—'}</td>
                  <td className="px-3 py-2"><PriorityBadge value={a.priority} /></td>
                  <td className="px-3 py-2 text-stone-500">{fmtDate(a.target_date)}</td>
                  <td className="px-3 py-2">
                    <select value={a.status} onChange={e => quickStatus(a, e.target.value)}
                            className="rounded border border-stone-200 bg-white px-1.5 py-1 text-[11px]">
                      {(options?.action_statuses ?? []).map(s => (
                        <option key={s} value={s} disabled={s === 'COMPLETED' && !hasEvidence && a.status !== 'COMPLETED'}
                                title={s === 'COMPLETED' && !hasEvidence ? 'Link evidence to this action before marking it Completed' : undefined}>
                          {label(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-stone-500">{a.completion_pct}%</td>
                  <td className="px-3 py-2 text-right"><Button onClick={() => setEditing(a)}>Edit</Button></td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {(creating || editing) && options && (
        <ActionFormModal
          kcas={kcas} owners={owners} controls={controls} apps={apps} options={options}
          initial={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function ActionFormModal({ kcas, owners, controls, apps, options, initial, onClose, onSaved }: {
  kcas: Kca[]; owners: Owner[]; controls: Control[]; apps: Application[]; options: Options
  initial?: Action; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<any>(initial ?? {
    action_id: '', name: '', description: '', control_id: null, kca_id: kcas[0]?.id, application_id: null,
    owner_id: owners[0]?.id ?? null, owner_person: '', priority: 'MEDIUM', start_date: null, target_date: null,
    status: 'NOT_STARTED', completion_pct: 0, notes: '', blocker: '', dependency: '',
  })
  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [linked, setLinked] = useState<EvidenceSummary[]>(initial?.evidence ?? [])
  const hasEvidence = linked.length > 0
  const [ev, setEv] = useState({ name: '', type: 'OTHER', url: '', file: null as File | null })
  const [evBusy, setEvBusy] = useState(false)
  const [evError, setEvError] = useState<string | null>(null)
  const close = () => (linked.length > (initial?.evidence ?? []).length ? onSaved() : onClose())

  const addEvidence = async () => {
    if (!initial) return
    if (!ev.file && !ev.url.trim()) { setEvError('Attach a file or paste a URL.'); return }
    setEvBusy(true)
    setEvError(null)
    try {
      let url = ev.url.trim()
      let name = ev.name.trim()
      if (ev.file) {
        const up = await uploadEvidenceFile(ev.file)
        url = up.file_url
        name = name || up.original_name
      }
      const payload: any = {
        name: name || url, evidence_type: ev.type, file_url: url, application_id: form.application_id,
        owner_id: form.owner_id, date: new Date().toISOString().slice(0, 10),
        action_ids: [initial.id], control_ids: form.control_id ? [form.control_id] : [],
      }
      const created = await evidenceApi.create(payload)
      setLinked(l => [...l, created])
      setEv({ name: '', type: 'OTHER', url: '', file: null })
    } catch (err) {
      setEvError(errorMessage(err))
    } finally {
      setEvBusy(false)
    }
  }

  const submit = async () => {
    const nextErrors: Record<string, string> = {}
    if (!form.owner_id) nextErrors.owner_id = 'Owning department/team is required.'
    if (!form.target_date) nextErrors.target_date = 'Target date is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setFormError(null)
    try {
      if (initial) await actionsApi.update(initial.id, form)
      else await actionsApi.create(form)
      onSaved()
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  return (
    <Modal title={initial ? `Edit ${initial.action_id}` : 'Add Action'} onClose={close} wide>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Action ID"><input className={inputClass} value={form.action_id} onChange={e => set('action_id', e.target.value)} /></Field>
        <Field label="KCA">
          <select className={inputClass} value={form.kca_id} onChange={e => set('kca_id', Number(e.target.value))}>
            {kcas.map(k => <option key={k.id} value={k.id}>{k.code} — {k.name}</option>)}
          </select>
        </Field>
        <div className="col-span-2"><Field label="Name"><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field></div>
        <div className="col-span-2"><Field label="Description"><textarea className={inputClass} rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} /></Field></div>
        <Field label="Control">
          <select className={inputClass} value={form.control_id ?? ''} onChange={e => set('control_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">None</option>
            {controls.map(c => <option key={c.id} value={c.id}>{c.control_id} — {c.name}</option>)}
          </select>
        </Field>
        <Field label="Application">
          <select className={inputClass} value={form.application_id ?? ''} onChange={e => set('application_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">None</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Owning Department/Team">
          <select required className={inputClass} value={form.owner_id ?? ''} onChange={e => set('owner_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="" disabled>Select a department/team…</option>
            {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {errors.owner_id && <div className="mt-1 text-[11px] text-red-600">{errors.owner_id}</div>}
        </Field>
        <Field label="Owner (Person)">
          <input className={inputClass} placeholder="Named individual doing the work" value={form.owner_person ?? ''} onChange={e => set('owner_person', e.target.value)} />
        </Field>
        <Field label="Priority">
          <select className={inputClass} value={form.priority} onChange={e => set('priority', e.target.value)}>
            {options.priorities.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>
            {options.action_statuses.map(s => (
              <option key={s} value={s} disabled={s === 'COMPLETED' && !hasEvidence && form.status !== 'COMPLETED'}>
                {label(s)}{s === 'COMPLETED' && !hasEvidence && form.status !== 'COMPLETED' ? ' (needs linked evidence)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Completion %"><input type="number" min={0} max={100} className={inputClass} value={form.completion_pct} onChange={e => set('completion_pct', Number(e.target.value))} /></Field>
        <Field label="Start Date"><input type="date" className={inputClass} value={form.start_date ?? ''} onChange={e => set('start_date', e.target.value || null)} /></Field>
        <Field label="Target Date">
          <input required type="date" className={inputClass} value={form.target_date ?? ''} onChange={e => set('target_date', e.target.value || null)} />
          {errors.target_date && <div className="mt-1 text-[11px] text-red-600">{errors.target_date}</div>}
        </Field>
        <div className="col-span-2"><Field label="Blocker"><input className={inputClass} value={form.blocker ?? ''} onChange={e => set('blocker', e.target.value)} /></Field></div>
        <div className="col-span-2"><Field label="Dependency"><input className={inputClass} value={form.dependency ?? ''} onChange={e => set('dependency', e.target.value)} /></Field></div>
        <div className="col-span-2"><Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></Field></div>
        <div className="col-span-2 rounded border border-stone-200 bg-stone-50 p-3">
          <div className="mb-2 text-xs font-semibold text-stone-700">Evidence ({linked.length})</div>
          {linked.map(e => (
            <div key={e.id} className="mb-1 flex items-center gap-2 text-xs text-stone-600">
              <span className="font-mono text-stone-400">{e.evidence_id}</span>
              <span>{e.name}</span>
              {e.file_url && <a className="text-orange-700 underline" href={e.file_url} target="_blank" rel="noreferrer">open</a>}
            </div>
          ))}
          {!initial ? (
            <div className="text-[11px] text-stone-400">Save the action first, then reopen it to attach evidence.</div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input className={inputClass} placeholder="Name (optional - defaults to file name)" value={ev.name} onChange={e => setEv(v => ({ ...v, name: e.target.value }))} />
              <select className={inputClass} value={ev.type} onChange={e => setEv(v => ({ ...v, type: e.target.value }))}>
                {options.evidence_types.map(t => <option key={t} value={t}>{label(t)}</option>)}
              </select>
              <input className={inputClass} placeholder="Paste a URL (or choose a file →)" value={ev.url} onChange={e => setEv(v => ({ ...v, url: e.target.value }))} />
              <input type="file" className="text-xs" onChange={e => setEv(v => ({ ...v, file: e.target.files?.[0] ?? null }))} />
              <div className="col-span-2 flex items-center gap-2">
                <Button onClick={addEvidence}>{evBusy ? 'Adding…' : 'Add evidence'}</Button>
                {evError && <span className="text-[11px] text-red-600">{evError}</span>}
                <span className="text-[11px] text-stone-400">Also appears in the Evidence section.</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {formError && <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Save</Button>
      </div>
    </Modal>
  )
}
