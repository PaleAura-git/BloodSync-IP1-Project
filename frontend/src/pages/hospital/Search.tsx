import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { searchApi } from '../../api'
import type { BloodType, SearchResult } from '../../types'
import { format } from '../../utils/date'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({ value: v, label: v }))
const MUSCAT_AREAS = [
  'Muscat', 'Muttrah', 'Ruwi', 'Madinat al-Sultan Qaboos', 'Al Khuwair',
  'Qurum', 'Bousher', 'Al Ghubra', 'Al Maabilah', 'Seeb', 'Azaiba',
  'Al Khoud', 'Wattayah', 'Darsait', 'Hamriyah', 'Al Amerat', 'Quriyat',
  'Bowshar', 'Muwaileh', 'Al Hail',
].map((a) => ({ value: a, label: a }))

const selectStyle = { backgroundColor: '#1A1A1A', border: 'none', color: '#EFEFEF' }

export function HospitalSearch() {
  const [searchParams] = useSearchParams()
  const [bloodType, setBloodType] = useState(searchParams.get('blood') || '')
  const [area, setArea] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  useEffect(() => {
    if (searchParams.get('blood')) handleSearch()
  }, [])

  const handleSearch = async () => {
    if (!bloodType) return
    setLoading(true)
    setSearched(false)
    try {
      const res = await searchApi.searchDonors({
        bloodType: bloodType as BloodType,
        area: area || undefined,
        availableOnly,
      })
      setResults(res.data.data || res.data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const handleRequestDonation = async (donorId: string) => {
    setRequesting(donorId)
    try {
      await searchApi.revealContact(donorId)
      setFeedback((f) => ({ ...f, [donorId]: 'Notification sent' }))
      setTimeout(() => setFeedback((f) => { const n = { ...f }; delete n[donorId]; return n }), 3000)
    } catch {
      setFeedback((f) => ({ ...f, [donorId]: 'Failed' }))
      setTimeout(() => setFeedback((f) => { const n = { ...f }; delete n[donorId]; return n }), 3000)
    } finally {
      setRequesting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading font-semibold text-[20px] text-text-primary">Search Donors</h1>

      {/* Filters */}
      <div className="rounded-md px-4 py-4" style={{ backgroundColor: '#141414' }}>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-text-tertiary uppercase tracking-wide font-medium">Blood type</label>
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              className="rounded px-3 py-1.5 text-[13px] focus:outline-none min-w-[120px]"
              style={selectStyle}
            >
              <option value="">Select</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>{bt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-text-tertiary uppercase tracking-wide font-medium">Area</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="rounded px-3 py-1.5 text-[13px] focus:outline-none min-w-[150px]"
              style={selectStyle}
            >
              <option value="">Any area</option>
              {MUSCAT_AREAS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mb-0.5">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="accent-red-accent"
            />
            <span className="text-[13px] text-text-secondary">Available now</span>
          </label>
          <button
            onClick={handleSearch}
            disabled={!bloodType || loading}
            className="px-4 py-1.5 rounded text-[13px] font-body font-semibold text-white transition-all duration-150 disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: '#E53935' }}
            onMouseEnter={e => { if (bloodType && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C62828' }}
            onMouseLeave={e => { if (bloodType && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E53935' }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Results container — always visible */}
      <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#111111' }}>
        {loading ? (
          <div className="py-10 flex justify-center">
            <PageSpinner />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                {['Name', 'Blood Type', 'Area', 'Eligibility', 'Last Donation', 'Score', ''].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: '#555' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!searched && results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-text-tertiary">
                    Search for donors by selecting a blood type.
                  </td>
                </tr>
              ) : searched && results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-text-tertiary">
                    No matching donors found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                results.map((r, i) => (
                  <tr
                    key={r.donor._id}
                    className="hover:bg-bg-hover transition-all duration-150"
                    style={i !== results.length - 1 ? { borderBottom: '1px solid #1A1A1A' } : {}}
                  >
                    <td className="px-4 py-2.5 text-[13px] text-text-primary">{r.donor.fullName || '—'}</td>
                    <td className="px-4 py-2.5"><Badge variant="red">{r.donor.bloodType}</Badge></td>
                    <td className="px-4 py-2.5 text-[13px] text-text-secondary">{r.donor.location?.area || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[12px] font-medium ${r.donor.isEligible ? 'text-green-accent' : 'text-red-accent'}`}>
                        {r.donor.isEligible ? 'Eligible' : 'Not eligible'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-secondary">
                      {r.donor.lastDonationDate ? format(r.donor.lastDonationDate) : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-tertiary">
                      {r.matchScore ? `${Math.round(r.matchScore * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {feedback[r.donor._id] ? (
                        <span className={`text-[12px] ${feedback[r.donor._id] === 'Notification sent' ? 'text-green-accent' : 'text-red-accent'}`}>
                          {feedback[r.donor._id]}
                        </span>
                      ) : (
                        <button
                          disabled={requesting === r.donor._id}
                          onClick={() => handleRequestDonation(r.donor._id)}
                          className="px-3 py-1 rounded text-[12px] font-body font-semibold text-white transition-all duration-150 disabled:opacity-40 cursor-pointer"
                          style={{ backgroundColor: '#E53935' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#C62828')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#E53935')}
                        >
                          {requesting === r.donor._id ? '…' : 'Request'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
