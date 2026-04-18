import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { PageSpinner } from '../../components/ui/Spinner'
import { notificationApi } from '../../api'
import type { Notification } from '../../types'
import { formatDistanceToNow } from '../../utils/date'

type TabFilter = 'all' | 'urgent_request' | 'donation_confirmed' | 'general'

const TYPE_ICON: Record<string, React.ReactNode> = {
  urgent_request: <AlertTriangle size={14} className="text-red-accent" />,
  donation_confirmed: <CheckCircle size={14} className="text-green-accent" />,
  eligibility_changed: <CheckCircle size={14} className="text-amber-accent" />,
  general: <Info size={14} className="text-text-tertiary" />,
}

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'urgent_request', label: 'Urgent Requests' },
  { key: 'donation_confirmed', label: 'Donations' },
  { key: 'general', label: 'System' },
]

export function HospitalNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [tab, setTab] = useState<TabFilter>('all')

  useEffect(() => {
    notificationApi.getHospitalNotifications()
      .then((res) => setNotifications(res.data.data || res.data.notifications || []))
      .finally(() => setLoading(false))
  }, [])

  const markAllRead = async () => {
    if (unreadCount === 0) return
    setMarking(true)
    try {
      const unread = notifications.filter((n) => !n.isRead)
      await Promise.all(unread.map((n) => notificationApi.markAsRead(n._id)))
      setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })))
    } finally {
      setMarking(false)
    }
  }

  if (loading) return <PageSpinner />

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const filtered = tab === 'all'
    ? notifications
    : notifications.filter((n) => {
        if (tab === 'urgent_request') return n.type === 'urgent_request'
        if (tab === 'donation_confirmed') return n.type === 'donation_confirmed'
        if (tab === 'general') return n.type === 'general' || n.type === 'eligibility_changed'
        return true
      })

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-heading font-semibold text-[20px] text-text-primary">Notifications</h1>
          {unreadCount > 0 && (
            <span className="font-mono text-[11px] text-text-tertiary">({unreadCount} unread)</span>
          )}
        </div>
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0 || marking}
          className="text-[12px] px-3 py-1.5 rounded transition-all duration-150 cursor-pointer"
          style={{
            color: unreadCount === 0 ? '#333' : '#888',
            backgroundColor: 'transparent',
            border: 'none',
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
            </button>
          )
        })}
      </div>

      {/* Notifications container */}
      <div
        className="rounded-md overflow-hidden"
        style={{ backgroundColor: '#111111', minHeight: '200px' }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center" style={{ minHeight: '200px' }}>
            <Bell size={20} className="text-text-tertiary mb-3" />
            <p className="text-[13px] text-text-tertiary">No notifications yet.</p>
            <p className="text-[12px] mt-1" style={{ color: '#444' }}>
              You'll receive alerts for donor responses and donation updates.
            </p>
          </div>
        ) : (
          filtered.map((n, i) => (
            <div
              key={n._id}
              className="flex items-start gap-3 px-4 py-3 transition-colors"
              style={{
                borderBottom: i !== filtered.length - 1 ? '1px solid #1A1A1A' : undefined,
                backgroundColor: !n.isRead ? 'rgba(255,255,255,0.02)' : undefined,
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {TYPE_ICON[n.type] || <Bell size={14} className="text-text-tertiary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] leading-snug ${n.isRead ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                  {n.message}
                </p>
                <p className="font-mono text-[11px] text-text-tertiary mt-0.5">
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
