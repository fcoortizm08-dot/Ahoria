'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction, Category } from '@/types'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-3 rounded-xl bg-[#0d1117] p-4 border border-[#1e2d45]">
          <div className="w-8 h-8 rounded-full bg-[#1a2535]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-40 rounded bg-[#1a2535]" />
            <div className="h-2.5 w-24 rounded bg-[#1a2535]" />
          </div>
          <div className="h-4 w-20 rounded bg-[#1a2535]" />
        </div>
      ))}
    </div>
  )
}

export default function ExpensesPage() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories]     = useState<Category[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  const [form, setForm] = useState({
    amount:      '',
    description: '',
    date:        now.toISOString().split('T')[0],
    category_id: '',
  })

  const navigateMonth = (delta: number) => {
    let m = month + delta, y = year
    if (m < 1)  { m = 12; y-- }
    if (m > 12) { m = 1;  y++ }
    setMonth(m); setYear(y)
  }

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/transactions?type=expense&year=${year}&month=${month}`)
      const json = await res.json() as { transactions?: Transaction[] }
      setTransactions(json.transactions ?? [])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('categories').select('id, name, icon, color').eq('type', 'expense').order('name')
      .then(({ data }) => setCategories((data as Category[]) ?? []))
  }, [])

  const total = transactions.reduce((s, t) => s + t.amount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || !form.description || !form.date) {
      setFormError('Completa todos los campos requeridos.')
      return
    }
    setSubmitting(true)
    setFormError('')
    const res = await fetch('/api/transactions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:        'expense',
        amount:      parseFloat(form.amount),
        description: form.description,
        date:        form.date,
        category_id: form.category_id || null,
      }),
    })
    const json = await res.json() as { transaction?: Transaction; error?: string }
    if (!res.ok) {
      setFormError(json.error ?? 'Error al guardar.')
      setSubmitting(false)
      return
    }
    setTransactions(prev => [json.transaction!, ...prev])
    setShowForm(false)
    setForm({ amount: '', description: '', date: now.toISOString().split('T')[0], category_id: '' })
    setSubmitting(false)
  }

  const monthLabel = `${MONTHS[month - 1]} ${year}`

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Gastos</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
        >
          {showForm ? 'Cancelar' : '+ Agregar gasto'}
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigateMonth(-1)} className="rounded-lg border border-[#1e2d45] bg-[#0d1117] px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition">‹</button>
        <span className="text-sm font-medium text-slate-300 capitalize min-w-[130px] text-center">{monthLabel}</span>
        <button onClick={() => navigateMonth(1)} className="rounded-lg border border-[#1e2d45] bg-[#0d1117] px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition">›</button>
      </div>

      {/* KPI */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
        <p className="text-xs text-red-600 mb-0.5">Total del mes</p>
        <p className="text-2xl font-bold text-red-400">{formatCurrency(total)}</p>
        <p className="text-[11px] text-slate-600 mt-0.5">{transactions.length} transacciones</p>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#1e2d45] bg-[#0d1117] p-5 space-y-3"
        >
          <p className="text-sm font-semibold text-white mb-1">Nuevo gasto</p>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Monto (CLP) *</label>
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                placeholder="15000"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Fecha *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Descripción *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Ej: Supermercado"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Categoría</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError('') }}
              className="flex-1 rounded-xl border border-[#1e2d45] py-2 text-xs text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-500 transition disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : 'Guardar gasto'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <Skeleton />
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#1e2d45] bg-[#0d1117] py-14 text-center">
          <p className="text-2xl mb-2">💸</p>
          <p className="text-sm text-slate-500">Sin gastos en {monthLabel}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition underline"
          >
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 rounded-xl border border-[#1e2d45] bg-[#0d1117] px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-sm flex-shrink-0">
                {tx.category?.icon ?? '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{tx.description}</p>
                <p className="text-[11px] text-slate-600">
                  {tx.category?.name ?? 'Sin categoría'} · {formatDate(tx.date)}
                </p>
              </div>
              <span className="text-sm font-semibold text-red-400 flex-shrink-0">
                -{formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
