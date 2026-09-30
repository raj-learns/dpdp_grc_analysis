import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { kcasApi, ownersApi, applicationsApi, getOptions, resetDemoData } from '../lib/api'
import { Card, CardHeader, Button, Modal, Field, inputClass, Disclaimer } from '../components/ui'
import { label } from '../lib/format'
import { ApplicationFormModal } from './Applications'
import type { Kca, Owner, Application, Options } from '../lib/types'

export default function Settings() {
  const [kcas, setKcas] = useState<Kca[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [options, setOptions] = useState<Options | null>(null)
  const [editingKca, setEditingKca] = useState<Kca | 'new' | null>(null)
  const [editingOwner, setEditingOwner] = useState<Owner | 'new' | null>(null)
  const [editingApplication, setEditingApplication] = useState<Application | 'new' | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const load = () => { kcasApi.list().then(setKcas); ownersApi.list().then(setOwners); applicationsApi.list().then(setApplications) }
  useEffect(() => { load(); getOptions().then(setOptions) }, [])

  const doReset = async () => {
    setResetting(true)
    const res = await resetDemoData()
    setResetting(false)
    setResetConfirm(false)
    setResetMsg(res.message)
    load()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Settings</h1>
        <p className="text-xs text-stone-500">Manage the internal KCA framework, owners and applications. Fixed vocabularies (statuses, priorities, etc.) are listed read-only below.</p>
      </div>
      <Disclaimer />

      <Card>
        <CardHeader title="Internal DPDP Compliance Assessment Domains (KCAs)" subtitle="Internal grouping only — not an official statutory classification" right={<Button variant="primary" onClick={() => setEditingKca('new')}>Add KCA</Button>} />
        <div className="divide-y divide-stone-100">
          {kcas.map(k => (
            <div key={k.id} className="flex items-center justify-between px-4 py-2 text-xs">
              <div>
                <span className="font-medium text-stone-700">{k.code} — {k.name}</span>
                <p className="text-stone-400">{k.description}</p>
              </div>
              <Button onClick={() => setEditingKca(k)}>Edit</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Owners" subtitle="People/roles that can own controls and actions" right={<Button variant="primary" onClick={() => setEditingOwner('new')}>Add Owner</Button>} />
        <div className="divide-y divide-stone-100">
          {owners.map(o => (
            <div key={o.id} className="flex items-center justify-between px-4 py-2 text-xs">
              <div>
                <span className="font-medium text-stone-700">{o.name}</span>
                {o.role && <span className="ml-2 text-stone-400">{o.role}</span>}
              </div>
              <Button onClick={() => setEditingOwner(o)}>Edit</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Applications"
          subtitle="Systems that process personal data — click through for per-application readiness"
          right={<Button variant="primary" onClick={() => setEditingApplication('new')}>Add Application</Button>}
        />
        <div className="divide-y divide-stone-100">
          {applications.map(a => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2 text-xs">
              <Link to={`/applications/${a.id}`} className="min-w-0 hover:text-orange-700">
                <span className="font-medium text-stone-700">{a.name}</span>
                <span className="ml-2 text-stone-400">{a.environment || 'Environment not specified'}</span>
              </Link>
              <Button onClick={() => setEditingApplication(a)}>Edit</Button>
            </div>
          ))}
          {applications.length === 0 && <div className="px-4 py-3 text-xs text-stone-400">No applications yet.</div>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Fixed Vocabularies" subtitle="Statuses, priorities and other option lists used across the app" />
        {options && (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
            <VocabList title="Control Statuses" items={options.control_statuses} />
            <VocabList title="Action Statuses" items={options.action_statuses} />
            <VocabList title="Applicability" items={options.applicability} />
            <VocabList title="Priorities" items={options.priorities} />
            <VocabList title="Evidence Types" items={options.evidence_types} />
            <VocabList title="Deadline Phases" items={options.deadline_phases} />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Reset Demo Data" subtitle="Wipes ALL data (including anything you've added or edited) and reloads the reference/demo dataset" />
        <div className="p-4">
          {resetMsg && <p className="mb-2 text-xs text-emerald-600">{resetMsg}</p>}
          <Button variant="danger" onClick={() => setResetConfirm(true)}>Reset Demo Data…</Button>
        </div>
      </Card>

      {resetConfirm && (
        <Modal title="Confirm Reset" onClose={() => setResetConfirm(false)}>
          <p className="text-xs text-stone-600">
            This will permanently delete every requirement, control, action, evidence item, application and owner
            currently in the database, and reload the original reference/demo dataset. This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setResetConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={doReset}>{resetting ? 'Resetting…' : 'Yes, wipe and reset'}</Button>
          </div>
        </Modal>
      )}

      {editingKca && (
        <KcaFormModal initial={editingKca === 'new' ? undefined : editingKca} onClose={() => setEditingKca(null)} onSaved={() => { setEditingKca(null); load() }} />
      )}
      {editingOwner && (
        <OwnerFormModal initial={editingOwner === 'new' ? undefined : editingOwner} onClose={() => setEditingOwner(null)} onSaved={() => { setEditingOwner(null); load() }} />
      )}
      {editingApplication && options && (
        <ApplicationFormModal
          options={options}
          initial={editingApplication === 'new' ? undefined : editingApplication}
          onClose={() => setEditingApplication(null)}
          onSaved={() => { setEditingApplication(null); load() }}
        />
      )}
    </div>
  )
}

function VocabList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">{title}</div>
      <ul className="space-y-0.5 text-xs text-stone-600">
        {items.map(i => <li key={i}>{label(i)}</li>)}
      </ul>
    </div>
  )
}

function KcaFormModal({ initial, onClose, onSaved }: { initial?: Kca; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Kca>>(initial ?? { code: '', name: '', description: '', sort_order: 0 })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const submit = async () => { if (initial) await kcasApi.update(initial.id, form); else await kcasApi.create(form); onSaved() }
  return (
    <Modal title={initial ? `Edit ${initial.code}` : 'Add KCA'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Code (e.g. KCA-13)"><input className={inputClass} value={form.code ?? ''} onChange={e => set('code', e.target.value)} /></Field>
        <Field label="Name"><input className={inputClass} value={form.name ?? ''} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Description"><textarea className={inputClass} rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} /></Field>
        <Field label="Sort Order"><input type="number" className={inputClass} value={form.sort_order ?? 0} onChange={e => set('sort_order', Number(e.target.value))} /></Field>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save</Button></div>
    </Modal>
  )
}

function OwnerFormModal({ initial, onClose, onSaved }: { initial?: Owner; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Owner>>(initial ?? { name: '', role: '', email: '' })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const submit = async () => { if (initial) await ownersApi.update(initial.id, form); else await ownersApi.create(form); onSaved() }
  return (
    <Modal title={initial ? `Edit ${initial.name}` : 'Add Owner'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name"><input className={inputClass} value={form.name ?? ''} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Role"><input className={inputClass} value={form.role ?? ''} onChange={e => set('role', e.target.value)} /></Field>
        <Field label="Email"><input className={inputClass} value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></Field>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save</Button></div>
    </Modal>
  )
}
