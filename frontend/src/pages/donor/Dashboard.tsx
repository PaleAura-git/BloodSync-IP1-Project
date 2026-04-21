import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { donorApi, urgentRequestApi } from '../../api'
import { PageSpinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import type { DonorProfile, UrgentRequest } from '../../types'
import { timeAgo } from '../../utils/date'

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-1">
      <dt className="text-faint w-24 shrink-0 text-[13px]">{k}</dt>
      <dd className="text-[13px]">{v}</dd>
    </div>
  )
}

export function DonorDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<DonorProfile | null>(null)
  const [requests, setRequests] = useState<UrgentRequest[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      donorApi.getProfile(),
      urgentRequestApi.getActive(),
    ]).then(([pRes, rRes]) => {
      const p = pRes.data.data || pRes.data
      setProfile(p)
      setAvailable(p.isAvailable)
      const allReqs: UrgentRequest[] = rRes.data.data || rRes.data || []
      // Show requests where this donor's blood type is compatible (can donate to)
      const compatible: Record<string, string[]> = {
        'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        'O+':  ['O+', 'A+', 'B+', 'AB+'],
        'A-':  ['A-', 'A+', 'AB-', 'AB+'],
        'A+':  ['A+', 'AB+'],
        'B-':  ['B-', 'B+', 'AB-', 'AB+'],
        'B+':  ['B+', 'AB+'],
        'AB-': ['AB-', 'AB+'],
        'AB+': ['AB+'],
      }
      const canDonateTo = compatible[p.bloodType] ?? [p.bloodType]
      setRequests(allReqs.filter((r: UrgentRequest) => canDonateTo.includes(r.bloodType)))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggleAvail = async () => {
    try {
      await donorApi.toggleAvailability()
      setAvailable(a => !a)
    } catch {}
  }

  if (loading) return <PageSpinner/>

  const daysSinceLast = profile?.lastDonationDate
    ? Math.floor((Date.now() - new Date(profile.lastDonationDate).getTime()) / 86400000)
    : null

  return (
    <div className="animate-fade-in">
      <h1 className="text-[18px] font-semibold text-ink mb-8">Dashboard</h1>

      <dl className="text-[13px] leading-[26px] mb-10">
        <Row k="Status" v={
          <span className={cn('text-ink', profile?.isEligible ? '' : 'text-muted')}>
            {profile?.isEligible ? 'Eligible to donate' : profile?.eligibilityReason || 'Not eligible'}
          </span>
        }/>
        <Row k="Type" v={<span className="text-ink">{profile?.bloodType}</span>}/>
        {profile?.lastDonationDate && (
          <Row k="Last" v={
            <span className="text-ink">
              {new Date(profile.lastDonationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              <span className="text-faint"> · {daysSinceLast} days ago</span>
            </span>
          }/>
        )}
        <Row k="Donations" v={<span className="text-ink tabular-nums">{profile?.totalDonations ?? 0}</span>}/>
        <Row k="Available" v={
          <button onClick={toggleAvail}
            className="text-ink hover:text-accent transition-colors inline-flex items-center gap-2">
            <span className={cn('h-1.5 w-1.5 rounded-full', available ? 'bg-accent' : 'bg-faint')}/>
            {available ? 'yes' : 'no'}
            <span className="text-faint text-[11px]">— change</span>
          </button>
        }/>
      </dl>

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[13px] font-medium text-ink">
            Open requests matching {profile?.bloodType}
          </h2>
          <span className="text-[12px] text-faint tabular-nums">
            {requests.length} match{requests.length === 1 ? '' : 'es'}
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-faint border-t border-b border-line">
            No open requests need {profile?.bloodType} right now. You'll be notified when that changes.
          </div>
        ) : (
          <div className="border-t border-line">
            {requests.map(r => {
              const age = timeAgo(r.createdAt)
              const matched = r.respondedDonors?.length ?? 0
              const critical = r.urgencyLevel === 'critical'
              const hosp = typeof r.hospital === 'object' ? r.hospital : null
              return (
                <div key={r._id} className="border-b border-line py-3 flex items-baseline gap-4 text-[13px] hover:bg-surface transition-colors px-1">
                  <span className="text-faint tabular-nums w-10 shrink-0">{age}</span>
                  <span className="text-ink flex-1 min-w-0 truncate">{hosp?.hospitalName ?? '—'}</span>
                  <span className="text-muted hidden md:inline w-24 truncate">{hosp?.location?.area}</span>
                  <span className={cn('w-20 tabular-nums', critical ? 'text-accent' : 'text-muted')}>
                    {critical ? '● ' : '○ '}{r.urgencyLevel}
                  </span>
                  <span className="text-muted tabular-nums w-20 text-right">{matched}/{r.unitsNeeded} units</span>
                  <button onClick={() => navigate('/donor/notifications')}
                    className="text-ink hover:text-accent text-[12px] underline-offset-4 hover:underline">
                    respond →
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
