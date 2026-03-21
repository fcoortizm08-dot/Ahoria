'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency, formatRelativeDate, getGreeting,
  calculateHealthScore, calculateMonthProjection,
  getDaysInMonth,
} from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { MonthSelector } from '@/components/common/MonthSelector'
import type {
  Transaction, CategoryExpense, MonthlyData,
  HealthScoreData, MonthProjection, Streak,
} from '@/types'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Design tokens ────────────────────────────────────────────
const C = {
  bg:       '#F7F8FA',
  surface:  '#FFFFFF',
  border:   '#E5E7EB',
  green:    '#10B981',
  greenDk:  '#059669',
  greenBg:  '#ECFDF5',
  blue:     '#3B82F6',
  blueBg:   '#EFF6FF',
  amber:    '#F59E0B',
  amberBg:  '#FFFBEB',
  red:      '#EF4444',
  redBg:    '#FEF2F2',
  ai:       '#8B5CF6',
  aiBg:     '#F5F3FF',
  text:     '#111827',
  muted:    '#6B7280',
  tertiary: '#9CA3AF',
}

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ─── Types ────────────────────────────────────────────────────
interface GoalItem {
  id: string; name: string; icon: string; color: string
  pct: number; target: number; current: number
}
interface Stats {
  totalIncome: number; totalExpenses: number; savingsRate: number; available: number
  todayExpenses: number; yesterdayExpenses: number
  healthScore: HealthScoreData; projection: MonthProjection
  recentTransactions: Transaction[]; monthlyData: MonthlyData[]
  categoryData: CategoryExpense[]; streak: Streak | null
  debtCount: number; debtTotal: number; goalList: GoalItem[]
}

// ─── Score ring ───────────────────────────────────────────────
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
      <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke={C.border} strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 800, color,
      }}>
        {score}
      </div>
    </div>
  )
}

