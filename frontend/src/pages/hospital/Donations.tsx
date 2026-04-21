import { useEffect, useState } from 'react'
import { donationApi } from '../../api'
import { PageSpinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import type { Donation } from '../../types'

type Tab = 'upcoming' | 'past'

export function HospitalDonations() {
  const [rows, setRows] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')

  useEffect(() => {
    donationApi.getHospitalDonations().then(res => {
      setRows(res.data.data || res.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const isUpcoming = (d: Donation) => ['scheduled', 'confirmed'].includes(d.status)
  const filtered = tab === 'upcoming' ? rows.filter(isUpcoming) : rows.filter(d => !isUpcoming(d))

  const actionLabel: Record<string, string> = {
    confirmed: 'check in →',
    scheduled: 'confirm →',
    completed: 'details →',
    no_show: 'follow up →',
    cancelled: 'details →',
  }

  if (loading) return <PageSpinner/>

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[18px] font-semibold text-ink">Appointments</h1>
        <button className="text-[13px] text-muted hover:text-ink">export ↓</button>
      </div>

      <div className="flex items-baseline gap-6 border-b border-line mb-6 text-[13px]">
        {([['upcoming', 'Upcoming'], ['past', 'Past']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn('pb-2 -mb-px border-b transition-colors',
              tab === k ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}>
            {l} <span className="text-faint tabular-nums ml-1">
              {k === 'upcoming' ? rows.filter(isUpcoming).length : rows.filter(d => !isUpcoming(d)).length}
            </span>
          </button>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="flex items-baseline gap-4 text-[11px] text-faint px-1 py-2 border-b border-line">
          <span className="w-20 tabular-nums">Date</span>
          <span className="w-12 tabular-nums">Time</span>
          <span className="flex-1">Donor</span>
          <span className="w-10 tabular-nums">Type</span>
          <span className="w-24 hidden md:inline">Status</span>
          <span className="w-24 text-right">Action</span>
        </div>
        {filtered.map(d => {
          const date = new Date(d.scheduledDate)
          const donor = typeof d.donor === 'object' ? d.donor : null
          const bt = d.bloodType.replace('-', '−')
          return (
            <div key={d._id} className="flex items-baseline gap-4 py-3 px-1 border-b border-line text-[13px] hover:bg-surface transition-colors">
              <span className="text-ink tabular-nums w-20">{date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
              <span className="text-muted tabular-nums w-12">{date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="flex-1 min-w-0 truncate text-ink">{donor?.fullName ?? '—'}</span>
              <span className="text-ink tabular-nums w-10">{bt}</span>
              <span className="text-muted w-24 hidden md:inline">{d.status.replace('_', ' ')}</span>
              <button className="w-24 text-right text-ink hover:text-accent text-[12px] underline-offset-4 hover:underline">
                {actionLabel[d.status] || 'details →'}
              </button>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[13px] text-muted">No appointments.</div>
        )}
      </div>
    </div>
  )
}
