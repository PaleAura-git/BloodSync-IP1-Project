import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { urgentRequestApi, donationApi } from '../../api'
import { PageSpinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import { timeAgo } from '../../utils/date'
import type { UrgentRequest, Donation } from '../../types'

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-1">
      <dt className="text-faint w-28 shrink-0 text-[13px]">{k}</dt>
      <dd className="text-[13px]">{v}</dd>
    </div>
  )
}

const inventoryFlags = [
  { bt: 'O−',  units: 2,  cap: 20, level: 'critical' as const },
  { bt: 'AB−', units: 1,  cap: 8,  level: 'critical' as const },
  { bt: 'A−',  units: 5,  cap: 15, level: 'low' as const },
  { bt: 'B−',  units: 3,  cap: 10, level: 'low' as const },
]

export function HospitalDashboard() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<UrgentRequest[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      urgentRequestApi.getHospitalRequests(),
      donationApi.getHospitalDonations(),
    ]).then(([rRes, dRes]) => {
      setRequests(rRes.data.data || rRes.data || [])
      setDonations(dRes.data.data || dRes.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSpinner/>

  const active = requests.filter(r => r.status === 'open')
  const upcoming = donations.filter(d => ['scheduled', 'confirmed'].includes(d.status))
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[18px] font-semibold text-ink">Dashboard</h1>
        <button onClick={() => navigate('/hospital/requests')}
          className="text-[12px] text-ink hover:text-accent underline-offset-4 hover:underline">
          + new request
        </button>
      </div>

      <dl className="text-[13px] mb-10 border-t border-line">
        <Row k="Active requests" v={
          <span className="text-ink">
            <span className="tabular-nums">{active.length}</span>
            <span className="text-faint"> · {active.filter(r => r.urgencyLevel === 'critical').length} critical, {active.filter(r => r.urgencyLevel === 'urgent').length} urgent</span>
          </span>
        }/>
        <Row k="Appointments" v={
          <span className="text-ink">
            <span className="tabular-nums">{upcoming.length}</span>
            <span className="text-faint"> scheduled</span>
          </span>
        }/>
        <Row k="Inventory" v={
          <span className="text-ink">
            <span className="text-accent tabular-nums">{inventoryFlags.filter(f => f.level === 'critical').length}</span>
            <span className="text-faint"> critical · </span>
            <span className="tabular-nums">{inventoryFlags.filter(f => f.level === 'low').length}</span>
            <span className="text-faint"> low</span>
          </span>
        }/>
      </dl>

      {/* Active requests */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[13px] font-medium text-ink">Active requests</h2>
          <button onClick={() => navigate('/hospital/requests')} className="text-[12px] text-faint hover:text-ink">see all</button>
        </div>
        <div className="border-t border-line">
          {active.map(r => {
            const age = timeAgo(r.createdAt)
            const matched = r.respondedDonors?.length ?? 0
            const critical = r.urgencyLevel === 'critical'
            const bt = r.bloodType.replace('-', '−')
            return (
              <div key={r._id} className="border-b border-line py-3 flex items-baseline gap-4 text-[13px] px-1 hover:bg-surface transition-colors">
                <span className="text-faint tabular-nums w-10 shrink-0">{age}</span>
                <span className="text-ink tabular-nums w-10">{bt}</span>
                <span className="text-muted tabular-nums w-16">{r.unitsNeeded} units</span>
                <span className={cn('w-20 hidden md:inline', critical ? 'text-accent' : 'text-muted')}>
                  {critical ? '● ' : '○ '}{r.urgencyLevel}
                </span>
                <span className="text-muted flex-1 min-w-0 truncate hidden md:inline">{r.notes || '—'}</span>
                <span className="text-ink tabular-nums">
                  {matched}/{r.unitsNeeded} <span className="text-faint">matched</span>
                </span>
              </div>
            )
          })}
          {active.length === 0 && (
            <div className="py-8 text-center text-[12px] text-faint">No active requests.</div>
          )}
        </div>
      </section>

      {/* Upcoming appointments */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[13px] font-medium text-ink">Upcoming appointments</h2>
          <button onClick={() => navigate('/hospital/donations')} className="text-[12px] text-faint hover:text-ink">see all</button>
        </div>
        <div className="border-t border-line">
          {upcoming.map(d => {
            const dt = new Date(d.scheduledDate)
            const donor = typeof d.donor === 'object' ? d.donor : null
            const bt = d.bloodType.replace('-', '−')
            return (
              <div key={d._id} className="border-b border-line py-3 flex items-baseline gap-4 text-[13px] px-1 hover:bg-surface transition-colors">
                <span className="text-ink tabular-nums w-28 shrink-0">
                  {dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  <span className="text-faint"> {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <span className="text-ink flex-1 min-w-0 truncate">{donor?.fullName ?? '—'}</span>
                <span className="text-muted tabular-nums w-10 hidden md:inline">{bt}</span>
                <span className="text-muted w-20 text-right">{d.status}</span>
              </div>
            )
          })}
          {upcoming.length === 0 && (
            <div className="py-8 text-center text-[12px] text-faint">No upcoming appointments.</div>
          )}
        </div>
      </section>

      {/* Inventory flags */}
      <section>
        <h2 className="text-[13px] font-medium text-ink mb-3">Inventory flags</h2>
        <div className="border-t border-line">
          {inventoryFlags.map(f => (
            <div key={f.bt} className="border-b border-line py-3 flex items-baseline gap-4 text-[13px] px-1">
              <span className="text-ink tabular-nums w-10 shrink-0">{f.bt}</span>
              <span className="text-ink tabular-nums w-20">{f.units}/{f.cap}</span>
              <span className="text-muted tabular-nums flex-1">units in stock</span>
              <span className={cn('tabular-nums', f.level === 'critical' ? 'text-accent' : 'text-muted')}>
                {f.level === 'critical' ? '●' : '○'} {f.level}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
