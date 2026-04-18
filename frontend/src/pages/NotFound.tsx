import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4">
      <p className="font-heading font-semibold text-[20px] text-text-primary">Page not found</p>
      <Button variant="ghost" onClick={() => navigate('/')}>Go home</Button>
    </div>
  )
}
