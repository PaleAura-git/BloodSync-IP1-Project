import { cn } from '../../utils/cn'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' }

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full font-medium text-white shrink-0', sizes[size], className)}
      style={{ backgroundColor: `hsl(${h} 45% 52%)` }}>
      {initials}
    </span>
  )
}

interface BloodTypeChipProps {
  bloodType: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'soft' | 'solid'
  className?: string
}

const chipSizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-[15px]' }

export function BloodTypeChip({ bloodType, size = 'sm', variant = 'soft', className }: BloodTypeChipProps) {
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full font-bold tracking-tight',
      chipSizes[size],
      variant === 'solid' ? 'bg-accent text-white shadow-soft' : 'bg-accent-glow text-accent border border-accent/20',
      className)}>
      {bloodType}
    </span>
  )
}
