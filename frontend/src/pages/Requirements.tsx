import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { requirementsApi, kcasApi, getOptions, exportUrl } from '../lib/api'
import { Card, Select, ApplicabilityBadge, Button, Modal, Field, inputClass, Disclaimer, KpiCard } from '../components/ui'
import { DEADLINE_PHASE_LABEL, label, badgeClass } from '../lib/format'
import type { LegalRequirement, Kca, Options } from '../lib/types'

const SOURCE_STYLE: Record<string, string> = {
  DPDP_ACT: 'bg-stone-800 text-white border-stone-800',
  DPDP_RULES: 'bg-stone-600 text-white border-stone-600',
  SCHEDULE: 'bg-stone-400 text-white border-stone-400',
  OTHER_GUIDANCE: 'bg-sky-100 text-sky-700 border-sky-300',
  INTERNAL: 'bg-orange-50 text-orange-700 border-orange-300',
}

export default function Requirements() {
  const [rows, setRows] = useState<LegalRequirement[]>([])
  const [kcas, setKcas] = useState<Kca[]>([])
  const [options, setOptions] = useState<Options | null>(null)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  const kcaId = params.get('kca_id') ?? ''
  const sourceType = params.get('source_type') ?? ''
  const deadlinePhase = params.get('deadline_phase') ?? ''
  const applicability = params.get('applicability') ?? ''

  useEffect(() => { kcasApi.list().then(setKcas); getOptions().then(setOptions) }, [])

  const load = () => {
    setLoading(true)
    requirementsApi.list({
      kca_id: kcaId || undefined,
      source_type: sourceType || undefined,
      deadline_phase: deadlinePhase || undefined,
      applicability: applicability || undefined,
      q: q || undefined,
    }).then(setRows).finally(() => setLoading(false))
  }
  useEffect(load, [kcaId, sourceType, deadlinePhase, applicability])

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next)
  }

  const kcaMap = useMemo(() => Object.fromEntries(kcas.map(k => [k.id, k])), [kcas])

  const counts = useMemo(() => {
    const applicable = rows.filter(r => r.applicability === 'APPLICABLE').length
    const tbd = rows.filter(r => r.applicability === 'TO_BE_DETERMINED').length
    const notApplicable = rows.filter(r => r.applicability === 'NOT_APPLICABLE').length
    return { applicable, tbd, notApplicable }
  }, [rows])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Requirements Library</h1>
          <p className="text-xs text-stone-500">Every row traces to an exact Act section, Rule, Schedule, or is marked as an internal requirement.</p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl('requirements')}><Button>Export CSV</Button></a>
          <Button variant="primary" onClick={() => setShowCreate(true)}>Add Requirement</Button>
        </div>
      </div>
      <Disclaimer />

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Applicable" value={counts.applicable} sub={`of ${rows.length} filtered requirements`} />
        <KpiCard label="To Be Determined" value={counts.tbd} sub={`of ${rows.length} filtered requirements`} accent={counts.tbd > 0 ? 'orange' : 'default'} />
        <KpiCard label="Not Applicable" value={counts.notApplicable} sub={`of ${rows.length} filtered requirements`} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-3">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
                 placeholder="Search title / description / section…" className={`${inputClass} w-64`} />
          <Select value={kcaId} onChange={v => setFilter('kca_id', v)} placeholder="All KCAs"
                  options={kcas.map(k => ({ value: String(k.id), label: `${k.code} — ${k.name}` }))} />
          <Select value={sourceType} onChange={v => setFilter('source_type', v)} placeholder="All Sources"
                  options={(options?.source_types ?? []).map(s => ({ value: s, label: label(s) }))} />
          <Select value={deadlinePhase} onChange={v => setFilter('deadline_phase', v)} placeholder="All Phases"
                  options={(options?.deadline_phases ?? []).map(s => ({ value: s, label: DEADLINE_PHASE_LABEL[s] ?? label(s) }))} />
          <Select value={applicability} onChange={v => setFilter('applicability', v)} placeholder="All Applicability"
                  options={(options?.applicability ?? []).map(s => ({ value: s, label: label(s) }))} />
          <Button onClick={load}>Search</Button>
          <span className="ml-auto text-xs text-stone-400">{rows.length} requirement(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">Title</th>
                <th className="px-3 py-2 text-left font-medium">Source</th>
                <th className="px-3 py-2 text-left font-medium">Reference</th>
                <th className="px-3 py-2 text-left font-medium">KCA</th>
                <th className="px-3 py-2 text-left font-medium">Phase</th>
                <th className="px-3 py-2 text-left font-medium">Applicability</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-3 py-6 text-stone-400">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-stone-400">No requirements match these filters.</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2 font-mono text-[11px] text-stone-500">
                    <Link to={`/requirements/${r.id}`} className="hover:text-orange-700">{r.requirement_id}</Link>
                  </td>
                  <td className="px-3 py-2 text-stone-700">
                    <Link to={`/requirements/${r.id}`} className="hover:text-orange-700">{r.title}</Link>
                  </td>
                  <td className="px-3 py-2"><span className={badgeClass(SOURCE_STYLE, r.source_type)}>{label(r.source_type)}</span></td>
                  <td className="px-3 py-2 text-stone-500">{r.section_reference}</td>
                  <td className="px-3 py-2 text-stone-500">{kcaMap[r.kca_id]?.code ?? '—'}</td>
                  <td className="px-3 py-2 text-stone-500">{DEADLINE_PHASE_LABEL[r.deadline_phase]?.split(' (')[0] ?? label(r.deadline_phase)}</td>
                  <td className="px-3 py-2"><ApplicabilityBadge value={r.applicability} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showCreate && options && (
        <RequirementFormModal kcas={kcas} options={options} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load() }} />
      )}
    </div>
  )
}

