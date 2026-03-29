import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end   = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .is('deleted_at', null)
      .order('date', { ascending: false })

    const txs = transactions ?? []
    const totalIncome   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const totalSavings  = totalIncome - totalExpenses
    const savingsPercentage = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0

    const { data: debts } = await supabase
      .from('debts')
      .select('current_balance')
      .eq('user_id', user.id)
      .eq('status', 'active')

    const totalDebt = (debts ?? []).reduce((s, d) => s + d.current_balance, 0)

    const expenseMap: Record<string, { amount: number; color: string; icon: string }> = {}
    txs.filter(t => t.type === 'expense').forEach(t => {
      const name  = t.category?.name  ?? 'Sin categoría'
      const color = t.category?.color ?? '#6b7280'
      const icon  = t.category?.icon  ?? '📦'
      if (!expenseMap[name]) expenseMap[name] = { amount: 0, color, icon }
      expenseMap[name].amount += t.amount
    })

    const expensesByCategory = Object.entries(expenseMap)
      .map(([name, { amount, color, icon }]) => ({
        name, amount, color, icon,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)

    const monthlyEvolution = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const mStart = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
      const mEnd   = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0]
      const { data: mTxs } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', mStart)
        .lte('date', mEnd)
        .is('deleted_at', null)
      const mIncome   = (mTxs ?? []).filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0)
      const mExpenses = (mTxs ?? []).filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)
      monthlyEvolution.push({
        month: d.toLocaleDateString('es-CL', { month: 'short' }),
        income: mIncome,
        expenses: mExpenses,
        savings: mIncome - mExpenses,
      })
    }

    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('target_date', { ascending: true })
      .limit(3)

    const { data: activeDebts } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('interest_rate', { ascending: false })
      .limit(3)

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      totalSavings,
      savingsPercentage,
      totalDebt,
      expensesByCategory,
      monthlyEvolution,
      recentTransactions: txs.slice(0, 5),
      goals: goals ?? [],
      debts: activeDebts ?? [],
    })

  } catch (error) {
    console.error('[GET /api/dashboard]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}