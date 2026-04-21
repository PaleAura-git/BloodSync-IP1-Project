import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/ui/Logo'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Icons } from '../../components/icons'
import { cn } from '../../utils/cn'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../api'
import type { BloodType } from '../../types'

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const AREAS = ['Al Khuwair', 'Ghala', 'Ruwi', 'Muttrah', 'Seeb', 'Bousher', 'Al Maabela', 'Qurum', 'Azaiba', 'Wadi Kabir']

export function RegisterDonor() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
    bloodType: '' as BloodType | '',
    dateOfBirth: '', lastDonationDate: '',
    area: '', address: '', shareContact: true,
  })
  const set = (k: keyof typeof form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleFinish = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register({
        email: form.email, password: form.password,
        userType: 'DONOR', fullName: form.fullName,
        phone: form.phone,
        bloodType: form.bloodType as BloodType || undefined,
        location: { area: form.area, address: form.address },
        lastDonationDate: form.lastDonationDate || undefined,
      })
      const { token, user } = res.data.data || res.data
      login(token, user)
      navigate('/donor/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex">
      <aside className="w-[260px] border-r border-line p-6 hidden md:flex flex-col">
        <Logo size={24}/>
        <div className="text-[11px] uppercase tracking-wider text-muted mt-8 mb-3">Setup</div>
        <ol className="space-y-1 text-[13px]">
          {[['Basics'], ['Medical'], ['Location']].map(([l], i) => (
            <li key={i} className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-md',
              i + 1 === step && 'bg-accent-glow text-accent',
              i + 1 < step && 'text-success')}>
              <span className={cn(
                'h-5 w-5 rounded-full border flex items-center justify-center text-[10px] font-semibold shrink-0',
                i + 1 < step ? 'bg-success border-success text-white' :
                i + 1 === step ? 'bg-accent border-accent text-white' :
                'bg-surface2 border-line text-muted'
              )}>
                {i + 1 < step ? <Icons.Check size={10}/> : i + 1}
              </span>
              {l}
            </li>
          ))}
        </ol>
        <button onClick={() => navigate('/')}
          className="mt-auto text-[12px] text-muted hover:text-ink flex items-center gap-1">
          <Icons.ArrowLeft size={12}/> Back to sign in
        </button>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="h-12 border-b border-line px-6 flex items-center justify-between">
          <div className="text-[12px] text-muted">
            Donor registration · Step <span className="text-ink font-medium">{step}</span> of 3
          </div>
          <div className="flex items-center gap-1 w-40">
            {[1, 2, 3].map(n => (
              <div key={n} className={cn('h-1 flex-1 rounded-full', n <= step ? 'bg-accent' : 'bg-surface2')}/>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-md">
            {step === 1 && (
              <div className="space-y-4">
                <Input label="Full name" placeholder="Leila Al-Harthi" value={form.fullName} onChange={e => set('fullName', e.target.value)}/>
                <Input label="Email" type="email" placeholder="you@example.om" value={form.email} onChange={e => set('email', e.target.value)}/>
                <Input label="Phone" type="tel" placeholder="+968 9123 4567" value={form.phone} onChange={e => set('phone', e.target.value)}/>
                <Input label="Password" type="password" hint="Min. 8 characters, one number" value={form.password} onChange={e => set('password', e.target.value)}/>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-2">Blood type</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BLOOD_TYPES.map(bt => (
                      <button key={bt} onClick={() => set('bloodType', bt)}
                        className={cn('h-10 rounded-md border text-[13px] font-semibold transition-colors',
                          form.bloodType === bt
                            ? 'bg-accent-glow border-accent text-accent'
                            : 'bg-surface border-line text-ink hover:border-line2')}>
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>
                <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)}/>
                <Input label="Last donation (optional)" type="date" value={form.lastDonationDate} onChange={e => set('lastDonationDate', e.target.value)}/>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <Select label="Area" options={AREAS.map(a => ({ value: a, label: a }))} placeholder="Select area"
                  value={form.area} onChange={e => set('area', e.target.value)}/>
                <Input label="Address" placeholder="Way 3041, Building 14" value={form.address} onChange={e => set('address', e.target.value)}/>
                <label className="flex gap-2.5 p-3 rounded-md bg-surface border border-line text-[12px] cursor-pointer">
                  <input type="checkbox" checked={form.shareContact as boolean}
                    onChange={e => set('shareContact', e.target.checked)}
                    className="mt-0.5 accent-[var(--bs-accent)]"/>
                  <span className="text-ink">Share contact with verified hospitals when matched.</span>
                </label>
                {error && <p className="text-xs text-danger">{error}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-line px-6 py-3 flex justify-between bg-surface">
          <Button variant="ghost" size="sm" onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}>
            Back
          </Button>
          {step < 3
            ? <Button size="sm" onClick={() => setStep(step + 1)} rightIcon={<Icons.Arrow size={12}/>}>Continue</Button>
            : <Button size="sm" loading={loading} onClick={handleFinish} rightIcon={<Icons.Check size={12}/>}>Finish</Button>
          }
        </div>
      </main>
    </div>
  )
}
