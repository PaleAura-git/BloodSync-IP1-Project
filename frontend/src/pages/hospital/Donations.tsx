import { useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { donationApi } from '../../api'
import type { Donation } from '../../types'
import { format } from '../../utils/date'

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

export function HospitalDonations() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    donationApi.getHospitalDonations()
      .then((res) => setDonations(res.data.data || res.data.donations || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSpinner />

  const filtered = statusFilter ? donations.filter((d) => d.status === statusFilter) : donations

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-semibold text-[20px] text-text-primary">Donation History</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded px-3 py-1.5 text-[12px] text-text-secondary focus:outline-none"
          style={{ backgroundColor: '#1A1A1A', border: 'none' }}
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No-show</option>
        </select>
      </div>

      {/* Table — always rendered */}
      <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#111111' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
              {['Date', 'Donor', 'Blood Type', 'Units', 'Status'].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: '#555' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <p className="text-[13px] text-text-tertiary">No donations recorded yet.</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#444' }}>Donations will appear here once scheduled by donors.</p>
                </td>
              </tr>
            ) : (
              filtered.map((d, i) => {
                const donor = typeof d.donor === 'object' ? d.donor : null
                return (
                  <tr
                    key={d._id}
                    className="hover:bg-bg-hover transition-all duration-150"
                    style={i !== filtered.length - 1 ? { borderBottom: '1px solid #1A1A1A' } : {}}
                  >
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-secondary">{format(d.scheduledDate)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-text-primary">{donor?.fullName || '—'}</td>
                    <td className="px-4 py-2.5"><Badge variant="red">{d.bloodType}</Badge></td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-secondary">{d.units}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
