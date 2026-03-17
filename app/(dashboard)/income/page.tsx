'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { MonthSelector } from '@/components/common/MonthSelector'
import type { Transaction, Category } from '@/types'

export default function IncomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', category_id: '', date: new Date().toISOString().split('T')[0], notes: '' })
  const [saving, setSaving] = useState(false)
  const { activeYear, activeMonth, addToast } = useFinanceStore()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = new Date(activeYear, activeMonth, 1).toISOString().split('T')[0]
    const end = new Date(activeYear, activeMonth + 1, 0).toISOString().split('T')[0]

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

  const total = transactions.reduce((s, t) => s + t.amount, 0)

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
    if (error) { addToast('Error al guardar el ingreso', 'error') }
    else {
      addToast('Ingreso registrado correctamente')
      setForm({ description: '', amount: '', category_id: '', date: new Date().toISOString().split('T')[0], notes: '' })
      setShowForm(false)
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (!error) { addToast('Ingreso eliminado'); fetchData() }
    else addToast('Error al eliminar', 'error')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-white">Ingresos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Total: <span className="text-emerald-400 font-semibold">{formatCurrency(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthSelector />
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-all">
            + Agregar
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white">Nuevo ingreso</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descripción *</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required placeholder="Ej: Salario" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto (CLP) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required min="1" placeholder="1000000" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Fecha *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Categoría</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-all">
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notas</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-all">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">No hay ingresos en este mes.</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-semibold">+ Agregar el primero</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e2d45]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 hidden sm:table-cell">Categoría</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 hidden sm:table-cell">Fecha</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400">Monto</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-b border-[#1e2d45] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: (tx.category?.color ?? '#10b981') + '20' }}>
                        {tx.category?.icon ?? '↑'}
                      </div>
                      <span className="text-sm text-white">{tx.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell">{tx.category ? `${tx.category.name}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell">{formatDate(tx.date)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-400 text-right">{formatCurrency(tx.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(tx.id)} className="text-slate-600 hover:text-red-400 text-xs transition-all">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#1e2d45]">
                <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-400 hidden sm:table-cell">Total</td>
                <td colSpan={1} className="px-4 py-3 text-xs font-semibold text-slate-400 sm:hidden">Total</td>
                <td className="px-4 py-3 text-sm font-extrabold text-emerald-400 text-right">{formatCurrency(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
