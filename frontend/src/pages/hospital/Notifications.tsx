import { useEffect, useState } from 'react'
import { notificationApi } from '../../api'
import { PageSpinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import { timeAgo } from '../../utils/date'
import type { Notification } from '../../types'

export function HospitalNotifications() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationApi.getHospitalNotifications().then(res => {
      setItems(res.data.data || res.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const unread = items.filter(n => !n.isRead).length

  const markAll = async () => {
    await Promise.all(items.filter(n => !n.isRead).map(n => notificationApi.markAsRead(n._id).catch(() => {})))
    setItems(items.map(n => ({ ...n, isRead: true })))
  }

  if (loading) return <PageSpinner/>

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-baseline justify-between mb-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[18px] font-semibold text-ink">Notifications</h1>
          {unread > 0 && <span className="text-[12px] text-faint tabular-nums">{unread} unread</span>}
        </div>
        <button onClick={markAll} className="text-[13px] text-muted hover:text-ink">mark all read</button>
      </div>

      <div className="border-t border-line">
        {items.length === 0 && (
          <div className="py-12 text-center text-[13px] text-muted">No notifications.</div>
        )}
        {items.map(n => (
          <div key={n._id} className="flex items-baseline gap-3 py-4 px-1 border-b border-line">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0 translate-y-[5px]',
              n.isRead ? 'bg-transparent' : 'bg-accent')}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <h3 className={cn('text-[13px] text-pretty flex-1', n.isRead ? 'text-muted' : 'text-ink')}>
                  {n.title}
                </h3>
                <span className="text-[11px] text-faint tabular-nums shrink-0">{timeAgo(n.createdAt)}</span>
              </div>
              <p className="text-[12px] text-muted mt-1 text-pretty">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
