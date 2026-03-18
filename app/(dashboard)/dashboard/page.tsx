'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency, formatRelativeDate, getGreeting,
  calculateHealthScore, calculateMonthProjection,
  generateAutoInsights, getDaysInMonth,
} from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { MonthSelector } from '@/components/common/MonthSelector'
import type {
  Transaction, CategoryExpense, MonthlyData,
  HealthScoreData, MonthProjection, Streak,
} from '@/types'
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Types locales ────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface Stats {
  totalIncome: number
  totalExpenses: number
  savingsRate: number
  available: number
  todayExpenses: number
  yesterdayExpenses: number
  healthScore: HealthScoreData
  projection: MonthProjection
  recentTransactions: Transaction[]
  monthlyData: MonthlyData[]
  categoryData: CategoryExpense[]
  streak: Streak | null
  debtCount: number
  debtTotal: number
  goalList: { id: string; name: string; icon: string; color: string; pct: number; target: number; current: number }[]
}

// ─── Helpers visuales ─────────────────────────────────────────────────────────
function formatCompact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function SpendingVelocity({ dailyAvg, daysLeft, available }: { dailyAvg: number; daysLeft: number; available: number }) {
  const safeAvgPerDay = daysLeft > 0 ? available / daysLeft : 0
  const velocity = safeAvgPerDay > 0 ? dailyAvg / safeAvgPerDay : 1
  const level = velocity < 0.8 ? 'slow' : velocity < 1.15 ? 'normal' : 'fast'
  const labels = { slow: { text: 'Ritmo bajo', color: '#22c55e', icon: '🐢', sub: 'Vas muy bien' }, normal: { text: 'Ritmo normal', color: '#3b82f6', icon: '✅', sub: 'En el plan' }, fast: { text: 'Ritmo alto', color: '#f59e0b', icon: '⚡', sub: 'Ojo con los gastos' } }
  const l = labels[level]
  const pct = Math.min(100, Math.round(velocity * 60))
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg width="40" height="40" className="-rotate-90">
          <circle cx="20" cy="20" r="15" fill="none" stroke="#1e2d45" strokeWidth="4" />
          <circle cx="20" cy="20" r="15" fill="none" stroke={l.color} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * (2 * Math.PI * 15)} ${2 * Math.PI * 15}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-base">{l.icon}</div>
      </div>
      <div>
        <p className="text-xs font-semibold" style={{ color: l.color }}>{l.text}</p>
        <p className="text-[10px] text-slate-500">{l.sub} · {formatCompact(dailyAvg)}/día</p>
      </div>
    </div>
  )
}

