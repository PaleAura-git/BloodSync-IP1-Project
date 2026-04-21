import React from 'react'
import { cn } from '../../utils/cn'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  children: React.ReactNode
  tone?: Tone
  size?: 'sm' | 'md'
  icon?: React.ReactNode
  className?: string
}

const tones: Record<Tone, string> = {
  neutral: 'bg-surface2 text-ink border-line',
  accent:  'bg-accent-glow text-accent border-accent/20',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger:  'bg-danger/10 text-danger border-danger/25',
  info:    'bg-info/10 text-info border-info/25',
}

export function Badge({ children, tone = 'neutral', size = 'sm', icon, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      tones[tone], className
    )}>
      {icon}{children}
    </span>
  )
}
