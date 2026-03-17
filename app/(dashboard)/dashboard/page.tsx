'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getGreeting } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Transaction } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface MonthlyData { month: string; ingresos: number; gastos: number }
interface CategoryData { name: string; value: number; color: string; icon: string }
interface Stats {
  totalIncome: number; totalExpenses: number; balance: number; savingsRate: number
  recentTransactions: Transaction[]
  monthlyData: MonthlyData[]
  categoryData: CategoryData[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { profile } = useFinanceStore()

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const { data: allTxs } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('date', sixMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    const txs = allTxs ?? []
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const current = txs.filter(t => t.date >= monthStart && t.date <= monthEnd)

    const totalIncome = current.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = current.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0

    const monthlyData: MonthlyData[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const s = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      const m = txs.filter(t => t.date >= s && t.date <= e)
      monthlyData.push({
        month: MONTHS_SHORT[d.getMonth()],
        ingresos: m.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        gastos: m.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      })
    }

    const catMap: Record<string, { amount: number; color: string; icon: string }> = {}
    current.filter(t => t.type === 'expense').forEach(t => {
      const key = t.category?.name ?? 'Sin categoría'
      if (!catMap[key]) catMap[key] = { amount: 0, color: t.category?.color ?? '#6b7280', icon: t.category?.icon ?? '📦' }
      catMap[key].amount += t.amount
    })
    const categoryData: CategoryData[] = Object.entries(catMap)
      .map(([name, v]) => ({ name, value: v.amount, color: v.color, icon: v.icon }))
      .sort((a, b) => b.value - a.value).slice(0, 6)

    setStats({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses, savingsRate, recentTransactions: txs.slice(0, 6), monthlyData, categoryData })
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const greeting = getGreeting()
  const name = profile?.full_name?.split(' ')[0] ?? ''
  const incomeGoal = profile?.monthly_income_goal ?? 0
  const savingsGoal = profile?.savings_goal_pct ?? 30

  if (isLoading) return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-52 bg-[#1e2d45] rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-[#0d1117] rounded-xl border border-[#1e2d45]" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-[#0d1117] rounded-xl border border-[#1e2d45]" />
        <div className="h-64 bg-[#0d1117] rounded-xl border border-[#1e2d45]" />
      </div>
    </div>
  )

  if (!stats) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-white">{greeting}{name ? `, ${name}` : ''} 👋</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Resumen de {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Ingresos" value={formatCurrency(stats.totalIncome)} sub={incomeGoal > 0 ? `Meta: ${formatCurrency(incomeGoal)}` : undefined} color="text-emerald-400" bg="bg-emerald-500/10" icon="↑" />
        <StatCard label="Gastos" value={formatCurrency(stats.totalExpenses)} color="text-red-400" bg="bg-red-500/10" icon="↓" />
        <StatCard label="Balance" value={formatCurrency(stats.balance)} color={stats.balance >= 0 ? 'text-blue-400' : 'text-red-400'} bg={stats.balance >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'} icon="≈" />
        <StatCard label="Tasa de ahorro" value={`${stats.savingsRate}%`} sub={`Meta: ${savingsGoal}%`} color={stats.savingsRate >= savingsGoal ? 'text-emerald-400' : 'text-amber-400'} bg={stats.savingsRate >= savingsGoal ? 'bg-emerald-500/10' : 'bg-amber-500/10'} icon="◎" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Evolución últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.monthlyData} barGap={4} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
              <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1e2d45', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#fff', fontWeight: 600 }}
                formatter={(v: unknown, n: unknown) => [formatCurrency(Number(v)), n === 'ingresos' ? 'Ingresos' : 'Gastos']} />
              <Bar dataKey="ingresos" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="gastos" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Ingresos</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Gastos</span>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Gastos por categoría este mes</h2>
          {stats.categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">Sin gastos registrados</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={stats.categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                    {stats.categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1e2d45', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: unknown) => [formatCurrency(Number(v))]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                {stats.categoryData.map((c, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    {c.icon} {c.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Transacciones recientes</h2>
        {stats.recentTransactions.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay transacciones recientes.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[#1e2d45]">
            {stats.recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: (tx.category?.color ?? '#6b7280') + '20' }}>
                    {tx.category?.icon ?? (tx.type === 'income' ? '↑' : '↓')}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{tx.description}</p>
                    <p className="text-[10px] text-slate-500">{tx.category?.name ?? '—'} · {new Date(tx.date + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, bg, icon }: { label: string; value: string; sub?: string; color: string; bg: string; icon: string }) {
  return (
    <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-base ${color}`}>{icon}</div>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className={`text-lg font-extrabold ${color} leading-tight`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