// ─── Cashflow chart ───────────────────────────────────────────
function CashflowChart({ data }: { data: MonthlyData[] }) {
  return (
    <div style={{ height: '160px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.tertiary }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '12px', color: C.text }}
            formatter={(value, name) => [formatCurrency(Number(value)), name === 'income' ? 'Ingresos' : 'Gastos']}
          />
          <Bar dataKey="income" fill={C.green} radius={[4,4,0,0]} maxBarSize={28} />
          <Bar dataKey="expenses" fill={C.red} radius={[4,4,0,0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, bg }: { label: string; value: string; sub?: string; color?: string; bg?: string }) {
  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: '12px', padding: '16px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      flex: 1,
    }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: color ?? C.text, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: C.tertiary, marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const { activeYear, activeMonth, profile, addToast } = useFinanceStore()
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const start = new Date(activeYear, activeMonth, 1).toISOString().split('T')[0]
    const end   = new Date(activeYear, activeMonth + 1, 0).toISOString().split('T')[0]

    // Six months for chart
    const sixMonthsAgo = new Date(activeYear, activeMonth - 5, 1).toISOString().split('T')[0]

    const [txRes, recentRes, goalRes, debtRes, streakRes, sixMoRes] = await Promise.all([
      supabase.from('transactions').select('*, category:categories(*)')
        .eq('user_id', user.id).is('deleted_at', null).gte('date', start).lte('date', end),
      supabase.from('transactions').select('*, category:categories(*)')
        .eq('user_id', user.id).is('deleted_at', null).gte('date', start).lte('date', end)
        .order('date', { ascending: false }).limit(8),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('streaks').select('*').eq('user_id', user.id).single(),
      supabase.from('transactions').select('*, category:categories(*)')
        .eq('user_id', user.id).is('deleted_at', null).gte('date', sixMonthsAgo).lte('date', end),
    ])

    const txs      = txRes.data ?? []
    const recent   = recentRes.data ?? []
    const goals    = goalRes.data ?? []
    const debts    = debtRes.data ?? []
    const streak   = streakRes.data ?? null
    const sixMoTxs = sixMoRes.data ?? []

    const totalIncome   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savingsRate   = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0
    const available     = totalIncome - totalExpenses

    // Today / yesterday
    const todayStr     = new Date().toISOString().split('T')[0]
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const todayExpenses     = txs.filter(t => t.type === 'expense' && t.date.startsWith(todayStr)).reduce((s, t) => s + t.amount, 0)
    const yesterdayExpenses = txs.filter(t => t.type === 'expense' && t.date.startsWith(yesterdayStr)).reduce((s, t) => s + t.amount, 0)

    // Category breakdown
    const catMap = new Map<string, CategoryExpense>()
    txs.filter(t => t.type === 'expense').forEach(t => {
      const key  = t.category_id ?? '__none__'
      const name = t.category?.name ?? 'Sin categoría'
      const icon = t.category?.icon ?? '📦'
      const color = t.category?.color ?? '#6B7280'
      if (!catMap.has(key)) catMap.set(key, { name, icon, color, amount: 0, percentage: 0, budget: t.category?.monthly_budget ?? null, category_id: key })
      catMap.get(key)!.amount += t.amount
    })
    const catData = Array.from(catMap.values())
      .map(c => ({ ...c, percentage: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)

    // Monthly data (6 months)
    const monthMap = new Map<string, MonthlyData>()
    for (let i = 5; i >= 0; i--) {
      const d     = new Date(activeYear, activeMonth - i, 1)
      const key   = `${d.getFullYear()}-${d.getMonth()}`
      const label = MONTHS_SHORT[d.getMonth()]
      monthMap.set(key, { month: label, income: 0, expenses: 0, savings: 0 })
    }
    sixMoTxs.forEach(t => {
      const d   = new Date(t.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!monthMap.has(key)) return
      const m = monthMap.get(key)!
      if (t.type === 'income') m.income += t.amount
      else m.expenses += t.amount
    })
    const monthlyData = Array.from(monthMap.values()).map(m => ({ ...m, savings: m.income - m.expenses }))

    // Health score
    const healthScore = calculateHealthScore({
      totalIncome, totalExpenses,
      hasActiveDebts: debts.length > 0, debtCount: debts.length,
      hasGoals: goals.length > 0,
      streakDays: streak?.current_streak ?? 0,
    })

    // Projection
    const projection = calculateMonthProjection({ totalExpenses, totalIncome, year: activeYear, month: activeMonth })

    // Goal list
    const goalList: GoalItem[] = goals.map(g => ({
      id: g.id, name: g.name, icon: g.icon, color: g.color,
      pct: g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0,
      target: g.target_amount, current: g.current_amount,
    }))

    setStats({
      totalIncome, totalExpenses, savingsRate, available,
      todayExpenses, yesterdayExpenses,
      healthScore, projection, recentTransactions: recent,
      monthlyData, categoryData: catData, streak,
      debtCount: debts.length,
      debtTotal: debts.reduce((s, d) => s + d.current_balance, 0),
      goalList,
    })
    setLoading(false)
  }, [activeYear, activeMonth])

  useEffect(() => { fetchStats() }, [fetchStats])

  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Usuario'
  const today = new Date()
  const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const dateLabel = `${dayNames[today.getDay()]} ${today.getDate()} de ${monthNames[today.getMonth()]} ${today.getFullYear()}`

  const daysInMonth  = getDaysInMonth(activeYear, activeMonth)
  const dayOfMonth   = today.getDate()
  const monthPct     = Math.round((dayOfMonth / daysInMonth) * 100)

  const scoreColorFn = (score: number) => {
    if (score >= 80) return C.green
    if (score >= 60) return '#84cc16'
    if (score >= 40) return C.amber
    return C.red
  }

  if (loading) {
    return (
      <div style={{ padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: '80px', backgroundColor: C.surface, borderRadius: '12px', border: `1px solid ${C.border}` }} />
          ))}
        </div>
        <div style={{ height: '180px', backgroundColor: C.surface, borderRadius: '12px', border: `1px solid ${C.border}` }} />
      </div>
    )
  }

  if (!stats) return null

  const { healthScore, projection } = stats
  const scoreColor = scoreColorFn(healthScore.score)

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── Header row ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, margin: 0 }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>{dateLabel}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MonthSelector />
          <Link href="/expenses" style={{
            backgroundColor: C.green, color: '#FFFFFF',
            padding: '8px 16px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 2px 4px rgba(16,185,129,0.25)',
          }}>
            + Agregar
          </Link>
        </div>
      </div>

      {/* ── Hero card ────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        borderRadius: '12px', padding: '28px 32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: '20px',
        display: 'flex', alignItems: 'stretch', gap: '0',
      }}>
        {/* Left: available */}
        <div style={{ flex: '0 0 auto', paddingRight: '40px', borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
            Disponible este mes
          </div>
          <div style={{ fontSize: '38px', fontWeight: 900, color: C.text, letterSpacing: '-1px', lineHeight: 1, marginBottom: '12px' }}>
            {formatCurrency(stats.available)}
          </div>
          <span style={{
            display: 'inline-block',
            backgroundColor: healthScore.score >= 80 ? C.greenBg : healthScore.score >= 60 ? '#F0FDF4' : healthScore.score >= 40 ? C.amberBg : C.redBg,
            color: scoreColor,
            fontSize: '11px', fontWeight: 700,
            padding: '3px 10px', borderRadius: '999px',
            border: `1px solid ${scoreColor}40`,
            marginBottom: '16px',
          }}>
            {healthScore.label}
          </span>
          <div>
            <div style={{ fontSize: '11px', color: C.tertiary, marginBottom: '6px' }}>
              Día {dayOfMonth} de {daysInMonth} — {monthPct}% del mes
            </div>
            <div style={{ height: '4px', backgroundColor: '#E5E7EB', borderRadius: '999px', width: '200px' }}>
              <div style={{
                height: '4px', borderRadius: '999px',
                backgroundColor: C.green,
                width: `${monthPct}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Right: 3 stat boxes */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '40px', gap: '0' }}>
          {[
            { label: 'Ingresos', value: formatCurrency(stats.totalIncome), color: C.green, bg: C.greenBg, icon: '↑' },
            { label: 'Gastos', value: formatCurrency(stats.totalExpenses), color: C.red, bg: C.redBg, icon: '↓' },
            { label: 'Ahorro', value: formatCurrency(Math.max(stats.totalIncome - stats.totalExpenses, 0)), color: C.blue, bg: C.blueBg, icon: '🐖', sub: `${stats.savingsRate}% de ingresos` },
          ].map((item, idx) => (
            <div key={item.label} style={{
              flex: 1,
              paddingLeft: idx > 0 ? '28px' : '0',
              marginLeft: idx > 0 ? '28px' : '0',
              borderLeft: idx > 0 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '6px',
                  backgroundColor: item.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', color: item.color,
                }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: C.muted }}>{item.label}</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: item.color, letterSpacing: '-0.3px' }}>
                {item.value}
              </div>
              {item.sub && <div style={{ fontSize: '11px', color: C.tertiary, marginTop: '2px' }}>{item.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* Gasto hoy */}
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Gasto hoy
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: stats.todayExpenses > 0 ? C.red : C.text }}>
            {formatCurrency(stats.todayExpenses)}
          </div>
          <div style={{ fontSize: '11px', color: C.tertiary, marginTop: '4px' }}>
            {stats.yesterdayExpenses > 0
              ? stats.todayExpenses > stats.yesterdayExpenses
                ? `↑ vs ayer (${formatCurrency(stats.yesterdayExpenses)})`
                : `↓ vs ayer (${formatCurrency(stats.yesterdayExpenses)})`
              : 'Sin gastos ayer'
            }
          </div>
        </div>

        {/* Ritmo */}
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Ritmo de gasto
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '13px', fontWeight: 700,
              padding: '2px 8px', borderRadius: '999px',
              backgroundColor: projection.isOverBudget ? C.redBg : C.greenBg,
              color: projection.isOverBudget ? C.red : C.green,
            }}>
              {projection.isOverBudget ? 'Alto' : 'Normal'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: C.tertiary, marginTop: '4px' }}>
            Prom. diario: {formatCurrency(projection.dailyAvg)}
          </div>
        </div>

        {/* Proyección */}
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Proyección fin de mes
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: projection.isOverBudget ? C.red : C.text }}>
            {formatCurrency(projection.projectedExpenses)}
          </div>
          <div style={{ fontSize: '11px', color: C.tertiary, marginTop: '4px' }}>
            {projection.isOverBudget ? '⚠ Superarías ingresos' : 'Dentro del presupuesto'}
          </div>
        </div>

        {/* Score */}
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <ScoreRing score={healthScore.score} color={scoreColor} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Score financiero
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: scoreColor }}>
              {healthScore.label}
            </div>
            <div style={{ fontSize: '11px', color: C.tertiary }}>de 100 puntos</div>
          </div>
        </div>
      </div>

      {/* ── Main 2-column grid ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: '20px', marginBottom: '24px' }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Category expenses */}
          <div style={{
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '12px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: 0 }}>Gastos por categoría</h3>
              <Link href="/expenses" style={{ fontSize: '12px', color: C.green, textDecoration: 'none', fontWeight: 600 }}>
                Ver todos →
              </Link>
            </div>
            {stats.categoryData.length === 0 ? (
              <p style={{ fontSize: '13px', color: C.tertiary, textAlign: 'center', padding: '20px 0' }}>
                Sin gastos este mes
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.categoryData.slice(0, 6).map(cat => (
                  <div key={cat.category_id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '8px',
                      backgroundColor: cat.color + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', flexShrink: 0,
                    }}>
                      {cat.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{cat.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.red }}>{formatCurrency(cat.amount)}</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: '#E5E7EB', borderRadius: '999px' }}>
                        <div style={{
                          height: '4px', borderRadius: '999px',
                          backgroundColor: cat.color,
                          width: `${cat.percentage}%`,
                        }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: C.tertiary, width: '28px', textAlign: 'right', flexShrink: 0 }}>
                      {cat.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cashflow chart */}
          <div style={{
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '12px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ marginBottom: '4px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: 0 }}>Flujo de caja</h3>
              <p style={{ fontSize: '12px', color: C.tertiary, margin: '2px 0 16px' }}>Últimos 6 meses</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: C.green }} />
                <span style={{ fontSize: '11px', color: C.muted }}>Ingresos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: C.red }} />
                <span style={{ fontSize: '11px', color: C.muted }}>Gastos</span>
              </div>
            </div>
            <CashflowChart data={stats.monthlyData} />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Goals */}
          <div style={{
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '12px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: 0 }}>Metas de ahorro</h3>
              <Link href="/goals" style={{ fontSize: '12px', color: C.blue, textDecoration: 'none', fontWeight: 600 }}>
                Nueva meta →
              </Link>
            </div>
            {stats.goalList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '24px', marginBottom: '6px' }}>🎯</p>
                <p style={{ fontSize: '12px', color: C.tertiary, margin: 0 }}>Sin metas activas</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {stats.goalList.slice(0, 3).map(g => (
                  <div key={g.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>{g.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{g.name}</span>
                          <span style={{ fontSize: '11px', color: C.blue, fontWeight: 600 }}>{g.pct}%</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: '4px', backgroundColor: '#E5E7EB', borderRadius: '999px' }}>
                      <div style={{
                        height: '4px', borderRadius: '999px',
                        backgroundColor: g.color,
                        width: `${g.pct}%`,
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                      <span style={{ fontSize: '10px', color: C.tertiary }}>{formatCurrency(g.current)}</span>
                      <span style={{ fontSize: '10px', color: C.tertiary }}>{formatCurrency(g.target)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Debts */}
          <div style={{
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '12px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: 0 }}>Deudas</h3>
              <Link href="/debts" style={{ fontSize: '12px', color: C.amber, textDecoration: 'none', fontWeight: 600 }}>
                Gestionar →
              </Link>
            </div>
            {stats.debtCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '24px', marginBottom: '6px' }}>✓</p>
                <p style={{ fontSize: '12px', color: C.green, fontWeight: 600, margin: 0 }}>Sin deudas activas</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: C.amber, letterSpacing: '-0.5px', marginBottom: '4px' }}>
                  {formatCurrency(stats.debtTotal)}
                </div>
                <div style={{ fontSize: '12px', color: C.tertiary }}>
                  {stats.debtCount} deuda{stats.debtCount !== 1 ? 's' : ''} activa{stats.debtCount !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>

          {/* AI card */}
          <div style={{
            background: 'linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)',
            border: `1px solid #DDD6FE`,
            borderRadius: '12px', padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontWeight: 800, fontSize: '14px',
              }}>F</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Asistente IA — Fin</div>
                <div style={{ fontSize: '11px', color: '#8B5CF6' }}>¿En qué te ayudo hoy?</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              {['¿Cómo voy este mes?', '¿En qué gasto más?', 'Dame un consejo'].map(q => (
                <Link key={q} href="/ai" style={{
                  display: 'block', padding: '7px 10px', borderRadius: '8px',
                  backgroundColor: '#FFFFFF', border: '1px solid #DDD6FE',
                  fontSize: '12px', color: '#7C3AED', textDecoration: 'none', fontWeight: 500,
                  transition: 'background-color 0.15s',
                }}>
                  {q}
                </Link>
              ))}
            </div>
            <Link href="/ai" style={{
              display: 'block', textAlign: 'center', padding: '8px',
              backgroundColor: '#8B5CF6', color: '#FFFFFF',
              borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              textDecoration: 'none',
            }}>
              Abrir chat →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recent transactions ──────────────────────────────────── */}
      <div style={{
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: 0 }}>Últimos movimientos</h3>
          <Link href="/expenses" style={{ fontSize: '12px', color: C.green, textDecoration: 'none', fontWeight: 600 }}>
            Ver todos →
          </Link>
        </div>

        {stats.recentTransactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', marginBottom: '8px' }}>📋</p>
            <p style={{ fontSize: '14px', color: C.muted, marginBottom: '4px', fontWeight: 600 }}>Sin movimientos este mes</p>
            <p style={{ fontSize: '13px', color: C.tertiary }}>Registra tu primer ingreso o gasto</p>
          </div>
        ) : (
          <div>
            {stats.recentTransactions.map((tx, idx) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 24px',
                  borderBottom: idx < stats.recentTransactions.length - 1 ? `1px solid ${C.border}` : 'none',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                  backgroundColor: (tx.category?.color ?? (tx.type === 'income' ? C.green : C.red)) + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px',
                }}>
                  {tx.category?.icon ?? (tx.type === 'income' ? '↑' : '↓')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description}
                  </div>
                  <div style={{ fontSize: '11px', color: C.tertiary }}>
                    {tx.category?.name ?? (tx.type === 'income' ? 'Ingreso' : 'Sin categoría')} · {formatRelativeDate(tx.date)}
                  </div>
                </div>
                <div style={{
                  fontSize: '14px', fontWeight: 700,
                  color: tx.type === 'income' ? C.green : C.red,
                  flexShrink: 0,
                }}>
                  {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
