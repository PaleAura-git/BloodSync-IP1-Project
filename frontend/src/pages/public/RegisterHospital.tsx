import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/ui/Logo'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../api'

export function RegisterHospital() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    hospitalName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    area: '',
  })

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authApi.register({
        email: form.email,
        password: form.password,
        userType: 'HOSPITAL',
        hospitalName: form.hospitalName,
        phone: form.phone,
        location: { area: form.area || 'Muscat', address: form.address },
      })
      const { token, user } = res.data
      login(token, user)
      navigate('/hospital/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center py-8">
      <div className="w-[400px]">
        <div className="bg-bg-surface border border-bg-border rounded-lg p-7">
          <div className="mb-6">
            <Logo size="sm" />
            <p className="text-text-secondary text-[13px] mt-3">Create hospital account</p>
          </div>

          {error && <p className="text-red-accent text-[12px] mb-3">{error}</p>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input label="Hospital name" value={form.hospitalName} onChange={set('hospitalName')} placeholder="Royal Hospital" required />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="admin@hospital.om" required />
            <Input label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
            <Input label="Confirm password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••" required />
            <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+968 XXXX XXXX" required />
            <Input label="Area" value={form.area} onChange={set('area')} placeholder="Al Khuwair" />
            <Input label="Address" value={form.address} onChange={set('address')} placeholder="Street address" required />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Create Account
            </Button>
          </form>

          <p className="text-[12px] text-text-tertiary mt-4">
            <Link to="/login/hospital" className="hover:text-text-secondary transition-colors">
              Already have an account? Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
