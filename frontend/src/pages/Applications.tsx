import { useState } from 'react'
import { applicationsApi } from '../lib/api'
import { Modal, Field, inputClass, Button } from '../components/ui'
import { label } from '../lib/format'
import type { Application, Options } from '../lib/types'

// The Applications list view now lives in Settings (an application/system is
// reference data you set up once, same treatment as KCAs/Owners) - this file
// keeps only the shared form modal, reused by Settings and by ApplicationDetail.

export function ApplicationFormModal({ options, initial, onClose, onSaved }: {
  options: Options; initial?: Application; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<Application>>(initial ?? {
    name: '', environment: '', business_owner: '', technical_owner: '',
    personal_data_processed: '', processing_purposes: '',
    consent_integration_status: 'NOT_STARTED', dpdp_assessment_status: 'NOT_STARTED', notes: '',
  })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (initial) await applicationsApi.update(initial.id, form)
    else await applicationsApi.create(form)
    onSaved()
  }

  return (
    <Modal title={initial ? `Edit ${initial.name}` : 'Add Application'} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><input className={inputClass} value={form.name ?? ''} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Environment">
          <select className={inputClass} value={form.environment ?? ''} onChange={e => set('environment', e.target.value)}>
            <option value="">Not specified</option>
            {options.environments.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Business Owner"><input className={inputClass} value={form.business_owner ?? ''} onChange={e => set('business_owner', e.target.value)} /></Field>
        <Field label="Technical Owner"><input className={inputClass} value={form.technical_owner ?? ''} onChange={e => set('technical_owner', e.target.value)} /></Field>
        <div className="col-span-2"><Field label="Personal Data Processed"><textarea className={inputClass} rows={2} value={form.personal_data_processed ?? ''} onChange={e => set('personal_data_processed', e.target.value)} /></Field></div>
        <div className="col-span-2"><Field label="Processing Purposes"><textarea className={inputClass} rows={2} value={form.processing_purposes ?? ''} onChange={e => set('processing_purposes', e.target.value)} /></Field></div>
        <Field label="Consent Integration Status">
          <select className={inputClass} value={form.consent_integration_status} onChange={e => set('consent_integration_status', e.target.value)}>
            {options.consent_integration_statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="DPDP Assessment Status">
          <select className={inputClass} value={form.dpdp_assessment_status} onChange={e => set('dpdp_assessment_status', e.target.value)}>
            {options.application_assessment_statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <div className="col-span-2"><Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></Field></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Save</Button>
      </div>
    </Modal>
  )
}
