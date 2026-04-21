import { useEffect, useState } from 'react'
import { notificationApi } from '../../api'
import { PageSpinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'
import { timeAgo } from '../../utils/date'
import type { Notification } from '../../types'

export function DonorNotifications() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationApi.getDonorNotifications().then(res => {
      setItems(res.data.data || res.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const unread = items.filter(n => !n.isRead).length

  const markAll = async () => {
    const unreadItems = items.filter(n => !n.isRead)
    await Promise.all(unreadItems.map(n => notificationApi.markAsRead(n._id).catch(() => {})))
    setItems(items.map(n => ({ ...n, isRead: true })))
  }

  const markOne = async (id: string) => {
    try {
      await notificationApi.markAsRead(id)
      setItems(items.map(n => n._id === id ? { ...n, isRead: true } : n))
    } catch {}
  }

  if (loading) return <PageSpinner/>

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[18px] font-semibold text-ink">Notifications</h1>
        <div className="flex items-baseline gap-4 text-[12px]">
          <span className="text-faint tabular-nums">{unread} unread</span>
          {unread > 0 && (
            <button onClick={markAll} className="text-ink hover:text-accent underline-offset-4 hover:underline">
              mark all read
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-line">
        {items.length === 0 && (
          <div className="py-12 text-center text-[13px] text-muted">No notifications.</div>
        )}
        {items.map(n => {
          const critical = n.type === 'urgent_request'
          return (
            <div key={n._id}
              className="flex items-baseline gap-4 py-4 px-1 border-b border-line text-[13px] hover:bg-surface transition-colors cursor-pointer"
              onClick={() => !n.isRead && markOne(n._id)}>
              <span className={cn('w-2 text-center shrink-0',
                critical ? 'text-accent' : n.isRead ? 'text-transparent' : 'text-muted')}>
                {critical ? '●' : n.isRead ? ' ' : '○'}
              </span>
              <span className="text-faint tabular-nums w-10 shrink-0">{timeAgo(n.createdAt)}</span>
              <div className="flex-1 min-w-0">
                <div className={cn('text-pretty', n.isRead ? 'text-muted' : 'text-ink')}>{n.title}</div>
                <div className="text-[12px] text-faint mt-0.5 text-pretty">{n.message}</div>
                {critical && !n.isRead && (
                  <div className="mt-2 flex gap-4 text-[12px]">
                    <button className="text-ink hover:text-accent underline-offset-4 hover:underline">respond →</button>
                    <button className="text-faint hover:text-ink" onClick={e => { e.stopPropagation(); markOne(n._id) }}>dismiss</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
