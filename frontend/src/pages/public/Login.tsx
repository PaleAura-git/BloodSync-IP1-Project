import { Navigate } from 'react-router-dom'

// Login is handled by RoleSelection at /
export function LoginPage() {
  return <Navigate to="/" replace/>
}
