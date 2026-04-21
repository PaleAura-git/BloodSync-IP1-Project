import { useEffect, useState } from 'react'
import { urgentRequestApi } from '../../api'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { PageSpinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import { timeAgo } from '../../utils/date'
import type { UrgentRequest, BloodType, UrgencyLevel } from '../../types'

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const URGENCY_LEVELS: UrgencyLevel[] = ['normal', 'urgent', 'critical']

type Tab = 'all' | 'open' | 'fulfilled' | 'expired'

export function HospitalRequests() {
  const [requests, setRequests] = useState<UrgentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [modal, setModal] = useState(false)
  const [newBt, setNewBt] = useState<BloodType>('O-')
  const [newUnits, setNewUnits] = useState(3)
  const [newUrgency, setNewUrgency] = useState<UrgencyLevel>('critical')
  const [newNotes, setNewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    urgentRequestApi.getHospitalRequests().then(res => {
      setRequests(res.data.data || res.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab)
  const counts = {
    all: requests.length,
    open: requests.filter(r => r.status === 'open').length,
    fulfilled: requests.filter(r => r.status === 'fulfilled').length,
    expired: requests.filter(r => r.status === 'expired').length,
  }

  const broadcast = async () => {
    setSubmitting(true)
    try {
      const res = await urgentRequestApi.create({
        bloodType: newBt, unitsNeeded: newUnits,
        urgencyLevel: newUrgency, notes: newNotes || undefined,
      })
      setRequests(r => [res.data.data || res.data, ...r])
      setModal(false)
    } catch {} finally { setSubmitting(false) }
  }

  if (loading) return <PageSpinner/>

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[18px] font-semibold text-ink">Requests</h1>
        <button onClick={() => setModal(true)}
          className="text-[13px] text-ink hover:text-accent underline-offset-4 hover:underline">
          + new request
        </button>
      </div>

      <div className="flex items-baseline gap-6 border-b border-line mb-6 text-[13px]">
        {(['all', 'open', 'fulfilled', 'expired'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('pb-2 -mb-px border-b transition-colors capitalize',
              tab === t ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}>
            {t} <span className="text-faint tabular-nums ml-1">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-line">
        {filtered.map(r => {
          const bt = r.bloodType.replace('-', '−')
          const critical = r.urgencyLevel === 'critical' && r.status === 'open'
          const responded = r.respondedDonors?.length ?? 0
          return (
            <div key={r._id} className="py-5 px-1 border-b border-line">
              <div className="flex items-baseline gap-4 mb-2">
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0 translate-y-[-2px]',
                  critical ? 'bg-accent' : r.status === 'open' ? 'bg-ink' : 'bg-faint')}/>
                <span className="text-ink tabular-nums w-10">{bt}</span>
                <span className="text-ink tabular-nums">{r.unitsNeeded} unit{r.unitsNeeded > 1 ? 's' : ''}</span>
                <span className="text-faint">·</span>
                <span className="text-muted">{r.urgencyLevel}</span>
                <span className="text-faint">·</span>
                <span className="text-muted">{r.status}</span>
                <span className="flex-1"/>
                <span className="text-[11px] text-faint tabular-nums shrink-0">{timeAgo(r.createdAt)} ago</span>
              </div>
              {r.notes && <p className="ml-8 text-[13px] text-muted mb-2">{r.notes}</p>}
              <div className="ml-8 flex items-baseline gap-4 text-[12px]">
                <span className="text-faint tabular-nums">{responded} donor{responded === 1 ? '' : 's'} responded</span>
                {r.status === 'open' && (
                  <>
                    <button className="text-ink hover:text-accent underline-offset-4 hover:underline">view responses →</button>
                    <button onClick={() => urgentRequestApi.fulfill(r._id).then(() => setRequests(rs => rs.map(x => x._id === r._id ? { ...x, status: 'fulfilled' } : x))).catch(() => {})}
                      className="text-muted hover:text-ink">close</button>
                  </>
                )}
                {r.status === 'fulfilled' && (
                  <button className="text-ink hover:text-accent underline-offset-4 hover:underline">view details →</button>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[13px] text-muted">
            No requests here.{' '}
            <button onClick={() => setModal(true)} className="text-ink hover:text-accent underline-offset-4 hover:underline">
              create one →
            </button>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New request"
        subtitle="Broadcast to every donor with a compatible blood type in Muscat."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button loading={submitting} onClick={broadcast}>Broadcast</Button>
          </>
        }>
        <div className="space-y-5 text-[13px]">
          <div>
            <div className="text-faint text-[11px] mb-2">Blood type needed</div>
            <div className="flex gap-2 flex-wrap">
              {BLOOD_TYPES.map(x => (
                <button key={x} onClick={() => setNewBt(x)}
                  className={cn('px-2 tabular-nums', newBt === x ? 'text-accent' : 'text-muted hover:text-ink')}>
                  {newBt === x ? '● ' : '○ '}{x.replace('-', '−')}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-faint text-[11px] mb-2">Units</div>
              <input type="number" value={newUnits} min={1}
                onChange={e => setNewUnits(+e.target.value)}
                className="w-full border-0 border-b border-line bg-transparent text-ink tabular-nums py-1 outline-none focus:border-ink"/>
            </div>
            <div>
              <div className="text-faint text-[11px] mb-2">Urgency</div>
              <div className="flex gap-3 pt-1">
                {URGENCY_LEVELS.map(v => (
                  <button key={v} onClick={() => setNewUrgency(v)}
                    className={cn(newUrgency === v ? 'text-accent' : 'text-muted hover:text-ink')}>
                    {newUrgency === v ? '● ' : '○ '}{v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="text-faint text-[11px] mb-2">Notes</div>
            <textarea rows={2} value={newNotes} onChange={e => setNewNotes(e.target.value)}
              placeholder="Trauma case — ICU, immediate need."
              className="w-full border-0 border-b border-line bg-transparent text-ink py-1 outline-none focus:border-ink resize-none placeholder:text-faint"/>
          </div>
          <div className="text-[11px] text-faint pt-2 border-t border-line">
            Estimated reach: 142 donors. Critical requests also dispatch SMS.
          </div>
        </div>
      </Modal>
    </div>
  )
}
