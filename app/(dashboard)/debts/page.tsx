'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Debt } from '@/types'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
}

const DEBT_TYPE_LABELS: Record<string, string> = {
  formal:      'Préstamo formal',
  informal:    'Préstamo informal',
  bnpl:        'Cuotas / BNPL',
  credit_card: 'Tarjeta de crédito',
}

const DEBT_TYPE_ICONS: Record<string, string> = {
  formal:      '🏦',
  informal:    '🤝',
  bnpl:        '📦',
  credit_card: '💳',
}

const EMPTY_FORM = {
  name: '', total_amount: '', current_balance: '',
  interest_rate: '', minimum_payment: '', due_day: '', debt_type: 'credit_card',
}

export default function DebtsPage() {
  const [debts, setDebts]             = useState<Debt[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const { addToast } = useFinanceStore()

  const fetchDebts = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('debts').select('*').eq('user_id', user.id)
      .order('status').order('created_at', { ascending: false })
    setDebts(data ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchDebts() }, [fetchDebts])

  const activeDebts    = debts.filter(d => d.status === 'active')
  const totalDebt      = activeDebts.reduce((s, d) => s + d.current_balance, 0)
  const totalPaid      = debts.reduce((s, d) => s + (d.total_amount - d.current_balance), 0)
  const totalMinPay    = activeDebts.reduce((s, d) => s + d.minimum_payment, 0)
  const snowballTarget = [...activeDebts].sort((a, b) => a.current_balance - b.current_balance)[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('debts').insert({
      user_id: user.id, name: form.name, debt_type: form.debt_type,
      total_amount: Number(form.total_amount),
      current_balance: Number(form.current_balance),
      interest_rate: Number(form.interest_rate) || 0,
      minimum_payment: Number(form.minimum_payment) || 0,
      due_day: form.due_day ? Number(form.due_day) : null,
      status: 'active',
    })
    if (error) addToast('Error al guardar la deuda', 'error')
    else {
      addToast('Deuda registrada ✓')
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchDebts()
    }
    setSaving(false)
  }

  const handleRegisterPayment = async (debt: Debt) => {
    if (!paymentAmount || Number(paymentAmount) <= 0) return
    const supabase = createClient()
    const newBalance = Math.max(debt.current_balance - Number(paymentAmount), 0)
    const newStatus  = newBalance === 0 ? 'paid' : 'active'
    await supabase.from('debts').update({
      current_balance: newBalance, status: newStatus, updated_at: new Date().toISOString(),
    }).eq('id', debt.id)
    addToast(newStatus === 'paid' ? `¡Deuda "${debt.name}" pagada! 🎉` : `Pago de ${formatCurrency(Number(paymentAmount))} registrado ✓`)
    setPaymentDebtId(null)
    setPaymentAmount('')
    fetchDebts()
  }

  const handleMarkPaid = async (id: string) => {
    const supabase = createClient()
    await supabase.from('debts').update({ status: 'paid', current_balance: 0, updated_at: new Date().toISOString() }).eq('id', id)
    addToast('¡Deuda pagada! 🎉')
    fetchDebts()
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('debts').delete().eq('id', id)
    addToast('Deuda eliminada')
    fetchDebts()
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Mis deudas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeDebts.length} deuda{activeDebts.length !== 1 ? 's' : ''} activa{activeDebts.length !== 1 ? 's' : ''}
            {totalDebt > 0 && ` · ${formatCurrency(totalDebt)} pendiente`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}
        >
          + Agregar deuda
        </button>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Total adeudado</p>
          <p className="text-3xl font-black tracking-tight mb-1" style={{ color: '#D97706' }}>
            {formatCurrency(totalDebt)}
          </p>
          <p className="text-xs text-gray-400">{activeDebts.length} deuda{activeDebts.length !== 1 ? 's' : ''} activa{activeDebts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Total pagado</p>
          <p className="text-2xl font-extrabold tracking-tight text-emerald-600 mb-1">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-gray-400">en todos los registros</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Pago mínimo mensual</p>
          <p className="text-2xl font-extrabold tracking-tight text-red-500 mb-1">{formatCurrency(totalMinPay)}</p>
          <p className="text-xs text-gray-400">comprometido este mes</p>
        </div>
      </div>

      {/* ── SNOWBALL STRATEGY ──────────────────────────────────── */}
      {snowballTarget && (
        <div className="rounded-2xl p-5 mb-6 flex items-start gap-4"
          style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: '#FEF3C7' }}>
            ⛄
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900 mb-0.5">Estrategia bola de nieve</p>
            <p className="text-sm text-amber-700">
              Enfócate primero en{' '}
              <strong className="text-amber-900">"{snowballTarget.name}"</strong>
              {' '}— es tu deuda más pequeña con{' '}
              <strong>{formatCurrency(snowballTarget.current_balance)}</strong> pendiente.
              Pagarla primero te dará impulso para las siguientes.
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full shrink-0">
            Siguiente objetivo
          </span>
        </div>
      )}

      {/* ── ADD FORM ───────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Nueva deuda</h2>
              <p className="text-xs text-gray-400 mt-0.5">Registra los datos de la deuda</p>
            </div>
            <button onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nombre *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Ej: Tarjeta BCI, Crédito hipotecario..." autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipo de deuda</label>
                <select value={form.debt_type}
                  onChange={e => setForm(f => ({ ...f, debt_type: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-amber-400 transition-colors">
                  {Object.entries(DEBT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{DEBT_TYPE_ICONS[v]} {l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Monto total original (CLP) *</label>
                <input type="number" value={form.total_amount}
                  onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                  required min="1" placeholder="1.000.000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-amber-400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Saldo actual pendiente (CLP) *</label>
                <input type="number" value={form.current_balance}
                  onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))}
                  required min="0" placeholder="800.000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-amber-400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tasa de interés (% mensual)</label>
                <input type="number" value={form.interest_rate}
                  onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))}
                  min="0" step="0.01" placeholder="2.5"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-amber-400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Pago mínimo mensual (CLP)</label>
                <input type="number" value={form.minimum_payment}
                  onChange={e => setForm(f => ({ ...f, minimum_payment: e.target.value }))}
                  min="0" placeholder="50.000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-amber-400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Día de vencimiento</label>
                <input type="number" value={form.due_day}
                  onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))}
                  min="1" max="31" placeholder="15"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-amber-400 transition-colors" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                {saving ? 'Guardando...' : 'Guardar deuda'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── DEBT CARDS ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-5">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : debts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p className="text-5xl mb-4">✅</p>
          <p className="text-base font-bold text-emerald-700 mb-1">¡Sin deudas registradas!</p>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Si tienes deudas, registrarlas te ayuda a planificar su pago y liberarte más rápido.
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
            + Agregar primera deuda
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {debts.map(debt => {
            const progress = debt.total_amount > 0
              ? Math.min(Math.round(((debt.total_amount - debt.current_balance) / debt.total_amount) * 100), 100)
              : 0
            const isPaid      = debt.status === 'paid'
            const isPaying    = paymentDebtId === debt.id
            const isSnowball  = snowballTarget?.id === debt.id

            return (
              <div key={debt.id}
                className="bg-white rounded-2xl border p-6 relative transition-shadow hover:shadow-md"
                style={{
                  borderColor: isPaid ? '#A7F3D0' : isSnowball ? '#FDE68A' : '#E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  opacity: isPaid ? 0.85 : 1,
                }}>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: isPaid ? '#ECFDF5' : '#FFFBEB' }}>
                      {DEBT_TYPE_ICONS[debt.debt_type] ?? '💳'}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{debt.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isPaid ? '#ECFDF5' : '#FFFBEB',
                            color: isPaid ? '#10B981' : '#D97706',
                          }}>
                          {isPaid ? '✓ Pagada' : DEBT_TYPE_LABELS[debt.debt_type] ?? 'Deuda'}
                        </span>
                        {isSnowball && !isPaid && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            ⛄ Objetivo actual
                          </span>
                        )}
                        {!isPaid && debt.due_day && (
                          <span className="text-xs text-gray-400">Vence día {debt.due_day}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPaid && (
                      <button onClick={() => handleMarkPaid(debt.id)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        style={{ color: '#10B981', backgroundColor: '#ECFDF5' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#D1FAE5')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ECFDF5')}>
                        ✓ Pagada
                      </button>
                    )}
                    <button onClick={() => handleDelete(debt.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm p-1.5 rounded-lg hover:bg-red-50">
                      ✕
                    </button>
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Saldo pendiente</p>
                    <p className="text-2xl font-extrabold tracking-tight"
                      style={{ color: isPaid ? '#10B981' : '#D97706' }}>
                      {formatCurrency(debt.current_balance)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-0.5">Total original</p>
                    <p className="text-sm font-semibold text-gray-400">{formatCurrency(debt.total_amount)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: isPaid ? '#10B981' : '#3B82F6',
                    }} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <span><span className="font-semibold text-blue-500">{progress}%</span> pagado</span>
                  {!isPaid && debt.minimum_payment > 0 && (
                    <span>Mín. {formatCurrency(debt.minimum_payment)}/mes</span>
                  )}
                  {!isPaid && debt.interest_rate > 0 && (
                    <span>{debt.interest_rate}% mensual</span>
                  )}
                </div>

                {/* Payment action */}
                {!isPaid && (
                  isPaying ? (
                    <div className="flex gap-2">
                      <input
                        type="number" value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        placeholder="Monto del pago" autoFocus
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
                      />
                      <button onClick={() => handleRegisterPayment(debt)}
                        className="px-3 py-2 text-sm font-semibold text-white rounded-lg shrink-0 bg-blue-500 hover:bg-blue-600 transition-colors">
                        Registrar
                      </button>
                      <button onClick={() => { setPaymentDebtId(null); setPaymentAmount('') }}
                        className="px-2 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setPaymentDebtId(debt.id)}
                      className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors text-blue-600 border border-blue-100 bg-blue-50 hover:bg-blue-100">
                      + Registrar pago
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
