import React from 'react'
import { cn } from '../../utils/cn'
import { Icons } from '../icons'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Input({ label, error, hint, leftIcon, rightIcon, className, ...rest }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-[13px] font-medium text-ink mb-1.5">{label}</label>}
      <div className={cn(
        'relative flex items-center rounded-lg border bg-surface transition-colors focus-ring',
        error ? 'border-danger' : 'border-line hover:border-line2'
      )}>
        {leftIcon && <span className="pl-3 text-muted pointer-events-none">{leftIcon}</span>}
        <input
          className={cn(
            'flex-1 bg-transparent text-ink placeholder:text-muted outline-none px-3 text-sm',
            'h-[var(--bs-h-input)]',
            leftIcon ? 'pl-2' : undefined, className
          )}
          {...rest}
        />
        {rightIcon && <span className="pr-3 text-muted">{rightIcon}</span>}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
  placeholder?: string
  error?: string
}

export function Select({ label, options, placeholder, error, className, ...rest }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-[13px] font-medium text-ink mb-1.5">{label}</label>}
      <div className={cn(
        'relative rounded-lg border bg-surface focus-ring',
        error ? 'border-danger' : 'border-line hover:border-line2'
      )}>
        <select
          className={cn('w-full bg-transparent text-ink outline-none appearance-none h-[var(--bs-h-input)] pl-3 pr-9 text-sm cursor-pointer', className)}
          {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value} className="bg-surface">{o.label}</option>)}
        </select>
        <Icons.Chev size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted rotate-90 pointer-events-none"/>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}
