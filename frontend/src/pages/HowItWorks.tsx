import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader } from '../components/ui'

type Node = {
  id: string; title: string; tag: string; what: string; example: string
  links: string[]; route: string; col: number; row: number
}

// col/row place each box on the map; links are the connections highlighted on click.
const NODES: Node[] = [
  { id: 'req', title: 'Legal Requirement', tag: 'What the law says', col: 0, row: 0, route: '/requirements',
    what: 'A section or rule of the DPDP Act that applies to us. Each is marked Applicable, Not Applicable or To Be Determined.',
    example: 'Rule 4 - Consent Manager registration', links: ['kca', 'ctl'] },
  { id: 'kca', title: 'KCA', tag: '12 internal groups', col: 1, row: 0, route: '/kca-scorecard',
    what: 'Key Compliance Area: an internal bucket (e.g. Consent Management) that groups requirements, controls and actions so progress rolls up per area.',
    example: 'Consent Management', links: ['req', 'ctl', 'act', 'dash'] },
  { id: 'ctl', title: 'Control', tag: 'How we comply', col: 2, row: 0, route: '/controls',
    what: 'A safeguard or process that satisfies a requirement. A control is implemented through one or more actions.',
    example: 'Capture and store user consent', links: ['req', 'kca', 'act', 'evd'] },
  { id: 'act', title: 'Action', tag: 'The actual task', col: 2, row: 1, route: '/actions',
    what: 'A concrete task with an owning department, a person, a target date and a status. It cannot be marked Completed without evidence.',
    example: 'Add consent banner to portal - due 15 Oct', links: ['ctl', 'kca', 'own', 'app', 'evd', 'dash'] },
  { id: 'own', title: 'Owner', tag: 'Department + person', col: 1, row: 1, route: '/actions',
    what: 'Every action has an owning department/team and a named person doing the work, so nothing is unassigned.',
    example: 'IT Security / Priya', links: ['act'] },
  { id: 'app', title: 'Application', tag: 'A system we run', col: 3, row: 1, route: '/applications/1',
    what: 'A system that handles personal data. Actions are tagged to it, so each application has its own compliance %. Target: an application must be compliant before go-live.',
    example: 'DigiVarsity portal, CDMS', links: ['act', 'evd', 'dash'] },
  { id: 'evd', title: 'Evidence', tag: 'Proof it is done', col: 3, row: 0, route: '/evidence',
    what: 'A file or URL (screenshot, audit log, policy) proving an action was carried out. Attach it from the action itself; it also shows in the Evidence section. One item can back several actions.',
    example: 'Screenshot of live consent banner', links: ['act', 'ctl', 'app'] },
  { id: 'dash', title: 'Dashboard & Reports', tag: 'The result', col: 4, row: 0, route: '/',
    what: 'Every percentage is calculated live from action status. Change one action and the scorecard, gaps and dashboard all move.',
    example: 'Overall 32% - 4 actions overdue', links: ['kca', 'act', 'app'] },
]

const FLOW = [
  'Requirement says what the law needs',
  'KCA groups it into an area',
  'Control defines how we comply',
  'Action is the task, with owner and date',
  'Evidence proves it, so the action can close',
  'Dashboard recalculates the compliance score',
]

export default function HowItWorks() {
  const [selectedId, setSelectedId] = useState<string>('act')
  const selected = NODES.find(n => n.id === selectedId)!
  const lit = new Set([selected.id, ...selected.links])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-stone-800">How It Works</h1>
        <p className="text-xs text-stone-500">Click any box to see what it is and what it connects to.</p>
      </div>

      <Card>
        <CardHeader title="How compliance flows through the tool" subtitle="Left to right: from the law to the score" />
        <ol className="flex flex-wrap items-center gap-2 p-4 text-xs">
          {FLOW.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-stone-700">
                <span className="mr-1 font-semibold text-orange-700">{i + 1}.</span>{step}
              </span>
              {i < FLOW.length - 1 && <span className="text-stone-300">→</span>}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Connection map" subtitle="Selected box and everything linked to it stay highlighted" />
          <div className="grid grid-cols-5 gap-3 p-4">
            {NODES.map(n => {
              const isSel = n.id === selected.id
              const isLit = lit.has(n.id)
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedId(n.id)}
                  style={{ gridColumnStart: n.col + 1, gridRowStart: n.row + 1 }}
                  className={`rounded-md border px-2 py-3 text-left transition-all ${
                    isSel ? 'border-orange-500 bg-orange-50 shadow-sm'
                    : isLit ? 'border-orange-200 bg-white'
                    : 'border-stone-200 bg-stone-50 opacity-40 hover:opacity-70'
                  }`}
                >
                  <div className="text-[13px] font-semibold text-stone-800">{n.title}</div>
                  <div className="text-[11px] text-stone-500">{n.tag}</div>
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title={selected.title} subtitle={selected.tag} />
          <div className="space-y-3 p-4 text-xs text-stone-600">
            <p>{selected.what}</p>
            <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2">
              <span className="font-semibold text-stone-700">Example: </span>{selected.example}
            </div>
            <div>
              <div className="mb-1 font-semibold text-stone-700">Connects to</div>
              <div className="flex flex-wrap gap-1">
                {selected.links.map(id => {
                  const n = NODES.find(x => x.id === id)!
                  return (
                    <button key={id} type="button" onClick={() => setSelectedId(id)}
                            className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] text-orange-800 hover:bg-orange-100">
                      {n.title}
                    </button>
                  )
                })}
              </div>
            </div>
            <Link to={selected.route} className="inline-block font-medium text-orange-700 underline">
              Open {selected.title} page →
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Two levels of compliance" subtitle="Organisation-wide and per application" />
        <div className="grid grid-cols-1 gap-3 p-4 text-xs text-stone-600 md:grid-cols-2">
          <div className="rounded border border-stone-200 p-3">
            <div className="mb-1 font-semibold text-stone-800">Organisation level</div>
            Overall posture across all actions. It can dip when a new system is added, until that system is remediated.
          </div>
          <div className="rounded border border-stone-200 p-3">
            <div className="mb-1 font-semibold text-stone-800">Application level</div>
            Each system is judged on its own actions. Planned rule: a system stays in test until it is compliant, then goes live.
          </div>
        </div>
      </Card>
    </div>
  )
}
