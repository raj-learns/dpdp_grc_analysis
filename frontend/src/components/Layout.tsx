import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDashboard } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { SectionLabel } from './ui'

type NavLeaf = { to: string; label: string; end?: boolean }
type NavGroup = { group: string; items: NavLeaf[] }
type NavEntry = NavLeaf | NavGroup

const NAV: NavEntry[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/requirements', label: 'Requirements' },
  {
    group: 'Compliance Scorecard',
    items: [
      { to: '/kca-scorecard', label: 'KCA Scorecard' },
      { to: '/controls', label: 'Controls' },
      { to: '/gap-analysis', label: 'Gap Analysis' },
      { to: '/reports', label: 'Reports' },
      { to: '/november-2026', label: 'November 2026' },
      { to: '/may-2027', label: 'May 2027' },
    ],
  },
  { to: '/actions', label: 'Actions' },
  { to: '/evidence', label: 'Evidence' },
  { to: '/questionnaire', label: 'Questionnaire' },
  { to: '/news', label: 'News' },
  { to: '/settings', label: 'Settings' },
]

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'group' in entry
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `block rounded px-3 py-2 text-[13px] font-medium transition-colors ${
    isActive ? 'bg-orange-600/90 text-white' : 'text-stone-300 hover:bg-white/5 hover:text-white'
  }`
}

export default function Layout() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    getDashboard().then(d => setLastUpdated(d.last_updated)).catch(() => {})
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const toggleGroup = (name: string) => setCollapsedGroups(s => {
    const next = new Set(s)
    if (next.has(name)) next.delete(name); else next.add(name)
    return next
  })

  return (
    <div className="flex min-h-screen bg-stone-100">
      <aside className="flex w-60 shrink-0 flex-col bg-[#0b1220] text-stone-300">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="text-sm font-semibold tracking-wide text-white">DPDP GRC Analysis</div>
          <div className="mt-0.5 text-[11px] text-stone-400">Internal compliance tracker</div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV.map(entry => {
            if (!isGroup(entry)) {
              return (
                <NavLink key={entry.to} to={entry.to} end={entry.end} className={navLinkClass}>
                  {entry.label}
                </NavLink>
              )
            }
            const hasActiveChild = entry.items.some(item => location.pathname === item.to)
            const isOpen = hasActiveChild || !collapsedGroups.has(entry.group)
            return (
              <div key={entry.group} className="pt-3 first:pt-0">
                <button
                  onClick={() => toggleGroup(entry.group)}
                  className="flex w-full items-center justify-between px-3 py-1 text-left"
                >
                  <SectionLabel>{entry.group}</SectionLabel>
                  <span className={`text-stone-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </button>
                {isOpen && (
                  <div className="space-y-0.5 pl-2">
                    {entry.items.map(item => (
                      <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-[10px] leading-relaxed text-stone-500">
          Internal assessment framework.<br />Not a statutory classification.<br />Not legal advice.
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
          <div className="text-sm font-semibold text-stone-800">DPDP GRC Analysis</div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-stone-400">
              Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString('en-IN') : '—'}
            </div>
            {user && (
              <div className="flex items-center gap-2 border-l border-stone-200 pl-4 text-xs text-stone-500">
                <span>{user.username}</span>
                <button onClick={handleLogout} className="font-medium text-stone-400 hover:text-orange-700">
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 px-6 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
