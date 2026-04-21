import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/ui/Logo'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Icons } from '../../components/icons'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../api'

const AREAS = ['Al Khuwair', 'Ghala', 'Ruwi', 'Muttrah', 'Seeb', 'Bousher', 'Al Khoud', 'Mina Al Fahal', 'Qurum', 'Azaiba']

export function RegisterHospital() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    hospitalName: '', phone: '', email: '', password: '',
    area: '', operatingHours: '', address: '', licenseNumber: '',
  })
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register({
        email: form.email, password: form.password,
        userType: 'HOSPITAL', hospitalName: form.hospitalName,
        phone: form.phone,
        location: { area: form.area, address: form.address },
      })
      const { token, user } = res.data.data || res.data
      login(token, user)
      navigate('/hospital/dashboard')
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
        <div className="text-[12px] text-muted">
          Once submitted, our compliance team reviews your credentials within 24 hours.
        </div>
        <div className="mt-4 p-3 rounded-md bg-info/5 border border-info/20 text-[11px] text-ink/90">
          <Icons.Shield size={14} className="text-info inline mr-1.5 align-[-2px]"/>
          All hospitals are verified before any donor data becomes visible.
        </div>
        <button onClick={() => navigate('/')}
          className="mt-auto text-[12px] text-muted hover:text-ink flex items-center gap-1">
          <Icons.ArrowLeft size={12}/> Back to sign in
        </button>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="h-12 border-b border-line px-6 flex items-center text-[12px] text-muted">
          Hospital registration
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-xl grid grid-cols-2 gap-3">
            <Input label="Hospital name" placeholder="Royal Hospital"
              value={form.hospitalName} onChange={e => set('hospitalName', e.target.value)}/>
            <Input label="Official phone" placeholder="+968 2459 9000"
              value={form.phone} onChange={e => set('phone', e.target.value)}/>
            <div className="col-span-2">
              <Input label="Official email" type="email" placeholder="bloodbank@hospital.om"
                value={form.email} onChange={e => set('email', e.target.value)}/>
            </div>
            <div className="col-span-2">
              <Input label="Password" type="password"
                value={form.password} onChange={e => set('password', e.target.value)}/>
            </div>
            <Select label="Area" options={AREAS.map(a => ({ value: a, label: a }))} placeholder="Select area"
              value={form.area} onChange={e => set('area', e.target.value)}/>
            <Input label="Operating hours" placeholder="Sun–Thu 07–21"
              value={form.operatingHours} onChange={e => set('operatingHours', e.target.value)}/>
            <div className="col-span-2">
              <Input label="Address" placeholder="Way 4125"
                value={form.address} onChange={e => set('address', e.target.value)}/>
            </div>
            <div className="col-span-2">
              <Input label="License / registration #" placeholder="OM-HOSP-2019-1042"
                value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)}/>
            </div>
            {error && <p className="col-span-2 text-xs text-danger">{error}</p>}
          </div>
        </div>
        <div className="border-t border-line px-6 py-3 flex justify-between bg-surface">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>Cancel</Button>
          <Button size="sm" loading={loading} onClick={handleSubmit} rightIcon={<Icons.Arrow size={12}/>}>
            Submit for verification
          </Button>
        </div>
      </main>
    </div>
  )
}
