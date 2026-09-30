import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { Card, Button, Field, inputClass } from '../components/ui'

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from, { replace: true })
    } catch {
      setError('Invalid username or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 text-center">
          <div className="text-sm font-semibold text-stone-900">DPDP GRC Analysis</div>
          <div className="mt-0.5 text-xs text-stone-500">Internal compliance tracker</div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Username">
            <input className={inputClass} value={username} onChange={e => setUsername(e.target.value)} autoFocus required />
          </Field>
          <Field label="Password">
            <input type="password" className={inputClass} value={password} onChange={e => setPassword(e.target.value)} required />
          </Field>
          {error && <div className="text-xs text-red-600">{error}</div>}
          <Button type="submit" variant="primary" className={`w-full ${submitting ? 'opacity-50' : ''}`}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-[11px] text-stone-400">
          Accounts are created by an administrator - contact your DPO/Compliance Lead if you need access.
        </p>
      </Card>
    </div>
  )
}
