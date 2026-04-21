import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { PageSpinner } from '../ui/Spinner'
import { Logo } from '../ui/Logo'
import { Icons } from '../icons'
import { cn } from '../../utils/cn'
import { donorApi, hospitalApi } from '../../api'

interface AppShellProps {
  requiredRole?: 'DONOR' | 'HOSPITAL'
}

const navDonor = [
  { path: '/donor/dashboard',     label: 'Dashboard',     icon: (s: number) => <Icons.Home size={s}/> },
  { path: '/donor/quiz',          label: 'Eligibility',   icon: (s: number) => <Icons.Shield size={s}/> },
  { path: '/donor/donations',     label: 'My donations',  icon: (s: number) => <Icons.Heart size={s}/> },
  { path: '/donor/notifications', label: 'Notifications', icon: (s: number) => <Icons.Bell size={s}/> },
  { path: '/donor/profile',       label: 'Profile',       icon: (s: number) => <Icons.User size={s}/> },
]
const navHospital = [
  { path: '/hospital/dashboard',     label: 'Dashboard',       icon: (s: number) => <Icons.Home size={s}/> },
  { path: '/hospital/search',        label: 'Find donors',     icon: (s: number) => <Icons.Search size={s}/> },
  { path: '/hospital/requests',      label: 'Urgent requests', icon: (s: number) => <Icons.Zap size={s}/> },
  { path: '/hospital/donations',     label: 'Appointments',    icon: (s: number) => <Icons.Calendar size={s}/> },
  { path: '/hospital/notifications', label: 'Notifications',   icon: (s: number) => <Icons.Bell size={s}/> },
  { path: '/hospital/profile',       label: 'Profile',         icon: (s: number) => <Icons.Hospital size={s}/> },
]

const breadcrumbMap: Record<string, string[]> = {
  '/donor/dashboard':     ['Donor', 'Dashboard'],
  '/donor/quiz':          ['Donor', 'Eligibility'],
  '/donor/donations':     ['Donor', 'My donations'],
  '/donor/notifications': ['Donor', 'Notifications'],
  '/donor/profile':       ['Donor', 'Profile'],
  '/hospital/dashboard':     ['Hospital', 'Dashboard'],
  '/hospital/search':        ['Hospital', 'Find donors'],
  '/hospital/requests':      ['Hospital', 'Urgent requests'],
  '/hospital/donations':     ['Hospital', 'Appointments'],
  '/hospital/notifications': ['Hospital', 'Notifications'],
  '/hospital/profile':       ['Hospital', 'Profile'],
}

export function AppShell({ requiredRole }: AppShellProps) {
  const { user, token, isLoading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (isLoading) return <PageSpinner/>
  if (!token || !user) return <Navigate to="/" replace/>
  if (requiredRole && user.userType !== requiredRole) {
    return <Navigate to={user.userType === 'DONOR' ? '/donor/dashboard' : '/hospital/dashboard'} replace/>
  }

  const isDonor = user.userType === 'DONOR'
  const nav = isDonor ? navDonor : navHospital
  const currentPath = location.pathname
  const crumbs = breadcrumbMap[currentPath] || []

  const [displayName, setDisplayName] = useState<string>(user.email.split('@')[0])
  useEffect(() => {
    if (isDonor) {
      donorApi.getProfile().then(res => {
        const p = res.data.data || res.data
        if (p?.fullName) setDisplayName(p.fullName)
      }).catch(() => {})
    } else {
      hospitalApi.getProfile().then(res => {
        const p = res.data.data || res.data
        if (p?.hospitalName) setDisplayName(p.hospitalName)
      }).catch(() => {})
    }
  }, [isDonor])

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside className={cn(
        'w-[220px] shrink-0 bg-bg border-r border-line flex flex-col',
        'fixed inset-y-0 left-0 z-40 transition-transform lg:static lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="px-4 h-12 flex items-center border-b border-line">
          <Logo size={22}/>
        </div>

        <div className="px-4 py-3 border-b border-line">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-faint">~/</span>
            <span className="text-ink truncate">{displayName}</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <ul className="space-y-px">
            {nav.map(item => {
              const active = currentPath === item.path || currentPath.startsWith(item.path + '/')
              return (
                <li key={item.path}>
                  <button
                    onClick={() => { navigate(item.path); setMobileOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 h-8 rounded-sm text-[12.5px] transition-colors relative',
                      active
                        ? 'bg-surface text-ink border-l-2 border-accent pl-2'
                        : 'text-muted hover:text-ink hover:bg-surface'
                    )}>
                    <span className="shrink-0 opacity-80">{item.icon(17)}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-line p-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 h-8 rounded-sm text-[12.5px] text-muted hover:text-ink hover:bg-surface">
            <Icons.Logout size={15}/> <span>Sign out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)}/>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* TopBar */}
        <header className="sticky top-0 z-20 bg-bg border-b border-line">
          <div className="flex items-center gap-3 px-6 h-12">
            <button className="lg:hidden text-muted hover:text-ink" onClick={() => setMobileOpen(true)}>
              <Icons.Menu size={18}/>
            </button>
            <nav className="hidden md:flex items-center gap-2 text-[13px] text-muted">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <Icons.Chev size={12} className="text-faint"/>}
                  <span className={i === crumbs.length - 1 ? 'text-ink font-medium' : ''}>{c}</span>
                </span>
              ))}
            </nav>
            <div className="flex-1"/>
            <div className="hidden md:flex items-center gap-2 border border-line bg-surface px-2.5 h-7 w-[260px] rounded-sm focus-ring">
              <Icons.Search size={12} className="text-faint"/>
              <input
                placeholder={isDonor ? 'search…' : 'search donors, requests…'}
                className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-faint text-ink"/>
              <kbd className="hidden lg:block text-[10px] text-faint border border-line rounded-sm px-1">⌘K</kbd>
            </div>
            <button className="relative h-7 w-7 flex items-center justify-center text-muted hover:text-ink">
              <Icons.Bell size={14}/>
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-accent"/>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-8 lg:px-12 py-10">
            <Outlet/>
          </div>
        </main>
      </div>
    </div>
  )
}
