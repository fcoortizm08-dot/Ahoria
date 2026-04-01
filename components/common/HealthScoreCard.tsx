'use client'

import type { HealthScoreData } from '@/types'

interface Props {
  data: HealthScoreData
  available: number
  monthPct: number
  projection?: { isOverBudget: boolean; projectedExpenses: number; daysLeft: number }
}

function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (Math.abs(amount) >= 1_000) return `$${Math.round(amount / 1_000)}k`
  return `$${amount}`
}

export function HealthScoreCard({ data, available, monthPct, projection }: Props) {
  const { score, label, color } = data

  // Círculo SVG
  const size = 64
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference

  return (
    <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl p-5">
      <div className="flex items-center gap-4">
        {/* Score circular */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* Track */}
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="#1e2d45" strokeWidth={strokeWidth}
            />
            {/* Progress */}
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={color} strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold text-white leading-none">{score}</span>
            <span className="text-[9px] text-slate-500 leading-none mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold" style={{ color }}>● {label}</span>
          </div>
          <p className="text-slate-400 text-xs mb-2">Disponible este mes</p>
          <p className={`text-2xl font-extrabold leading-none ${available >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatCurrencyCompact(available)}
          </p>
        </div>
      </div>

      {/* Barra de progreso del mes */}
      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
          <span>Gastos del mes</span>
          <span className={monthPct > 90 ? 'text-red-400 font-semibold' : monthPct > 70 ? 'text-yellow-400' : 'text-slate-400'}>
            {monthPct}% gastado
          </span>
        </div>
        <div className="h-2 bg-[#1e2d45] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, monthPct)}%`,
              background: monthPct > 90 ? '#ef4444' : monthPct > 70 ? '#f59e0b' : '#3b82f6',
            }}
          />
        </div>
      </div>

      {/* Proyección alerta */}
      {projection?.isOverBudget && (
        <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          <span className="text-sm">⚠️</span>
          <p className="text-xs text-red-400">
            Proyección: superarás el presupuesto. Quedan {projection.daysLeft} días.
          </p>
        </div>
      )}
    </div>
  )
}
