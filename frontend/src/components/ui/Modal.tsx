import React, { useEffect } from 'react'
import { cn } from '../../utils/cn'
import { Icons } from '../icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className={cn('relative w-full bs-card-raised overflow-hidden animate-slide-up', sizes[size])}>
        {(title || subtitle) && (
          <header className="px-6 pt-5 pb-3 border-b border-line flex items-start justify-between gap-4">
            <div>
              {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
              {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="text-muted hover:text-ink mt-0.5">
              <Icons.X size={16}/>
            </button>
          </header>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <footer className="px-6 py-4 bg-surface2 border-t border-line flex justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
