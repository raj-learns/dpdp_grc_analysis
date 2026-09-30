import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../lib/api'
import { Card, CardHeader, Disclaimer, ProgressBar } from '../components/ui'
import { pct } from '../lib/format'
import type { KcaScoreRow } from '../lib/types'

export default function KcaScorecard() {
  const [rows, setRows] = useState<KcaScoreRow[] | null>(null)

  useEffect(() => { getDashboard().then(d => setRows(d.kca_scorecard)) }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">KCA Scorecard</h1>
        <p className="text-xs text-stone-500">
          Internal DPDP Compliance Assessment Domains — an internal reporting structure, not a statutory classification.
          Compliance % = applicable controls Implemented/Evidence Verified ÷ total applicable controls.
        </p>
      </div>
      <Disclaimer />

      <Card>
        <CardHeader title="All 12 Internal KCAs" subtitle="Click a row to see its requirements" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">KCA</th>
                <th className="px-3 py-2 text-right font-medium">Applicable</th>
                <th className="px-3 py-2 text-right font-medium">Implemented</th>
                <th className="px-3 py-2 text-right font-medium">In Progress</th>
                <th className="px-3 py-2 text-right font-medium">Not Started</th>
                <th className="px-3 py-2 text-right font-medium">N/A</th>
                <th className="px-3 py-2 text-right font-medium">TBD</th>
                <th className="px-3 py-2 text-right font-medium">Critical Open Actions</th>
                <th className="px-3 py-2 text-left font-medium">Compliance %</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && <tr><td className="px-3 py-6 text-stone-400" colSpan={9}>Loading…</td></tr>}
              {rows?.map(r => (
                <tr key={r.kca_id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2">
                    <Link to={`/requirements?kca_id=${r.kca_id}&applicability=APPLICABLE`} className="font-medium text-stone-800 hover:text-orange-700">
                      {r.kca_code} — {r.kca_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right text-stone-600">{r.applicable_controls}</td>
                  <td className="px-3 py-2 text-right text-stone-600">{r.implemented}</td>
                  <td className="px-3 py-2 text-right text-stone-600">{r.in_progress}</td>
                  <td className="px-3 py-2 text-right text-stone-600">{r.not_started}</td>
                  <td className="px-3 py-2 text-right text-stone-400">{r.not_applicable}</td>
                  <td className="px-3 py-2 text-right text-violet-500">{r.to_be_determined}</td>
                  <td className="px-3 py-2 text-right text-red-600">{r.critical_open_actions}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-24"><ProgressBar pct={r.compliance_pct ?? 0} /></div>
                      <span className="w-10 text-stone-700">{pct(r.compliance_pct)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[11px] text-stone-400">
        Compliance percentage is calculated from applicable controls — not from the number of KCAs. Not Applicable and To Be Determined controls are excluded from the denominator and shown separately.
      </p>
    </div>
  )
}
