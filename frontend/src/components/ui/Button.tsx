import React from 'react'
import { cn } from '../../utils/cn'
import { Spinner } from './Spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const variants = {
  primary:   'bg-accent text-white hover:bg-accent-hover shadow-soft',
  secondary: 'bg-surface2 text-ink border border-line hover:border-line2',
  ghost:     'bg-transparent text-ink hover:bg-surface2',
  outline:   'border border-accent text-accent hover:bg-accent-glow',
  danger:    'bg-danger text-white hover:opacity-90',
}
const sizes = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
}

export function Button({
  variant = 'primary', size = 'md', loading, leftIcon, rightIcon,
  fullWidth, className, children, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], fullWidth && 'w-full', className
      )}
      {...rest}>
      {loading ? <Spinner size={14}/> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
