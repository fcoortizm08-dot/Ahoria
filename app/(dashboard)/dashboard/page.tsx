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
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ─────────────────────────────────────────────────────────────────────────────
// AHORIA Design Tokens
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:      '#070e0a',   // fondo base
  surface: '#0e1912',   // cards
  elevated:'#131f18',   // cards elevadas
  border:  '#1e3228',   // bordes
  brand:   '#34d399',   // verde esmeralda (brand)
  income:  '#34d399',   // ingresos
  expense: '#f87171',   // gastos
  debt:    '#fbbf24',   // deudas
  goal:    '#818cf8',   // metas
  ai:      '#c084fc',   // IA / premium
  text:    '#ecfdf5',   // texto primario
  muted:   '#6b8f7a',   // texto secundario
  dim:     '#364d3f',   // texto terciario
}

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
interface Stats {
  totalIncome:        number
  totalExpenses:      number
  savingsRate:        number
  available:          number
  todayExpenses:      number
  yesterdayExpenses:  number
  healthScore:        HealthScoreData
  projection:         MonthProjection
  recentTransactions: Transaction[]
  monthlyData:        MonthlyData[]
  categoryData:       CategoryExpense[]
  streak:             Streak | null
  debtCount:          number
  debtTotal:          number
  goalList:           { id: string; name: string; icon: string; color: string; pct: number; target: number; current: number }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
/** Formato compacto: $182k, $1.2M */
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

/** Agrupa transacciones por fecha descendente */
function groupByDate(txs: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>()
  txs.forEach(tx => {
    const key = tx.date.split('T')[0]
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  })
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

/** Color dinámico del health score con paleta AHORIA */
function scoreColor(score: number): string {
  if (score >= 80) return C.income     // esmeralda
  if (score >= 60) return '#a3e635'    // lima
  if (score >= 40) return C.debt       // ámbar
  return C.expense                     // rosa
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

/** Indicador circular de Score */
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r   = 22
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke={C.border} strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[13px] font-extrabold leading-none" style={{ color }}>{score}</span>
        <span className="text-[7px] font-semibold" style={{ color: C.dim }}>score</span>
      </div>
    </div>
  )
}

/** Barra de velocidad de gasto */
function RhythmCard({ dailyAvg, daysLeft, available }: { dailyAvg: number; daysLeft: number; available: number }) {
  const safeAvg = daysLeft > 0 ? available / daysLeft : 0
  const vel     = safeAvg > 0 ? dailyAvg / safeAvg : 1
  const level   = vel < 0.8 ? 'bajo' : vel < 1.15 ? 'normal' : 'alto'
  const cfg     = {
    bajo:   { icon: '🐢', label: 'Ritmo bajo',   sub: 'Vas muy bien',        color: C.income },
    normal: { icon: '✓',  label: 'Ritmo normal', sub: 'En el plan',          color: C.goal   },
    alto:   { icon: '⚡', label: 'Ritmo alto',   sub: 'Ojo con los gastos',  color: C.debt   },
  }[level]
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl leading-none">{cfg.icon}</span>
        <span className="text-sm font-extrabold" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
      <p className="text-[10px]" style={{ color: C.dim }}>
        {cfg.sub} · {fmt(dailyAvg)}/día
      </p>
    </div>
  )
}

