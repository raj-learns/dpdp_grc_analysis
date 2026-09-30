import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

// Brand-neutral, colour-blind-considerate palette used consistently across the app.
export const COLORS = {
  implemented: '#059669',   // emerald-600
  inProgress: '#2563eb',    // blue-600
  gap: '#dc2626',           // red-600
  notApplicable: '#a8a29e', // stone-400
  tbd: '#7c3aed',           // violet-600
  accent: '#c2410c',        // orange-700
}

export function StatusDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <div className="flex h-56 items-center justify-center text-xs text-stone-400">No control data yet</div>
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip formatter={(v, n) => [`${v} (${((Number(v) / total) * 100).toFixed(0)}%)`, n]} />
        <Legend verticalAlign="bottom" height={48} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function HorizontalBar({ data, dataKey = 'value', label = 'name', height = 340 }: {
  data: Record<string, unknown>[]
  dataKey?: string
  label?: string
  height?: number
}) {
  if (data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-xs text-stone-400">No data yet</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <YAxis type="category" dataKey={label} width={230} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={(d[dataKey] as number) >= 60 ? COLORS.implemented : (d[dataKey] as number) >= 25 ? COLORS.accent : COLORS.gap} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
