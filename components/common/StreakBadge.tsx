interface Props {
  currentStreak: number
  longestStreak: number
}

export function StreakBadge({ currentStreak, longestStreak }: Props) {
  if (currentStreak === 0) return null

  const flames = currentStreak >= 30 ? '🔥🔥🔥' : currentStreak >= 14 ? '🔥🔥' : '🔥'

  return (
    <div className="flex items-center gap-2 bg-[#0d1117] border border-[#1e2d45] rounded-xl px-3 py-2">
      <span className="text-base">{flames}</span>
      <div>
        <p className="text-xs font-bold text-white">{currentStreak} días seguidos</p>
        <p className="text-[10px] text-slate-500">Récord: {longestStreak} días</p>
      </div>
    </div>
  )
}
