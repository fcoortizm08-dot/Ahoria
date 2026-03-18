'use client'

interface Props {
  title: string
  body: string
  icon: string
  type: string
  onDismiss?: () => void
  onAction?: () => void
  actionLabel?: string
}

export function InsightCard({ title, body, icon, type, onDismiss, onAction, actionLabel }: Props) {
  const typeColors: Record<string, string> = {
    spending_alert: 'border-yellow-500/30 bg-yellow-500/5',
    projection: 'border-red-500/30 bg-red-500/5',
    achievement: 'border-green-500/30 bg-green-500/5',
    tip: 'border-blue-500/30 bg-blue-500/5',
    weekly_summary: 'border-purple-500/30 bg-purple-500/5',
  }

  const borderClass = typeColors[type] ?? 'border-[#1e2d45] bg-[#0d1117]'

  return (
    <div className={`border rounded-2xl px-4 py-3 flex items-start gap-3 ${borderClass}`}>
      <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{body}</p>
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-all"
          >
            {actionLabel} →
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-slate-600 hover:text-slate-400 text-xs mt-0.5 transition-all"
        >
          ✕
        </button>
      )}
    </div>
  )
}
