import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  ClipboardList,
  Droplets,
  Bell,
  Search,
  LogOut,
  AlertTriangle,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { useAuth } from '../../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { notificationApi } from '../../api'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  key?: string
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetchUnread = async () => {
      try {
        const fn =
          user.userType === 'DONOR'
            ? notificationApi.getDonorNotifications
            : notificationApi.getHospitalNotifications
        const res = await fn()
        const notifications = res.data.data || res.data.notifications || []
        setUnreadCount(notifications.filter((n: { isRead: boolean }) => !n.isRead).length)
      } catch {
        // silent
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user])

  const donorNav: NavItem[] = [
    { to: '/donor/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { to: '/donor/profile', label: 'Profile', icon: <User size={16} /> },
    { to: '/donor/quiz', label: 'Eligibility Quiz', icon: <ClipboardList size={16} /> },
    { to: '/donor/donations', label: 'Donations', icon: <Droplets size={16} /> },
    { to: '/donor/notifications', label: 'Notifications', icon: <Bell size={16} />, key: 'notifications' },
  ]

  const hospitalNav: NavItem[] = [
    { to: '/hospital/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { to: '/hospital/profile', label: 'Profile', icon: <User size={16} /> },
    { to: '/hospital/search', label: 'Search Donors', icon: <Search size={16} /> },
    { to: '/hospital/requests', label: 'Requests', icon: <AlertTriangle size={16} /> },
    { to: '/hospital/donations', label: 'Donations', icon: <Droplets size={16} /> },
    { to: '/hospital/notifications', label: 'Notifications', icon: <Bell size={16} />, key: 'notifications' },
  ]

  const navItems = user?.userType === 'DONOR' ? donorNav : hospitalNav

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className="w-[220px] h-screen fixed left-0 top-0 bg-bg-sidebar flex flex-col border-r border-bg-border">
      <div className="px-4 py-4 border-b border-bg-border">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2 text-[13px] transition-all duration-150 ease-out ${
                isActive
                  ? 'bg-bg-surface text-text-primary'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.key === 'notifications' && unreadCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-accent flex-shrink-0" />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-bg-border">
        <div className="mb-2">
          <p className="text-[12px] font-medium text-text-primary truncate">
            {user?.email}
          </p>
          <p className="text-[11px] text-text-tertiary uppercase tracking-wide">
            {user?.userType === 'DONOR' ? 'Donor' : 'Hospital'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors duration-150"
        >
          <LogOut size={13} />
          Logout
        </button>
      </div>
    </aside>
  )
}
