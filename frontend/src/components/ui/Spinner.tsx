export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span className="w-4 h-4 border border-text-tertiary border-t-text-secondary rounded-full animate-spin" />
    </div>
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-48 opacity-50">
      <Spinner />
    </div>
  )
}
