import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-[12px] font-medium text-text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`bg-bg-surface border ${error ? 'border-red-accent' : 'border-bg-border'} text-text-primary placeholder-text-tertiary rounded px-3 py-2 text-[13px] font-body transition-all duration-150 ease-out focus:outline-none focus:border-text-secondary ${className}`}
        {...props}
      />
      {error && <p className="text-[12px] text-red-accent">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className = '', id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-[12px] font-medium text-text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full bg-bg-surface border ${error ? 'border-red-accent' : 'border-bg-border'} text-text-primary rounded px-3 py-2 text-[13px] font-body transition-all duration-150 ease-out focus:outline-none focus:border-text-secondary pr-8 ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {error && <p className="text-[12px] text-red-accent">{error}</p>}
    </div>
  )
}