// Agrupa transacciones por fecha
function groupByDate(txs: Transaction[]) {
  const map = new Map<string, Transaction[]>()
  txs.forEach(tx => {
    const key = tx.date.split('T')[0]
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  })
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dismissedInsight, setDismissedInsight] = useState(false)
  const { profile, activeYear, activeMonth } = useFinanceStore()

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const monthStart = new Date(activeYear, activeMonth, 1).toISOString().split('T')[0]
    const monthEnd   = new Date(activeYear, activeMonth + 1, 0).toISOString().split('T')[0]
    const todayStr   = now.toISOString().split('T')[0]
    const yest       = new Date(now); yest.setDate(yest.getDate() - 1)
    const yesterdayStr = yest.toISOString().split('T')[0]

    const [
      { data: allTxs },
      { data: streakData },
      { data: debts },
      { data: goals },
    ] = await Promise.all([
      supabase.from('transactions').select('*, category:categories(*)')
        .eq('user_id', user.id).is('deleted_at', null)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .order('date', { ascending: false }),
      supabase.from('streaks').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('debts').select('id, current_balance').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('goals').select('id, name, icon, color, target_amount, current_amount').eq('user_id', user.id).eq('status', 'active'),
    ])

    const txs     = allTxs ?? []
    const monthTxs = txs.filter(t => t.date >= monthStart && t.date <= monthEnd)

    const totalIncome   = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savingsRate   = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
    const available     = totalIncome - totalExpenses
    const debtCount     = debts?.length ?? 0
    const debtTotal     = debts?.reduce((s, d) => s + (d.current_balance ?? 0), 0) ?? 0
    const hasGoals      = (goals?.length ?? 0) > 0

    const todayExpenses     = txs.filter(t => t.type === 'expense' && t.date === todayStr).reduce((s, t) => s + t.amount, 0)
    const yesterdayExpenses = txs.filter(t => t.type === 'expense' && t.date === yesterdayStr).reduce((s, t) => s + t.amount, 0)

    const goalList = (goals ?? []).map(g => ({
      id: g.id, name: g.name, icon: g.icon, color: g.color,
      target: g.target_amount, current: g.current_amount,
      pct: g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0,
    }))

    const healthScore = calculateHealthScore({
      totalIncome, totalExpenses,
      hasActiveDebts: debtCount > 0, debtCount, hasGoals,
      streakDays: streakData?.current_streak ?? 0,
    })
    const projection = calculateMonthProjection({ totalExpenses, totalIncome, year: activeYear, month: activeMonth })

    // Últimas 8 transacciones del mes
    const recentTransactions = monthTxs.slice(0, 8)

    // 6 meses
    const monthlyData: MonthlyData[] = []
    for (let i = 5; i >= 0; i--) {
      const d  = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mS = d.toISOString().split('T')[0]
      const mE = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      const mt = txs.filter(t => t.date >= mS && t.date <= mE)
      const inc = mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const exp = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      monthlyData.push({ month: MONTHS_SHORT[d.getMonth()], income: inc, expenses: exp, savings: Math.max(0, inc - exp) })
    }

    // Categorías
    const catMap = new Map<string, Omit<CategoryExpense, 'percentage'>>()
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const key = t.category?.name ?? 'Sin categoría'
      const ex  = catMap.get(key)
      if (ex) { ex.amount += t.amount }
      else catMap.set(key, { name: key, amount: t.amount, color: t.category?.color ?? '#94a3b8', icon: t.category?.icon ?? '📦', budget: t.category?.monthly_budget ?? null, category_id: t.category_id ?? '' })
    })
    const categoryData: CategoryExpense[] = Array.from(catMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map(c => ({ ...c, percentage: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0 }))

    setStats({
      totalIncome, totalExpenses, savingsRate, available,
      todayExpenses, yesterdayExpenses,
      healthScore, projection, recentTransactions,
      monthlyData, categoryData,
      streak: streakData ?? null,
      debtCount, debtTotal, goalList,
    })
    setIsLoading(false)
  }, [activeYear, activeMonth])

  useEffect(() => { fetchStats() }, [fetchStats])

  const autoInsights = stats ? generateAutoInsights({
    totalIncome: stats.totalIncome, totalExpenses: stats.totalExpenses,
    categoryData: stats.categoryData, projection: stats.projection,
    healthScore: stats.healthScore, streakDays: stats.streak?.current_streak ?? 0,
  }) : []

  const daysTotal   = getDaysInMonth(activeYear, activeMonth)
  const daysElapsed = stats?.projection.daysElapsed ?? 1
  const daysLeft    = daysTotal - daysElapsed
  const monthPct    = stats && stats.totalIncome > 0 ? Math.round((stats.totalExpenses / stats.totalIncome) * 100) : 0
  const firstName   = profile?.full_name?.split(' ')[0] ?? ''
  const isCurrentMonth = new Date().getFullYear() === activeYear && new Date().getMonth() === activeMonth

  // ─── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex justify-between items-center">
        <div className="h-7 w-44 bg-[#0d1117] rounded-xl animate-pulse" />
        <div className="h-8 w-24 bg-[#0d1117] rounded-xl animate-pulse" />
      </div>
      <div className="h-52 bg-[#0d1117] rounded-2xl border border-[#1e2d45] animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 bg-[#0d1117] rounded-2xl border border-[#1e2d45] animate-pulse" />
        <div className="h-24 bg-[#0d1117] rounded-2xl border border-[#1e2d45] animate-pulse" />
      </div>
      <div className="h-40 bg-[#0d1117] rounded-2xl border border-[#1e2d45] animate-pulse" />
      <div className="h-52 bg-[#0d1117] rounded-2xl border border-[#1e2d45] animate-pulse" />
    </div>
  )

  if (!stats) return null

  const grouped = groupByDate(stats.recentTransactions)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pb-24">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[17px] font-extrabold text-white leading-tight">
            {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stats.streak && stats.streak.current_streak >= 2 && (
            <div className="flex items-center gap-1 bg-[#0d1117] border border-[#1e2d45] rounded-xl px-2.5 py-1.5">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-bold text-orange-400">{stats.streak.current_streak}</span>
            </div>
          )}
          <MonthSelector />
        </div>
      </div>

      {/* ── HERO CARD: Balance + Estado del mes ────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #0d1117 60%, #0a1628 100%)', border: '1px solid #1e2d45' }}>

        {/* Accent top */}
        <div className="h-0.5 w-full" style={{
          background: stats.healthScore.score >= 80
            ? 'linear-gradient(90deg, #22c55e, #3b82f6)'
            : stats.healthScore.score >= 60
            ? 'linear-gradient(90deg, #84cc16, #22c55e)'
            : stats.healthScore.score >= 40
            ? 'linear-gradient(90deg, #f59e0b, #f97316)'
            : 'linear-gradient(90deg, #ef4444, #f97316)',
        }} />

        <div className="p-5">
          {/* Estado + mes */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: stats.healthScore.color }} />
              <span className="text-xs font-semibold" style={{ color: stats.healthScore.color }}>
                Salud {stats.healthScore.label}
              </span>
              <span className="text-[10px] text-slate-600">· {stats.healthScore.score}/100</span>
            </div>
            <span className="text-[10px] text-slate-600 font-medium">
              {MONTHS_SHORT[activeMonth]} {activeYear}
            </span>
          </div>

          {/* Balance disponible — métrica hero */}
          <div className="mb-5">
            <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-widest font-medium">Disponible este mes</p>
            <p className={`text-4xl font-extrabold leading-none tracking-tight ${stats.available >= 0 ? 'text-white' : 'text-red-400'}`}>
              {formatCurrency(stats.available)}
            </p>
            {stats.totalIncome > 0 && (
              <p className="text-[11px] text-slate-500 mt-1.5">
                de <span className="text-slate-300 font-semibold">{formatCurrency(stats.totalIncome)}</span> ingresados este mes
                {stats.savingsRate > 0 && <> · <span className="text-green-400 font-semibold">{Math.round(stats.savingsRate)}% ahorro</span></>}
              </p>
            )}
          </div>

          {/* Timeline del mes */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="text-slate-500">Día {daysElapsed} de {daysTotal}</span>
              <span className={
                monthPct > 95 ? 'text-red-400 font-bold' :
                monthPct > 80 ? 'text-yellow-400 font-semibold' :
                'text-slate-400'
              }>
                {monthPct}% gastado
                {isCurrentMonth && daysLeft > 0 && <> · {daysLeft}d restantes</>}
              </span>
            </div>
            {/* Barra compuesta: gastado vs día del mes */}
            <div className="relative h-2.5 bg-[#1e2d45] rounded-full overflow-hidden">
              {/* Gasto */}
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, monthPct)}%`,
                  background: monthPct > 95 ? '#ef4444' : monthPct > 80 ? '#f59e0b' : '#3b82f6',
                }} />
              {/* Indicador día actual */}
              {isCurrentMonth && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/40"
                  style={{ left: `${Math.round((daysElapsed / daysTotal) * 100)}%` }} />
              )}
            </div>
            {isCurrentMonth && monthPct > Math.round((daysElapsed / daysTotal) * 100) + 10 && (
              <p className="text-[10px] text-yellow-400 mt-1">
                ⚠️ Gastas más rápido que el tiempo transcurrido
              </p>
            )}
          </div>

          {/* Ingresos / Gastos / Proyección */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#1e2d45]">
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">Ingresos</p>
              <p className="text-sm font-bold text-green-400">{formatCompact(stats.totalIncome)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">Gastos</p>
              <p className="text-sm font-bold text-red-400">{formatCompact(stats.totalExpenses)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">
                {isCurrentMonth ? 'Proyectado' : 'Balance'}
              </p>
              <p className={`text-sm font-bold ${stats.projection.projectedBalance >= 0 ? 'text-slate-300' : 'text-red-400'}`}>
                {isCurrentMonth
                  ? formatCompact(stats.projection.projectedExpenses)
                  : formatCompact(stats.available)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── INSIGHT AUTOMÁTICO ──────────────────────────────────────────────── */}
      {autoInsights.length > 0 && !dismissedInsight && (() => {
        const ins = autoInsights[0]
        const bgMap: Record<string, string> = {
          spending_alert: 'bg-yellow-500/8 border-yellow-500/20',
          projection: 'bg-red-500/8 border-red-500/20',
          achievement: 'bg-green-500/8 border-green-500/20',
          tip: 'bg-blue-500/8 border-blue-500/20',
        }
        return (
          <div className={`flex items-start gap-3 border rounded-2xl px-4 py-3 ${bgMap[ins.type] ?? 'bg-[#0d1117] border-[#1e2d45]'}`}>
            <span className="text-xl flex-shrink-0">{ins.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white leading-tight">{ins.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{ins.body}</p>
            </div>
            <button onClick={() => setDismissedInsight(true)} className="text-slate-600 hover:text-slate-400 text-sm flex-shrink-0 transition-all mt-0.5">✕</button>
          </div>
        )
      })()}

      {/* ── HOY vs AYER ─────────────────────────────────────────────────────── */}
      {isCurrentMonth && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Hoy</p>
            </div>
            {stats.todayExpenses > 0 ? (
              <>
                <p className="text-xl font-extrabold text-white">{formatCompact(stats.todayExpenses)}</p>
                {stats.yesterdayExpenses > 0 && (
                  <p className="text-[10px] mt-1">
                    <span className={stats.todayExpenses > stats.yesterdayExpenses ? 'text-red-400' : 'text-green-400'}>
                      {stats.todayExpenses > stats.yesterdayExpenses ? '↑' : '↓'}{' '}
                      {Math.round(Math.abs((stats.todayExpenses - stats.yesterdayExpenses) / stats.yesterdayExpenses) * 100)}%
                    </span>
                    <span className="text-slate-600"> vs ayer</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-xl font-extrabold text-slate-600">$0</p>
            )}
          </div>
          <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Ritmo</p>
            </div>
            {stats.projection.dailyAvg > 0
              ? <SpendingVelocity dailyAvg={stats.projection.dailyAvg} daysLeft={daysLeft} available={stats.available} />
              : <p className="text-xl font-extrabold text-slate-600">—</p>}
          </div>
        </div>
      )}

      {/* ── CATEGORÍAS SCROLL HORIZONTAL ───────────────────────────────────── */}
      {stats.categoryData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[13px] font-bold text-white">Gastos por categoría</h2>
            <a href="/expenses" className="text-[11px] text-blue-400 hover:text-blue-300 transition-all">Ver todos →</a>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {stats.categoryData.slice(0, 8).map(cat => {
              const budgetPct = cat.budget ? Math.min(100, Math.round((cat.amount / cat.budget) * 100)) : null
              return (
                <div key={cat.name}
                  className="flex-shrink-0 w-28 bg-[#0d1117] border border-[#1e2d45] rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: cat.color + '20' }}>
                      {cat.icon}
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">{cat.percentage}%</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 leading-tight truncate">{cat.name}</p>
                    <p className="text-sm font-extrabold text-white mt-0.5 leading-tight">{formatCompact(cat.amount)}</p>
                  </div>
                  {budgetPct !== null && (
                    <div>
                      <div className="h-1 bg-[#1e2d45] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${budgetPct}%`,
                          background: budgetPct >= 100 ? '#ef4444' : budgetPct >= 80 ? '#f59e0b' : cat.color,
                        }} />
                      </div>
                      <p className="text-[9px] text-slate-600 mt-0.5">{budgetPct}% del límite</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── DEUDAS + METAS ──────────────────────────────────────────────────── */}
      {(stats.debtCount > 0 || stats.goalList.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {stats.debtCount > 0 && (
            <a href="/debts"
              className="bg-[#0d1117] border border-[#1e2d45] hover:border-red-500/30 rounded-2xl p-4 transition-all group block">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">💳</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Deudas</p>
              </div>
              <p className="text-xl font-extrabold text-red-400">{formatCompact(stats.debtTotal)}</p>
              <p className="text-[10px] text-slate-600 mt-1">{stats.debtCount} deuda{stats.debtCount !== 1 ? 's' : ''} activa{stats.debtCount !== 1 ? 's' : ''}</p>
              <p className="text-[10px] text-slate-600 mt-2 group-hover:text-blue-400 transition-all">Gestionar →</p>
            </a>
          )}
          {stats.goalList.length > 0 && (
            <a href="/goals"
              className="bg-[#0d1117] border border-[#1e2d45] hover:border-blue-500/30 rounded-2xl p-4 transition-all group block">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🎯</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Metas</p>
              </div>
              {stats.goalList[0] && (
                <>
                  <p className="text-[11px] text-white font-semibold truncate">{stats.goalList[0].icon} {stats.goalList[0].name}</p>
                  <div className="mt-2 h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats.goalList[0].pct}%`, background: stats.goalList[0].color || '#3b82f6' }} />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">{stats.goalList[0].pct}% completada</p>
                </>
              )}
              <p className="text-[10px] text-slate-600 mt-2 group-hover:text-blue-400 transition-all">Ver metas →</p>
            </a>
          )}
        </div>
      )}

      {/* ── GRÁFICO 6 MESES ─────────────────────────────────────────────────── */}
      {stats.monthlyData.some(m => m.income > 0 || m.expenses > 0) && (
        <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold text-white">Flujo de caja</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <div className="w-2 h-2 rounded-sm bg-green-500" /> Ingresos
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <div className="w-2 h-2 rounded-sm bg-red-500" /> Gastos
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={stats.monthlyData} barSize={9} barGap={3} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
                contentStyle={{ background: '#0d1117', border: '1px solid #1e2d45', borderRadius: 12, fontSize: 11, padding: '8px 12px' }}
                formatter={(v: unknown) => [formatCurrency(Number(v))]}
                labelStyle={{ color: '#94a3b8', marginBottom: 4, fontSize: 11 }}
              />
              <Bar dataKey="income"   fill="#22c55e" radius={[3,3,0,0]} name="Ingresos" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[3,3,0,0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
          {/* Ahorro promedio */}
          {(() => {
            const avgSavings = stats.monthlyData.reduce((s, m) => s + m.savings, 0) / (stats.monthlyData.filter(m => m.income > 0).length || 1)
            return avgSavings > 0 ? (
              <p className="text-[10px] text-slate-600 mt-2 border-t border-[#1e2d45] pt-2">
                Ahorro promedio 6 meses: <span className="text-green-400 font-semibold">{formatCurrency(avgSavings)}</span>
              </p>
            ) : null
          })()}
        </div>
      )}

      {/* ── TRANSACCIONES RECIENTES AGRUPADAS ───────────────────────────────── */}
      {grouped.length > 0 && (
        <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1e2d45]">
            <h2 className="text-[13px] font-bold text-white">Últimos movimientos</h2>
            <a href="/expenses" className="text-[11px] text-blue-400 hover:text-blue-300 transition-all">Ver todos →</a>
          </div>
          {grouped.map(([date, txs]) => {
            const dayTotal = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            return (
              <div key={date}>
                {/* Cabecera de día */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#060d17]">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    {formatRelativeDate(date)}
                  </span>
                  {dayTotal > 0 && (
                    <span className="text-[10px] text-red-400 font-semibold">-{formatCompact(dayTotal)}</span>
                  )}
                </div>
                {txs.map((tx, i) => (
                  <div key={tx.id}
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.015] transition-all ${i < txs.length - 1 ? 'border-b border-[#1e2d45]/60' : ''}`}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: (tx.category?.color ?? (tx.type === 'income' ? '#22c55e' : '#ef4444')) + '20' }}>
                      {tx.category?.icon ?? (tx.type === 'income' ? '💰' : '💸')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white font-medium truncate leading-tight">{tx.description}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{tx.category?.name ?? (tx.type === 'income' ? 'Ingreso' : 'Sin categoría')}</p>
                    </div>
                    <span className={`text-[13px] font-bold flex-shrink-0 ${tx.type === 'income' ? 'text-green-400' : 'text-slate-200'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCompact(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── ESTADO VACÍO ────────────────────────────────────────────────────── */}
      {stats.totalIncome === 0 && stats.totalExpenses === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl">
            🚀
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base mb-1">Empieza a controlar tu dinero</p>
            <p className="text-slate-500 text-sm">Toca el botón <span className="text-blue-400 font-bold text-base mx-0.5">+</span> para registrar tu primer movimiento.</p>
          </div>
        </div>
      )}
    </div>
  )
}
