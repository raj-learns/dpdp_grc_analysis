import { useEffect, useMemo, useState } from 'react'
import {
  getQuestionnaireQuestions, getQuestionnaireProgress, questionnaireResponsesApi, kcasApi, getOptions,
  getSuggestions, applySuggestions, ownersApi,
} from '../lib/api'
import { Card, Button, Field, inputClass, Disclaimer, ProgressBar, ConfidenceBadge, EmptyState, SectionLabel } from '../components/ui'
import { label, fmtDate, QUESTIONNAIRE_SECTION_LABEL } from '../lib/format'
import type { QuestionnaireQuestion, QuestionnaireResponse, QuestionnaireProgressRow, Kca, Options, Suggestion, ApplySuggestionResult, Owner } from '../lib/types'

// Static fallback so the sidebar has content before /settings/options resolves;
// the live list from Options.questionnaire_sections is the source of truth.
const SECTION_FALLBACK = [
  'ENTERPRISE', 'KCA-01', 'KCA-02', 'KCA-03', 'KCA-04', 'KCA-05', 'KCA-06',
  'KCA-07', 'KCA-08', 'KCA-09', 'KCA-10', 'KCA-11', 'KCA-12',
  'APPLICATION', 'VENDOR', 'DATAFLOW', 'CONTROL', 'ACTION', 'EVIDENCE',
]

const emptyResponseForm = (questionId: number) => ({
  question_id: questionId, instance_label: '', respondent_name: '', respondent_department: '',
  answer_text: '', evidence_note: '', confidence: '', answered_date: null as string | null, notes: '',
})

