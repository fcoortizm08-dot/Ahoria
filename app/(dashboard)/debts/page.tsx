'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Debt } from '@/types'

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', total_amount: '', current_balance: '', interest_rate: '', minimum_payment: '', due_day: '' })
  const [saving, setSaving] = useState(false)
  const { addToast } = useFinanceStore()

  const fetchDebts = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('debts').select('*').eq('user_id', user.id).order('status').order('created_at', { ascending: false })
    setDebts(data ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchDebts() }, [fetchDebts])

  const activeDebts = debts.filter(d => d.status === 'active')
  const totalDebt = activeDebts.reduce((s, d) => s + d.current_balance, 0)
  const totalMinPayment = activeDebts.reduce((s, d) => s + d.minimum_payment, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('debts').insert({
      user_id: user.id, name: form.name,
      total_amount: Number(form.total_amount),
      current_balance: Number(form.current_balance),
      interest_rate: Number(form.interest_rate) || 0,
      minimum_payment: Number(form.minimum_payment) || 0,
      due_day: form.due_day ? Number(form.due_day) : null,
      status: 'active',
    })
    if (error) { addToast('Error al guardar la deuda', 'error') }
    else {
      addToast('Deuda registrada correctamente')
      setForm({ name: '', total_amount: '', current_balance: '', interest_rate: '', minimum_payment: '', due_day: '' })
      setShowForm(false)
      fetchDebts()
    }
    setSaving(false)
  }

  const handleMarkPaid = async (id: string) => {
    const supabase = createClient()
    await supabase.from('debts').update({ status: 'paid', current_balance: 0, updated_at: new Date().toISOString() }).eq('id', id)
    addToast('¡Deuda marcada como pagada! 🎉')
    fetchDebts()
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('debts').delete().eq('id', id)
    addToast('Deuda eliminada')
    fetchDebts()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-white">Deudas</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Total adeudado: <span className="text-red-400 font-semibold">{formatCurrency(totalDebt)}</span>
            {totalMinPayment > 0 && <> · Pago mín/mes: <span className="text-amber-400 font-semibold">{formatCurrency(totalMinPayment)}</span></>}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-all">
          + Agregar deuda
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white">Nueva deuda</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ej: Tarjeta de crédito BCI" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto total (CLP) *</label>
              <input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} required min="1" placeholder="1000000" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Saldo actual (CLP) *</label>
              <input type="number" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} required min="0" placeholder="800000" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tasa de interés (% mensual)</label>
              <input type="number" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} min="0" step="0.01" placeholder="2.5" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Pago mínimo mensual (CLP)</label>
              <input type="number" value={form.minimum_payment} onChange={e => setForm(f => ({ ...f, minimum_payment: e.target.value }))} min="0" placeholder="50000" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Día de vencimiento</label>
              <input type="number" value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} min="1" max="31" placeholder="15" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
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

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-40 bg-[#0d1117] rounded-xl border border-[#1e2d45] animate-pulse" />)}
        </div>
      ) : debts.length === 0 ? (
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-12 text-center">
          <p className="text-3xl mb-3">💳</p>
          <p className="text-slate-400 text-sm">No tienes deudas registradas.</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-semibold">+ Agregar primera deuda</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {debts.map(debt => {
            const progress = debt.total_amount > 0 ? Math.min(Math.round(((debt.total_amount - debt.current_balance) / debt.total_amount) * 100), 100) : 0
            const isPaid = debt.status === 'paid'
            return (
              <div key={debt.id} className={`bg-[#0d1117] rounded-xl border p-5 flex flex-col gap-3 ${isPaid ? 'border-emerald-500/20 opacity-70' : 'border-[#1e2d45]'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{debt.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isPaid
                        ? <span className="text-[10px] bg-emerald-500/10 text-emerald-400 rounded-full px-2 py-0.5 border border-emerald-500/20">Pagada ✓</span>
                        : debt.due_day && <span className="text-[10px] text-slate-500">Vence día {debt.due_day}</span>
                      }
                      {!isPaid && debt.interest_rate > 0 && <span className="text-[10px] text-slate-500">{debt.interest_rate}% mensual</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {!isPaid && (
                      <button onClick={() => handleMarkPaid(debt.id)} className="text-xs text-emerald-500 hover:text-emerald-400 transition-all font-medium">✓ Pagar</button>
                    )}
                    <button onClick={() => handleDelete(debt.id)} className="text-slate-600 hover:text-red-400 text-xs transition-all">✕</button>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Saldo: <span className={`font-semibold ${isPaid ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(debt.current_balance)}</span></span>
                  <span className="text-slate-500">de {formatCurrency(debt.total_amount)}</span>
                </div>
                <div className="w-full bg-[#1e2d45] rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${isPaid ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{progress}% pagado</span>
                  {!isPaid && debt.minimum_payment > 0 && <span>Pago mín: {formatCurrency(debt.minimum_payment)}/mes</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
