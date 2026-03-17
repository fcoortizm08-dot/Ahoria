'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Debt } from '@/types'

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', total_amount: '', current_balance: '', interest_rate: '', minimum_payment: '', due_day: '' })
  const [saving, setSaving] = useState(false)

  const fetchDebts = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('debts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setDebts(data ?? [])
    setIsLoading(false)
  }

  useEffect(() => { fetchDebts() }, [])

  const totalDebt = debts.filter(d => d.status === 'active').reduce((s, d) => s + d.current_balance, 0)
  const totalMinPayment = debts.filter(d => d.status === 'active').reduce((s, d) => s + d.minimum_payment, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('debts').insert({
      user_id: user.id,
      name: form.name,
      total_amount: Number(form.total_amount),
      current_balance: Number(form.current_balance),
      interest_rate: Number(form.interest_rate) || 0,
      minimum_payment: Number(form.minimum_payment) || 0,
      due_day: form.due_day ? Number(form.due_day) : null,
      status: 'active',
    })

    setForm({ name: '', total_amount: '', current_balance: '', interest_rate: '', minimum_payment: '', due_day: '' })
    setShowForm(false)
    setSaving(false)
    fetchDebts()
  }

  const handleMarkPaid = async (id: string) => {
    const supabase = createClient()
    await supabase.from('debts').update({ status: 'paid', current_balance: 0 }).eq('id', id)
    fetchDebts()
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('debts').delete().eq('id', id)
    fetchDebts()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Deudas</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Total adeudado: <span className="text-red-400 font-semibold">{formatCurrency(totalDebt)}</span>
            {totalMinPayment > 0 && <> · Pago mínimo mensual: <span className="text-amber-400 font-semibold">{formatCurrency(totalMinPayment)}</span></>}
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
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ej: Tarjeta de crédito BCI" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto total (CLP)</label>
              <input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} required min="1" placeholder="1000000" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Saldo actual (CLP)</label>
              <input type="number" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} required min="0" placeholder="800000" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tasa de interés (%)</label>
              <input type="number" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} min="0" step="0.1" placeholder="2.5" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Pago mínimo (CLP)</label>
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
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-8 text-center text-slate-500 text-sm">Cargando...</div>
      ) : debts.length === 0 ? (
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-8 text-center text-slate-500 text-sm">No tienes deudas registradas.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {debts.map(debt => {
            const progress = debt.total_amount > 0 ? Math.round(((debt.total_amount - debt.current_balance) / debt.total_amount) * 100) : 0
            return (
              <div key={debt.id} className={`bg-[#0d1117] rounded-xl border p-5 flex flex-col gap-3 ${debt.status === 'paid' ? 'border-emerald-500/20 opacity-60' : 'border-[#1e2d45]'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{debt.name}</p>
                    {debt.status === 'paid' && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 rounded-full px-2 py-0.5">Pagada</span>}
                  </div>
                  <div className="flex gap-2">
                    {debt.status === 'active' && (
                      <button onClick={() => handleMarkPaid(debt.id)} className="text-xs text-emerald-500 hover:text-emerald-400 transition-all">✓ Pagar</button>
                    )}
                    <button onClick={() => handleDelete(debt.id)} className="text-slate-600 hover:text-red-400 text-xs transition-all">✕</button>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Saldo: <span className="text-red-400 font-semibold">{formatCurrency(debt.current_balance)}</span></span>
                  <span>Total: {formatCurrency(debt.total_amount)}</span>
                </div>
                <div className="w-full bg-[#1e2d45] rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{progress}% pagado</span>
                  {debt.minimum_payment > 0 && <span>Pago mín: {formatCurrency(debt.minimum_payment)}/mes</span>}
                  {debt.due_day && <span>Vence día {debt.due_day}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