export function RequirementFormModal({ kcas, options, initial, onClose, onSaved }: {
  kcas: Kca[]; options: Options; initial?: LegalRequirement; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<LegalRequirement>>(initial ?? {
    requirement_id: '', title: '', description: '', source_type: 'INTERNAL', section_reference: '',
    source_url: '', kca_id: kcas[0]?.id, deadline_phase: 'ONGOING', applicability: 'TO_BE_DETERMINED',
    applicability_reason: '', notes: '',
  })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (initial) await requirementsApi.update(initial.id, form)
    else await requirementsApi.create(form)
    onSaved()
  }

  return (
    <Modal title={initial ? `Edit ${initial.requirement_id}` : 'Add Legal Requirement'} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Requirement ID"><input className={inputClass} value={form.requirement_id ?? ''} onChange={e => set('requirement_id', e.target.value)} /></Field>
        <Field label="KCA">
          <select className={inputClass} value={form.kca_id} onChange={e => set('kca_id', Number(e.target.value))}>
            {kcas.map(k => <option key={k.id} value={k.id}>{k.code} — {k.name}</option>)}
          </select>
        </Field>
        <Field label="Title"><input className={inputClass} value={form.title ?? ''} onChange={e => set('title', e.target.value)} /></Field>
        <div className="col-span-2">
          <Field label="Description"><textarea className={inputClass} rows={3} value={form.description ?? ''} onChange={e => set('description', e.target.value)} /></Field>
        </div>
        <Field label="Source Type">
          <select className={inputClass} value={form.source_type} onChange={e => set('source_type', e.target.value)}>
            {options.source_types.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="Section / Rule Reference"><input className={inputClass} value={form.section_reference ?? ''} onChange={e => set('section_reference', e.target.value)} /></Field>
        <div className="col-span-2">
          <Field label="Source URL"><input className={inputClass} value={form.source_url ?? ''} onChange={e => set('source_url', e.target.value)} /></Field>
        </div>
        <Field label="Deadline Phase">
          <select className={inputClass} value={form.deadline_phase} onChange={e => set('deadline_phase', e.target.value)}>
            {options.deadline_phases.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="Applicability">
          <select className={inputClass} value={form.applicability} onChange={e => set('applicability', e.target.value)}>
            {options.applicability.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Applicability Reason"><textarea className={inputClass} rows={2} value={form.applicability_reason ?? ''} onChange={e => set('applicability_reason', e.target.value)} /></Field>
        </div>
        <div className="col-span-2">
          <Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Save</Button>
      </div>
    </Modal>
  )
}
