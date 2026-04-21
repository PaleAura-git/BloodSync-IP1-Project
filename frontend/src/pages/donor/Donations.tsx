import { useEffect, useState } from 'react'
import { donationApi } from '../../api'
import { PageSpinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import type { Donation } from '../../types'

export function DonorDonations() {
  const [rows, setRows] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    donationApi.getMyHistory().then(res => {
      setRows(res.data.data || res.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSpinner/>

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[18px] font-semibold text-ink">My donations</h1>
        <div className="text-[12px] text-faint tabular-nums">
          {rows.length} total · {rows.filter(d => d.status === 'completed').length} completed
        </div>
      </div>

      <div className="border-t border-line">
        <div className="flex items-baseline gap-4 text-[11px] text-faint px-1 py-2 border-b border-line">
          <span className="w-24 shrink-0">Date</span>
          <span className="w-10">Type</span>
          <span className="w-10 tabular-nums">Units</span>
          <span className="w-20 hidden md:inline">Status</span>
          <span className="flex-1">Hospital</span>
          <span className="w-40 hidden md:inline">Notes</span>
        </div>

        {rows.length === 0 && (
          <div className="py-12 text-center text-[13px] text-muted">No donations yet.</div>
        )}

        {rows.map(d => {
          const date = new Date(d.scheduledDate)
          const bt = d.bloodType.replace('-', '−')
          const bad = d.status === 'cancelled' || d.status === 'no_show'
          const hosp = typeof d.hospital === 'object' ? d.hospital : null
          return (
            <div key={d._id} className="flex items-baseline gap-4 py-3 px-1 border-b border-line text-[13px] hover:bg-surface transition-colors">
              <span className="text-ink tabular-nums w-24 shrink-0">
                {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span className="text-ink tabular-nums w-10">{bt}</span>
              <span className="text-ink tabular-nums w-10">{d.units}</span>
              <span className={cn('w-20 hidden md:inline', bad ? 'text-accent' : 'text-muted')}>
                {bad ? '● ' : '○ '}{d.status.replace('_', ' ')}
              </span>
              <span className="flex-1 min-w-0 truncate text-ink">
                {hosp?.hospitalName ?? '—'}
                <span className="text-faint"> — {hosp?.location?.area}</span>
              </span>
              <span className="text-muted w-40 truncate hidden md:inline">{d.notes || '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
