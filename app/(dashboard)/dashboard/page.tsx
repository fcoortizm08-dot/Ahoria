'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getGreeting, getCurrentMonthRange } from '@/lib/utils'
import type { Transaction, Debt, Goal } from '@/types'

interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  activeDebts: number
  activeGoals: number
  recentTransactions: Transaction[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    activeDebts: 0,
    activeGoals: 0,
    recentTransactions: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { start, end } = getCurrentMonthRange()

      const [{ data: transactions }, { data: debts }, { data: goals }] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: false }),
        supabase
          .from('debts')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active'),
      ])

      const txs = transactions ?? []
      const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      setStats({
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        activeDebts: (debts ?? []).length,
        activeGoals: (goals ?? []).length,
        recentTransactions: txs.slice(0, 5),
      })
      setIsLoading(false)
    }
    fetchStats()
  }, [])

  const greeting = getGreeting()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-white">{greeting} 👋</h1>
        <p className="text-slate-400 text-sm mt-0.5">Aquí está tu resumen financiero de este mes</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Ingresos del mes"
            value={formatCurrency(stats.totalIncome)}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
            icon="↑"
          />
          <StatCard
            label="Gastos del mes"
            value={formatCurrency(stats.totalExpenses)}
            color="text-red-400"
            bg="bg-red-500/10"
            icon="↓"
          />
          <StatCard
            label="Balance"
            value={formatCurrency(stats.balance)}
            color={stats.balance >= 0 ? 'text-blue-400' : 'text-red-400'}
            bg={stats.balance >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'}
            icon="≈"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Transacciones recientes</h2>
          {stats.recentTransactions.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay transacciones este mes.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-[#1e2d45] last:border-0">
                  <div>
                    <p className="text-xs font-medium text-white">{tx.description}</p>
                    <p className="text-[10px] text-slate-500">{tx.date}</p>
                  </div>
                  <span className={`text-xs font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">Deudas activas</h2>
            <p className="text-3xl font-extrabold text-white">{stats.activeDebts}</p>
            <p className="text-xs text-slate-500 mt-0.5">deudas en seguimiento</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">Metas activas</h2>
            <p className="text-3xl font-extrabold text-white">{stats.activeGoals}</p>
            <p className="text-xs text-slate-500 mt-0.5">metas en progreso</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, bg, icon }: {
  label: string
  value: string
  color: string
  bg: string
  icon: string
}) {
  return (
    <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center text-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-xl font-extrabold ${color}`}>{value}</p>
      </div>
    </div>
  )
}
