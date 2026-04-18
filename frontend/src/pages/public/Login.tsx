import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/ui/Logo'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../api'

interface LoginPageProps {
  role: 'donor' | 'hospital'
}

export function LoginPage({ role }: LoginPageProps) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login({
        email,
        password,
        userType: role === 'donor' ? 'DONOR' : 'HOSPITAL',
      })
      const { token, user } = res.data
      login(token, user)
      navigate(role === 'donor' ? '/donor/dashboard' : '/hospital/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const otherRole = role === 'donor' ? 'hospital' : 'donor'
  const otherLabel = role === 'donor' ? 'Hospital' : 'Donor'

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="w-[360px]">
        {/* No border — surface color on base is enough separation */}
        <div className="rounded-lg p-7" style={{ backgroundColor: '#1A1A1A', border: '1px solid #222' }}>
          <div className="mb-6">
            <Logo size="sm" />
            <p className="text-text-secondary text-[13px] mt-3 capitalize">
              {role} login
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {error && <p className="text-red-accent text-[12px]">{error}</p>}

            {/* Primary action — red, full width */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2 rounded text-[13px] font-body font-semibold text-white transition-all duration-150 ease-out disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: loading ? '#C62828' : '#E53935' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C62828' }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E53935' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin inline-block" />
                  Logging in…
                </span>
              ) : 'Log In'}
            </button>
          </form>

          {/* Links — no divider, just spacing */}
          <div className="mt-5 flex flex-col gap-2">
            <Link
              to={`/register/${role}`}
              className="text-[12px] text-text-secondary hover:text-text-primary transition-colors"
            >
              Don't have an account? Register
            </Link>
            {/* Tertiary — intentionally dimmer */}
            <Link
              to={`/login/${otherRole}`}
              className="text-[12px] transition-colors"
              style={{ color: '#555' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#888'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#555'}
            >
              Log in as {otherLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
