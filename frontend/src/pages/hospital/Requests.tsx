import { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { PageSpinner } from '../../components/ui/Spinner'
import { urgentRequestApi } from '../../api'
import type { UrgentRequest, BloodType, UrgencyLevel } from '../../types'
import { format, formatDistanceToNow } from '../../utils/date'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({ value: v, label: v }))
const URGENCY = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
]

type TabFilter = 'all' | 'open' | 'fulfilled' | 'expired'

function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'green' | 'dim' | 'red' | 'amber' }> = {
    open: { label: 'Open', variant: 'green' },
    fulfilled: { label: 'Fulfilled', variant: 'dim' },
    expired: { label: 'Expired', variant: 'red' },
    cancelled: { label: 'Cancelled', variant: 'red' },
  }
  const s = map[status] || { label: status, variant: 'dim' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function UrgencyBadge({ level }: { level: string }) {
  const map: Record<string, 'red' | 'amber' | 'dim'> = {
    critical: 'red', urgent: 'amber', normal: 'dim',
  }
  return <Badge variant={map[level] || 'dim'}>{level}</Badge>
}

export function HospitalRequests() {
  const [requests, setRequests] = useState<UrgentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [fulfillId, setFulfillId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reqForm, setReqForm] = useState({ bloodType: '' as BloodType | '', unitsNeeded: '1', urgencyLevel: 'urgent' as UrgencyLevel, notes: '' })

  const loadRequests = async () => {
    try {
      const res = await urgentRequestApi.getHospitalRequests()
      setRequests(res.data.data || res.data.requests || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRequests() }, [])

  const filtered = requests.filter((r) => tab === 'all' || r.status === tab)

  const handleCreate = async () => {
    if (!reqForm.bloodType) return
    setSubmitting(true)
    try {
      await urgentRequestApi.create({
        bloodType: reqForm.bloodType as BloodType,
        unitsNeeded: parseInt(reqForm.unitsNeeded),
        urgencyLevel: reqForm.urgencyLevel,
        notes: reqForm.notes || undefined,
      })
      await loadRequests()
      setShowModal(false)
      setReqForm({ bloodType: '', unitsNeeded: '1', urgencyLevel: 'urgent', notes: '' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleFulfill = async () => {
    if (!fulfillId) return
    setSubmitting(true)
    try {
      await urgentRequestApi.fulfill(fulfillId)
      await loadRequests()
    } finally {
      setSubmitting(false)
      setFulfillId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSubmitting(true)
    try {
      await urgentRequestApi.delete(deleteId)
      await loadRequests()
    } finally {
      setSubmitting(false)
      setDeleteId(null)
    }
  }

  if (loading) return <PageSpinner />

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Active' },
    { key: 'fulfilled', label: 'Fulfilled' },
    { key: 'expired', label: 'Expired' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-semibold text-[20px] text-text-primary">Requests</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-[13px] font-body font-semibold text-white transition-all duration-150 cursor-pointer"
          style={{ backgroundColor: '#E53935' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#C62828')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#E53935')}
        >
          <Plus size={13} />
          New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom: '1px solid #1E1E1E' }}>
        {tabs.map((t) => {
          const count = t.key === 'all' ? requests.length : requests.filter((r) => r.status === t.key).length
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-[13px] transition-all duration-150 border-b-2 -mb-px cursor-pointer"
              style={{
                borderBottomColor: isActive ? '#EFEFEF' : 'transparent',
                color: isActive ? '#EFEFEF' : '#888',
                fontWeight: isActive ? '600' : '400',
              }}
            >
              {t.label}
              {count > 0 && (
                <span className="ml-1.5 font-mono text-[11px]" style={{ color: '#555' }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Requests container — always rendered */}
      <div className="rounded-md overflow-hidden" style={{ backgroundColor: '#111111' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
              {['Blood Type', 'Units', 'Urgency', 'Responses', 'Status', 'Posted', ''].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: '#555' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <p className="text-[13px] text-text-tertiary">No requests yet.</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#444' }}>Create one to find donors.</p>
                </td>
              </tr>
            ) : (
              filtered.map((req, i) => (
                <>
                  <tr
                    key={req._id}
                    className="hover:bg-bg-hover cursor-pointer transition-all duration-150"
                    style={i !== filtered.length - 1 || expanded === req._id ? { borderBottom: '1px solid #1A1A1A' } : {}}
                    onClick={() => setExpanded(expanded === req._id ? null : req._id)}
                  >
                    <td className="px-4 py-2.5"><Badge variant="red">{req.bloodType}</Badge></td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-secondary">{req.unitsNeeded}</td>
                    <td className="px-4 py-2.5"><UrgencyBadge level={req.urgencyLevel} /></td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text-tertiary">{req.respondedDonors?.length || 0}</td>
                    <td className="px-4 py-2.5"><RequestStatusBadge status={req.status} /></td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-text-tertiary">{formatDistanceToNow(req.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      {expanded === req._id
                        ? <ChevronUp size={13} className="text-text-tertiary" />
                        : <ChevronDown size={13} className="text-text-tertiary" />}
                    </td>
                  </tr>
                  {expanded === req._id && (
                    <tr key={`${req._id}-detail`} style={{ borderBottom: i !== filtered.length - 1 ? '1px solid #1A1A1A' : undefined }}>
                      <td colSpan={7} className="px-4 pb-3 pt-2" style={{ backgroundColor: '#0D0D0D' }}>
                        <div className="flex items-center gap-3">
                          {req.notes && (
                            <p className="text-[12px] text-text-secondary flex-1">{req.notes}</p>
                          )}
                          <p className="text-[12px] text-text-tertiary font-mono">{format(req.createdAt)}</p>
                          {req.status === 'open' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setFulfillId(req._id) }}>
                                Mark Fulfilled
                              </Button>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteId(req._id) }}>
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Urgent Request"
        actions={
          <Button onClick={handleCreate} loading={submitting} disabled={!reqForm.bloodType}>
            Post Request
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Select label="Blood type" options={BLOOD_TYPES} placeholder="Select blood type" value={reqForm.bloodType} onChange={(e) => setReqForm((f) => ({ ...f, bloodType: e.target.value as BloodType }))} />
          <Input label="Units needed" type="number" min="1" value={reqForm.unitsNeeded} onChange={(e) => setReqForm((f) => ({ ...f, unitsNeeded: e.target.value }))} />
          <Select label="Urgency" options={URGENCY} value={reqForm.urgencyLevel} onChange={(e) => setReqForm((f) => ({ ...f, urgencyLevel: e.target.value as UrgencyLevel }))} />
          <Input label="Notes (optional)" value={reqForm.notes} onChange={(e) => setReqForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any additional details" />
        </div>
      </Modal>

      <ConfirmModal
        open={!!fulfillId}
        onClose={() => setFulfillId(null)}
        onConfirm={handleFulfill}
        title="Mark as Fulfilled"
        message="This will close the request and notify matched donors."
        confirmLabel="Fulfill"
        loading={submitting}
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Request"
        message="This will permanently delete the request."
        confirmLabel="Delete"
        loading={submitting}
      />
    </div>
  )
}
