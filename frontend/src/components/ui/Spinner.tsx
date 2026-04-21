import { cn } from '../../utils/cn'

interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 18, className }: SpinnerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      className={cn('text-accent', className)}
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

export function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <Spinner size={28}/>
    </div>
  )
}
