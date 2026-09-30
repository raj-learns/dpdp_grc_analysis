import { useEffect, useState } from 'react'
import { getGaps, exportUrl } from '../lib/api'
import { Card, Select, PriorityBadge, StatusBadge, Button, Disclaimer, EmptyState } from '../components/ui'
import { fmtDate, label } from '../lib/format'

export default function GapAnalysis() {
  const [rows, setRows] = useState<any[]>([])
  const [severity, setSeverity] = useState('')
  const [kca, setKca] = useState('')

  useEffect(() => { getGaps().then(setRows) }, [])

  const kcas = Array.from(new Set(rows.map(r => r.kca_code))).sort()
  const filtered = rows.filter(r => (!severity || r.severity === severity) && (!kca || r.kca_code === kca))

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Gap Analysis</h1>
          <p className="text-xs text-stone-500">Applicable controls that are not started or have a confirmed gap, ranked by priority, phase proximity and target date.</p>
        </div>
        <a href={exportUrl('gaps')}><Button>Export CSV</Button></a>
      </div>
      <Disclaimer />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-3">
          <Select value={severity} onChange={setSeverity} placeholder="All Severities"
                  options={['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => ({ value: s, label: label(s) }))} />
          <Select value={kca} onChange={setKca} placeholder="All KCAs" options={kcas.map(k => ({ value: k, label: k }))} />
          <span className="ml-auto text-xs text-stone-400">{filtered.length} gap(s)</span>
        </div>
        {filtered.length === 0 ? <EmptyState title="No open gaps match these filters." body="That's either genuinely good news, or the control register still needs populating — check the KCA Scorecard for TBD/unassigned items." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Gap</th>
                  <th className="px-3 py-2 text-left font-medium">KCA</th>
                  <th className="px-3 py-2 text-left font-medium">Legal Reference</th>
                  <th className="px-3 py-2 text-left font-medium">Affected Applications</th>
                  <th className="px-3 py-2 text-left font-medium">Severity</th>
                  <th className="px-3 py-2 text-left font-medium">Owner</th>
                  <th className="px-3 py-2 text-left font-medium">Target Date</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.control_id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 text-stone-700">{r.gap}</td>
                    <td className="px-3 py-2 text-stone-500">{r.kca_code}</td>
                    <td className="px-3 py-2 text-stone-500">{r.legal_reference}</td>
                    <td className="px-3 py-2 text-stone-500">{r.affected_applications.join(', ') || '—'}</td>
                    <td className="px-3 py-2"><PriorityBadge value={r.severity} /></td>
                    <td className="px-3 py-2 text-stone-500">{r.owner}</td>
                    <td className="px-3 py-2 text-stone-500">{fmtDate(r.target_date)}</td>
                    <td className="px-3 py-2"><StatusBadge value={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
