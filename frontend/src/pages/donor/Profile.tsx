import { useEffect, useState } from 'react'
import { donorApi } from '../../api'
import { PageSpinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import type { DonorProfile } from '../../types'

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-1">
      <dt className="text-faint w-28 shrink-0 text-[13px]">{k}</dt>
      <dd className="text-[13px]">{v}</dd>
    </div>
  )
}

function EditRow({ k, value, onChange, type = 'text' }: { k: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex items-baseline gap-4 py-2.5 px-1 border-b border-line">
      <label className="text-faint text-[13px] w-28 shrink-0">{k}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent text-ink text-[13px] outline-none focus:text-accent placeholder:text-faint"/>
    </div>
  )
}

function PrefRow({ label, hint, on }: { label: string; hint: string; on: boolean }) {
  const [v, setV] = useState(on)
  return (
    <div className="flex items-baseline gap-4 py-3 px-1 border-b border-line">
      <div className="flex-1">
        <div className="text-[13px] text-ink">{label}</div>
        <div className="text-[12px] text-faint">{hint}</div>
      </div>
      <button onClick={() => setV(!v)}
        className="text-[13px] text-ink hover:text-accent transition-colors inline-flex items-center gap-2 tabular-nums">
        <span className={cn('h-1.5 w-1.5 rounded-full', v ? 'bg-accent' : 'bg-faint')}/>
        {v ? 'on' : 'off'}
      </button>
    </div>
  )
}

export function DonorProfile() {
  const [profile, setProfile] = useState<DonorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [lastDonation, setLastDonation] = useState('')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    donorApi.getProfile().then(res => {
      const p = res.data.data || res.data
      setProfile(p)
      setEmail(p.email || '')
      setPhone(p.phone || '')
      setDob(p.dateOfBirth?.split('T')[0] || '')
      setLastDonation(p.lastDonationDate?.split('T')[0] || '')
      setArea(p.location?.area || '')
      setAddress(p.location?.address || '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await donorApi.updateProfile({
        phone, dateOfBirth: dob, lastDonationDate: lastDonation,
        location: { area, address },
      })
    } catch {} finally { setSaving(false) }
  }

  if (loading) return <PageSpinner/>

  return (
    <div className="animate-fade-in max-w-[720px]">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[18px] font-semibold text-ink">Profile</h1>
        <button onClick={save} disabled={saving}
          className="text-[12px] text-ink hover:text-accent underline-offset-4 hover:underline disabled:opacity-50">
          {saving ? 'saving…' : 'save changes'}
        </button>
      </div>

      <dl className="text-[13px] mb-10 border-t border-line">
        <Row k="Name" v={<span className="text-ink">{profile?.fullName}</span>}/>
        <Row k="Type" v={
          <span className="text-ink">
            {profile?.bloodType}
            <span className="text-faint"> · verified, change requires admin review</span>
          </span>
        }/>
        <Row k="Donations" v={<span className="text-ink tabular-nums">{profile?.totalDonations ?? 0}</span>}/>
        <Row k="Status" v={
          <span className={profile?.isEligible ? 'text-success' : 'text-accent'}>
            {profile?.isEligible ? 'Eligible' : 'Not eligible'}
          </span>
        }/>
      </dl>

      <h2 className="text-[13px] font-medium text-ink mb-3">Personal</h2>
      <div className="border-t border-line mb-10">
        <EditRow k="Email" value={email} onChange={setEmail}/>
        <EditRow k="Phone" value={phone} onChange={setPhone}/>
        <EditRow k="Date of birth" value={dob} onChange={setDob} type="date"/>
        <EditRow k="Last donation" value={lastDonation} onChange={setLastDonation} type="date"/>
        <EditRow k="Area" value={area} onChange={setArea}/>
        <EditRow k="Address" value={address} onChange={setAddress}/>
      </div>

      <h2 className="text-[13px] font-medium text-ink mb-3">Notifications</h2>
      <div className="border-t border-line">
        <PrefRow label="Critical requests" hint="push, any time" on={true}/>
        <PrefRow label="Urgent requests" hint="push, 07–22 only" on={true}/>
        <PrefRow label="Standard requests" hint="daily digest" on={false}/>
        <PrefRow label="Reveal contact on match" hint="required to respond" on={true}/>
      </div>
    </div>
  )
}