export default function Questionnaire() {
  const [kcas, setKcas] = useState<Kca[]>([])
  const [options, setOptions] = useState<Options | null>(null)
  const [progress, setProgress] = useState<QuestionnaireProgressRow[]>([])
  const [section, setSection] = useState('ENTERPRISE')
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([])
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    kcasApi.list().then(setKcas)
    getOptions().then(setOptions)
    refreshProgress()
  }, [])

  const refreshProgress = () => getQuestionnaireProgress().then(setProgress)

  const loadSection = () => {
    setLoading(true)
    Promise.all([
      getQuestionnaireQuestions({ section }),
      questionnaireResponsesApi.list({ section }),
    ]).then(([qs, rs]) => { setQuestions(qs); setResponses(rs) }).finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadSection, [section])

  const responsesByQuestion = useMemo(() => {
    const m: Record<number, QuestionnaireResponse[]> = {}
    for (const r of responses) (m[r.question_id] ??= []).push(r)
    return m
  }, [responses])

  const kcaByCode = useMemo(() => Object.fromEntries(kcas.map(k => [k.code, k])), [kcas])
  const progressBySection = useMemo(() => Object.fromEntries(progress.map(p => [p.section, p])), [progress])
  const sectionList = options?.questionnaire_sections?.length ? options.questionnaire_sections : SECTION_FALLBACK

  const filteredQuestions = useMemo(() => {
    if (!search.trim()) return questions
    const q = search.toLowerCase()
    return questions.filter(x =>
      x.question_id.toLowerCase().includes(q) ||
      x.topic.toLowerCase().includes(q) ||
      x.question_text.toLowerCase().includes(q) ||
      x.who_should_answer.toLowerCase().includes(q),
    )
  }, [questions, search])

  const toggle = (id: number) => setExpanded(s => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const afterSave = () => { loadSection(); refreshProgress() }

  const overall = progress.reduce((acc, p) => ({ total: acc.total + p.total, answered: acc.answered + p.answered }), { total: 0, answered: 0 })
  const overallPct = overall.total ? Math.round((overall.answered / overall.total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Stakeholder Questionnaire</h1>
          <p className="text-xs text-stone-500">
            Interview managers/stakeholders section by section and record their answers here — recorded answers are
            the source data used later to fill in Requirements, Controls, Actions, Applications and Evidence.
          </p>
        </div>
        <div className="w-52 shrink-0">
          <div className="mb-1 text-right text-[11px] text-stone-500">{overall.answered} / {overall.total} answered overall</div>
          <ProgressBar pct={overallPct} />
        </div>
      </div>
      <Disclaimer />

      <div className="grid grid-cols-[240px_1fr] gap-4">
        <Card className="h-fit">
          <div className="p-2">
            {sectionList.map(s => {
              const p = progressBySection[s]
              const pct = p && p.total ? Math.round((p.answered / p.total) * 100) : 0
              const subLabel = s.startsWith('KCA-') ? kcaByCode[s]?.name : QUESTIONNAIRE_SECTION_LABEL[s]
              return (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`mb-1 block w-full rounded px-2 py-1.5 text-left transition-colors ${
                    section === s ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${section === s ? 'text-orange-700' : 'text-stone-700'}`}>{s}</span>
                    <span className="shrink-0 text-[10px] text-stone-400">{p ? `${p.answered}/${p.total}` : '—'}</span>
                  </div>
                  {subLabel && <div className="truncate text-[11px] text-stone-400">{subLabel}</div>}
                  <div className="mt-1"><ProgressBar pct={pct} /></div>
                </button>
              )
            })}
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <div className="flex items-center gap-2 border-b border-stone-200 p-3">
              <input
                className={inputClass}
                placeholder="Search this section's questions (ID, topic, who should answer)…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="ml-auto whitespace-nowrap text-xs text-stone-400">{filteredQuestions.length} question(s)</span>
            </div>
          </Card>

          {loading && <Card><div className="p-6 text-xs text-stone-400">Loading…</div></Card>}
          {!loading && filteredQuestions.length === 0 && (
            <Card><EmptyState title="No questions match" body="Try clearing the search box." /></Card>
          )}

          {!loading && filteredQuestions.map(q => (
            <QuestionCard
              key={q.id}
              question={q}
              responses={responsesByQuestion[q.id] ?? []}
              expanded={expanded.has(q.id)}
              onToggle={() => toggle(q.id)}
              options={options}
              onSaved={afterSave}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function QuestionCard({ question, responses, expanded, onToggle, options, onSaved }: {
  question: QuestionnaireQuestion
  responses: QuestionnaireResponse[]
  expanded: boolean
  onToggle: () => void
  options: Options | null
  onSaved: () => void
}) {
  return (
    <Card className={expanded ? 'ring-1 ring-orange-300' : ''}>
      <button
        onClick={onToggle}
        className={`flex w-full items-start justify-between gap-3 p-3 text-left ${expanded ? 'bg-orange-50/60' : ''}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-500">{question.question_id}</span>
            <span className={`font-medium text-stone-800 ${expanded ? 'text-base' : 'text-sm'}`}>{question.topic}</span>
            {responses.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                {responses.length} answer{responses.length > 1 ? 's' : ''} recorded
              </span>
            )}
            {question.repeatable && (
              <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">answer once per item</span>
            )}
          </div>
          <p className={expanded ? 'mt-1.5 text-sm font-medium text-stone-900' : 'mt-1 text-xs text-stone-600'}>{question.question_text}</p>
        </div>
        <span className="mt-1 shrink-0 text-stone-400">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-stone-200 p-3">
          <div>
            <SectionLabel>{question.repeatable ? 'Record another answer' : 'Record an answer'}</SectionLabel>
            <ResponseForm question={question} options={options} onSaved={onSaved} />
          </div>

          {responses.length > 0 && (
            <div className="space-y-2">
              <SectionLabel>Recorded answers</SectionLabel>
              {responses.map(r => (
                <ResponseRow key={r.id} response={r} question={question} options={options} onChanged={onSaved} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-stone-100 pt-3 text-[11px] text-stone-500 sm:grid-cols-2">
            {question.why && <div className="sm:col-span-2"><span className="font-medium text-stone-600">Why we're asking: </span>{question.why}</div>}
            {question.answer_type && <div><span className="font-medium text-stone-600">Expected answer: </span>{question.answer_type}</div>}
            {question.evidence_hint && <div><span className="font-medium text-stone-600">Evidence that would help: </span>{question.evidence_hint}</div>}
            <div><span className="font-medium text-stone-600">Who should answer: </span>{question.who_should_answer || '—'}</div>
            {question.followup && <div className="sm:col-span-2"><span className="font-medium text-stone-600">Follow-up if applicable: </span>{question.followup}</div>}
            {question.notes && <div className="sm:col-span-2"><span className="font-medium text-stone-600">Notes: </span>{question.notes}</div>}
            <div className="sm:col-span-2"><span className="font-medium text-stone-600">GRC field(s) this populates: </span><span className="font-mono">{question.grc_fields}</span></div>
          </div>
        </div>
      )}
    </Card>
  )
}

function ResponseRow({ response, question, options, onChanged }: {
  response: QuestionnaireResponse
  question: QuestionnaireQuestion
  options: Options | null
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <ResponseForm
        question={question}
        initial={response}
        options={options}
        onSaved={() => { setEditing(false); onChanged() }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const remove = async () => {
    if (!confirm('Delete this recorded answer?')) return
    await questionnaireResponsesApi.remove(response.id)
    onChanged()
  }

  return (
    <div className="rounded border border-stone-200 p-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {response.instance_label && (
            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">{response.instance_label}</span>
          )}
          <span className="font-medium text-stone-700">{response.respondent_name || 'Unnamed respondent'}</span>
          {response.respondent_department && <span className="text-stone-400">({response.respondent_department})</span>}
          {response.confidence && <ConfidenceBadge value={response.confidence} />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-400">{fmtDate(response.answered_date)}</span>
          <Button onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="danger" onClick={remove}>Delete</Button>
        </div>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-stone-700">{response.answer_text || '—'}</p>
      {response.evidence_note && <p className="mt-1 text-stone-500"><span className="font-medium">Evidence: </span>{response.evidence_note}</p>}
      {response.notes && <p className="mt-1 text-stone-400"><span className="font-medium">Notes: </span>{response.notes}</p>}
      <SuggestionsPanel response={response} />
    </div>
  )
}

function SuggestionsPanel({ response }: { response: QuestionnaireResponse }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Record<string, ApplySuggestionResult>>({})
  const [owners, setOwners] = useState<Owner[]>([])
  const [extraInput, setExtraInput] = useState<Record<string, { owner_id?: number; target_date?: string }>>({})
  const [applying, setApplying] = useState(false)

  const load = () => {
    setLoading(true)
    getSuggestions(response.id)
      .then(rows => {
        setSuggestions(rows)
        setChecked(new Set(rows.filter(r => !r.already_applied && !r.requires_extra_input).map(r => r.target_key)))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open && suggestions.length === 0) {
      load()
      ownersApi.list().then(setOwners)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleChecked = (key: string) => setChecked(c => {
    const next = new Set(c)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const canApply = (s: Suggestion) => {
    if (!checked.has(s.target_key)) return false
    if (s.requires_extra_input) {
      const extra = extraInput[s.target_key]
      return !!extra?.owner_id && !!extra?.target_date
    }
    return true
  }

  const apply = async () => {
    const items = suggestions.filter(s => checked.has(s.target_key) && canApply(s)).map(s => ({
      target_key: s.target_key, entity_type: s.entity_type, entity_code: s.entity_code,
      field_name: s.field_name, proposed_value: s.proposed_value,
      ...(s.requires_extra_input ? extraInput[s.target_key] : {}),
    }))
    if (items.length === 0) return
    setApplying(true)
    try {
      const res = await applySuggestions(response.id, items)
      setResults(Object.fromEntries(res.results.map(r => [r.target_key, r])))
      load()
    } finally {
      setApplying(false)
    }
  }

  const applyableCount = suggestions.filter(s => !s.already_applied).length

  return (
    <div className="mt-2 rounded border border-dashed border-orange-200 bg-orange-50/40 p-2">
      <button className="text-[11px] font-medium text-orange-700" onClick={() => setOpen(o => !o)}>
        {open ? '−' : '+'} Show suggested GRC updates
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {loading && <div className="text-[11px] text-stone-400">Computing…</div>}
          {!loading && suggestions.length === 0 && (
            <div className="text-[11px] text-stone-400">No concrete suggestions could be derived from this answer — this question likely feeds a field that needs human judgement.</div>
          )}
          {!loading && suggestions.map(s => (
            <div key={s.target_key} className="flex items-start gap-2 rounded border border-stone-200 bg-white p-1.5 text-[11px]">
              {!s.requires_extra_input && (
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked.has(s.target_key)}
                  onChange={() => toggleChecked(s.target_key)}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-mono text-stone-500">
                  {s.entity_type}{s.entity_code ? `:${s.entity_code}` : ' (new)'}.{s.field_name}
                </div>
                <div className="mt-0.5 text-stone-600">
                  {s.current_value ? <span className="text-stone-400 line-through">{s.current_value.length > 80 ? '…' + s.current_value.slice(-80) : s.current_value}</span> : <span className="text-stone-400">—</span>}
                  {' → '}
                  <span className="font-medium text-stone-900">{s.proposed_value.length > 200 ? s.proposed_value.slice(0, 200) + '…' : s.proposed_value}</span>
                </div>
                <div className="mt-0.5 text-stone-400">from: {s.source_clause}</div>

                {s.requires_extra_input && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked.has(s.target_key)}
                      onChange={() => toggleChecked(s.target_key)}
                    />
                    <select
                      className={inputClass}
                      style={{ width: 160 }}
                      value={extraInput[s.target_key]?.owner_id ?? ''}
                      onChange={e => setExtraInput(ex => ({ ...ex, [s.target_key]: { ...ex[s.target_key], owner_id: e.target.value ? Number(e.target.value) : undefined } }))}
                    >
                      <option value="">Owning dept…</option>
                      {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <input
                      type="date"
                      className={inputClass}
                      style={{ width: 140 }}
                      value={extraInput[s.target_key]?.target_date ?? ''}
                      onChange={e => setExtraInput(ex => ({ ...ex, [s.target_key]: { ...ex[s.target_key], target_date: e.target.value || undefined } }))}
                    />
                  </div>
                )}

                {s.already_applied && (
                  <div className="mt-0.5 text-emerald-600">Already applied on {fmtDate(s.already_applied_at)}</div>
                )}
                {results[s.target_key] && (
                  <div className={`mt-0.5 ${results[s.target_key].success ? 'text-emerald-600' : 'text-red-600'}`}>
                    {results[s.target_key].message}
                  </div>
                )}
              </div>
            </div>
          ))}
          {!loading && applyableCount > 0 && (
            <div className="flex justify-end">
              <Button variant="primary" onClick={apply} className={applying ? 'opacity-50' : ''}>
                {applying ? 'Applying…' : 'Apply selected'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResponseForm({ question, initial, options, onSaved, onCancel }: {
  question: QuestionnaireQuestion
  initial?: QuestionnaireResponse
  options: Options | null
  onSaved: () => void
  onCancel?: () => void
}) {
  const [form, setForm] = useState<any>(initial ?? emptyResponseForm(question.id))
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true)
    try {
      if (initial) await questionnaireResponsesApi.update(initial.id, form)
      else await questionnaireResponsesApi.create({ ...form, question_id: question.id })
      if (!initial) setForm(emptyResponseForm(question.id))
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded border border-dashed border-stone-300 bg-stone-50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.repeatable && (
          <div className="sm:col-span-2">
            <Field label="Which application / vendor / control / etc. is this answer for?">
              <input className={inputClass} value={form.instance_label ?? ''} onChange={e => set('instance_label', e.target.value)} placeholder="e.g. DigiVarsity Pre-Production" />
            </Field>
          </div>
        )}
        <Field label="Respondent name">
          <input className={inputClass} value={form.respondent_name ?? ''} onChange={e => set('respondent_name', e.target.value)} />
        </Field>
        <Field label="Department / role">
          <input className={inputClass} value={form.respondent_department ?? ''} onChange={e => set('respondent_department', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Answer">
            <textarea
              className={inputClass}
              rows={3}
              value={form.answer_text ?? ''}
              onChange={e => set('answer_text', e.target.value)}
              placeholder={question.answer_type || 'Record the answer here'}
            />
          </Field>
        </div>
        <Field label="Confidence">
          <select className={inputClass} value={form.confidence ?? ''} onChange={e => set('confidence', e.target.value)}>
            <option value="">—</option>
            {(options?.response_confidence ?? []).map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <Field label="Date answered">
          <input type="date" className={inputClass} value={form.answered_date ?? ''} onChange={e => set('answered_date', e.target.value || null)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Evidence (link, path, or description — if any)">
            <input className={inputClass} value={form.evidence_note ?? ''} onChange={e => set('evidence_note', e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <input className={inputClass} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        <Button variant="primary" onClick={submit} className={saving ? 'opacity-50' : ''}>{initial ? 'Save changes' : 'Save answer'}</Button>
      </div>
    </div>
  )
}
