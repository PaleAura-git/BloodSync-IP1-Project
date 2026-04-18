import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'
import { donorApi } from '../../api'
import type { DonorProfile } from '../../types'
import { format } from '../../utils/date'
import { useAuth } from '../../contexts/AuthContext'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({ value: v, label: v }))
const MUSCAT_AREAS = [
  'Muscat', 'Muttrah', 'Ruwi', 'Madinat al-Sultan Qaboos', 'Al Khuwair',
  'Qurum', 'Bousher', 'Al Ghubra', 'Al Maabilah', 'Seeb', 'Azaiba',
  'Al Khoud', 'Wattayah', 'Darsait', 'Hamriyah', 'Al Amerat', 'Quriyat',
  'Bowshar', 'Muwaileh', 'Al Hail',
].map((a) => ({ value: a, label: a }))

interface EditSection {
  personal: boolean
  blood: boolean
  location: boolean
}

export function DonorProfile() {
  const { user } = useAuth()
  const [donor, setDonor] = useState<DonorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditSection>({ personal: false, blood: false, location: false })
  const [saving, setSaving] = useState<Partial<EditSection>>({})
  const [feedback, setFeedback] = useState('')
  const [draft, setDraft] = useState<Partial<DonorProfile>>({})

  useEffect(() => {
    donorApi.getProfile()
      .then((res) => setDonor(res.data.data || res.data.donor || res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSpinner />
  if (!donor) return <p className="text-text-tertiary text-[13px]">Profile not found.</p>

  const initial = (donor.fullName || user?.email || '?').charAt(0).toUpperCase()
  const memberSince = user?.createdAt ? format(user.createdAt) : null

  const startEdit = (section: keyof EditSection) => {
    setDraft({
      fullName: donor.fullName,
      phone: donor.phone,
      bloodType: donor.bloodType,
      dateOfBirth: donor.dateOfBirth,
      location: { ...donor.location },
    })
    setEditing((e) => ({ ...e, [section]: true }))
  }

  const cancelEdit = (section: keyof EditSection) => {
    setEditing((e) => ({ ...e, [section]: false }))
    setDraft({})
  }

  const saveSection = async (section: keyof EditSection) => {
    setSaving((s) => ({ ...s, [section]: true }))
    try {
      const res = await donorApi.updateProfile(draft)
      setDonor(res.data.data || res.data.donor || res.data)
      setEditing((e) => ({ ...e, [section]: false }))
      setFeedback('Profile updated')
      setTimeout(() => setFeedback(''), 3000)
    } catch {
      setFeedback('Update failed')
      setTimeout(() => setFeedback(''), 3000)
    } finally {
      setSaving((s) => ({ ...s, [section]: false }))
    }
  }

  const setField = (field: string, val: string) =>
    setDraft((d) => ({ ...d, [field]: val }))
  const setLocationField = (field: string, val: string) =>
    setDraft((d) => ({ ...d, location: { ...(d.location || donor.location), [field]: val } }))

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar header block */}
      <div className="flex items-center gap-4 px-5 py-4 rounded-md" style={{ backgroundColor: '#111111' }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-heading font-semibold text-[18px] text-text-primary"
          style={{ backgroundColor: '#1A1A1A' }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading font-semibold text-[20px] text-text-primary truncate">
              {donor.fullName || '—'}
            </h1>
            {donor.bloodType && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: '#E53935' }}
              >
                {donor.bloodType}
              </span>
            )}
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: '#555' }}>
            {user?.email || '—'}
            {memberSince ? ` · Member since ${memberSince}` : ''}
          </p>
        </div>
      </div>

      {feedback && (
        <p className={`text-[12px] ${feedback.includes('failed') ? 'text-red-accent' : 'text-green-accent'}`}>
          {feedback}
        </p>
      )}

      {/* Personal Info */}
      <Section
        title="Personal Info"
        editing={editing.personal}
        onEdit={() => startEdit('personal')}
        onCancel={() => cancelEdit('personal')}
        onSave={() => saveSection('personal')}
        saving={!!saving.personal}
      >
        {editing.personal ? (
          <div className="flex flex-col gap-3">
            <Input label="Full name" value={draft.fullName || ''} onChange={(e) => setField('fullName', e.target.value)} />
            <Input label="Phone" value={draft.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wide mb-1" style={{ color: '#555' }}>Email</p>
              <p className="text-[13px] text-text-tertiary">Cannot be changed</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Row label="Name" value={donor.fullName || '—'} />
            <Row label="Phone" value={donor.phone || '—'} />
            <Row label="Email" value={user?.email || '—'} />
          </div>
        )}
      </Section>

      {/* Blood Info */}
      <Section
        title="Blood Info"
        editing={editing.blood}
        onEdit={() => startEdit('blood')}
        onCancel={() => cancelEdit('blood')}
        onSave={() => saveSection('blood')}
        saving={!!saving.blood}
      >
        {editing.blood ? (
          <div className="flex flex-col gap-3">
            <Select
              label="Blood type"
              options={BLOOD_TYPES}
              value={draft.bloodType || ''}
              onChange={(e) => setField('bloodType', e.target.value)}
            />
            <Input
              label="Date of birth"
              type="date"
              value={draft.dateOfBirth ? draft.dateOfBirth.split('T')[0] : ''}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Row
              label="Blood type"
              value={
                donor.bloodType
                  ? <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold text-white" style={{ backgroundColor: '#E53935' }}>{donor.bloodType}</span>
                  : '—'
              }
            />
            <Row label="Date of birth" value={donor.dateOfBirth ? format(donor.dateOfBirth) : '—'} />
            <Row label="Last donation" value={donor.lastDonationDate ? format(donor.lastDonationDate) : '—'} />
            <Row label="Total donations" value={String(donor.totalDonations ?? 0)} />
          </div>
        )}
      </Section>

      {/* Location */}
      <Section
        title="Location"
        editing={editing.location}
        onEdit={() => startEdit('location')}
        onCancel={() => cancelEdit('location')}
        onSave={() => saveSection('location')}
        saving={!!saving.location}
      >
        {editing.location ? (
          <div className="flex flex-col gap-3">
            <Select
              label="Area"
              options={MUSCAT_AREAS}
              value={draft.location?.area || ''}
              onChange={(e) => setLocationField('area', e.target.value)}
            />
            <Input
              label="Address"
              value={draft.location?.address || ''}
              onChange={(e) => setLocationField('address', e.target.value)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Row label="Area" value={donor.location?.area || '—'} />
            <Row label="Address" value={donor.location?.address || '—'} />
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({
  title, editing, onEdit, onCancel, onSave, saving, children,
}: {
  title: string
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#141414' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1E1E1E' }}>
        <p className="text-[13px] font-heading font-semibold text-text-primary">{title}</p>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={onSave} loading={saving}>Save</Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <p className="text-[12px]" style={{ color: '#555' }}>{label}</p>
      <div className="text-[13px] text-text-primary">{value}</div>
    </div>
  )
}
