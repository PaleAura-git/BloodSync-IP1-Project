import { useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { donorApi, donationApi } from '../../api'
import type { Donation, DonorProfile } from '../../types'
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

export function DonorDonations() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [donor, setDonor] = useState<DonorProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      donationApi.getMyHistory().catch(() => ({ data: { data: [] } })),
      donorApi.getProfile().catch(() => null),
    ])
      .then(([dRes, pRes]) => {
        setDonations(dRes.data.data || dRes.data.donations || [])
        if (pRes) setDonor(pRes.data.data || pRes.data.donor || pRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSpinner />

  const cooldownDays = () => {
    if (!donor?.cooldownUntil) return null
    const diff = new Date(donor.cooldownUntil).getTime() - Date.now()
    if (diff <= 0) return null
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
  const days = cooldownDays()

  const nextEligibleDate = donor?.cooldownUntil && days
    ? format(donor.cooldownUntil)
    : null

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading font-semibold text-[20px] text-text-primary">Donation History</h1>

      {/* Summary stat blocks */}
      <div className="flex gap-3">
        <div className="flex-1 px-4 py-3 rounded-md" style={{ backgroundColor: '#141414' }}>
          <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: '#555' }}>Total Donations</p>
          <p className="font-mono text-[13px] font-medium text-text-primary">{String(donor?.totalDonations ?? 0)}</p>
        </div>
        <div className="flex-1 px-4 py-3 rounded-md" style={{ backgroundColor: '#141414' }}>
          <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: '#555' }}>Next Eligible</p>
          <p
            className="font-mono text-[13px] font-medium"
            style={{ color: days ? '#F59E0B' : '#2EC486' }}
          >
            {nextEligibleDate ? nextEligibleDate : 'Available now'}
          </p>
        </div>
        <div className="flex-1 px-4 py-3 rounded-md flex items-center gap-2" style={{ backgroundColor: '#141414' }}>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: '#555' }}>Blood Type</p>
            {donor?.bloodType
              ? <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold text-white" style={{ backgroundColor: '#E53935' }}>{donor.bloodType}</span>
              : <p className="font-mono text-[13px] font-medium text-text-tertiary">—</p>
            }
          </div>
        </div>
      </div>

      {/* Table — always shown with headers */}
      <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#111111' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
              {['Date', 'Hospital', 'Blood Type', 'Units', 'Status'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide"
                  style={{ color: '#555' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center">
                  <p className="text-text-tertiary text-[13px]">No donations yet.</p>
                  <p className="text-[12px] mt-1" style={{ color: '#444' }}>
                    Your donation history will appear here after your first donation.
                  </p>
                </td>
              </tr>
            ) : (
              donations.map((d, i) => {
                const hosp = typeof d.hospital === 'object' ? d.hospital : null
                return (
                  <tr
                    key={d._id}
                    className="hover:bg-bg-hover transition-all duration-150"
                    style={i !== donations.length - 1 ? { borderBottom: '1px solid #1A1A1A' } : {}}
                  >
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-secondary">{format(d.scheduledDate)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-text-primary">{hosp?.hospitalName || '—'}</td>
                    <td className="px-4 py-2.5"><Badge variant="red">{d.bloodType}</Badge></td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-secondary">{d.units ?? '—'}</td>
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
