import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/authContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import HowItWorks from './pages/HowItWorks'
import Requirements from './pages/Requirements'
import RequirementDetail from './pages/RequirementDetail'
import KcaScorecard from './pages/KcaScorecard'
import Controls from './pages/Controls'
import Actions from './pages/Actions'
import Evidence from './pages/Evidence'
import ApplicationDetail from './pages/ApplicationDetail'
import November2026 from './pages/November2026'
import May2027 from './pages/May2027'
import GapAnalysis from './pages/GapAnalysis'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Questionnaire from './pages/Questionnaire'
import News from './pages/News'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="p-8 text-sm text-stone-400">Loading…</div>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="requirements" element={<Requirements />} />
          <Route path="requirements/:id" element={<RequirementDetail />} />
          <Route path="kca-scorecard" element={<KcaScorecard />} />
          <Route path="controls" element={<Controls />} />
          <Route path="actions" element={<Actions />} />
          <Route path="evidence" element={<Evidence />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="november-2026" element={<November2026 />} />
          <Route path="may-2027" element={<May2027 />} />
          <Route path="gap-analysis" element={<GapAnalysis />} />
          <Route path="questionnaire" element={<Questionnaire />} />
          <Route path="news" element={<News />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
