import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/ui/Logo'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Icons } from '../../components/icons'
import { cn } from '../../utils/cn'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../api'

type Mode = 'signin' | 'signup'
type Role = 'DONOR' | 'HOSPITAL'

export function RoleSelection() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('signin')
  const [role, setRole] = useState<Role>('DONOR')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const res = await authApi.login({ email, password, userType: role })
        const { token, user } = res.data.data || res.data
        login(token, user)
        navigate(role === 'DONOR' ? '/donor/dashboard' : '/hospital/dashboard')
      } else {
        navigate(role === 'DONOR' ? '/register/donor' : '/register/hospital')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Sign in failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="h-14 border-b border-line px-6 flex items-center">
        <Logo size={22}/>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[22px] font-semibold text-ink tracking-tight">
            {mode === 'signin' ? 'Sign in to BloodSync' : 'Create your account'}
          </h1>
          <p className="text-[13px] text-muted mt-1">
            {mode === 'signin'
              ? 'Access your donor or hospital console.'
              : 'Register as a donor or a hospital.'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface2 border border-line">
            {([['DONOR', 'Donor'], ['HOSPITAL', 'Hospital']] as [Role, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setRole(k)}
                className={cn('h-8 rounded-md text-[12px] font-medium transition-colors',
                  role === k ? 'bg-bg text-ink shadow-soft' : 'text-muted hover:text-ink')}>
                {l}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <Input
              label="Email" type="email"
              placeholder={role === 'DONOR' ? 'you@example.om' : 'bloodbank@hospital.om'}
              leftIcon={<Icons.Mail size={13}/>}
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <Input
              label="Password" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {mode === 'signin' && (
              <div className="flex items-center justify-between text-[12px]">
                <label className="flex items-center gap-2 text-muted cursor-pointer">
                  <input type="checkbox" className="accent-[var(--bs-accent)]"/> Keep me signed in
                </label>
                <a className="text-muted hover:text-ink" href="#">Forgot password?</a>
              </div>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button fullWidth size="md" loading={loading} onClick={handleSubmit}
              rightIcon={<Icons.Arrow size={13}/>}>
              {mode === 'signin' ? 'Sign in' : `Continue as ${role === 'DONOR' ? 'donor' : 'hospital'}`}
            </Button>
          </div>

          <div className="mt-5 pt-5 border-t border-line text-[12px] text-muted text-center">
            {mode === 'signin' ? (
              <>New to BloodSync?{' '}
                <button onClick={() => setMode('signup')} className="text-accent font-medium hover:underline">
                  Create account
                </button>
              </>
            ) : (
              <>Already have one?{' '}
                <button onClick={() => setMode('signin')} className="text-accent font-medium hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-line flex items-center justify-between text-[11px] text-muted">
        <span>© 2026 BloodSync</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-ink">Privacy</a>
          <a href="#" className="hover:text-ink">Terms</a>
        </div>
      </footer>
    </div>
  )
}
