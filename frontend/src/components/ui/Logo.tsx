import { cn } from '../../utils/cn'

interface LogoProps {
  size?: number
  wordmark?: boolean
  className?: string
}

export function Logo({ size = 32, wordmark = true, className }: LogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 32 32">
        <defs>
          <linearGradient id="bs-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F04A46"/>
            <stop offset="1" stopColor="#E53935"/>
          </linearGradient>
        </defs>
        <path d="M16 3 C 10 11, 6 15, 6 20 a10 10 0 0 0 20 0 c0-5 -4-9 -10-17z" fill="url(#bs-g)"/>
        <circle cx="16" cy="20" r="5" fill="none" stroke="white" strokeWidth="1.6" opacity="0.8"/>
        <path d="M11 20 a5 5 0 0 1 10 0" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      {wordmark && (
        <span className="font-semibold tracking-tight text-ink" style={{ fontSize: size * 0.55 }}>
          BloodSync
        </span>
      )}
    </div>
  )
}
