import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { PageSpinner } from '../ui/Spinner'

interface AppShellProps {
  requiredRole?: 'DONOR' | 'HOSPITAL'
}

export function AppShell({ requiredRole }: AppShellProps) {
  const { user, token, isLoading } = useAuth()

  if (isLoading) return <PageSpinner />
  if (!token || !user) return <Navigate to="/" replace />
  if (requiredRole && user.userType !== requiredRole) {
    return <Navigate to={user.userType === 'DONOR' ? '/donor/dashboard' : '/hospital/dashboard'} replace />
  }

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      <Sidebar />
      <main className="ml-[220px] flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-10 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
