import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'
import { donorApi, urgentRequestApi, donationApi } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import type { DonorProfile, UrgentRequest, Donation } from '../../types'
import { formatDistanceToNow, format } from '../../utils/date'

function urgencyVariant(level: string): 'red' | 'amber' | 'dim' {
  if (level === 'critical') return 'red'
  if (level === 'urgent') return 'amber'
  return 'dim'
}

export function DonorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [donor, setDonor] = useState<DonorProfile | null>(null)
  const [requests, setRequests] = useState<UrgentRequest[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [dRes, rRes, donRes] = await Promise.all([
          donorApi.getProfile().catch(() => null),
          urgentRequestApi.getActive().catch(() => ({ data: { data: [] } })),
          donationApi.getMyHistory().catch(() => ({ data: { data: [] } })),
        ])
        if (dRes) setDonor(dRes.data.data || dRes.data.donor || dRes.data)
        setRequests(rRes.data.data || rRes.data.requests || [])
        setDonations((donRes.data.data || donRes.data.donations || []).slice(0, 5))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <PageSpinner />

  const firstName = donor?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const quizDone = donor?.quizCompleted ?? false

  const daysUntilAvailable = () => {
    if (!donor?.cooldownUntil) return null
    const diff = new Date(donor.cooldownUntil).getTime() - Date.now()
    if (diff <= 0) return null
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
  const cooldownDays = daysUntilAvailable()

  return (
    <div className="flex flex-col gap-7">
      {/* Welcome bar */}
      <div className="flex items-center gap-3">
        <h1 className="font-heading font-semibold text-[20px] text-text-primary">
          Welcome back, {firstName}
        </h1>
        {donor?.bloodType && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold text-white bg-red-accent">
            {donor.bloodType}
          </span>
        )}
      </div>

      {/* Quiz alert banner — always shown, never replaces content below */}
      {!quizDone && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-md"
          style={{ backgroundColor: '#141414', borderLeft: '3px solid #F59E0B' }}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={14} className="text-amber-accent flex-shrink-0" />
            <p className="text-[13px] text-text-secondary">
              Complete your eligibility screening to start receiving donation requests.
            </p>
          </div>
          <button
            onClick={() => navigate('/donor/quiz')}
            className="ml-4 flex-shrink-0 px-3 py-1.5 rounded text-[12px] font-semibold text-white transition-all duration-150"
            style={{ backgroundColor: '#E53935' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C62828'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E53935'}
          >
            Take Quiz
          </button>
        </div>
      )}

      {/* Stat row — always visible, three separate blocks */}
      <div className="flex gap-3">
        <StatBlock
          label="Eligibility"
          value={!quizDone ? 'Pending' : donor?.isEligible ? 'Eligible' : 'Not eligible'}
          valueColor={!quizDone ? '#555' : donor?.isEligible ? '#2EC486' : '#E53935'}
        />
        <StatBlock
          label="Cooldown"
          value={!quizDone ? 'Complete quiz first' : cooldownDays ? `${cooldownDays}d remaining` : 'Available now'}
          valueColor={!quizDone ? '#555' : cooldownDays ? '#F59E0B' : '#2EC486'}
        />
        <StatBlock
          label="Total Donations"
          value={String(donor?.totalDonations ?? 0)}
          valueColor="#EFEFEF"
        />
      </div>

      {/* Urgent Requests */}
      <section>
        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-2">
          Urgent Requests
        </p>
        <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#111111' }}>
          {requests.length === 0 ? (
            <div className="px-4 py-4">
              <p className="text-text-tertiary text-[13px]">No urgent requests right now.</p>
              <p className="text-[12px] mt-0.5" style={{ color: '#444' }}>
                You'll see matching requests here once hospitals post emergencies.
              </p>
            </div>
          ) : (
            requests.map((req, i) => {
              const hosp = typeof req.hospital === 'object' ? req.hospital : null
              return (
                <div
                  key={req._id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-all duration-150 ${
                    i !== requests.length - 1 ? 'border-b border-bg-border' : ''
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary truncate">
                      {hosp?.hospitalName || 'Hospital'}
                    </p>
                    <p className="text-[12px] text-text-tertiary">
                      {hosp?.location?.area || ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={urgencyVariant(req.urgencyLevel)}>
                      {req.bloodType} · {req.unitsNeeded}u
                    </Badge>
                    <span className="text-[11px] text-text-tertiary">
                      {formatDistanceToNow(req.createdAt)}
                    </span>
                    <Button size="sm" className="ml-1">Respond</Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Recent Donations */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide">
            Recent Donations
          </p>
          <Link
            to="/donor/donations"
            className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            View all <ChevronRight size={12} />
          </Link>
        </div>
        <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#111111' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                {['Date', 'Hospital', 'Blood Type', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: '#555' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-[13px] text-text-tertiary text-center">
                    No donations yet.
                  </td>
                </tr>
              ) : (
                donations.map((d, i) => {
                  const hosp = typeof d.hospital === 'object' ? d.hospital : null
                  return (
                    <tr
                      key={d._id}
                      className={`hover:bg-bg-hover transition-all duration-150 ${i !== donations.length - 1 ? 'border-b border-bg-border' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-mono text-[12px] text-text-secondary">
                        {format(d.scheduledDate)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-text-primary">
                        {hosp?.hospitalName || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="red">{d.bloodType}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={d.status} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatBlock({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="flex-1 px-4 py-3 rounded-md" style={{ backgroundColor: '#141414' }}>
      <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: '#555' }}>
        {label}
      </p>
      <p className="font-mono text-[13px] font-medium" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'green' | 'amber' | 'dim' | 'red' }> = {
    completed: { label: 'Completed', variant: 'green' },
    confirmed: { label: 'Confirmed', variant: 'amber' },
    scheduled: { label: 'Scheduled', variant: 'dim' },
    cancelled: { label: 'Cancelled', variant: 'red' },
    no_show: { label: 'No-show', variant: 'red' },
  }
  const s = map[status] || { label: status, variant: 'dim' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
