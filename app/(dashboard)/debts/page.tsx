'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { PaywallGate } from '@/components/common/PaywallGate'
import { FEATURE_KEYS } from '@/lib/plans'
import type { Debt } from '@/types'

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-[#0d1117] p-4 border border-[#1e2d45] space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1a2535]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded bg-[#1a2535]" />
              <div className="h-2.5 w-20 rounded bg-[#1a2535]" />
            </div>
            <div className="h-4 w-24 rounded bg-[#1a2535]" />
          </div>
          <div className="h-2 w-full rounded-full bg-[#1a2535]" />
        </div>
      ))}
    </div>
  )
}

type PaymentForm = { debtId: string; amount: string }

export default function DebtsPage() {
  const [debts, setDebts]         = useState<Debt[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [limitReached, setLimitReached] = useState(false)

  const [paymentForm, setPaymentForm]   = useState<PaymentForm | null>(null)
  const [paying, setPaying]             = useState(false)
  const [paymentError, setPaymentError] = useState('')

  const [form, setForm] = useState({
    name:            '',
    total_amount:    '',
    current_balance: '',
    interest_rate:   '',
    minimum_payment: '',
    due_day:         '',
  })

  const fetchDebts = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/debts')
      const json = await res.json() as { debts?: Debt[] }
      setDebts(json.debts ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDebts() }, [fetchDebts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.total_amount || !form.current_balance) {
      setFormError('Completa los campos requeridos.')
      return
    }
    setSubmitting(true)
    setFormError('')
    const res = await fetch('/api/debts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:            form.name,
        total_amount:    parseFloat(form.total_amount),
        current_balance: parseFloat(form.current_balance),
        interest_rate:   form.interest_rate   ? parseFloat(form.interest_rate)   : 0,
        minimum_payment: form.minimum_payment ? parseFloat(form.minimum_payment) : 0,
        due_day:         form.due_day         ? parseInt(form.due_day)           : null,
      }),
    })
    const json = await res.json() as { debt?: Debt; error?: string }
    if (!res.ok) {
      if (json.error === 'limit_reached') {
        setLimitReached(true)
        setShowForm(false)
      } else {
        setFormError(json.error ?? 'Error al guardar.')
      }
      setSubmitting(false)
      return
    }
    setDebts(prev => [...prev, json.debt!])
    setShowForm(false)
    setForm({ name: '', total_amount: '', current_balance: '', interest_rate: '', minimum_payment: '', due_day: '' })
    setSubmitting(false)
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm || !paymentForm.amount) {
      setPaymentError('Ingresa un monto.')
      return
    }
    setPaying(true)
    setPaymentError('')
    const res = await fetch(`/api/debts/${paymentForm.debtId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(paymentForm.amount) }),
    })
    const json = await res.json() as { debt?: Debt; error?: string }
    if (!res.ok) {
      setPaymentError(json.error ?? 'Error al registrar pago.')
      setPaying(false)
      return
    }
    if (json.debt!.status === 'paid') {
      setDebts(prev => prev.filter(d => d.id !== json.debt!.id))
    } else {
      setDebts(prev => prev.map(d => d.id === json.debt!.id ? json.debt! : d))
    }
    setPaymentForm(null)
    setPaying(false)
  }

  const paidPct = (debt: Debt) =>
    Math.min(100, debt.total_amount > 0
      ? Math.round(((debt.total_amount - debt.current_balance) / debt.total_amount) * 100)
      : 0)

  const totalBalance = debts.reduce((s, d) => s + d.current_balance, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Deudas</h1>
        {!limitReached ? (
          <button
            onClick={() => setShowForm(v => !v)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
          >
            {showForm ? 'Cancelar' : '+ Nueva deuda'}
          </button>
        ) : null}
      </div>

      {/* Paywall if limit reached */}
      {limitReached && (
        <PaywallGate featureKey={FEATURE_KEYS.MAX_DEBTS}>
          <></>
        </PaywallGate>
      )}

      {/* KPI */}
      {!loading && debts.length > 0 && (
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 px-5 py-4">
          <p className="text-xs text-orange-600 mb-0.5">Saldo total pendiente</p>
          <p className="text-2xl font-bold text-orange-400">{formatCurrency(totalBalance)}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">{debts.length} deuda{debts.length !== 1 ? 's' : ''} activa{debts.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Add form */}
      {showForm && !limitReached && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#1e2d45] bg-[#0d1117] p-5 space-y-3"
        >
          <p className="text-sm font-semibold text-white mb-1">Nueva deuda</p>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Ej: Tarjeta de crédito"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Monto total (CLP) *</label>
              <input
                type="number"
                min="1"
                value={form.total_amount}
                onChange={(e) => setForm(f => ({ ...f, total_amount: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                placeholder="500000"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Saldo actual (CLP) *</label>
              <input
                type="number"
                min="0"
                value={form.current_balance}
                onChange={(e) => setForm(f => ({ ...f, current_balance: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                placeholder="350000"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Tasa (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.interest_rate}
                onChange={(e) => setForm(f => ({ ...f, interest_rate: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                placeholder="2.5"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Cuota mínima</label>
              <input
                type="number"
                min="0"
                value={form.minimum_payment}
                onChange={(e) => setForm(f => ({ ...f, minimum_payment: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                placeholder="30000"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Día de pago</label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.due_day}
                onChange={(e) => setForm(f => ({ ...f, due_day: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                placeholder="15"
              />
            </div>
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
              className="flex-1 rounded-xl bg-orange-600 py-2 text-xs font-semibold text-white hover:bg-orange-500 transition disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : 'Registrar deuda'}
            </button>
          </div>
        </form>
      )}

      {/* Payment form */}
      {paymentForm && (
        <form
          onSubmit={handlePayment}
          className="rounded-2xl border border-[#1e2d45] bg-[#0d1117] p-5 space-y-3"
        >
          <p className="text-sm font-semibold text-white mb-1">Registrar pago</p>
          {paymentError && <p className="text-xs text-red-400">{paymentError}</p>}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Monto pagado (CLP) *</label>
            <input
              type="number"
              min="1"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm(f => f ? { ...f, amount: e.target.value } : null)}
              className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="50000"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setPaymentForm(null); setPaymentError('') }}
              className="flex-1 rounded-xl border border-[#1e2d45] py-2 text-xs text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={paying}
              className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {paying ? 'Guardando…' : 'Registrar pago'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <Skeleton />
      ) : debts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#1e2d45] bg-[#0d1117] py-14 text-center">
          <p className="text-2xl mb-2">🏦</p>
          <p className="text-sm text-slate-500">Sin deudas activas</p>
          {!limitReached && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition underline"
            >
              Registrar la primera
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map((debt) => {
            const pct = paidPct(debt)
            return (
              <div
                key={debt.id}
                className="rounded-xl border border-[#1e2d45] bg-[#0d1117] px-4 py-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center text-lg flex-shrink-0">
                    🏦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{debt.name}</p>
                    <p className="text-[11px] text-slate-600">
                      {debt.interest_rate > 0 ? `${debt.interest_rate}% · ` : ''}
                      {debt.due_day ? `Vence día ${debt.due_day}` : 'Sin fecha'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-orange-400">{formatCurrency(debt.current_balance)}</p>
                    <p className="text-[11px] text-slate-600">saldo</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-[#1a2535] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-600">{pct}% pagado</span>
                    {debt.minimum_payment > 0 && (
                      <span className="text-[10px] text-slate-600">
                        Mín. {formatCurrency(debt.minimum_payment)}/mes
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPaymentForm({ debtId: debt.id, amount: '' })
                    setPaymentError('')
                  }}
                  className="w-full rounded-xl border border-[#1e2d45] py-1.5 text-[11px] text-slate-400 hover:text-white hover:border-slate-600 transition"
                >
                  + Registrar pago
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
