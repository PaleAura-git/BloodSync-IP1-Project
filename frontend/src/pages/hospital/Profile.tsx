import { useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'
import { hospitalApi } from '../../api'
import type { HospitalProfile } from '../../types'

export function HospitalProfilePage() {
  const [hospital, setHospital] = useState<HospitalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [draft, setDraft] = useState<Partial<HospitalProfile>>({})

  useEffect(() => {
    hospitalApi.getProfile()
      .then((res) => {
        const data = res.data.data || res.data.hospital || res.data
        if (data && data._id) {
          setHospital(data)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = () => {
    if (!hospital) return
    setDraft({
      hospitalName: hospital.hospitalName,
      phone: hospital.phone,
      operatingHours: hospital.operatingHours,
      location: { ...hospital.location },
    })
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await hospitalApi.updateProfile(draft)
      setHospital(res.data.data || res.data.hospital || res.data)
      setEditing(false)
      setFeedback('Profile updated')
      setTimeout(() => setFeedback(''), 3000)
    } catch {
      setFeedback('Update failed')
      setTimeout(() => setFeedback(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const createProfile = async () => {
    setSaving(true)
    try {
      const res = await hospitalApi.createProfile({
        hospitalName: 'My Hospital',
        phone: '',
        location: { area: '', address: '' },
      })
      const data = res.data.data || res.data.hospital || res.data
      setHospital(data)
      setNotFound(false)
      setDraft({
        hospitalName: data.hospitalName,
        phone: data.phone,
        operatingHours: data.operatingHours,
        location: { ...data.location },
      })
      setEditing(true)
    } catch {
      setFeedback('Failed to create profile')
      setTimeout(() => setFeedback(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const setField = (field: string, val: string) =>
    setDraft((d) => ({ ...d, [field]: val }))
  const setLocField = (field: string, val: string) =>
    setDraft((d) => ({ ...d, location: { ...(d.location || hospital?.location || { area: '', address: '' }), [field]: val } }))

  if (loading) return <PageSpinner />

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading font-semibold text-[20px] text-text-primary">Profile</h1>
        <div className="rounded-md px-6 py-10 flex flex-col items-center text-center" style={{ backgroundColor: '#111111' }}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-[20px]"
            style={{ backgroundColor: '#1A1A1A' }}
          >
            🏥
          </div>
          <p className="text-[14px] font-medium text-text-primary mb-1">No hospital profile found.</p>
          <p className="text-[13px] text-text-tertiary mb-5">
            Set up your profile to start managing donation requests.
          </p>
          {feedback && (
            <p className="text-[12px] text-red-accent mb-3">{feedback}</p>
          )}
          <button
            onClick={createProfile}
            disabled={saving}
            className="px-5 py-2 rounded text-[13px] font-body font-semibold text-white transition-all duration-150 cursor-pointer disabled:opacity-40"
            style={{ backgroundColor: '#E53935' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#C62828')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#E53935')}
          >
            {saving ? 'Creating…' : 'Create Profile'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-md px-4 py-4" style={{ backgroundColor: '#111111' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-heading font-semibold text-[18px] text-text-primary flex-shrink-0"
            style={{ backgroundColor: '#1A1A1A' }}
          >
            {hospital!.hospitalName?.charAt(0)?.toUpperCase() || 'H'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-heading font-semibold text-[16px] text-text-primary">{hospital!.hospitalName}</p>
              {hospital!.isVerified && <Badge variant="green">Verified</Badge>}
            </div>
            <p className="text-[12px] text-text-tertiary">{hospital!.location?.area || '—'}</p>
          </div>
        </div>
      </div>

      {feedback && (
        <p className={`text-[12px] ${feedback.includes('failed') ? 'text-red-accent' : 'text-green-accent'}`}>
          {feedback}
        </p>
      )}

      {/* Info card */}
      <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#141414' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1E1E1E' }}>
          <p className="text-[13px] font-heading font-semibold text-text-primary">Hospital Info</p>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={save} loading={saving}>Save</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={startEdit}>Edit</Button>
          )}
        </div>
        <div className="px-4 py-4">
          {editing ? (
            <div className="flex flex-col gap-3">
              <Input label="Hospital name" value={draft.hospitalName || ''} onChange={(e) => setField('hospitalName', e.target.value)} />
              <Input label="Phone" value={draft.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
              <Input label="Area" value={draft.location?.area || ''} onChange={(e) => setLocField('area', e.target.value)} />
              <Input label="Address" value={draft.location?.address || ''} onChange={(e) => setLocField('address', e.target.value)} />
              <Input label="Operating hours" value={draft.operatingHours || ''} onChange={(e) => setField('operatingHours', e.target.value)} placeholder="e.g. 8am – 10pm" />
            </div>
          ) : (
            <div className="flex flex-col">
              {[
                { label: 'Name', value: hospital!.hospitalName },
                { label: 'Phone', value: hospital!.phone },
                { label: 'Area', value: hospital!.location?.area },
                { label: 'Address', value: hospital!.location?.address },
                { label: 'Hours', value: hospital!.operatingHours || '—' },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className="flex justify-between items-center py-2"
                  style={i !== arr.length - 1 ? { borderBottom: '1px solid #1E1E1E' } : {}}
                >
                  <p className="text-[12px] text-text-tertiary">{row.label}</p>
                  <p className="text-[13px] text-text-primary">{row.value || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
