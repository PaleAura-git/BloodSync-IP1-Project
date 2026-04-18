import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Droplets, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react'
import { PageSpinner } from '../../components/ui/Spinner'
import { notificationApi } from '../../api'
import type { Notification } from '../../types'
import { formatDistanceToNow } from '../../utils/date'

const TYPE_ICON: Record<string, React.ReactNode> = {
  urgent_request: <AlertTriangle size={14} className="text-red-accent" />,
  donation_confirmed: <Droplets size={14} className="text-green-accent" />,
  cooldown_expired: <Clock size={14} className="text-green-accent" />,
  eligibility_changed: <CheckCircle size={14} className="text-amber-accent" />,
  general: <Info size={14} className="text-text-tertiary" />,
}

type FilterTab = 'all' | 'urgent_request' | 'donation_confirmed' | 'general'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'urgent_request', label: 'Urgent Requests' },
  { key: 'donation_confirmed', label: 'Donations' },
  { key: 'general', label: 'System' },
]

export function DonorNotifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [tab, setTab] = useState<FilterTab>('all')

  useEffect(() => {
    notificationApi.getDonorNotifications()
      .then((res) => setNotifications(res.data.data || res.data.notifications || []))
      .finally(() => setLoading(false))
  }, [])

  const markAllRead = async () => {
    if (marking) return
    setMarking(true)
    try {
      const unread = notifications.filter((n) => !n.isRead)
      await Promise.all(unread.map((n) => notificationApi.markAsRead(n._id)))
      setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })))
    } finally {
      setMarking(false)
    }
  }

  const markOne = async (id: string) => {
    await notificationApi.markAsRead(id).catch(() => {})
    setNotifications((ns) => ns.map((n) => n._id === id ? { ...n, isRead: true } : n))
  }

  if (loading) return <PageSpinner />

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const filtered = tab === 'all' ? notifications : notifications.filter((n) => n.type === tab)

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-heading font-semibold text-[20px] text-text-primary">Notifications</h1>
          {unreadCount > 0 && (
            <span className="font-mono text-[11px]" style={{ color: '#555' }}>({unreadCount} unread)</span>
          )}
        </div>
        {/* Always shown, disabled when nothing to mark */}
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0 || marking}
          className="px-3 py-1.5 rounded text-[12px] font-medium transition-all duration-150"
          style={{
            backgroundColor: 'transparent',
            color: unreadCount === 0 ? '#333' : '#888',
            cursor: unreadCount === 0 ? 'default' : 'pointer',
          }}
          onMouseEnter={e => { if (unreadCount > 0) (e.currentTarget as HTMLButtonElement).style.color = '#EFEFEF' }}
          onMouseLeave={e => { if (unreadCount > 0) (e.currentTarget as HTMLButtonElement).style.color = '#888' }}
        >
          {marking ? 'Marking…' : 'Mark all as read'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0" style={{ borderBottom: '1px solid #1E1E1E' }}>
        {TABS.map((t) => {
          const count = t.key === 'all'
            ? notifications.length
            : notifications.filter((n) => n.type === t.key).length
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-[13px] transition-all duration-150 -mb-px"
              style={{
                borderBottom: tab === t.key ? '2px solid #EFEFEF' : '2px solid transparent',
                color: tab === t.key ? '#EFEFEF' : '#888',
                fontWeight: tab === t.key ? 500 : 400,
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

      {/* Notification list — always has a container */}
      <div
        className="rounded-md overflow-hidden"
        style={{ backgroundColor: '#111111', minHeight: '200px' }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-text-tertiary text-[13px]">No notifications yet.</p>
            <p className="text-[12px] mt-1 text-center max-w-xs" style={{ color: '#444' }}>
              You'll receive notifications for urgent requests, donation updates, and eligibility changes.
            </p>
          </div>
        ) : (
          filtered.map((n, i) => (
            <div
              key={n._id}
              onClick={() => { markOne(n._id); if (n.relatedRequest) navigate('/donor/dashboard') }}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-bg-hover transition-all duration-150"
              style={{
                borderBottom: i !== filtered.length - 1 ? '1px solid #1A1A1A' : undefined,
                backgroundColor: !n.isRead ? 'rgba(255,255,255,0.02)' : undefined,
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {TYPE_ICON[n.type] || <Bell size={14} className="text-text-tertiary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] leading-snug"
                  style={{ color: n.isRead ? '#888' : '#EFEFEF', fontWeight: n.isRead ? 400 : 500 }}
                >
                  {n.message}
                </p>
                <p className="font-mono text-[11px] mt-0.5" style={{ color: '#444' }}>
                  {formatDistanceToNow(n.createdAt)}
                </p>
              </div>
              {!n.isRead && (
                <div className="w-1.5 h-1.5 rounded-full bg-red-accent flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
