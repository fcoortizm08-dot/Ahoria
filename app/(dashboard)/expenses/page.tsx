'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { MonthSelector } from '@/components/common/MonthSelector'
import type { Transaction, Category } from '@/types'

interface CategoryGroup {
  category: Category | null
  transactions: Transaction[]
  total: number
}

interface InlineForm {
  description: string
  amount: string
  date: string
  notes: string
}

const EMPTY_FORM: InlineForm = {
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function ExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // activeFormCatKey = category id (or 'null' for sin categoría) de la sección con formulario abierto
  const [activeFormCatKey, setActiveFormCatKey] = useState<string | null>(null)
  const [inlineForm, setInlineForm] = useState<InlineForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  // qué secciones están colapsadas
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
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

  const total = transactions.reduce((s, t) => s + t.amount, 0)

  // Agrupar por categoría
  const groups: CategoryGroup[] = (() => {
    const map = new Map<string, CategoryGroup>()

    transactions.forEach(tx => {
      const key = tx.category_id ?? 'null'
      if (!map.has(key)) {
        map.set(key, { category: tx.category ?? null, transactions: [], total: 0 })
      }
      const g = map.get(key)!
      g.transactions.push(tx)
      g.total += tx.amount
    })

    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  })()

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const openForm = (catKey: string) => {
    setActiveFormCatKey(catKey)
    setInlineForm(EMPTY_FORM)
  }

  const closeForm = () => {
    setActiveFormCatKey(null)
    setInlineForm(EMPTY_FORM)
  }

  const handleSubmit = async (e: React.FormEvent, categoryId: string | null) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'expense',
      description: inlineForm.description,
      amount: Number(inlineForm.amount),
      category_id: categoryId,
      date: inlineForm.date,
      notes: inlineForm.notes || null,
      is_recurring: false,
    })

    if (error) { addToast('Error al guardar el gasto', 'error') }
    else {
      addToast('Gasto registrado correctamente')
      closeForm()
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (!error) { addToast('Gasto eliminado'); fetchData() }
    else addToast('Error al eliminar', 'error')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-white">Gastos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Total: <span className="text-red-400 font-semibold">{formatCurrency(total)}</span>
            {groups.length > 0 && <> · {groups.length} categoría{groups.length !== 1 ? 's' : ''}</>}
          </p>
        </div>
        <MonthSelector />
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-[#0d1117] rounded-xl border border-[#1e2d45] animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-12 text-center">
          <p className="text-3xl mb-3">💸</p>
          <p className="text-slate-400 text-sm mb-3">No hay gastos en este mes.</p>
          {/* Botones de categorías para agregar rápido */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {categories.slice(0, 6).map(cat => (
              <button
                key={cat.id}
                onClick={() => { openForm(cat.id); setCollapsed(new Set()) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] border border-[#1e2d45] text-xs text-slate-300 hover:border-blue-500/50 hover:text-white transition-all"
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(group => {
            const catKey = group.category?.id ?? 'null'
            const isCollapsed = collapsed.has(catKey)
            const isFormOpen = activeFormCatKey === catKey
            const pct = total > 0 ? Math.round((group.total / total) * 100) : 0

            return (
              <div key={catKey} className="bg-[#0d1117] rounded-xl border border-[#1e2d45] overflow-hidden">
                {/* Cabecera de categoría */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleCollapse(catKey)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: (group.category?.color ?? '#ef4444') + '20' }}
                    >
                      {group.category?.icon ?? '📦'}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {group.category?.name ?? 'Sin categoría'}
                        </span>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          {group.transactions.length} gasto{group.transactions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {/* Barra de progreso proporcional */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-[#1e2d45] rounded-full h-1">
                          <div
                            className="h-1 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: group.category?.color ?? '#ef4444' }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">{pct}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-extrabold text-red-400">{formatCurrency(group.total)}</span>
                      <span className={`text-slate-500 text-xs transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>▾</span>
                    </div>
                  </button>

                  {/* Botón agregar en esta categoría */}
                  <button
                    onClick={() => isFormOpen ? closeForm() : openForm(catKey)}
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all ${isFormOpen ? 'bg-blue-500/20 text-blue-400' : 'bg-[#1e2d45] text-slate-400 hover:bg-blue-500/20 hover:text-blue-400'}`}
                    title={`Agregar gasto en ${group.category?.name ?? 'Sin categoría'}`}
                  >
                    +
                  </button>
                </div>

                {/* Formulario inline */}
                {isFormOpen && (
                  <form
                    onSubmit={e => handleSubmit(e, group.category?.id ?? null)}
                    className="border-t border-[#1e2d45] bg-[#111827]/50 px-4 py-4 flex flex-col gap-3"
                  >
                    <p className="text-xs font-semibold text-slate-400">
                      Nuevo gasto en <span style={{ color: group.category?.color ?? '#ef4444' }}>{group.category?.name ?? 'Sin categoría'}</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <input
                          value={inlineForm.description}
                          onChange={e => setInlineForm(f => ({ ...f, description: e.target.value }))}
                          required
                          placeholder="Descripción"
                          autoFocus
                          className="w-full bg-[#0d1117] border border-[#1e2d45] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={inlineForm.amount}
                          onChange={e => setInlineForm(f => ({ ...f, amount: e.target.value }))}
                          required
                          min="1"
                          placeholder="Monto (CLP)"
                          className="w-full bg-[#0d1117] border border-[#1e2d45] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={inlineForm.date}
                          onChange={e => setInlineForm(f => ({ ...f, date: e.target.value }))}
                          required
                          className="w-full bg-[#0d1117] border border-[#1e2d45] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={closeForm} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-all">Cancelar</button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-4 py-1.5 text-xs transition-all disabled:opacity-60"
                      >
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de transacciones */}
                {!isCollapsed && (
                  <div className="border-t border-[#1e2d45]">
                    {group.transactions.map((tx, idx) => (
                      <div
                        key={tx.id}
                        className={`flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] ${idx < group.transactions.length - 1 ? 'border-b border-[#1e2d45]' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{tx.description}</p>
                          {tx.notes && <p className="text-[10px] text-slate-500 truncate">{tx.notes}</p>}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                          <span className="text-[11px] text-slate-500 hidden sm:block">{formatDate(tx.date)}</span>
                          <span className="text-sm font-semibold text-red-400">{formatCurrency(tx.amount)}</span>
                          <button onClick={() => handleDelete(tx.id)} className="text-slate-600 hover:text-red-400 text-xs transition-all">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Sección para agregar en categoría nueva */}
          <div className="bg-[#0d1117] rounded-xl border border-dashed border-[#1e2d45] overflow-hidden">
            {activeFormCatKey === 'new' ? (
              <form
                onSubmit={e => {
                  const cat = categories.find(c => c.id === (e.currentTarget.querySelector('[name=cat]') as HTMLSelectElement)?.value)
                  return handleSubmit(e, cat?.id ?? null)
                }}
                className="px-4 py-4 flex flex-col gap-3"
              >
                <p className="text-xs font-semibold text-slate-400">Nuevo gasto</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <input
                      value={inlineForm.description}
                      onChange={e => setInlineForm(f => ({ ...f, description: e.target.value }))}
                      required placeholder="Descripción" autoFocus
                      className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="number" value={inlineForm.amount}
                      onChange={e => setInlineForm(f => ({ ...f, amount: e.target.value }))}
                      required min="1" placeholder="Monto (CLP)"
                      className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="date" value={inlineForm.date}
                      onChange={e => setInlineForm(f => ({ ...f, date: e.target.value }))}
                      required
                      className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      name="cat"
                      className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={closeForm} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-all">Cancelar</button>
                  <button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-4 py-1.5 text-xs transition-all disabled:opacity-60">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => openForm('new')}
                className="w-full flex items-center gap-2 px-4 py-3 text-slate-500 hover:text-slate-300 text-sm transition-all"
              >
                <span className="text-lg">+</span> Agregar gasto en otra categoría
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
