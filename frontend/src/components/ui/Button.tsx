import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-body font-semibold rounded transition-all duration-150 ease-out cursor-pointer select-none'

  const sizes = {
    sm: 'px-3 py-1.5 text-[12px]',
    md: 'px-4 py-2 text-[13px]',
  }

  const variants = {
    primary: 'bg-red-accent hover:bg-red-hover text-white disabled:opacity-40',
    danger: 'bg-red-accent hover:bg-red-hover text-white disabled:opacity-40',
    ghost: 'bg-transparent hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-40',
    outline:
      'bg-transparent border border-bg-border hover:bg-bg-hover text-text-primary disabled:opacity-40',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  )
}
