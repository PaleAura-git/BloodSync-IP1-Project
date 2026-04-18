import React from 'react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export function Modal({ open, onClose, title, children, actions }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg-surface rounded-lg border border-bg-border w-full max-w-md mx-4">
        <div className="p-5">
          <h3 className="font-heading text-[14px] font-semibold text-text-primary mb-3">{title}</h3>
          <div className="text-text-secondary text-[13px]">{children}</div>
        </div>
        {actions && (
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', loading }: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      }
    >
      {message}
    </Modal>
  )
}
