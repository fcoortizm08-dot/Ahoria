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

const EMPTY_FORM = {
  description: '', amount: '',
  date: new Date().toISOString().split('T')[0],
  category_id: '', notes: '',
}

export default function IncomePage() {
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
        .eq('user_id', user.id).eq('type', 'income').is('deleted_at', null)
        .gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('categories').select('*').eq('type', 'income')
        .or(`user_id.eq.${user.id},is_system.eq.true`).order('name'),
    ])
    setTransactions(txs ?? [])
    setCategories(cats ?? [])
    setIsLoading(false)
  }, [activeYear, activeMonth])

  useEffect(() => { fetchData() }, [fetchData])

  const total      = transactions.reduce((s, t) => s + t.amount, 0)
  const recurring  = transactions.filter(t => t.is_recurring).reduce((s, t) => s + t.amount, 0)
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate()
  const dailyAvg   = daysInMonth > 0 ? total / daysInMonth : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id, type: 'income',
      description: form.description, amount: Number(form.amount),
      category_id: form.category_id || null, date: form.date,
      notes: form.notes || null, is_recurring: false,
    })
    if (error) addToast('Error al guardar el ingreso', 'error')
    else {
      addToast('Ingreso registrado ✓')
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
    if (!error) { addToast('Ingreso eliminado'); fetchData() }
    else addToast('Error al eliminar', 'error')
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Ingresos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {transactions.length} movimiento{transactions.length !== 1 ? 's' : ''} este mes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector />
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
          >
            + Agregar ingreso
          </button>
        </div>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total del mes',         value: formatCurrency(total),              color: '#10B981', sub: `${transactions.length} ingresos` },
          { label: 'Ingresos recurrentes',  value: formatCurrency(recurring),          color: '#6B7280', sub: recurring > 0 ? `${Math.round((recurring/total)*100)}% del total` : 'Ninguno aún' },
          { label: 'Promedio diario',       value: formatCurrency(Math.round(dailyAvg)), color: '#6B7280', sub: `en ${daysInMonth} días` },
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
              <h2 className="text-base font-bold text-gray-900">Nuevo ingreso</h2>
              <p className="text-xs text-gray-400 mt-0.5">Completa los datos del ingreso</p>
            </div>
            <button onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Descripción *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required placeholder="Ej: Salario mensual, Proyecto freelance..."
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Monto (CLP) *</label>
                <input
                  type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required min="1" placeholder="1.000.000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha *</label>
                <input
                  type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Categoría</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors"
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors"
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
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                {saving ? 'Guardando...' : 'Guardar ingreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TRANSACTION LIST ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-5xl mb-4">💰</p>
            <p className="text-base font-bold text-gray-700 mb-1">Sin ingresos este mes</p>
            <p className="text-sm text-gray-400 mb-6">Registra tu primer ingreso para llevar el control</p>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              + Agregar el primero
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
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
                          style={{ backgroundColor: (cat?.color ?? '#10B981') + '18' }}>
                          {cat?.icon ?? '💰'}
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
                      <span className="text-sm font-bold text-emerald-600">+{formatCurrency(tx.amount)}</span>
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
                <td colSpan={3} className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Total del mes
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-base font-extrabold text-emerald-600">{formatCurrency(total)}</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
