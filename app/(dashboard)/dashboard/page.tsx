'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatRelativeDate, getGreeting, calculateHealthScore, calculateMonthProjection, generateAutoInsights, getDaysInMonth } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { HealthScoreCard } from '@/components/common/HealthScoreCard'
import { InsightCard } from '@/components/common/InsightCard'
import { StreakBadge } from '@/components/common/StreakBadge'
import { MonthSelector } from '@/components/common/MonthSelector'
import type { Transaction, CategoryExpense, MonthlyData, HealthScoreData, MonthProjection, Streak } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface Stats {
  totalIncome: number
  totalExpenses: number
  balance: number
  savingsRate: number
  available: number
  healthScore: HealthScoreData
  projection: MonthProjection
  recentTransactions: Transaction[]
  monthlyData: MonthlyData[]
  categoryData: CategoryExpense[]
  streak: Streak | null
  debtCount: number
  hasGoals: boolean
}

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
    const monthEnd = new Date(activeYear, activeMonth + 1, 0).toISOString().split('T')[0]

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
      supabase.from('debts').select('id').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('goals').select('id').eq('user_id', user.id).eq('status', 'active'),
    ])

    const txs = allTxs ?? []
    const monthTxs = txs.filter(t => t.date >= monthStart && t.date <= monthEnd)

    const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const balance = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
    const available = totalIncome - totalExpenses
    const debtCount = debts?.length ?? 0
    const hasGoals = (goals?.length ?? 0) > 0

    // Health Score
    const healthScore = calculateHealthScore({
      totalIncome, totalExpenses,
      hasActiveDebts: debtCount > 0,
      debtCount,
      hasGoals,
      streakDays: streakData?.current_streak ?? 0,
    })

    // Proyección
    const projection = calculateMonthProjection({ totalExpenses, totalIncome, year: activeYear, month: activeMonth })

    // Últimas transacciones (6)
    const recentTransactions = monthTxs.slice(0, 6)

    // Datos de últimos 6 meses
    const monthlyData: MonthlyData[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mStart = d.toISOString().split('T')[0]
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      const mTxs = txs.filter(t => t.date >= mStart && t.date <= mEnd)
      const inc = mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const exp = mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      monthlyData.push({ month: MONTHS_SHORT[d.getMonth()], income: inc, expenses: exp, savings: Math.max(0, inc - exp) })
    }

    // Gastos por categoría
    const catMap = new Map<string, { name: string; amount: number; color: string; icon: string; budget: number | null; category_id: string }>()
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const key = t.category?.name ?? 'Sin categoría'
      const existing = catMap.get(key)
      if (existing) { existing.amount += t.amount }
      else catMap.set(key, {
        name: key, amount: t.amount,
        color: t.category?.color ?? '#94a3b8',
        icon: t.category?.icon ?? '📦',
        budget: t.category?.monthly_budget ?? null,
        category_id: t.category_id ?? '',
      })
    })
    const categoryData: CategoryExpense[] = Array.from(catMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map(c => ({ ...c, percentage: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0 }))

    setStats({
      totalIncome, totalExpenses, balance, savingsRate, available,
      healthScore, projection, recentTransactions,
      monthlyData, categoryData,
      streak: streakData ?? null,
      debtCount, hasGoals,
    })
    setIsLoading(false)
  }, [activeYear, activeMonth])

  useEffect(() => { fetchStats() }, [fetchStats])

  const autoInsights = stats ? generateAutoInsights({
    totalIncome: stats.totalIncome,
    totalExpenses: stats.totalExpenses,
    categoryData: stats.categoryData,
    projection: stats.projection,
    healthScore: stats.healthScore,
    streakDays: stats.streak?.current_streak ?? 0,
  }) : []

  const daysLeft = stats ? getDaysInMonth(activeYear, activeMonth) - stats.projection.daysElapsed : 0
  const monthPct = stats && stats.totalIncome > 0 ? Math.round((stats.totalExpenses / stats.totalIncome) * 100) : 0

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-white">
            {getGreeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats?.streak && stats.streak.current_streak > 0 && (
            <StreakBadge currentStreak={stats.streak.current_streak} longestStreak={stats.streak.longest_streak} />
          )}
          <MonthSelector />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#0d1117] rounded-2xl border border-[#1e2d45] animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* HERO: Health Score + Disponible */}
          <HealthScoreCard
            data={stats.healthScore}
            available={stats.available}
            monthPct={monthPct}
            projection={{
              isOverBudget: stats.projection.isOverBudget,
              projectedExpenses: stats.projection.projectedExpenses,
              daysLeft,
            }}
          />

          {/* Insight automático */}
          {autoInsights.length > 0 && !dismissedInsight && (
            <InsightCard
              {...autoInsights[0]}
              onDismiss={() => setDismissedInsight(true)}
            />
          )}

          {/* KPIs secundarios */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-1">Ingresos del mes</p>
              <p className="text-xl font-extrabold text-green-400">{formatCurrency(stats.totalIncome)}</p>
              {stats.savingsRate > 0 && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Ahorro: <span className="text-green-400 font-semibold">{Math.round(stats.savingsRate)}%</span>
                </p>
              )}
            </div>
            <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-1">Gastos del mes</p>
              <p className="text-xl font-extrabold text-red-400">{formatCurrency(stats.totalExpenses)}</p>
              {stats.projection.dailyAvg > 0 && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Promedio: <span className="text-slate-300 font-semibold">{formatCurrency(stats.projection.dailyAvg)}/día</span>
                </p>
              )}
            </div>
          </div>

          {/* Deudas y Metas activas */}
          {(stats.debtCount > 0 || stats.hasGoals) && (
            <div className="grid grid-cols-2 gap-3">
              {stats.debtCount > 0 && (
                <a href="/debts" className="bg-[#0d1117] border border-[#1e2d45] hover:border-red-500/30 rounded-2xl p-4 transition-all group">
                  <p className="text-xs text-slate-500 mb-1">Deudas activas</p>
                  <p className="text-2xl font-extrabold text-red-400">{stats.debtCount}</p>
                  <p className="text-[10px] text-slate-500 mt-1 group-hover:text-slate-300 transition-all">Ver deudas →</p>
                </a>
              )}
              {stats.hasGoals && (
                <a href="/goals" className="bg-[#0d1117] border border-[#1e2d45] hover:border-blue-500/30 rounded-2xl p-4 transition-all group">
                  <p className="text-xs text-slate-500 mb-1">Metas activas</p>
                  <p className="text-2xl font-extrabold text-blue-400">🎯</p>
                  <p className="text-[10px] text-slate-500 mt-1 group-hover:text-slate-300 transition-all">Ver metas →</p>
                </a>
              )}
            </div>
          )}

          {/* Gráfico: Últimos 6 meses */}
          {stats.monthlyData.some(m => m.income > 0 || m.expenses > 0) && (
            <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white mb-4">Últimos 6 meses</h2>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={stats.monthlyData} barSize={10} barGap={2}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#0d1117', border: '1px solid #1e2d45', borderRadius: 12, fontSize: 11 }}
                    formatter={(v: unknown) => formatCurrency(Number(v))}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Ingresos" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Ingresos
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Gastos
                </div>
              </div>
            </div>
          )}

          {/* Top categorías del mes */}
          {stats.categoryData.length > 0 && (
            <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Top gastos del mes</h2>
                <a href="/expenses" className="text-xs text-blue-400 hover:text-blue-300 transition-all">Ver todos →</a>
              </div>
              <div className="flex flex-col gap-3">
                {stats.categoryData.slice(0, 5).map(cat => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: cat.color + '20' }}>
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-300 truncate">{cat.name}</span>
                        <span className="text-xs font-semibold text-white ml-2 flex-shrink-0">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${cat.percentage}%`, background: cat.color }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 flex-shrink-0 w-8 text-right">{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transacciones recientes */}
          {stats.recentTransactions.length > 0 && (
            <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold text-white">Recientes</h2>
                <a href="/expenses" className="text-xs text-blue-400 hover:text-blue-300 transition-all">Ver todos →</a>
              </div>
              {stats.recentTransactions.map((tx, i) => (
                <div key={tx.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] ${i < stats.recentTransactions.length - 1 ? 'border-b border-[#1e2d45]' : ''}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: (tx.category?.color ?? (tx.type === 'income' ? '#22c55e' : '#ef4444')) + '20' }}>
                    {tx.category?.icon ?? (tx.type === 'income' ? '💰' : '💸')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{tx.description}</p>
                    <p className="text-[10px] text-slate-500">{formatRelativeDate(tx.date)}</p>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Estado vacío */}
          {stats.totalIncome === 0 && stats.totalExpenses === 0 && (
            <div className="bg-[#0d1117] border border-dashed border-[#1e2d45] rounded-2xl p-10 text-center">
              <p className="text-4xl mb-3">🚀</p>
              <p className="text-white font-semibold mb-1">¡Empieza a registrar!</p>
              <p className="text-slate-500 text-sm">Usa el botón <span className="text-blue-400 font-bold">+</span> para registrar tu primer ingreso o gasto.</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
