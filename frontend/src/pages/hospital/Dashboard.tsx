import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'
import { hospitalApi, urgentRequestApi, donationApi } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import type { HospitalProfile, UrgentRequest, Donation, BloodType, UrgencyLevel } from '../../types'
import { formatDistanceToNow, format } from '../../utils/date'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({ value: v, label: v }))
const URGENCY = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
]

function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'green' | 'dim' | 'red' | 'amber' }> = {
    open: { label: 'Open', variant: 'green' },
    fulfilled: { label: 'Fulfilled', variant: 'dim' },
    expired: { label: 'Expired', variant: 'red' },
    cancelled: { label: 'Cancelled', variant: 'red' },
  }
  const s = map[status] || { label: status, variant: 'dim' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function HospitalDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hospital, setHospital] = useState<HospitalProfile | null>(null)
  const [requests, setRequests] = useState<UrgentRequest[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [requestForm, setRequestForm] = useState({ bloodType: '' as BloodType | '', unitsNeeded: '1', urgencyLevel: 'urgent' as UrgencyLevel, notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [searchBlood, setSearchBlood] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [hRes, rRes, dRes] = await Promise.all([
          hospitalApi.getProfile().catch(() => null),
          urgentRequestApi.getHospitalRequests().catch(() => ({ data: { data: [] } })),
          donationApi.getHospitalDonations().catch(() => ({ data: { data: [] } })),
        ])
        if (hRes) setHospital(hRes.data.data || hRes.data.hospital || hRes.data)
        setRequests(rRes.data.data || rRes.data.requests || [])
        setDonations((dRes.data.data || dRes.data.donations || []).slice(0, 5))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCreateRequest = async () => {
    if (!requestForm.bloodType) return
    setSubmitting(true)
    try {
      await urgentRequestApi.create({
        bloodType: requestForm.bloodType as BloodType,
        unitsNeeded: parseInt(requestForm.unitsNeeded),
        urgencyLevel: requestForm.urgencyLevel,
        notes: requestForm.notes || undefined,
      })
      const rRes = await urgentRequestApi.getHospitalRequests()
      setRequests(rRes.data.data || rRes.data.requests || [])
      setShowModal(false)
      setRequestForm({ bloodType: '', unitsNeeded: '1', urgencyLevel: 'urgent', notes: '' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageSpinner />

  const name = hospital?.hospitalName || user?.email?.split('@')[0] || 'Hospital'
  const activeRequests = requests.filter((r) => r.status === 'open').slice(0, 5)

  const stats = {
    total: requests.length,
    fulfilled: requests.filter((r) => r.status === 'fulfilled').length,
    matched: donations.length,
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-semibold text-[20px] text-text-primary">
          Welcome, {name}
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-[13px] font-body font-semibold text-white transition-all duration-150 cursor-pointer"
          style={{ backgroundColor: '#E53935' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#C62828')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#E53935')}
        >
          <Plus size={14} />
          Urgent Request
        </button>
      </div>

      {/* Quick search */}
      <div className="rounded-md px-4 py-3" style={{ backgroundColor: '#141414' }}>
        <p className="text-[12px] text-text-tertiary uppercase tracking-wide font-medium mb-2">Quick Donor Search</p>
        <div className="flex gap-2 items-center">
          <select
            value={searchBlood}
            onChange={(e) => setSearchBlood(e.target.value)}
            className="text-text-primary rounded px-3 py-1.5 text-[13px] focus:outline-none"
            style={{ backgroundColor: '#1A1A1A', border: 'none' }}
          >
            <option value="">Blood type</option>
            {BLOOD_TYPES.map((bt) => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
          </select>
          <button
            disabled={!searchBlood}
            onClick={() => navigate(`/hospital/search?blood=${searchBlood}`)}
            className="px-4 py-1.5 rounded text-[13px] font-body font-semibold text-white transition-all duration-150 disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: '#E53935' }}
            onMouseEnter={e => { if (searchBlood) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C62828' }}
            onMouseLeave={e => { if (searchBlood) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E53935' }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Active requests */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-medium text-text-tertiary uppercase tracking-wide">Active Requests</p>
          <Link to="/hospital/requests" className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#111111' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                {['Blood Type', 'Units', 'Urgency', 'Responses', 'Status', 'Posted'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: '#555' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center">
                    <p className="text-[13px] text-text-tertiary">No active requests.</p>
                    <p className="text-[12px] mt-0.5" style={{ color: '#444' }}>Post one when you need donors.</p>
                  </td>
                </tr>
              ) : (
                activeRequests.map((req, i) => (
                  <tr
                    key={req._id}
                    className="hover:bg-bg-hover transition-all duration-150"
                    style={i !== activeRequests.length - 1 ? { borderBottom: '1px solid #1A1A1A' } : {}}
                  >
                    <td className="px-4 py-2.5"><Badge variant="red">{req.bloodType}</Badge></td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-secondary">{req.unitsNeeded}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[12px] font-medium ${req.urgencyLevel === 'critical' ? 'text-red-accent' : req.urgencyLevel === 'urgent' ? 'text-amber-accent' : 'text-text-tertiary'}`}>
                        {req.urgencyLevel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-tertiary">{req.respondedDonors?.length || 0}</td>
                    <td className="px-4 py-2.5"><RequestStatusBadge status={req.status} /></td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-text-tertiary">{formatDistanceToNow(req.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Incoming donations */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-medium text-text-tertiary uppercase tracking-wide">Incoming Donations</p>
          <Link to="/hospital/donations" className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#111111' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                {['Donor', 'Blood Type', 'Date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: '#555' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center">
                    <p className="text-[13px] text-text-tertiary">No incoming donations yet.</p>
                    <p className="text-[12px] mt-0.5" style={{ color: '#444' }}>Donations will appear here once scheduled.</p>
                  </td>
                </tr>
              ) : (
                donations.map((d, i) => {
                  const donor = typeof d.donor === 'object' ? d.donor : null
                  return (
                    <tr
                      key={d._id}
                      className="hover:bg-bg-hover transition-all duration-150"
                      style={i !== donations.length - 1 ? { borderBottom: '1px solid #1A1A1A' } : {}}
                    >
                      <td className="px-4 py-2.5 text-[13px] text-text-primary">{donor?.fullName || '—'}</td>
                      <td className="px-4 py-2.5"><Badge variant="red">{d.bloodType}</Badge></td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-text-tertiary">{format(d.scheduledDate)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={d.status === 'completed' ? 'green' : d.status === 'scheduled' ? 'dim' : 'amber'}>
                          {d.status}
                        </Badge>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Stats — 3 separate blocks */}
      <div className="flex gap-3">
        {[
          { label: 'Total Requests', value: stats.total },
          { label: 'Fulfilled', value: stats.fulfilled },
          { label: 'Donors Matched', value: stats.matched },
        ].map((s) => (
          <div key={s.label} className="flex-1 rounded-md px-4 py-3" style={{ backgroundColor: '#141414' }}>
            <p className="text-[11px] text-text-tertiary uppercase tracking-wide mb-1">{s.label}</p>
            <p className="font-mono text-[22px] font-medium text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create Request Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Post Urgent Request"
        actions={
          <Button onClick={handleCreateRequest} loading={submitting} disabled={!requestForm.bloodType}>
            Post Request
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Blood type"
            options={BLOOD_TYPES}
            placeholder="Select blood type"
            value={requestForm.bloodType}
            onChange={(e) => setRequestForm((f) => ({ ...f, bloodType: e.target.value as BloodType }))}
          />
          <Input
            label="Units needed"
            type="number"
            min="1"
            value={requestForm.unitsNeeded}
            onChange={(e) => setRequestForm((f) => ({ ...f, unitsNeeded: e.target.value }))}
          />
          <Select
            label="Urgency level"
            options={URGENCY}
            value={requestForm.urgencyLevel}
            onChange={(e) => setRequestForm((f) => ({ ...f, urgencyLevel: e.target.value as UrgencyLevel }))}
          />
          <Input
            label="Notes (optional)"
            value={requestForm.notes}
            onChange={(e) => setRequestForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Any additional details"
          />
        </div>
      </Modal>
    </div>
  )
}
