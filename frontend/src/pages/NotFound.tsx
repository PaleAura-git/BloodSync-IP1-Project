import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
      <p className="font-semibold text-[20px] text-ink tracking-tight">404 — Page not found</p>
      <Button variant="ghost" onClick={() => navigate('/')}>Go home</Button>
    </div>
  )
}
