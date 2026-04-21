import { useEffect, useState } from 'react'
import { hospitalApi } from '../../api'
import { PageSpinner } from '../../components/ui/Spinner'
import { Row } from '../../components/ui/Row'
import type { HospitalProfile } from '../../types'

const team = [
  { name: 'Dr. Noura Al-Busaidi', role: 'Blood bank lead', email: 'n.busaidi@royalhospital.om' },
  { name: 'Ahmed Al-Rahbi',       role: 'Coordinator',     email: 'a.rahbi@royalhospital.om' },
  { name: 'Maryam Al-Kharusi',    role: 'Admin',           email: 'm.kharusi@royalhospital.om' },
]

export function HospitalProfilePage() {
  const [profile, setProfile] = useState<HospitalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    hospitalApi.getProfile().then(res => {
      setProfile(res.data.data || res.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await hospitalApi.updateProfile({
        phone: profile.phone,
        operatingHours: profile.operatingHours,
        location: profile.location,
      })
    } catch {} finally { setSaving(false) }
  }

  if (loading) return <PageSpinner/>

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[18px] font-semibold text-ink">Profile</h1>
        <button onClick={save} disabled={saving}
          className="text-[13px] text-ink hover:text-accent underline-offset-4 hover:underline disabled:opacity-50">
          {saving ? 'saving…' : 'save →'}
        </button>
      </div>

      <div className="border-t border-line">
        <div className="py-3 px-1 border-b border-line">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[15px] text-ink">{profile?.hospitalName}</h2>
            {profile?.isVerified && <span className="text-[11px] text-muted">verified</span>}
          </div>
          <div className="text-[12px] text-muted mt-1">{profile?.location?.area} · joined Mar 2023</div>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-faint mb-3">Contact</h3>
        <dl className="border-t border-line text-[13px]">
          <Row k="Name"    v={<span className="text-ink">{profile?.hospitalName}</span>}/>
          <Row k="Phone"   v={<span className="text-ink tabular-nums">{profile?.phone}</span>}/>
          <Row k="Hours"   v={<span className="text-ink">{profile?.operatingHours || '—'}</span>}/>
          <Row k="Area"    v={<span className="text-ink">{profile?.location?.area}</span>}/>
          <Row k="Address" v={<span className="text-ink">{profile?.location?.address}</span>}/>
        </dl>
        <div className="pt-3 text-[12px]">
          <button className="text-muted hover:text-ink">edit →</button>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-faint mb-3">Team</h3>
        <div className="border-t border-line">
          {team.map(p => (
            <div key={p.email} className="flex items-baseline gap-4 py-3 px-1 border-b border-line text-[13px]">
              <span className="text-ink flex-1">{p.name}</span>
              <span className="text-muted w-32 hidden sm:inline">{p.role}</span>
              <span className="text-faint text-[11px] truncate hidden md:inline">{p.email}</span>
              <button className="text-muted hover:text-ink text-[12px]">manage →</button>
            </div>
          ))}
          <button className="w-full text-left py-3 px-1 text-[13px] text-muted hover:text-ink border-b border-line">
            + invite team member
          </button>
        </div>
      </div>
    </div>
  )
}
