'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { MonthSelector } from '@/components/common/MonthSelector'
import type { Transaction, Category } from '@/types'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
}

interface CategoryGroup {
  category: Category | null
  transactions: Transaction[]
  total: number
  pct: number
}

const EMPTY_FORM = {
  description: '', amount: '',
  date: new Date().toISOString().split('T')[0],
  category_id: '', notes: '',
}

export default function ExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories]     = useState<Category[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const { activeYear, activeMonth, addToast } = useFinanceStore()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const start = new Date(activeYear, activeMonth, 1).toISOString().split('T')[0]
    const end   = new Date(activeYear, activeMonth + 1, 0).toISOString().split('T')[0]
    const [{ data: txs }, { data: cats }] = await Promise.all([
      supabase.from('transactions').select('*, category:categories(*)')
        .eq('user_id', user.id).eq('type', 'expense').is('deleted_at', null)
        .gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('categories').select('*').eq('type', 'expense')
        .or(`user_id.eq.${user.id},is_system.eq.true`).order('name'),
    ])
    setTransactions(txs ?? [])
    setCategories(cats ?? [])
    setIsLoading(false)
  }, [activeYear, activeMonth])

  useEffect(() => { fetchData() }, [fetchData])

  const total       = transactions.reduce((s, t) => s + t.amount, 0)
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate()
  const dailyAvg    = daysInMonth > 0 ? total / daysInMonth : 0

  const groups: CategoryGroup[] = (() => {
    const map = new Map<string, CategoryGroup>()
    transactions.forEach(tx => {
      const key = tx.category_id ?? 'null'
      if (!map.has(key)) map.set(key, { category: tx.category ?? null, transactions: [], total: 0, pct: 0 })
      const g = map.get(key)!
      g.transactions.push(tx)
      g.total += tx.amount
    })
    return Array.from(map.values())
      .map(g => ({ ...g, pct: total > 0 ? Math.round((g.total / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id, type: 'expense',
      description: form.description, amount: Number(form.amount),
      category_id: form.category_id || null, date: form.date,
      notes: form.notes || null, is_recurring: false,
    })
    if (error) addToast('Error al guardar el gasto', 'error')
    else {
      addToast('Gasto registrado ✓')
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('transactions')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (!error) { addToast('Gasto eliminado'); fetchData() }
    else addToast('Error al eliminar', 'error')
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Gastos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {groups.length} categoría{groups.length !== 1 ? 's' : ''} · {transactions.length} movimiento{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector />
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}
          >
            + Agregar gasto
          </button>
        </div>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total del mes',     value: formatCurrency(total),                color: '#EF4444', sub: `${transactions.length} gastos registrados` },
          { label: 'Categorías activas', value: `${groups.length}`,                  color: '#111827', sub: groups.length > 0 ? `Mayor: ${groups[0]?.category?.name ?? 'Sin categoría'}` : 'Sin gastos aún' },
          { label: 'Promedio diario',   value: formatCurrency(Math.round(dailyAvg)), color: '#6B7280', sub: `en ${daysInMonth} días` },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{k.label}</p>
            <p className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── ADD FORM ───────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Nuevo gasto</h2>
              <p className="text-xs text-gray-400 mt-0.5">Completa los datos del gasto</p>
            </div>
            <button onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Descripción *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required placeholder="Ej: Supermercado, Uber, Netflix..." autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Monto (CLP) *</label>
                <input
                  type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required min="1" placeholder="15.000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha *</label>
                <input
                  type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Categoría</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-red-400 transition-colors"
                >
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notas</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                {saving ? 'Guardando...' : 'Guardar gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p className="text-5xl mb-4">💸</p>
          <p className="text-base font-bold text-gray-700 mb-1">Sin gastos este mes</p>
          <p className="text-sm text-gray-400 mb-6">Empieza a registrar tus gastos por categoría</p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {categories.slice(0, 6).map(c => (
              <button key={c.id}
                onClick={() => { setForm(f => ({ ...f, category_id: c.id })); setShowForm(true) }}
                className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg"
            style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
            + Registrar primer gasto
          </button>
        </div>
      ) : (
        <>
          {/* ── CATEGORY BREAKDOWN ────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Distribución por categoría</h3>
                <p className="text-xs text-gray-400 mt-0.5">{groups.length} categorías activas</p>
              </div>
              <span className="text-sm font-bold text-red-500">{formatCurrency(total)}</span>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {groups.map(g => {
                const color = g.category?.color ?? '#EF4444'
                return (
                  <div key={g.category?.id ?? 'null'}
                    className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                    style={{ backgroundColor: color + '06' }}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: color + '20' }}>
                        {g.category?.icon ?? '📦'}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 truncate flex-1">
                        {g.category?.name ?? 'Sin categoría'}
                      </span>
                    </div>
                    <p className="text-base font-extrabold text-gray-900 mb-2">{formatCurrency(g.total)}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full" style={{ width: `${g.pct}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-xs text-gray-400">{g.pct}% del total</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── TRANSACTION TABLE ─────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Todos los gastos</h3>
              <span className="text-xs text-gray-400">{transactions.length} movimientos</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70">
                  {['Descripción', 'Categoría', 'Fecha', 'Monto', ''].map((h, i) => (
                    <th key={i}
                      className={`px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider ${i === 3 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(tx => {
                  const cat = tx.category as { name?: string; icon?: string; color?: string } | null
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                            style={{ backgroundColor: (cat?.color ?? '#EF4444') + '18' }}>
                            {cat?.icon ?? '💸'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                            {tx.notes && <p className="text-xs text-gray-400">{tx.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          {cat?.name ?? 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{formatDate(tx.date)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-bold text-red-500">−{formatCurrency(tx.amount)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => handleDelete(tx.id)}
                          className="opacity-0 group-hover:opacity-100 transition-all text-gray-300 hover:text-red-400 text-sm px-2 py-1 rounded">
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/70">
                  <td colSpan={3} className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Total del mes</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-base font-extrabold text-red-500">{formatCurrency(total)}</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
