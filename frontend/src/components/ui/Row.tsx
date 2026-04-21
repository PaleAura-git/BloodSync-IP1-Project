import React from 'react'

// Aligned key-value row used across dashboard, profile, and detail views
export function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-1">
      <dt className="text-faint w-24 shrink-0 text-[13px]">{k}</dt>
      <dd className="text-[13px]">{v}</dd>
    </div>
  )
}
