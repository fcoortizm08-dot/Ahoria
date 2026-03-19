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
import type { Transaction, CategoryExpense, MonthlyData, HealthScoreData, MonthProjection, Streak } from '@/types'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#070e0a',
  surface: '#0e1912',
  elevated:'#131f18',
  border:  '#1e3228',
  brand:   '#34d399',
  income:  '#34d399',
  expense: '#f87171',
  debt:    '#fbbf24',
  goal:    '#818cf8',
  text:    '#ecfdf5',
  muted:   '#6b8f7a',
  dim:     '#364d3f',
}

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

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function groupByDate(txs: Transaction[]) {
  const map = new Map<string, Transaction[]>()
  txs.forEach(tx => {
    const key = tx.date.split('T')[0]
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  })
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex justify-between items-center">
        <div className="h-6 w-40 rounded-xl animate-pulse" style={{ backgroundColor: C.surface }} />
        <div className="h-7 w-20 rounded-xl animate-pulse" style={{ backgroundColor: C.surface }} />
      </div>
      <div className="h-56 rounded-2xl animate-pulse" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }} />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }} />
        <div className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }} />
      </div>
      <div className="h-36 rounded-2xl animate-pulse" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }} />
      <div className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }} />
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
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
    const monthStart   = new Date(activeYear, activeMonth, 1).toISOString().split('T')[0]
    const monthEnd     = new Date(activeYear, activeMonth + 1, 0).toISOString().split('T')[0]
    const todayStr     = now.toISOString().split('T')[0]
    const yest         = new Date(now); yest.setDate(yest.getDate() - 1)
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

    const txs      = allTxs ?? []
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

    const recentTransactions = monthTxs.slice(0, 8)

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

    const catMap = new Map<string, Omit<CategoryExpense, 'percentage'>>()
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const key = t.category?.name ?? 'Sin categoría'
      const ex  = catMap.get(key)
      if (ex) { ex.amount += t.amount }
      else catMap.set(key, { name: key, amount: t.amount, color: t.category?.color ?? '#6b8f7a', icon: t.category?.icon ?? '📦', budget: t.category?.monthly_budget ?? null, category_id: t.category_id ?? '' })
    })
    const categoryData: CategoryExpense[] = Array.from(catMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map(c => ({ ...c, percentage: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0 }))

    setStats({ totalIncome, totalExpenses, savingsRate, available, todayExpenses, yesterdayExpenses, healthScore, projection, recentTransactions, monthlyData, categoryData, streak: streakData ?? null, debtCount, debtTotal, goalList })
    setIsLoading(false)
  }, [activeYear, activeMonth])

  useEffect(() => { fetchStats() }, [fetchStats])

  const autoInsights = stats ? generateAutoInsights({
    totalIncome: stats.totalIncome, totalExpenses: stats.totalExpenses,
    categoryData: stats.categoryData, projection: stats.projection,
    healthScore: stats.healthScore, streakDays: stats.streak?.current_streak ?? 0,
  }) : []

  const daysTotal      = getDaysInMonth(activeYear, activeMonth)
  const daysElapsed    = stats?.projection.daysElapsed ?? 1
  const daysLeft       = daysTotal - daysElapsed
  const monthPct       = stats && stats.totalIncome > 0 ? Math.round((stats.totalExpenses / stats.totalIncome) * 100) : 0
  const firstName      = profile?.full_name?.split(' ')[0] ?? ''
  const isCurrentMonth = new Date().getFullYear() === activeYear && new Date().getMonth() === activeMonth

  if (isLoading) return <Skeleton />
  if (!stats) return null

  const grouped = groupByDate(stats.recentTransactions)

  // Colores del health score (AHORIA palette)
  const scoreColor = stats.healthScore.score >= 80 ? C.income
    : stats.healthScore.score >= 60 ? '#a3e635'
    : stats.healthScore.score >= 40 ? C.debt
    : C.expense

  const barColor = monthPct > 95 ? C.expense
    : monthPct > 80 ? C.debt
    : C.brand

  return (
    <div className="flex flex-col gap-4 pb-24">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[17px] font-extrabold leading-tight" style={{ color: C.text }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-[11px] mt-0.5 capitalize" style={{ color: C.dim }}>
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stats.streak && stats.streak.current_streak >= 2 && (
            <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5"
              style={{ backgroundColor: C.elevated, border: `1px solid ${C.border}` }}>
              <span className="text-sm">🔥</span>
              <span className="text-xs font-bold" style={{ color: '#fb923c' }}>{stats.streak.current_streak}</span>
            </div>
          )}
          <MonthSelector />
        </div>
      </div>

      {/* ── HERO CARD — Pulso Financiero ──────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

        {/* Accent line dinámico */}
        <div className="h-0.5 w-full" style={{
          background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}40)`,
        }} />

        <div className="p-5">
          {/* Score + mes */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full ah-pulse" style={{ backgroundColor: scoreColor }} />
              <span className="text-xs font-semibold" style={{ color: scoreColor }}>
                Salud {stats.healthScore.label}
              </span>
              <span className="text-[10px]" style={{ color: C.dim }}>
                · {stats.healthScore.score}/100
              </span>
            </div>
            <span className="text-[10px] font-medium" style={{ color: C.dim }}>
              {MONTHS_SHORT[activeMonth]} {activeYear}
            </span>
          </div>

          {/* Métrica hero: Disponible */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] mb-1.5" style={{ color: C.muted }}>
              Disponible este mes
            </p>
            <p className="text-[42px] font-extrabold leading-none tracking-tight"
              style={{ color: stats.available >= 0 ? C.text : C.expense }}>
              {fmt(stats.available)}
            </p>
            {stats.totalIncome > 0 && (
              <p className="text-[11px] mt-2" style={{ color: C.muted }}>
                de{' '}
                <span className="font-semibold" style={{ color: C.text }}>
                  {formatCurrency(stats.totalIncome)}
                </span>{' '}
                ingresados
                {stats.savingsRate > 0 && (
                  <> ·{' '}
                    <span className="font-semibold" style={{ color: C.income }}>
                      {Math.round(stats.savingsRate)}% ahorrando
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Barra de progreso del mes */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-[10px] mb-2">
              <span style={{ color: C.muted }}>Día {daysElapsed} de {daysTotal}</span>
              <span style={{ color: monthPct > 95 ? C.expense : monthPct > 80 ? C.debt : C.muted }}>
                {monthPct}% gastado
                {isCurrentMonth && daysLeft > 0 && <> · {daysLeft}d restantes</>}
              </span>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, monthPct)}%`, backgroundColor: barColor }} />
              {isCurrentMonth && (
                <div className="absolute top-0 bottom-0 w-0.5 rounded-full" style={{
                  left: `${Math.round((daysElapsed / daysTotal) * 100)}%`,
                  backgroundColor: 'rgba(236,253,245,0.3)',
                }} />
              )}
            </div>
            {isCurrentMonth && monthPct > Math.round((daysElapsed / daysTotal) * 100) + 10 && (
              <p className="text-[10px] mt-1.5" style={{ color: C.debt }}>
                ⚠ Ritmo de gasto por encima del promedio del mes
              </p>
            )}
          </div>

          {/* Ingresos / Gastos / Proyectado */}
          <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
            {[
              { label: 'Ingresos', value: fmt(stats.totalIncome), color: C.income },
              { label: 'Gastos', value: fmt(stats.totalExpenses), color: C.expense },
              { label: isCurrentMonth ? 'Proyectado' : 'Balance',
                value: isCurrentMonth ? fmt(stats.projection.projectedExpenses) : fmt(stats.available),
                color: stats.projection.projectedBalance >= 0 ? C.text : C.expense },
            ].map(col => (
              <div key={col.label}>
                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: C.dim }}>
                  {col.label}
                </p>
                <p className="text-sm font-extrabold" style={{ color: col.color }}>
                  {col.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── INSIGHT DEL DÍA ───────────────────────────────────────────────── */}
      {autoInsights.length > 0 && !dismissedInsight && (() => {
        const ins = autoInsights[0]
        const insColors: Record<string, { bg: string; border: string }> = {
          spending_alert: { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)' },
          projection:     { bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.2)' },
          achievement:    { bg: 'rgba(52,211,153,0.06)',  border: 'rgba(52,211,153,0.2)' },
          tip:            { bg: 'rgba(129,140,248,0.06)', border: 'rgba(129,140,248,0.2)' },
        }
        const ic = insColors[ins.type] ?? { bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.15)' }
        return (
          <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: ic.bg, border: `1px solid ${ic.border}` }}>
            <span className="text-xl flex-shrink-0">{ins.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-tight" style={{ color: C.text }}>{ins.title}</p>
              <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: C.muted }}>{ins.body}</p>
            </div>
            <button onClick={() => setDismissedInsight(true)}
              className="text-sm flex-shrink-0 transition-all mt-0.5"
              style={{ color: C.dim }}>✕</button>
          </div>
        )
      })()}

      {/* ── HOY vs RITMO (solo mes actual) ────────────────────────────────── */}
      {isCurrentMonth && (
        <div className="grid grid-cols-2 gap-3">
          {/* Hoy */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.brand }} />
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Hoy</p>
            </div>
            {stats.todayExpenses > 0 ? (
              <>
                <p className="text-xl font-extrabold" style={{ color: C.text }}>{fmt(stats.todayExpenses)}</p>
                {stats.yesterdayExpenses > 0 && (
                  <p className="text-[10px] mt-1">
                    <span style={{ color: stats.todayExpenses > stats.yesterdayExpenses ? C.expense : C.income }}>
                      {stats.todayExpenses > stats.yesterdayExpenses ? '↑' : '↓'}{' '}
                      {Math.round(Math.abs((stats.todayExpenses - stats.yesterdayExpenses) / stats.yesterdayExpenses) * 100)}%
                    </span>
                    <span style={{ color: C.dim }}> vs ayer</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-xl font-extrabold" style={{ color: C.dim }}>$0</p>
            )}
          </div>

          {/* Ritmo */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.muted }} />
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Ritmo</p>
            </div>
            {stats.projection.dailyAvg > 0 ? (() => {
              const safeAvg = daysLeft > 0 ? stats.available / daysLeft : 0
              const vel = safeAvg > 0 ? stats.projection.dailyAvg / safeAvg : 1
              const level = vel < 0.8 ? 'bajo' : vel < 1.15 ? 'normal' : 'alto'
              const lc = level === 'bajo' ? C.income : level === 'normal' ? C.goal : C.debt
              return (
                <>
                  <p className="text-xl font-extrabold" style={{ color: lc }}>
                    {level === 'bajo' ? '🐢' : level === 'normal' ? '✓' : '⚡'} {level.charAt(0).toUpperCase() + level.slice(1)}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: C.dim }}>
                    {fmt(stats.projection.dailyAvg)}/día promedio
                  </p>
                </>
              )
            })() : (
              <p className="text-xl font-extrabold" style={{ color: C.dim }}>—</p>
            )}
          </div>
        </div>
      )}

      {/* ── CATEGORÍAS SCROLL ─────────────────────────────────────────────── */}
      {stats.categoryData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold" style={{ color: C.text }}>Gastos por categoría</h2>
            <a href="/expenses" className="text-[11px] font-medium transition-all" style={{ color: C.brand }}>
              Ver todos →
            </a>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {stats.categoryData.slice(0, 8).map(cat => {
              const budgetPct = cat.budget ? Math.min(100, Math.round((cat.amount / cat.budget) * 100)) : null
              const catColor = cat.color || C.muted
              return (
                <div key={cat.name}
                  className="flex-shrink-0 w-28 rounded-2xl p-3 flex flex-col gap-2.5"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                      style={{ backgroundColor: catColor + '18' }}>
                      {cat.icon}
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: C.muted }}>
                      {cat.percentage}%
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] leading-tight truncate" style={{ color: C.muted }}>{cat.name}</p>
                    <p className="text-sm font-extrabold mt-0.5 leading-tight" style={{ color: C.text }}>
                      {fmt(cat.amount)}
                    </p>
                  </div>
                  {budgetPct !== null && (
                    <div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${budgetPct}%`,
                          backgroundColor: budgetPct >= 100 ? C.expense : budgetPct >= 80 ? C.debt : catColor,
                        }} />
                      </div>
                      <p className="text-[9px] mt-0.5" style={{ color: C.dim }}>{budgetPct}% del límite</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── DEUDAS + METAS ────────────────────────────────────────────────── */}
      {(stats.debtCount > 0 || stats.goalList.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {stats.debtCount > 0 && (
            <a href="/debts" className="rounded-2xl p-4 transition-all block group"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(248,113,113,0.3)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">💳</span>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Deudas</p>
              </div>
              <p className="text-xl font-extrabold" style={{ color: C.expense }}>{fmt(stats.debtTotal)}</p>
              <p className="text-[10px] mt-1" style={{ color: C.dim }}>
                {stats.debtCount} deuda{stats.debtCount !== 1 ? 's' : ''} activa{stats.debtCount !== 1 ? 's' : ''}
              </p>
              <p className="text-[10px] mt-2 transition-all" style={{ color: C.dim }}>Gestionar →</p>
            </a>
          )}
          {stats.goalList.length > 0 && (
            <a href="/goals" className="rounded-2xl p-4 transition-all block group"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(129,140,248,0.3)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🎯</span>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Metas</p>
              </div>
              {stats.goalList[0] && (
                <>
                  <p className="text-[12px] font-semibold truncate" style={{ color: C.text }}>
                    {stats.goalList[0].icon} {stats.goalList[0].name}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats.goalList[0].pct}%`, backgroundColor: stats.goalList[0].color || C.goal }} />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: C.dim }}>
                    {stats.goalList[0].pct}% completada
                  </p>
                </>
              )}
              <p className="text-[10px] mt-2 transition-all" style={{ color: C.dim }}>Ver metas →</p>
            </a>
          )}
        </div>
      )}

      {/* ── GRÁFICO FLUJO 6 MESES ─────────────────────────────────────────── */}
      {stats.monthlyData.some(m => m.income > 0 || m.expenses > 0) && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold" style={{ color: C.text }}>Flujo de caja</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: C.muted }}>
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: C.income }} /> Ingresos
              </div>
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: C.muted }}>
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: C.expense }} /> Gastos
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stats.monthlyData} barSize={8} barGap={3} barCategoryGap="32%">
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.dim }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(236,253,245,0.03)', radius: 4 }}
                contentStyle={{ backgroundColor: C.elevated, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 11, padding: '8px 12px' }}
                formatter={(v: unknown) => [formatCurrency(Number(v))]}
                labelStyle={{ color: C.muted, marginBottom: 4 }}
              />
              <Bar dataKey="income"   fill={C.income}  radius={[3,3,0,0]} name="Ingresos" />
              <Bar dataKey="expenses" fill={C.expense} radius={[3,3,0,0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
          {(() => {
            const validMonths = stats.monthlyData.filter(m => m.income > 0)
            const avgSavings  = validMonths.length > 0 ? validMonths.reduce((s, m) => s + m.savings, 0) / validMonths.length : 0
            return avgSavings > 0 ? (
              <p className="text-[10px] mt-2 pt-2" style={{ color: C.dim, borderTop: `1px solid ${C.border}` }}>
                Ahorro promedio 6 meses:{' '}
                <span className="font-semibold" style={{ color: C.income }}>{formatCurrency(avgSavings)}</span>
              </p>
            ) : null
          })()}
        </div>
      )}

      {/* ── TRANSACCIONES RECIENTES ───────────────────────────────────────── */}
      {grouped.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <h2 className="text-[13px] font-bold" style={{ color: C.text }}>Últimos movimientos</h2>
            <a href="/expenses" className="text-[11px] font-medium transition-all" style={{ color: C.brand }}>
              Ver todos →
            </a>
          </div>
          {grouped.map(([date, txs]) => {
            const dayTotal = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            return (
              <div key={date}>
                <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: C.bg }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                    {formatRelativeDate(date)}
                  </span>
                  {dayTotal > 0 && (
                    <span className="text-[10px] font-semibold" style={{ color: C.expense }}>
                      -{fmt(dayTotal)}
                    </span>
                  )}
                </div>
                {txs.map((tx, i) => (
                  <div key={tx.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition-all"
                    style={{ borderBottom: i < txs.length - 1 ? `1px solid ${C.border}40` : 'none' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: (tx.category?.color ?? (tx.type === 'income' ? C.income : C.expense)) + '18' }}>
                      {tx.category?.icon ?? (tx.type === 'income' ? '💰' : '💸')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate leading-tight" style={{ color: C.text }}>
                        {tx.description}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: C.dim }}>
                        {tx.category?.name ?? (tx.type === 'income' ? 'Ingreso' : 'Sin categoría')}
                      </p>
                    </div>
                    <span className="text-[13px] font-bold flex-shrink-0"
                      style={{ color: tx.type === 'income' ? C.income : C.text }}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── EMPTY STATE ───────────────────────────────────────────────────── */}
      {stats.totalIncome === 0 && stats.totalExpenses === 0 && (
        <div className="flex flex-col items-center justify-center gap-5 py-14">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: 'rgba(52,211,153,0.08)', border: `1px solid rgba(52,211,153,0.15)` }}>
            🌱
          </div>
          <div className="text-center">
            <p className="text-base font-bold mb-1" style={{ color: C.text }}>Empieza a ahorrar ahora</p>
            <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
              Toca el botón{' '}
              <span className="font-extrabold text-base mx-0.5" style={{ color: C.brand }}>+</span>
              {' '}para registrar tu primer movimiento.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
