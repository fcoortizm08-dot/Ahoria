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
import type { Transaction, CategoryExpense, MonthlyData, HealthScoreData, MonthProjection, Streak } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// ── Types ──────────────────────────────────────────────────────
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

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ── Score Ring ─────────────────────────────────────────────────
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 24, circ = 2 * Math.PI * r, dash = (score / 100) * circ
  return (
    <div className="relative shrink-0" style={{ width: 60, height: 60 }}>
      <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  )
}

// ── Cashflow Chart ─────────────────────────────────────────────
function CashflowChart({ data }: { data: MonthlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} barGap={3} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
          formatter={(value, name) => [formatCurrency(Number(value)), name === 'income' ? 'Ingresos' : 'Gastos']}
          cursor={{ fill: '#F9FAFB' }}
        />
        <Bar dataKey="income" fill="#10B981" radius={[4,4,0,0]} maxBarSize={24} name="income" />
        <Bar dataKey="expenses" fill="#FCA5A5" radius={[4,4,0,0]} maxBarSize={24} name="expenses" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Skeleton ───────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const { activeYear, activeMonth, profile } = useFinanceStore()

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const start = new Date(activeYear, activeMonth, 1).toISOString().split('T')[0]
    const end   = new Date(activeYear, activeMonth + 1, 0).toISOString().split('T')[0]
    const sixAgo = new Date(activeYear, activeMonth - 5, 1).toISOString().split('T')[0]

    const [txRes, recentRes, goalRes, debtRes, streakRes, sixMoRes] = await Promise.all([
      supabase.from('transactions').select('*, category:categories(*)')
        .eq('user_id', user.id).is('deleted_at', null).gte('date', start).lte('date', end),
      supabase.from('transactions').select('*, category:categories(*)')
        .eq('user_id', user.id).is('deleted_at', null).gte('date', start).lte('date', end)
        .order('date', { ascending: false }).limit(10),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('streaks').select('*').eq('user_id', user.id).single(),
      supabase.from('transactions').select('*, category:categories(*)')
        .eq('user_id', user.id).is('deleted_at', null).gte('date', sixAgo).lte('date', end),
    ])

    const txs = txRes.data ?? []
    const recent = recentRes.data ?? []
    const goals = goalRes.data ?? []
    const debts = debtRes.data ?? []
    const streak = streakRes.data ?? null
    const sixMo = sixMoRes.data ?? []

    const totalIncome   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savingsRate   = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0
    const available     = totalIncome - totalExpenses

    const todayStr     = new Date().toISOString().split('T')[0]
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const todayExpenses     = txs.filter(t => t.type === 'expense' && t.date.startsWith(todayStr)).reduce((s, t) => s + t.amount, 0)
    const yesterdayExpenses = txs.filter(t => t.type === 'expense' && t.date.startsWith(yesterdayStr)).reduce((s, t) => s + t.amount, 0)

    const catMap = new Map<string, CategoryExpense>()
    txs.filter(t => t.type === 'expense').forEach(t => {
      const key = t.category_id ?? '__none__'
      if (!catMap.has(key)) catMap.set(key, {
        name: t.category?.name ?? 'Sin categoría',
        icon: t.category?.icon ?? '📦',
        color: t.category?.color ?? '#6B7280',
        amount: 0, percentage: 0,
        budget: t.category?.monthly_budget ?? null,
        category_id: key,
      })
      catMap.get(key)!.amount += t.amount
    })
    const categoryData = Array.from(catMap.values())
      .map(c => ({ ...c, percentage: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)

    const monthMap = new Map<string, MonthlyData>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(activeYear, activeMonth - i, 1)
      monthMap.set(`${d.getFullYear()}-${d.getMonth()}`, { month: MONTHS_SHORT[d.getMonth()], income: 0, expenses: 0, savings: 0 })
    }
    sixMo.forEach(t => {
      const d = new Date(t.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!monthMap.has(key)) return
      const m = monthMap.get(key)!
      if (t.type === 'income') m.income += t.amount
      else m.expenses += t.amount
    })
    const monthlyData = Array.from(monthMap.values()).map(m => ({ ...m, savings: m.income - m.expenses }))

    const healthScore = calculateHealthScore({
      totalIncome, totalExpenses,
      hasActiveDebts: debts.length > 0, debtCount: debts.length,
      hasGoals: goals.length > 0,
      streakDays: streak?.current_streak ?? 0,
    })
    const projection = calculateMonthProjection({ totalExpenses, totalIncome, year: activeYear, month: activeMonth })
    const goalList: GoalItem[] = goals.map(g => ({
      id: g.id, name: g.name, icon: g.icon, color: g.color,
      pct: g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0,
      target: g.target_amount, current: g.current_amount,
    }))

    setStats({
      totalIncome, totalExpenses, savingsRate, available,
      todayExpenses, yesterdayExpenses,
      healthScore, projection, recentTransactions: recent,
      monthlyData, categoryData, streak,
      debtCount: debts.length,
      debtTotal: debts.reduce((s, d) => s + d.current_balance, 0),
      goalList,
    })
    setLoading(false)
  }, [activeYear, activeMonth])

  useEffect(() => { fetchStats() }, [fetchStats])

  const greeting  = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'ahí'
  const today     = new Date()
  const dayNames  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const monthNames= ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const dateLabel = `${dayNames[today.getDay()]} ${today.getDate()} de ${monthNames[today.getMonth()]} ${today.getFullYear()}`
  const daysInMonth = getDaysInMonth(activeYear, activeMonth)
  const dayOfMonth  = today.getDate()
  const monthPct    = Math.round((dayOfMonth / daysInMonth) * 100)

  const scoreColor = (s: number) => s >= 80 ? '#10B981' : s >= 60 ? '#84cc16' : s >= 40 ? '#F59E0B' : '#EF4444'

  // ── Loading state ──────────────────────────────────────────────
  if (loading) return (
    <div className="p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-36 w-full" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid gap-5" style={{ gridTemplateColumns: '60fr 40fr' }}>
        <div className="space-y-5">
          <Skeleton className="h-64" />
          <Skeleton className="h-52" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-52" />
          <Skeleton className="h-36" />
        </div>
      </div>
    </div>
  )

  if (!stats) return null
  const { healthScore, projection } = stats
  const sc = scoreColor(healthScore.score)

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="p-10 max-w-7xl mx-auto">

      {/* ── PAGE HEADER ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector />
          <Link href="/expenses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
            <span>+</span> Agregar gasto
          </Link>
        </div>
      </div>

      {/* ── HERO CARD ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="flex divide-x divide-gray-100">

          {/* Available balance */}
          <div className="p-8 shrink-0" style={{ minWidth: 280 }}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Disponible este mes
            </p>
            <p className="font-black text-gray-900 leading-none mb-3"
              style={{ fontSize: 40, letterSpacing: '-1.5px' }}>
              {formatCurrency(stats.available)}
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-5"
              style={{
                backgroundColor: healthScore.score >= 80 ? '#ECFDF5' : healthScore.score >= 60 ? '#F0FDF4' : healthScore.score >= 40 ? '#FFFBEB' : '#FEF2F2',
                color: sc,
                border: `1px solid ${sc}30`,
              }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sc, display: 'inline-block' }} />
              {healthScore.label}
            </span>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">Día {dayOfMonth} de {daysInMonth}</span>
                <span className="text-xs font-semibold text-gray-500">{monthPct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden" style={{ width: 220 }}>
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${monthPct}%` }} />
              </div>
            </div>
          </div>

          {/* Income / Expenses / Savings */}
          {[
            { label: 'Ingresos',   value: stats.totalIncome,    color: '#10B981', bg: '#ECFDF5', icon: '↑', sub: `${stats.categoryData.length} categorías` },
            { label: 'Gastos',     value: stats.totalExpenses,  color: '#EF4444', bg: '#FEF2F2', icon: '↓', sub: `de ${formatCurrency(stats.totalIncome)}` },
            { label: 'Ahorro',     value: Math.max(stats.available, 0), color: '#3B82F6', bg: '#EFF6FF', icon: '🐖', sub: `${stats.savingsRate}% de ingresos` },
          ].map(item => (
            <div key={item.label} className="flex-1 p-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: item.bg, color: item.color }}>
                  {item.icon}
                </div>
                <span className="text-xs font-semibold text-gray-500">{item.label}</span>
              </div>
              <p className="text-2xl font-extrabold leading-none mb-1 tracking-tight"
                style={{ color: item.color }}>
                {formatCurrency(item.value)}
              </p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI ROW ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">

        {/* Today */}
        <div className="bg-white rounded-xl border border-gray-200 p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Gasto hoy</p>
          <p className="text-2xl font-extrabold tracking-tight mb-1"
            style={{ color: stats.todayExpenses > 0 ? '#EF4444' : '#111827' }}>
            {formatCurrency(stats.todayExpenses)}
          </p>
          <p className="text-xs text-gray-400">
            {stats.yesterdayExpenses > 0
              ? `${stats.todayExpenses > stats.yesterdayExpenses ? '↑' : '↓'} vs ayer (${formatCurrency(stats.yesterdayExpenses)})`
              : 'Sin datos de ayer'}
          </p>
        </div>

        {/* Ritmo */}
        <div className="bg-white rounded-xl border border-gray-200 p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ritmo de gasto</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: projection.isOverBudget ? '#FEF2F2' : '#ECFDF5',
                color: projection.isOverBudget ? '#EF4444' : '#10B981',
              }}>
              {projection.isOverBudget ? 'Alto' : 'Normal'}
            </span>
          </div>
          <p className="text-xs text-gray-400">Prom. {formatCurrency(projection.dailyAvg)}/día</p>
        </div>

        {/* Proyección */}
        <div className="bg-white rounded-xl border border-gray-200 p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Proyección fin de mes</p>
          <p className="text-2xl font-extrabold tracking-tight mb-1"
            style={{ color: projection.isOverBudget ? '#EF4444' : '#111827' }}>
            {formatCurrency(projection.projectedExpenses)}
          </p>
          <p className="text-xs" style={{ color: projection.isOverBudget ? '#EF4444' : '#6B7280' }}>
            {projection.isOverBudget ? '⚠ Superarías tus ingresos' : '✓ Dentro del presupuesto'}
          </p>
        </div>

        {/* Score */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <ScoreRing score={healthScore.score} color={sc} />
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Score financiero</p>
            <p className="text-base font-bold" style={{ color: sc }}>{healthScore.label}</p>
            <p className="text-xs text-gray-400">de 100 puntos</p>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────────────── */}
      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: '1fr 380px' }}>

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-5">

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Gastos por categoría</h3>
                <p className="text-xs text-gray-400 mt-0.5">Este mes</p>
              </div>
              <Link href="/expenses" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                Ver todos →
              </Link>
            </div>
            {stats.categoryData.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-gray-400">Sin gastos este mes</p>
                <Link href="/expenses" className="inline-block mt-3 text-xs font-semibold text-emerald-600">
                  Registrar primer gasto →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.categoryData.slice(0, 6).map(cat => (
                  <div key={cat.category_id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: `${cat.color}18` }}>
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 truncate">{cat.name}</span>
                        <span className="text-sm font-bold text-red-500 shrink-0 ml-2">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 w-8 text-right">{cat.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cashflow chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Flujo de caja</h3>
                <p className="text-xs text-gray-400 mt-0.5">Últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                  Ingresos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-red-300 inline-block" />
                  Gastos
                </span>
              </div>
            </div>
            <CashflowChart data={stats.monthlyData} />
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-5">

          {/* Goals */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Metas de ahorro</h3>
                <p className="text-xs text-gray-400 mt-0.5">{stats.goalList.length} activas</p>
              </div>
              <Link href="/goals" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Ver todas →
              </Link>
            </div>
            {stats.goalList.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-2xl mb-1">🎯</p>
                <p className="text-xs text-gray-400 mb-3">Crea tu primera meta</p>
                <Link href="/goals"
                  className="inline-block text-xs font-semibold px-3 py-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                  + Nueva meta
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.goalList.slice(0, 3).map(g => (
                  <div key={g.id}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{g.icon}</span>
                      <span className="text-sm font-medium text-gray-700 flex-1 truncate">{g.name}</span>
                      <span className="text-xs font-bold" style={{ color: g.color }}>{g.pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${g.pct}%`, backgroundColor: g.color }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">{formatCurrency(g.current)}</span>
                      <span className="text-xs text-gray-400">{formatCurrency(g.target)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Debts */}
          {stats.debtCount > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Deudas activas</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{stats.debtCount} en curso</p>
                </div>
                <Link href="/debts" className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                  Gestionar →
                </Link>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#FFFBEB' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: '#FEF3C7' }}>
                  💳
                </div>
                <div>
                  <p className="text-xs text-amber-700 font-medium">Total pendiente</p>
                  <p className="text-xl font-extrabold tracking-tight" style={{ color: '#D97706' }}>
                    {formatCurrency(stats.debtTotal)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI Teaser */}
          <div className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', border: '1px solid #DDD6FE' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                ✦
              </div>
              <div>
                <p className="text-sm font-bold text-violet-900">Asistente Fin</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="text-xs text-violet-600">En línea</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-violet-800 font-medium mb-4">
              ¿Cómo puedo ayudarte con tus finanzas hoy?
            </p>
            <div className="space-y-2 mb-4">
              {['¿Cómo voy este mes?', '¿En qué gasto más?', '¿Cuándo llego a mi meta?'].map(q => (
                <Link key={q} href="/ai"
                  className="block text-xs text-violet-700 bg-white rounded-lg px-3 py-2 font-medium hover:bg-violet-50 transition-colors border border-violet-100">
                  {q}
                </Link>
              ))}
            </div>
            <Link href="/ai"
              className="block text-center text-xs font-bold text-white py-2.5 rounded-xl transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
              Abrir chat con Fin →
            </Link>
          </div>
        </div>
      </div>

      {/* ── RECENT TRANSACTIONS ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Últimos movimientos</h3>
            <p className="text-xs text-gray-400 mt-0.5">Actividad reciente</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/income" className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">Ingresos</Link>
            <Link href="/expenses" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">Ver todos →</Link>
          </div>
        </div>

        {stats.recentTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm font-medium text-gray-500 mb-1">Sin movimientos este mes</p>
            <p className="text-xs text-gray-400 mb-4">Registra tu primer ingreso o gasto</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/income"
                className="text-xs font-semibold px-4 py-2 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                + Ingreso
              </Link>
              <Link href="/expenses"
                className="text-xs font-semibold px-4 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                + Gasto
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(() => {
              const grouped = new Map<string, Transaction[]>()
              stats.recentTransactions.forEach(t => {
                const k = formatRelativeDate(t.date)
                if (!grouped.has(k)) grouped.set(k, [])
                grouped.get(k)!.push(t)
              })
              return Array.from(grouped.entries()).map(([date, txs]) => (
                <div key={date} className="py-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{date}</p>
                  <div className="space-y-1">
                    {txs.map(t => {
                      const isIncome = t.type === 'income'
                      const cat = t.category as { name?: string; icon?: string; color?: string } | null
                      return (
                        <div key={t.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors group">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                            style={{ backgroundColor: isIncome ? '#ECFDF5' : '#FEF2F2' }}>
                            {cat?.icon ?? (isIncome ? '💰' : '💸')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                            <p className="text-xs text-gray-400">{cat?.name ?? (isIncome ? 'Ingreso' : 'Gasto')}</p>
                          </div>
                          <span className="text-sm font-bold shrink-0"
                            style={{ color: isIncome ? '#10B981' : '#EF4444' }}>
                            {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

    </div>
  )
}
