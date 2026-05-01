export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-card p-5 space-y-3">
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="h-7 w-20" />
      <SkeletonLine className="h-3 w-36" />
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-3.5 border-b border-slate-50 last:border-0">
      <SkeletonLine className="h-4 w-14 flex-shrink-0" />
      <SkeletonLine className="h-4 w-20 flex-shrink-0" />
      <SkeletonLine className="h-4 flex-1" />
      <SkeletonLine className="h-4 w-16 flex-shrink-0" />
      <SkeletonLine className="h-6 w-24 rounded-full flex-shrink-0" />
      <SkeletonLine className="h-4 w-12 flex-shrink-0" />
    </div>
  )
}
