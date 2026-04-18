import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/ui/Logo'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../api'
import type { BloodType } from '../../types'

const BLOOD_TYPES: { value: string; label: string }[] = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
]

const MUSCAT_AREAS = [
  'Muscat', 'Muttrah', 'Ruwi', 'Madinat al-Sultan Qaboos', 'Al Khuwair',
  'Qurum', 'Bousher', 'Al Ghubra', 'Al Maabilah', 'Seeb', 'Azaiba',
  'Al Khoud', 'Wattayah', 'Darsait', 'Hamriyah', 'Al Amerat', 'Quriyat',
  'Bowshar', 'Muwaileh', 'Al Hail',
].map((a) => ({ value: a, label: a }))

export function RegisterDonor() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    bloodType: '' as BloodType | '',
    lastDonationDate: '',
    area: '',
    address: '',
  })

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleNext = () => {
    setError('')
    if (step === 1) {
      if (!form.fullName || !form.email || !form.password || !form.phone) {
        setError('All fields are required.')
        return
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }
    if (step === 2) {
      if (!form.bloodType) {
        setError('Please select your blood type.')
        return
      }
    }
    setStep((s) => s + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.area || !form.address) {
      setError('Location is required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authApi.register({
        email: form.email,
        password: form.password,
        userType: 'DONOR',
        fullName: form.fullName,
        phone: form.phone,
        bloodType: form.bloodType as BloodType,
        lastDonationDate: form.lastDonationDate || undefined,
        location: { area: form.area, address: form.address },
      })
      const { token, user } = res.data
      login(token, user)
      navigate('/donor/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center py-8">
      <div className="w-[380px]">
        <div className="bg-bg-surface border border-bg-border rounded-lg p-7">
          <div className="mb-5">
            <Logo size="sm" />
            <p className="text-text-secondary text-[13px] mt-3">Create donor account</p>
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-0.5 flex-1 rounded-full transition-all duration-150 ${
                  s <= step ? 'bg-red-accent' : 'bg-bg-border'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-red-accent text-[12px] mb-3">{error}</p>}

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-text-tertiary uppercase tracking-wide font-medium">Step 1 — Personal Info</p>
              <Input label="Full name" value={form.fullName} onChange={set('fullName')} placeholder="Afan Al Ghazali" />
              <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
              <Input label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
              <Input label="Confirm password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••" />
              <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+968 XXXX XXXX" />
              <Button onClick={handleNext} className="w-full mt-1">Next</Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-text-tertiary uppercase tracking-wide font-medium">Step 2 — Blood Info</p>
              <Select
                label="Blood type"
                options={BLOOD_TYPES}
                placeholder="Select blood type"
                value={form.bloodType}
                onChange={set('bloodType')}
              />
              <Input
                label="Last donation date (optional)"
                type="date"
                value={form.lastDonationDate}
                onChange={set('lastDonationDate')}
              />
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={handleNext} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <p className="text-[11px] text-text-tertiary uppercase tracking-wide font-medium">Step 3 — Location</p>
              <Select
                label="Area in Muscat"
                options={MUSCAT_AREAS}
                placeholder="Select area"
                value={form.area}
                onChange={set('area')}
              />
              <Input label="Address" value={form.address} onChange={set('address')} placeholder="Street or neighborhood" />
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" type="button" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button type="submit" loading={loading} className="flex-1">Create Account</Button>
              </div>
            </form>
          )}

          <p className="text-[12px] text-text-tertiary mt-4">
            <Link to="/login/donor" className="hover:text-text-secondary transition-colors">
              Already have an account? Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
