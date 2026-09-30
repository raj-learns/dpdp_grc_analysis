import { useEffect, useMemo, useState } from 'react'
import { controlsApi, kcasApi, ownersApi, requirementsApi, getOptions, exportUrl } from '../lib/api'
import { Card, Select, StatusBadge, PriorityBadge, ApplicabilityBadge, Button, Modal, Field, inputClass, ProgressBar, Disclaimer } from '../components/ui'
import { label, DEADLINE_PHASE_LABEL } from '../lib/format'
import type { Control, Kca, Owner, LegalRequirement, Options } from '../lib/types'

export default function Controls() {
  const [rows, setRows] = useState<Control[]>([])
  const [kcas, setKcas] = useState<Kca[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [requirements, setRequirements] = useState<LegalRequirement[]>([])
  const [options, setOptions] = useState<Options | null>(null)
  const [filters, setFilters] = useState({ kca_id: '', status: '', priority: '', applicability: '', deadline_phase: '' })
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<Control | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    kcasApi.list().then(setKcas)
    ownersApi.list().then(setOwners)
    requirementsApi.list().then(setRequirements)
    getOptions().then(setOptions)
  }, [])

  const load = () => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    controlsApi.list(params).then(setRows).finally(() => setLoading(false))
  }
  useEffect(load, [filters])

  const kcaMap = useMemo(() => Object.fromEntries(kcas.map(k => [k.id, k])), [kcas])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Controls</h1>
          <p className="text-xs text-stone-500">Internal controls implementing one or more legal requirements. Compliance % is derived from these rows.</p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl('controls')}><Button>Export CSV</Button></a>
          <Button variant="primary" onClick={() => setCreating(true)}>Add Control</Button>
        </div>
      </div>
      <Disclaimer />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-3">
          <Select value={filters.kca_id} onChange={v => setFilters(f => ({ ...f, kca_id: v }))} placeholder="All KCAs"
                  options={kcas.map(k => ({ value: String(k.id), label: `${k.code} — ${k.name}` }))} />
          <Select value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))} placeholder="All Statuses"
                  options={(options?.control_statuses ?? []).map(s => ({ value: s, label: label(s) }))} />
          <Select value={filters.priority} onChange={v => setFilters(f => ({ ...f, priority: v }))} placeholder="All Priorities"
                  options={(options?.priorities ?? []).map(s => ({ value: s, label: label(s) }))} />
          <Select value={filters.applicability} onChange={v => setFilters(f => ({ ...f, applicability: v }))} placeholder="All Applicability"
                  options={(options?.applicability ?? []).map(s => ({ value: s, label: label(s) }))} />
          <Select value={filters.deadline_phase} onChange={v => setFilters(f => ({ ...f, deadline_phase: v }))} placeholder="All Phases"
                  options={(options?.deadline_phases ?? []).map(s => ({ value: s, label: DEADLINE_PHASE_LABEL[s] ?? label(s) }))} />
          <span className="ml-auto text-xs text-stone-400">{rows.length} control(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Control</th>
                <th className="px-3 py-2 text-left font-medium">KCA</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Priority</th>
                <th className="px-3 py-2 text-left font-medium">Applicability</th>
                <th className="px-3 py-2 text-left font-medium">Owner</th>
                <th className="px-3 py-2 text-left font-medium">Progress</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-3 py-6 text-stone-400">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-stone-400">No controls match these filters.</td></tr>}
              {rows.map(c => (
                <>
                  <tr key={c.id} className="cursor-pointer border-t border-stone-100 hover:bg-stone-50" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                    <td className="px-3 py-2">
                      <div className="font-mono text-[11px] text-stone-400">{c.control_id}</div>
                      <div className="text-stone-700">{c.name}</div>
                    </td>
                    <td className="px-3 py-2 text-stone-500">{kcaMap[c.kca_id]?.code}</td>
                    <td className="px-3 py-2"><StatusBadge value={c.status} /></td>
                    <td className="px-3 py-2"><PriorityBadge value={c.priority} /></td>
                    <td className="px-3 py-2"><ApplicabilityBadge value={c.applicability} /></td>
                    <td className="px-3 py-2 text-stone-500">{c.owner?.name ?? 'Unassigned'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2"><div className="w-16"><ProgressBar pct={c.completion_pct} /></div><span>{c.completion_pct}%</span></div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button onClick={() => setEditing(c)}>Edit</Button>
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <tr className="border-t border-stone-100 bg-stone-50/60">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase text-stone-400">Linked Requirements ({c.requirements.length})</div>
                            {c.requirements.length === 0 && <div className="text-xs text-stone-400">None linked.</div>}
                            <ul className="space-y-1">
                              {c.requirements.map(r => (
                                <li key={r.id} className="text-xs text-stone-600">{r.requirement_id} — {r.title} <span className="text-stone-400">({r.section_reference})</span></li>
                              ))}
                            </ul>
                          </div>
                          <div className="text-xs text-stone-600">
                            {c.description && <p className="mb-2">{c.description}</p>}
                            {c.notes && <p className="text-stone-400">Notes: {c.notes}</p>}
                            <p className="mt-2 text-stone-400">Evidence required: {c.evidence_required ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {(creating || editing) && options && (
        <ControlFormModal
          kcas={kcas} owners={owners} requirements={requirements} options={options}
          initial={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function ControlFormModal({ kcas, owners, requirements, options, initial, onClose, onSaved }: {
  kcas: Kca[]; owners: Owner[]; requirements: LegalRequirement[]; options: Options
  initial?: Control; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<any>(initial ? {
    ...initial, requirement_ids: initial.requirements.map(r => r.id),
  } : {
    control_id: '', name: '', description: '', kca_id: kcas[0]?.id, applicability: 'APPLICABLE',
    owner_id: owners[0]?.id ?? null, status: 'NOT_STARTED', priority: 'MEDIUM', deadline_phase: 'ONGOING',
    completion_pct: 0, evidence_required: true, notes: '', requirement_ids: [] as number[],
  })
  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const toggleReq = (id: number) => {
    setForm((f: any) => ({
      ...f,
      requirement_ids: f.requirement_ids.includes(id) ? f.requirement_ids.filter((x: number) => x !== id) : [...f.requirement_ids, id],
    }))
  }

  const submit = async () => {
    if (initial) await controlsApi.update(initial.id, form)
    else await controlsApi.create(form)
    onSaved()
  }

  return (
    <Modal title={initial ? `Edit ${initial.control_id}` : 'Add Control'} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Control ID"><input className={inputClass} value={form.control_id} onChange={e => set('control_id', e.target.value)} /></Field>
        <Field label="KCA">
          <select className={inputClass} value={form.kca_id} onChange={e => set('kca_id', Number(e.target.value))}>
            {kcas.map(k => <option key={k.id} value={k.id}>{k.code} — {k.name}</option>)}
          </select>
        </Field>
        <div className="col-span-2"><Field label="Name"><input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></Field></div>
        <div className="col-span-2"><Field label="Description"><textarea className={inputClass} rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></Field></div>
        <Field label="Status">
          <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>
            {options.control_statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className={inputClass} value={form.priority} onChange={e => set('priority', e.target.value)}>
            {options.priorities.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="Applicability">
          <select className={inputClass} value={form.applicability} onChange={e => set('applicability', e.target.value)}>
            {options.applicability.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="Deadline Phase">
          <select className={inputClass} value={form.deadline_phase} onChange={e => set('deadline_phase', e.target.value)}>
            {options.deadline_phases.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="Owner">
          <select className={inputClass} value={form.owner_id ?? ''} onChange={e => set('owner_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">Unassigned</option>
            {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
        <Field label="Completion %"><input type="number" min={0} max={100} className={inputClass} value={form.completion_pct} onChange={e => set('completion_pct', Number(e.target.value))} /></Field>
        <Field label="Target Date"><input type="date" className={inputClass} value={form.target_date ?? ''} onChange={e => set('target_date', e.target.value || null)} /></Field>
        <Field label="Evidence Required">
          <select className={inputClass} value={form.evidence_required ? '1' : '0'} onChange={e => set('evidence_required', e.target.value === '1')}>
            <option value="1">Yes</option><option value="0">No</option>
          </select>
        </Field>
        <div className="col-span-2"><Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field></div>
        <div className="col-span-2">
          <div className="mb-1 text-xs font-medium text-stone-600">Linked Legal Requirements</div>
          <div className="max-h-40 overflow-y-auto rounded border border-stone-200 p-2">
            {requirements.map(r => (
              <label key={r.id} className="flex items-center gap-2 py-0.5 text-xs text-stone-600">
                <input type="checkbox" checked={form.requirement_ids.includes(r.id)} onChange={() => toggleReq(r.id)} />
                {r.requirement_id} — {r.title}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Save</Button>
      </div>
    </Modal>
  )
}
