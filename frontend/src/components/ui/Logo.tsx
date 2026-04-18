interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'text-[13px]',
    md: 'text-[16px]',
    lg: 'text-[20px]',
  }

  return (
    <div className="flex items-center gap-0">
      <span className={`font-heading font-semibold tracking-tight ${sizes[size]}`} style={{ color: '#E53935' }}>
        Blood
      </span>
      <span className={`font-heading font-semibold tracking-tight text-text-primary ${sizes[size]}`}>
        Sync
      </span>
    </div>
  )
}