/** Skeleton de carga */
function DashboardSkeleton() {
  const pulse = { backgroundColor: C.surface, border: `1px solid ${C.border}` }
  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex justify-between items-center">
        <div className="h-6 w-44 rounded-xl animate-pulse" style={pulse} />
        <div className="h-8 w-24 rounded-xl animate-pulse" style={pulse} />
      </div>
      <div className="h-8 rounded-2xl animate-pulse" style={pulse} />
      <div className="h-60 rounded-2xl animate-pulse" style={pulse} />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-2xl animate-pulse" style={pulse} />
        <div className="h-24 rounded-2xl animate-pulse" style={pulse} />
      </div>
      <div className="h-40 rounded-2xl animate-pulse" style={pulse} />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-2xl animate-pulse" style={pulse} />
        <div className="h-24 rounded-2xl animate-pulse" style={pulse} />
      </div>
      <div className="h-44 rounded-2xl animate-pulse" style={pulse} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats]               = useState<Stats | null>(null)
  const [isLoading, setIsLoading]       = useState(true)
  const [dismissedInsight, setDismissed] = useState(false)
  const { profile, activeYear, activeMonth } = useFinanceStore()

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now         = new Date()
    const sixMonthsAgo= new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const monthStart  = new Date(activeYear, activeMonth, 1).toISOString().split('T')[0]
    const monthEnd    = new Date(activeYear, activeMonth + 1, 0).toISOString().split('T')[0]
    const todayStr    = now.toISOString().split('T')[0]
    const yest        = new Date(now); yest.setDate(yest.getDate() - 1)
    const yesterdayStr= yest.toISOString().split('T')[0]

    const [
      { data: allTxs },
      { data: streakData },
      { data: debts },
      { data: goals },
    ] = await Promise.all([
      supabase.from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id).is('deleted_at', null)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .order('date', { ascending: false }),
      supabase.from('streaks').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('debts').select('id, current_balance').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('goals').select('id, name, icon, color, target_amount, current_amount').eq('user_id', user.id).eq('status', 'active'),
    ])

    const txs       = allTxs ?? []
    const monthTxs  = txs.filter(t => t.date >= monthStart && t.date <= monthEnd)
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

    // Últimas 10 transacciones del mes
    const recentTransactions = monthTxs.slice(0, 10)

    // Datos de 6 meses para gráfico
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

    // Gastos por categoría del mes
    const catMap = new Map<string, Omit<CategoryExpense, 'percentage'>>()
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const key = t.category?.name ?? 'Sin categoría'
      const ex  = catMap.get(key)
      if (ex) { ex.amount += t.amount }
      else catMap.set(key, {
        name: key, amount: t.amount,
        color: t.category?.color ?? C.muted,
        icon: t.category?.icon ?? '📦',
        budget: t.category?.monthly_budget ?? null,
        category_id: t.category_id ?? '',
      })
    })
    const categoryData: CategoryExpense[] = Array.from(catMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map(c => ({ ...c, percentage: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0 }))

    setStats({ totalIncome, totalExpenses, savingsRate, available, todayExpenses, yesterdayExpenses, healthScore, projection, recentTransactions, monthlyData, categoryData, streak: streakData ?? null, debtCount, debtTotal, goalList })
    setIsLoading(false)
  }, [activeYear, activeMonth])

  useEffect(() => { fetchStats() }, [fetchStats])

  // ── Cálculos derivados ──────────────────────────────────────────────────────
  const autoInsights = stats ? generateAutoInsights({
    totalIncome: stats.totalIncome, totalExpenses: stats.totalExpenses,
    categoryData: stats.categoryData, projection: stats.projection,
    healthScore: stats.healthScore, streakDays: stats.streak?.current_streak ?? 0,
  }) : []

  const daysTotal       = getDaysInMonth(activeYear, activeMonth)
  const daysElapsed     = stats?.projection.daysElapsed ?? 1
  const daysLeft        = daysTotal - daysElapsed
  const monthPct        = stats && stats.totalIncome > 0 ? Math.round((stats.totalExpenses / stats.totalIncome) * 100) : 0
  const firstName       = profile?.full_name?.split(' ')[0] ?? ''
  const isCurrentMonth  = new Date().getFullYear() === activeYear && new Date().getMonth() === activeMonth
  const grouped         = stats ? groupByDate(stats.recentTransactions) : []

  const hs = stats?.healthScore
  const sc = hs ? scoreColor(hs.score) : C.brand
  const barFill = monthPct > 95 ? C.expense : monthPct > 80 ? C.debt : C.brand

  // ── Render: Skeleton ────────────────────────────────────────────────────────
  if (isLoading) return <DashboardSkeleton />
  if (!stats) return null

  // ── Render principal ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pb-28">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HEADER — Saludo + streak + selector de mes
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
            <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
              style={{ backgroundColor: C.elevated, border: `1px solid ${C.border}` }}>
              <span className="text-sm">🔥</span>
              <span className="text-xs font-extrabold" style={{ color: '#fb923c' }}>
                {stats.streak.current_streak}
              </span>
            </div>
          )}
          <MonthSelector />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. ACCIONES RÁPIDAS — Atajos más usados
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex gap-2">
        {[
          { href: '/expenses', icon: '↓', label: 'Registrar gasto',   color: C.expense },
          { href: '/income',   icon: '↑', label: 'Registrar ingreso', color: C.income  },
          { href: '/debts',    icon: '◫', label: 'Ver deudas',        color: C.debt    },
          { href: '/goals',    icon: '◎', label: 'Mis metas',         color: C.goal    },
        ].map(a => (
          <a key={a.href} href={a.href}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all active:scale-[0.96]"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <span className="text-base font-bold leading-none" style={{ color: a.color }}>{a.icon}</span>
            <span className="text-[8px] font-semibold text-center leading-tight" style={{ color: C.muted }}>
              {a.label}
            </span>
          </a>
        ))}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. HERO CARD — Pulso Financiero del mes
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

        {/* Accent gradient dinámico */}
        <div className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, ${sc}, ${sc}30)` }} />

        <div className="p-5">

          {/* ── Fila superior: score ring + balance disponible ── */}
          <div className="flex items-start gap-4 mb-5">
            <ScoreRing score={hs?.score ?? 0} color={sc} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full ah-pulse flex-shrink-0" style={{ backgroundColor: sc }} />
                <span className="text-[11px] font-semibold" style={{ color: sc }}>
                  Salud {hs?.label ?? '—'}
                </span>
                <span className="text-[10px]" style={{ color: C.dim }}>
                  · {MONTHS_SHORT[activeMonth]} {activeYear}
                </span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] mb-1" style={{ color: C.muted }}>
                Disponible este mes
              </p>
              <p className="text-[38px] font-extrabold leading-none tracking-tight"
                style={{ color: stats.available >= 0 ? C.text : C.expense }}>
                {fmt(stats.available)}
              </p>
              {stats.totalIncome > 0 && (
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: C.muted }}>
                  de{' '}
                  <span className="font-semibold" style={{ color: C.text }}>
                    {formatCurrency(stats.totalIncome)}
                  </span>
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
          </div>

          {/* ── Barra de progreso del mes ── */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-[10px] mb-2">
              <span style={{ color: C.muted }}>Día {daysElapsed} de {daysTotal}</span>
              <span style={{ color: monthPct > 95 ? C.expense : monthPct > 80 ? C.debt : C.muted }}>
                {monthPct}% gastado
                {isCurrentMonth && daysLeft > 0 && (
                  <span style={{ color: C.dim }}> · {daysLeft}d restantes</span>
                )}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
              {/* Barra de gasto */}
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, monthPct)}%`, backgroundColor: barFill }} />
              {/* Indicador del día actual */}
              {isCurrentMonth && (
                <div className="absolute top-0 bottom-0 w-0.5 rounded-full"
                  style={{
                    left: `${Math.round((daysElapsed / daysTotal) * 100)}%`,
                    backgroundColor: 'rgba(236,253,245,0.35)',
                  }} />
              )}
            </div>
            {isCurrentMonth && monthPct > Math.round((daysElapsed / daysTotal) * 100) + 10 && (
              <p className="text-[10px] mt-1.5" style={{ color: C.debt }}>
                ⚠ Ritmo de gasto por encima del tiempo transcurrido
              </p>
            )}
          </div>

          {/* ── Stats finales: ingresos / gastos / proyectado ── */}
          <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
            {[
              {
                label: 'Ingresos',
                value: fmt(stats.totalIncome),
                color: C.income,
                sub:   `${stats.totalIncome > 0 ? '+' : ''}${Math.round(stats.savingsRate)}% guardado`,
              },
              {
                label: 'Gastos',
                value: fmt(stats.totalExpenses),
                color: C.expense,
                sub:   stats.categoryData[0] ? `Mayor: ${stats.categoryData[0].name}` : 'Sin gastos',
              },
              {
                label: isCurrentMonth ? 'Proyectado' : 'Balance final',
                value: isCurrentMonth ? fmt(stats.projection.projectedExpenses) : fmt(stats.available),
                color: stats.projection.projectedBalance >= 0 ? C.text : C.expense,
                sub:   stats.projection.isOverBudget ? 'Sobre presupuesto' : 'Dentro del plan',
              },
            ].map(col => (
              <div key={col.label}>
                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: C.dim }}>
                  {col.label}
                </p>
                <p className="text-[15px] font-extrabold leading-tight" style={{ color: col.color }}>
                  {col.value}
                </p>
                <p className="text-[9px] mt-0.5 truncate" style={{ color: C.dim }}>{col.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. INSIGHT DEL DÍA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {autoInsights.length > 0 && !dismissedInsight && (() => {
        const ins = autoInsights[0]
        const iMap: Record<string, { bg: string; border: string }> = {
          spending_alert: { bg: 'rgba(251,191,36,0.06)',  border: 'rgba(251,191,36,0.2)'  },
          projection:     { bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.2)' },
          achievement:    { bg: 'rgba(52,211,153,0.06)',  border: 'rgba(52,211,153,0.2)'  },
          tip:            { bg: 'rgba(129,140,248,0.06)', border: 'rgba(129,140,248,0.2)' },
        }
        const ic = iMap[ins.type] ?? { bg: 'rgba(52,211,153,0.05)', border: 'rgba(52,211,153,0.15)' }
        return (
          <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: ic.bg, border: `1px solid ${ic.border}` }}>
            <span className="text-xl flex-shrink-0 mt-0.5">{ins.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-snug" style={{ color: C.text }}>
                {ins.title}
              </p>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: C.muted }}>
                {ins.body}
              </p>
            </div>
            <button onClick={() => setDismissed(true)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-lg transition-all"
              style={{ color: C.dim, backgroundColor: 'rgba(255,255,255,0.04)' }}>
              ✕
            </button>
          </div>
        )
      })()}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. HOY vs RITMO (solo mes activo)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isCurrentMonth && (
        <div className="grid grid-cols-2 gap-3">

          {/* Card: Gastos de hoy */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1.5 h-1.5 rounded-full ah-pulse" style={{ backgroundColor: C.brand }} />
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Hoy</p>
            </div>
            {stats.todayExpenses > 0 ? (
              <>
                <p className="text-xl font-extrabold" style={{ color: C.text }}>
                  {fmt(stats.todayExpenses)}
                </p>
                {stats.yesterdayExpenses > 0 && (
                  <p className="text-[10px] mt-1">
                    <span style={{ color: stats.todayExpenses > stats.yesterdayExpenses ? C.expense : C.income }}>
                      {stats.todayExpenses > stats.yesterdayExpenses ? '↑' : '↓'}{' '}
                      {Math.round(Math.abs((stats.todayExpenses - stats.yesterdayExpenses) / stats.yesterdayExpenses) * 100)}%
                    </span>
                    <span style={{ color: C.dim }}> vs ayer</span>
                  </p>
                )}
                {stats.yesterdayExpenses === 0 && (
                  <p className="text-[10px] mt-1" style={{ color: C.dim }}>primer gasto del día</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xl font-extrabold" style={{ color: C.dim }}>$0</p>
                <p className="text-[10px] mt-1" style={{ color: C.dim }}>Sin gastos aún hoy</p>
              </>
            )}
          </div>

          {/* Card: Ritmo de gasto */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.muted }} />
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Ritmo</p>
            </div>
            {stats.projection.dailyAvg > 0
              ? <RhythmCard dailyAvg={stats.projection.dailyAvg} daysLeft={daysLeft} available={stats.available} />
              : <p className="text-xl font-extrabold" style={{ color: C.dim }}>—</p>
            }
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. GASTOS POR CATEGORÍA (scroll horizontal)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {stats.categoryData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold" style={{ color: C.text }}>Por categoría</h2>
            <a href="/expenses" className="text-[11px] font-medium" style={{ color: C.brand }}>
              Ver desglose →
            </a>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {stats.categoryData.slice(0, 8).map(cat => {
              const catColor  = cat.color || C.muted
              const budgetPct = cat.budget ? Math.min(100, Math.round((cat.amount / cat.budget) * 100)) : null
              const barColor  = budgetPct !== null
                ? budgetPct >= 100 ? C.expense : budgetPct >= 80 ? C.debt : catColor
                : catColor
              return (
                <div key={cat.name}
                  className="flex-shrink-0 w-[108px] rounded-2xl p-3 flex flex-col gap-2.5 transition-all active:scale-[0.97]"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[15px]"
                      style={{ backgroundColor: catColor + '18' }}>
                      {cat.icon}
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: C.muted }}>
                      {cat.percentage}%
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] leading-snug truncate" style={{ color: C.muted }}>{cat.name}</p>
                    <p className="text-[15px] font-extrabold mt-0.5 leading-tight" style={{ color: C.text }}>
                      {fmt(cat.amount)}
                    </p>
                  </div>
                  {/* Barra de presupuesto (si existe) */}
                  {budgetPct !== null && (
                    <div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${budgetPct}%`, backgroundColor: barColor }} />
                      </div>
                      <p className="text-[8px] mt-0.5 font-medium" style={{ color: C.dim }}>
                        {budgetPct}% del límite
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          7. DEUDAS + METAS (grid 50/50)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {(stats.debtCount > 0 || stats.goalList.length > 0) && (
        <div className="grid grid-cols-2 gap-3">

          {stats.debtCount > 0 && (
            <a href="/debts" className="rounded-2xl p-4 block transition-all active:scale-[0.97]"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.border}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm"
                  style={{ backgroundColor: 'rgba(248,113,113,0.1)' }}>
                  💳
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                  Deudas
                </p>
              </div>
              <p className="text-xl font-extrabold" style={{ color: C.expense }}>
                {fmt(stats.debtTotal)}
              </p>
              <p className="text-[10px] mt-1" style={{ color: C.dim }}>
                {stats.debtCount} activa{stats.debtCount !== 1 ? 's' : ''}
              </p>
              <p className="text-[10px] mt-3 font-medium" style={{ color: C.muted }}>
                Gestionar →
              </p>
            </a>
          )}

          {stats.goalList.length > 0 && (
            <a href="/goals" className="rounded-2xl p-4 block transition-all active:scale-[0.97]"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(129,140,248,0.3)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.border}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm"
                  style={{ backgroundColor: 'rgba(129,140,248,0.1)' }}>
                  🎯
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                  Meta principal
                </p>
              </div>
              {stats.goalList[0] && (
                <>
                  <p className="text-[12px] font-semibold truncate mb-2" style={{ color: C.text }}>
                    {stats.goalList[0].icon} {stats.goalList[0].name}
                  </p>
                  {/* Progress ring pequeño + porcentaje */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${stats.goalList[0].pct}%`,
                          backgroundColor: stats.goalList[0].color || C.goal,
                        }} />
                    </div>
                    <span className="text-[10px] font-bold flex-shrink-0" style={{ color: stats.goalList[0].color || C.goal }}>
                      {stats.goalList[0].pct}%
                    </span>
                  </div>
                  <p className="text-[9px] mt-1" style={{ color: C.dim }}>
                    {fmt(stats.goalList[0].current)} de {fmt(stats.goalList[0].target)}
                  </p>
                </>
              )}
              <p className="text-[10px] mt-3 font-medium" style={{ color: C.muted }}>
                Ver metas →
              </p>
            </a>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          8. TARJETA ASISTENTE IA — Acceso rápido a Fin
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <a href="/ai" className="block transition-all active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, rgba(192,132,252,0.08), rgba(129,140,248,0.06))', border: `1px solid rgba(192,132,252,0.18)`, borderRadius: 16 }}>
        <div className="px-4 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-base flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8)', color: '#070e0a' }}>
            ✦
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold" style={{ color: C.text }}>
              Pregúntale a Fin
            </p>
            <p className="text-[11px]" style={{ color: '#9d72e8' }}>
              "¿Cómo voy este mes?" · "¿Cuándo logro mi meta?"
            </p>
          </div>
          <div className="flex-shrink-0 text-sm" style={{ color: '#9d72e8' }}>→</div>
        </div>
      </a>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          9. GRÁFICO FLUJO DE CAJA — 6 meses
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {stats.monthlyData.some(m => m.income > 0 || m.expenses > 0) && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold" style={{ color: C.text }}>Flujo de caja</h2>
            <div className="flex items-center gap-3">
              {[
                { color: C.income,  label: 'Ingresos' },
                { color: C.expense, label: 'Gastos'   },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: C.muted }}>
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stats.monthlyData} barSize={8} barGap={3} barCategoryGap="30%">
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: C.dim }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(236,253,245,0.03)', radius: 4 }}
                contentStyle={{
                  backgroundColor: C.elevated,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  fontSize: 11,
                  padding: '8px 12px',
                  color: C.text,
                }}
                formatter={(v: unknown) => [formatCurrency(Number(v))]}
                labelStyle={{ color: C.muted, marginBottom: 4 }}
              />
              <Bar dataKey="income"   fill={C.income}  radius={[3,3,0,0]} name="Ingresos" />
              <Bar dataKey="expenses" fill={C.expense} radius={[3,3,0,0]} name="Gastos"   />
            </BarChart>
          </ResponsiveContainer>
          {/* Ahorro promedio */}
          {(() => {
            const validMonths = stats.monthlyData.filter(m => m.income > 0)
            if (!validMonths.length) return null
            const avgSavings = validMonths.reduce((s, m) => s + m.savings, 0) / validMonths.length
            if (avgSavings <= 0) return null
            return (
              <p className="text-[10px] mt-3 pt-3" style={{ color: C.dim, borderTop: `1px solid ${C.border}` }}>
                Ahorro promedio 6 meses:{' '}
                <span className="font-semibold" style={{ color: C.income }}>
                  {formatCurrency(avgSavings)}
                </span>
              </p>
            )
          })()}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          10. ÚLTIMOS MOVIMIENTOS (agrupados por día)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {grouped.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

          <div className="flex items-center justify-between px-4 pt-4 pb-3"
            style={{ borderBottom: `1px solid ${C.border}` }}>
            <h2 className="text-[13px] font-bold" style={{ color: C.text }}>Últimos movimientos</h2>
            <a href="/expenses" className="text-[11px] font-medium" style={{ color: C.brand }}>
              Ver todos →
            </a>
          </div>

          {grouped.map(([date, txs]) => {
            const dayExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            const dayIncome  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
            return (
              <div key={date}>
                {/* Cabecera del día */}
                <div className="flex items-center justify-between px-4 py-2"
                  style={{ backgroundColor: C.bg }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                    {formatRelativeDate(date)}
                  </span>
                  <div className="flex items-center gap-2">
                    {dayIncome  > 0 && <span className="text-[10px] font-semibold" style={{ color: C.income }}>+{fmt(dayIncome)}</span>}
                    {dayExpense > 0 && <span className="text-[10px] font-semibold" style={{ color: C.expense }}>-{fmt(dayExpense)}</span>}
                  </div>
                </div>

                {/* Lista de transacciones del día */}
                {txs.map((tx, i) => {
                  const txColor = tx.category?.color ?? (tx.type === 'income' ? C.income : C.expense)
                  return (
                    <div key={tx.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderBottom: i < txs.length - 1 ? `1px solid ${C.border}40` : 'none' }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: txColor + '18' }}>
                        {tx.category?.icon ?? (tx.type === 'income' ? '💰' : '💸')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: C.text }}>
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
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          11. EMPTY STATE — Primer uso
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {stats.totalIncome === 0 && stats.totalExpenses === 0 && (
        <div className="flex flex-col items-center justify-center gap-5 py-12">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: 'rgba(52,211,153,0.07)', border: `1px solid rgba(52,211,153,0.15)` }}>
            🌱
          </div>
          <div className="text-center max-w-xs">
            <p className="text-[16px] font-extrabold mb-2" style={{ color: C.text }}>
              Empieza a ahorrar ahora
            </p>
            <p className="text-sm leading-relaxed mb-4" style={{ color: C.muted }}>
              Registra tu primer ingreso o gasto. Tarda menos de 10 segundos.
            </p>
            <div className="flex gap-2 justify-center">
              <a href="/income"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
                style={{ backgroundColor: 'rgba(52,211,153,0.1)', border: `1px solid rgba(52,211,153,0.2)`, color: C.income }}>
                ↑ Ingreso
              </a>
              <a href="/expenses"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
                style={{ backgroundColor: 'rgba(248,113,113,0.1)', border: `1px solid rgba(248,113,113,0.2)`, color: C.expense }}>
                ↓ Gasto
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
