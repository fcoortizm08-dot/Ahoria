'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import { MonthSelector } from '@/components/common/MonthSelector'
import type { Transaction, Category } from '@/types'

const C = {
  bg: '#F7F8FA', surface: '#FFFFFF', border: '#E5E7EB',
  green: '#10B981', greenBg: '#ECFDF5',
  red: '#EF4444', redBg: '#FEF2F2',
  text: '#111827', muted: '#6B7280', tertiary: '#9CA3AF',
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

interface CategoryGroup {
  category: Category | null
  transactions: Transaction[]
  total: number
}

const EMPTY_FORM = {
  description: '', amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '', category_id: '',
}

export default function ExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
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
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate()
  const dailyAvg = total / daysInMonth

  // Group by category
  const groups: CategoryGroup[] = (() => {
    const map = new Map<string, CategoryGroup>()
    transactions.forEach(tx => {
      const key = tx.category_id ?? 'null'
      if (!map.has(key)) map.set(key, { category: tx.category ?? null, transactions: [], total: 0 })
      const g = map.get(key)!
      g.transactions.push(tx)
      g.total += tx.amount
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id, type: 'expense',
      description: form.description, amount: Number(form.amount),
      category_id: form.category_id || null, date: form.date,
      notes: form.notes || null, is_recurring: false,
    })
    if (error) { addToast('Error al guardar el gasto', 'error') }
    else {
      addToast('Gasto registrado correctamente')
      setForm(EMPTY_FORM)
      setShowForm(false)
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
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, margin: 0 }}>Gastos</h1>
          <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
            Total del mes:{' '}
            <span style={{ color: C.red, fontWeight: 700 }}>{formatCurrency(total)}</span>
            {groups.length > 0 && ` · ${groups.length} categoría${groups.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MonthSelector />
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              backgroundColor: C.red, color: '#FFFFFF',
              padding: '8px 16px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 4px rgba(239,68,68,0.25)',
            }}
          >
            + Agregar gasto
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total del mes', value: formatCurrency(total), color: C.red },
          { label: 'Categorías activas', value: `${groups.length}`, color: C.text },
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
            <div style={{ fontSize: '22px', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {groups.length > 0 && (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '16px' }}>
            Por categoría
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {groups.map(g => {
              const pct = total > 0 ? Math.round((g.total / total) * 100) : 0
              return (
                <div key={g.category?.id ?? 'null'} style={{
                  padding: '14px', borderRadius: '10px',
                  border: `1px solid ${C.border}`,
                  backgroundColor: (g.category?.color ?? '#6B7280') + '08',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{g.category?.icon ?? '📦'}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.category?.name ?? 'Sin categoría'}
                    </span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: C.red, marginBottom: '6px' }}>
                    {formatCurrency(g.total)}
                  </div>
                  <div style={{ height: '3px', backgroundColor: '#E5E7EB', borderRadius: '999px' }}>
                    <div style={{
                      height: '3px', borderRadius: '999px',
                      backgroundColor: g.category?.color ?? '#6B7280',
                      width: `${pct}%`,
                    }} />
                  </div>
                  <div style={{ fontSize: '10px', color: C.tertiary, marginTop: '3px' }}>{pct}% del total</div>
                </div>
              )
            })}
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
            Nuevo gasto
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Descripción *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required placeholder="Ej: Supermercado" autoFocus
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Monto (CLP) *</label>
                <input
                  type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required min="1" placeholder="15000"
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
                  fontWeight: 600, color: '#FFFFFF', backgroundColor: C.red,
                  border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Guardando...' : 'Guardar gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction list */}
      {isLoading ? (
        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: C.tertiary, fontSize: '14px' }}>
          Cargando...
        </div>
      ) : transactions.length === 0 ? (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '60px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>💸</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: C.muted, marginBottom: '4px' }}>Sin gastos este mes</p>
          <p style={{ fontSize: '13px', color: C.tertiary, marginBottom: '16px' }}>Registra tu primer gasto</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {categories.slice(0, 6).map(cat => (
              <button
                key={cat.id}
                onClick={() => { setForm(f => ({ ...f, category_id: cat.id })); setShowForm(true) }}
                style={{
                  padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                  border: `1px solid ${C.border}`, backgroundColor: C.surface,
                  color: C.muted, cursor: 'pointer',
                }}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
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
                  style={{ borderBottom: idx < transactions.length - 1 ? `1px solid ${C.border}` : 'none' }}
                >
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                        backgroundColor: (tx.category?.color ?? C.red) + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px',
                      }}>
                        {tx.category?.icon ?? '💸'}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{tx.description}</div>
                        {tx.notes && <div style={{ fontSize: '11px', color: C.tertiary }}>{tx.notes}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: C.tertiary }}>
                    {tx.category?.name ?? '—'}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: C.tertiary }}>
                    {formatDate(tx.date)}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.red }}>
                      −{formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '14px', color: C.tertiary, padding: '4px', borderRadius: '4px',
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
                  <span style={{ fontSize: '15px', fontWeight: 800, color: C.red }}>
                    {formatCurrency(total)}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
