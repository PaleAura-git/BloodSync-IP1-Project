interface BadgeProps {
  children: React.ReactNode
  variant?: 'red' | 'green' | 'amber' | 'dim' | 'outline'
  className?: string
}

export function Badge({ children, variant = 'dim', className = '' }: BadgeProps) {
  const variants = {
    // Solid backgrounds — red always punches with white text
    red: 'text-white',
    green: 'bg-green-accent/15 text-green-accent',
    amber: 'bg-amber-accent/15 text-amber-accent',
    dim: 'text-text-secondary',
    outline: 'text-text-secondary',
  }

  const styles: Record<string, React.CSSProperties> = {
    red: { backgroundColor: '#E53935' },
    green: {},
    amber: {},
    dim: { backgroundColor: '#1E1E1E' },
    outline: { backgroundColor: 'transparent', border: '1px solid #262626' },
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono font-medium ${variants[variant]} ${className}`}
      style={styles[variant]}
    >
      {children}
    </span>
  )
}
