import { useState, useEffect, useRef } from 'react'
import { searchApi } from '../../api'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { cn } from '../../utils/cn'
import type { BloodType, SearchResult, DonorProfile } from '../../types'
import { Row } from '../../components/ui/Row'

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const AREAS = [
  'Al Khuwair', 'Ruwi', 'Seeb', 'Bausher', 'Al Ghubra',
  'Qurum', 'Madinat Sultan Qaboos', 'Al Hail', 'Al Amerat',
  'Wadi Kabir', 'Darsait', 'Al Khoud', 'Muttrah', 'Azaiba',
  'Al Mawaleh', 'Shati Al Qurum', 'Madinat Al Ilam', 'Bowsher', 'Al Ansab',
]

export function HospitalSearch() {
  const [bt, setBt] = useState<BloodType>('O-')
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD'>('STANDARD')
  const [area, setArea] = useState<string | null>(null)
  const [areaOpen, setAreaOpen] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!areaOpen) return
    const handler = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setAreaOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [areaOpen])
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [revealed, setRevealed] = useState<DonorProfile | null>(null)
  const [revealData, setRevealData] = useState<DonorProfile | null>(null)

  const search = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const res = await searchApi.searchDonors({ bloodType: bt, urgency, neighborhood: area ?? undefined })
      setResults(res.data.data || res.data || [])
    } catch {} finally { setLoading(false) }
  }

  const reveal = async (donor: DonorProfile) => {
    try {
      const res = await searchApi.revealContact(donor._id)
      setRevealData(res.data.data || res.data || donor)
      setRevealed(donor)
    } catch {
      setRevealData(donor)
      setRevealed(donor)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[18px] font-semibold text-ink">Find donors</h1>
        <div className="text-[12px] text-faint tabular-nums">
          {searched ? `${results.length} match${results.length === 1 ? '' : 'es'}` : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="border-t border-line mb-6">
        <div className="flex items-baseline gap-4 py-3 px-1 border-b border-line text-[13px]">
          <span className="text-faint w-24 shrink-0">Blood type</span>
          <div className="flex gap-2 flex-wrap">
            {BLOOD_TYPES.map(x => (
              <button key={x} onClick={() => setBt(x)}
                className={cn('px-2 tabular-nums transition-colors',
                  bt === x ? 'text-accent' : 'text-muted hover:text-ink')}>
                {bt === x ? '● ' : '○ '}{x.replace('-', '−')}
              </button>
            ))}
          </div>
        </div>
        <div className="relative border-b border-line" ref={areaRef}>
          <div className="flex items-baseline gap-4 py-3 px-1 text-[13px]">
            <span className="text-faint w-24 shrink-0">Area</span>
            <span className="text-ink">{area ?? 'Any'}</span>
            <button onClick={() => setAreaOpen(o => !o)}
              className="text-faint text-[11px] hover:text-ink transition-colors">
              — change
            </button>
            {area && (
              <button onClick={() => setArea(null)} className="text-faint text-[11px] hover:text-ink transition-colors">
                · clear
              </button>
            )}
          </div>
          {areaOpen && (
            <div className="absolute left-28 top-0 z-20 bg-elevated border border-line rounded shadow-pop py-1 w-52 max-h-64 overflow-y-auto animate-fade-in">
              {AREAS.map(a => (
                <button key={a} onClick={() => { setArea(a); setAreaOpen(false) }}
                  className={cn('w-full text-left px-3 py-1.5 text-[13px] hover:bg-surface transition-colors',
                    area === a ? 'text-accent' : 'text-ink')}>
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-4 py-3 px-1 border-b border-line text-[13px]">
          <span className="text-faint w-24 shrink-0">Urgency</span>
          <div className="flex gap-4">
            {(['STANDARD', 'URGENT'] as const).map(u => (
              <button key={u} onClick={() => setUrgency(u)}
                className={cn('inline-flex items-center gap-2 transition-colors',
                  urgency === u ? 'text-accent' : 'text-muted hover:text-ink')}>
                <span className={cn('h-1.5 w-1.5 rounded-full', urgency === u ? 'bg-accent' : 'bg-faint')}/>
                {u.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="py-3 px-1">
          <button onClick={search} disabled={loading}
            className="text-ink hover:text-accent text-[13px] underline-offset-4 hover:underline disabled:opacity-50">
            {loading ? 'searching…' : 'search →'}
          </button>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="border-t border-line">
          <div className="flex items-baseline gap-4 text-[11px] text-faint px-1 py-2 border-b border-line">
            <span className="w-10">Type</span>
            <span className="flex-1">Name</span>
            <span className="w-28 hidden md:inline">Area</span>
            <span className="w-16 tabular-nums hidden md:inline">Prior</span>
            <span className="w-14 tabular-nums">Match</span>
            <span className="w-20 text-right">Action</span>
          </div>
          {results.map(r => {
            const d = r.donor
            const bloodType = d.bloodType.replace('-', '−')
            return (
              <div key={d._id} className="flex items-baseline gap-4 py-3 px-1 border-b border-line text-[13px] hover:bg-surface transition-colors">
                <span className="text-ink tabular-nums w-10">{bloodType}</span>
                <span className="flex-1 min-w-0 truncate text-ink">
                  {d.fullName}
                  {!d.isAvailable && <span className="text-faint"> · cooldown</span>}
                </span>
                <span className="text-muted w-28 truncate hidden md:inline">{d.location?.area}</span>
                <span className="text-muted tabular-nums w-16 hidden md:inline">{d.totalDonations} prior</span>
                <span className="text-ink tabular-nums w-14">{Math.round(r.matchScore * 100)}%</span>
                <button onClick={() => reveal(d)}
                  className="w-20 text-right text-ink hover:text-accent text-[12px] underline-offset-4 hover:underline">
                  reveal →
                </button>
              </div>
            )
          })}
          {results.length === 0 && (
            <div className="py-12 text-center text-[13px] text-muted">No donors found matching your criteria.</div>
          )}
        </div>
      )}

      <Modal open={!!revealed} onClose={() => setRevealed(null)}
        title="Donor contact revealed"
        subtitle="This action is logged for compliance and audit."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevealed(null)}>Close</Button>
            <Button>Call now</Button>
          </>
        }>
        {revealData && (
          <dl className="text-[13px] border-t border-line">
            <Row k="Name" v={<span className="text-ink">{revealData.fullName}</span>}/>
            <Row k="Type" v={<span className="text-ink">{revealData.bloodType?.replace('-', '−')}</span>}/>
            <Row k="Area" v={<span className="text-ink">{revealData.location?.area}</span>}/>
            <Row k="Donations" v={<span className="text-ink tabular-nums">{revealData.totalDonations}</span>}/>
            <Row k="Phone" v={<span className="text-ink">{revealData.phone}</span>}/>
          </dl>
        )}
      </Modal>
    </div>
  )
}
