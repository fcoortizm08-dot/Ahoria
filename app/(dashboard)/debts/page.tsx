'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Debt } from '@/types'

const C = {
  surface: '#FFFFFF', border: '#E5E7EB',
  amber: '#F59E0B', amberBg: '#FFFBEB',
  green: '#10B981', greenBg: '#ECFDF5',
  red: '#EF4444', redBg: '#FEF2F2',
  blue: '#3B82F6', blueBg: '#EFF6FF',
  text: '#111827', muted: '#6B7280', tertiary: '#9CA3AF',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: `1px solid ${C.border}`, borderRadius: '8px',
  backgroundColor: '#FFFFFF', color: C.text,
  fontSize: '13px', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: C.muted, marginBottom: '6px',
}

const DEBT_TYPE_LABELS: Record<string, string> = {
  formal: 'Préstamo formal',
  informal: 'Préstamo informal',
  bnpl: 'Cuotas/BNPL',
  credit_card: 'Tarjeta de crédito',
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', total_amount: '', current_balance: '',
    interest_rate: '', minimum_payment: '', due_day: '', debt_type: 'credit_card',
  })
  const [saving, setSaving] = useState(false)
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
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

  const activeDebts    = debts.filter(d => d.status === 'active')
  const totalDebt      = activeDebts.reduce((s, d) => s + d.current_balance, 0)
  const totalPaid      = debts.reduce((s, d) => s + (d.total_amount - d.current_balance), 0)
  const totalMinPay    = activeDebts.reduce((s, d) => s + d.minimum_payment, 0)
  const snowballTarget = activeDebts.sort((a, b) => a.current_balance - b.current_balance)[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('debts').insert({
      user_id: user.id, name: form.name,
      debt_type: form.debt_type,
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
      setForm({ name: '', total_amount: '', current_balance: '', interest_rate: '', minimum_payment: '', due_day: '', debt_type: 'credit_card' })
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
    addToast(newStatus === 'paid' ? `¡Deuda "${debt.name}" pagada! 🎉` : `Pago de ${formatCurrency(Number(paymentAmount))} registrado`)
    setPaymentDebtId(null)
    setPaymentAmount('')
    fetchDebts()
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
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, margin: 0 }}>Mis deudas</h1>
          <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
            Controla lo que debes y traza un plan para pagarlo
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            backgroundColor: C.amber, color: '#FFFFFF',
            padding: '8px 16px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600, border: 'none',
            cursor: 'pointer', boxShadow: '0 2px 4px rgba(245,158,11,0.25)',
          }}
        >
          + Agregar deuda
        </button>
      </div>

      {/* Hero stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Total adeudado
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: C.amber }}>{formatCurrency(totalDebt)}</div>
        </div>
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Total pagado
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: C.green }}>{formatCurrency(totalPaid)}</div>
        </div>
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Pago mínimo mensual
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: C.red }}>{formatCurrency(totalMinPay)}</div>
        </div>
      </div>

      {/* Strategy card */}
      {snowballTarget && (
        <div style={{
          backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: '12px', padding: '16px 20px',
          marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>⛄</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>Estrategia bola de nieve</div>
            <div style={{ fontSize: '12px', color: '#B45309' }}>
              Enfócate en <strong>"{snowballTarget.name}"</strong> ({formatCurrency(snowballTarget.current_balance)}).
              Es tu deuda más pequeña — págarla primero te dará motivación para las siguientes.
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '20px' }}>
            Nueva deuda
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nombre *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Ej: Tarjeta de crédito BCI"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Tipo de deuda</label>
                <select
                  value={form.debt_type}
                  onChange={e => setForm(f => ({ ...f, debt_type: e.target.value }))}
                  style={inputStyle}
                >
                  {Object.entries(DEBT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Monto total (CLP) *</label>
                <input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} required min="1" placeholder="1000000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Saldo actual (CLP) *</label>
                <input type="number" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} required min="0" placeholder="800000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tasa de interés (% mensual)</label>
                <input type="number" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} min="0" step="0.01" placeholder="2.5" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pago mínimo mensual (CLP)</label>
                <input type="number" value={form.minimum_payment} onChange={e => setForm(f => ({ ...f, minimum_payment: e.target.value }))} min="0" placeholder="50000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Día de vencimiento</label>
                <input type="number" value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} min="1" max="31" placeholder="15" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button" onClick={() => setShowForm(false)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                  fontWeight: 500, color: C.muted, border: `1px solid ${C.border}`,
                  backgroundColor: 'transparent', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={saving}
                style={{
                  padding: '8px 20px', borderRadius: '8px', fontSize: '13px',
                  fontWeight: 600, color: '#FFFFFF', backgroundColor: C.amber,
                  border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Guardando...' : 'Guardar deuda'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Debt cards */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {[1,2].map(i => (
            <div key={i} style={{ height: '180px', backgroundColor: C.surface, borderRadius: '12px', border: `1px solid ${C.border}` }} />
          ))}
        </div>
      ) : debts.length === 0 ? (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '60px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>✓</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: C.green, marginBottom: '8px' }}>
            ¡Sin deudas registradas!
          </p>
          <p style={{ fontSize: '13px', color: C.muted, marginBottom: '20px' }}>
            Si tienes deudas, registrarlas te ayuda a planificar su pago.
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              backgroundColor: C.amber, color: '#FFFFFF',
              padding: '10px 24px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
            }}
          >
            + Agregar primera deuda
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {debts.map(debt => {
            const progress = debt.total_amount > 0
              ? Math.min(Math.round(((debt.total_amount - debt.current_balance) / debt.total_amount) * 100), 100)
              : 0
            const isPaid = debt.status === 'paid'

            return (
              <div
                key={debt.id}
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${isPaid ? '#A7F3D0' : C.border}`,
                  borderRadius: '12px', padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  opacity: isPaid ? 0.8 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{debt.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                        backgroundColor: isPaid ? C.greenBg : C.amberBg,
                        color: isPaid ? C.green : C.amber,
                        border: `1px solid ${isPaid ? '#A7F3D0' : '#FDE68A'}`,
                      }}>
                        {isPaid ? 'Pagada ✓' : DEBT_TYPE_LABELS[debt.debt_type] ?? 'Deuda'}
                      </span>
                      {!isPaid && debt.due_day && (
                        <span style={{ fontSize: '11px', color: C.tertiary }}>Vence día {debt.due_day}</span>
                      )}
                      {!isPaid && debt.interest_rate > 0 && (
                        <span style={{ fontSize: '11px', color: C.tertiary }}>{debt.interest_rate}% mensual</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!isPaid && (
                      <button
                        onClick={() => handleMarkPaid(debt.id)}
                        style={{
                          fontSize: '11px', fontWeight: 600, color: C.green,
                          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                          borderRadius: '6px', backgroundColor: C.greenBg,
                        }}
                      >
                        ✓ Pagado
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(debt.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '14px', color: C.tertiary, padding: '4px',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.red)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.tertiary)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: C.tertiary }}>Saldo restante</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: isPaid ? C.green : C.amber }}>
                      {formatCurrency(debt.current_balance)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: C.tertiary }}>Total original</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: C.muted }}>
                      {formatCurrency(debt.total_amount)}
                    </div>
                  </div>
                </div>

                <div style={{ height: '6px', backgroundColor: '#E5E7EB', borderRadius: '999px', marginBottom: '6px' }}>
                  <div style={{
                    height: '6px', borderRadius: '999px',
                    backgroundColor: isPaid ? C.green : C.blue,
                    width: `${progress}%`,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.tertiary, marginBottom: '16px' }}>
                  <span>{progress}% pagado</span>
                  {!isPaid && debt.minimum_payment > 0 && (
                    <span>Pago mín: {formatCurrency(debt.minimum_payment)}/mes</span>
                  )}
                </div>

                {!isPaid && (
                  paymentDebtId === debt.id ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number" value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        placeholder="Monto del pago" autoFocus
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        onClick={() => handleRegisterPayment(debt)}
                        style={{
                          padding: '8px 14px', borderRadius: '8px', fontSize: '12px',
                          fontWeight: 600, color: '#FFFFFF', backgroundColor: C.green,
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        Registrar
                      </button>
                      <button
                        onClick={() => { setPaymentDebtId(null); setPaymentAmount('') }}
                        style={{
                          padding: '8px', borderRadius: '8px', fontSize: '14px',
                          color: C.tertiary, border: `1px solid ${C.border}`,
                          backgroundColor: 'transparent', cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPaymentDebtId(debt.id)}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: 600,
                        color: C.blue, border: `1px solid #BFDBFE`,
                        backgroundColor: C.blueBg, cursor: 'pointer',
                      }}
                    >
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
