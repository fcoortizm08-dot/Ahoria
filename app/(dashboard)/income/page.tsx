'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { MonthSelector } from '@/components/common/MonthSelector'
import type { Transaction, Category } from '@/types'

const C = {
  bg: '#F7F8FA', surface: '#FFFFFF', border: '#E5E7EB',
  green: '#10B981', greenDk: '#059669', greenBg: '#ECFDF5',
  text: '#111827', muted: '#6B7280', tertiary: '#9CA3AF',
  red: '#EF4444',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: `1px solid ${C.border}`, borderRadius: '8px',
  backgroundColor: '#FFFFFF', color: C.text,
  fontSize: '13px', outline: 'none',
  transition: 'border-color 0.15s ease',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px',
  fontWeight: 600, color: C.muted, marginBottom: '6px',
}

export default function IncomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    description: '', amount: '', category_id: '',
    date: new Date().toISOString().split('T')[0], notes: '',
  })
  const [saving, setSaving] = useState(false)
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

  const total = transactions.reduce((s, t) => s + t.amount, 0)
  const recurring = transactions.filter(t => t.is_recurring).reduce((s, t) => s + t.amount, 0)
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate()
  const dailyAvg = total / daysInMonth

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
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, margin: 0 }}>Ingresos</h1>
          <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
            Total del mes:{' '}
            <span style={{ color: C.green, fontWeight: 700 }}>{formatCurrency(total)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MonthSelector />
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              backgroundColor: C.green, color: '#FFFFFF',
              padding: '8px 16px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 4px rgba(16,185,129,0.25)',
            }}
          >
            + Agregar ingreso
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total del mes', value: formatCurrency(total), color: C.green },
          { label: 'Ingresos recurrentes', value: formatCurrency(recurring), color: C.muted },
          { label: 'Promedio diario', value: formatCurrency(Math.round(dailyAvg)), color: C.muted },
        ].map(kpi => (
          <div key={kpi.label} style={{
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '12px', padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: kpi.color }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Add form modal-style */}
      {showForm && (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '20px' }}>
            Nuevo ingreso
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Descripción *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required placeholder="Ej: Salario enero"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Monto (CLP) *</label>
                <input
                  type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required min="1" placeholder="1000000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input
                  type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Sin categoría</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional"
                  style={inputStyle}
                />
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
                  fontWeight: 600, color: '#FFFFFF', backgroundColor: C.green,
                  border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Guardando...' : 'Guardar ingreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction list */}
      <div style={{
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: C.tertiary, fontSize: '14px' }}>
            Cargando...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>💰</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: C.muted, marginBottom: '4px' }}>
              Sin ingresos este mes
            </p>
            <p style={{ fontSize: '13px', color: C.tertiary, marginBottom: '16px' }}>
              Registra tu primer ingreso para empezar a llevar el control
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                backgroundColor: C.green, color: '#FFFFFF',
                padding: '8px 20px', borderRadius: '8px',
                fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              + Agregar el primero
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Descripción', 'Categoría', 'Fecha', 'Monto', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '12px 20px', textAlign: i === 3 ? 'right' : 'left',
                    fontSize: '11px', fontWeight: 700, color: C.muted,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr
                  key={tx.id}
                  style={{
                    borderBottom: idx < transactions.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                        backgroundColor: (tx.category?.color ?? C.green) + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px',
                      }}>
                        {tx.category?.icon ?? '↑'}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{tx.description}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: C.tertiary }}>
                    {tx.category?.name ?? '—'}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: C.tertiary }}>
                    {formatDate(tx.date)}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.green }}>
                      +{formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '14px', color: C.tertiary, padding: '4px',
                        borderRadius: '4px', transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.red)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.tertiary)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `1px solid ${C.border}`, backgroundColor: '#F9FAFB' }}>
                <td colSpan={3} style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: C.muted }}>
                  Total del mes
                </td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: C.green }}>
                    {formatCurrency(total)}
                  </span>
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
