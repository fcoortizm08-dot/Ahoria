'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, calculatePercentage } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Goal } from '@/types'

const C = {
  surface: '#FFFFFF', border: '#E5E7EB',
  blue: '#3B82F6', blueBg: '#EFF6FF',
  green: '#10B981', greenBg: '#ECFDF5',
  text: '#111827', muted: '#6B7280', tertiary: '#9CA3AF',
  red: '#EF4444',
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

const ICONS = ['🎯','🏠','✈️','🚗','💻','📚','💊','🎓','💰','🌟','🏖️','🎸','👶','🐕','🏋️']
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16']

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [form, setForm] = useState({ name: '', target_amount: '', target_date: '', icon: '🎯', color: '#3b82f6' })
  const [saving, setSaving] = useState(false)
  const { addToast } = useFinanceStore()

  const fetchGoals = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('status').order('created_at', { ascending: false })
    setGoals(data ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const activeGoals    = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const totalSaved     = activeGoals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget    = activeGoals.reduce((s, g) => s + g.target_amount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('goals').insert({
      user_id: user.id, name: form.name,
      target_amount: Number(form.target_amount), current_amount: 0,
      target_date: form.target_date, icon: form.icon, color: form.color, status: 'active',
    })
    if (error) { addToast('Error al crear la meta', 'error') }
    else {
      addToast('Meta creada correctamente')
      setForm({ name: '', target_amount: '', target_date: '', icon: '🎯', color: '#3b82f6' })
      setShowForm(false)
      fetchGoals()
    }
    setSaving(false)
  }

  const handleDeposit = async (goal: Goal) => {
    if (!depositAmount || Number(depositAmount) <= 0) return
    const supabase = createClient()
    const newAmount = goal.current_amount + Number(depositAmount)
    const newStatus = newAmount >= goal.target_amount ? 'completed' : 'active'
    const { error } = await supabase.from('goals').update({
      current_amount: newAmount, status: newStatus, updated_at: new Date().toISOString(),
    }).eq('id', goal.id)
    if (!error) {
      addToast(newStatus === 'completed' ? `¡Meta "${goal.name}" completada! 🎉` : `Depósito de ${formatCurrency(Number(depositAmount))} registrado`)
      setDepositAmount('')
      setDepositGoalId(null)
      fetchGoals()
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('goals').delete().eq('id', id)
    addToast('Meta eliminada')
    fetchGoals()
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, margin: 0 }}>Metas de ahorro</h1>
          <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
            {activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} activa{activeGoals.length !== 1 ? 's' : ''}
            {totalTarget > 0 && (
              <> · Ahorrado: <span style={{ color: C.blue, fontWeight: 700 }}>{formatCurrency(totalSaved)}</span> de {formatCurrency(totalTarget)}</>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            backgroundColor: C.blue, color: '#FFFFFF',
            padding: '8px 16px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600, border: 'none',
            cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.25)',
          }}
        >
          + Nueva meta
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total ahorrado', value: formatCurrency(totalSaved), color: C.blue },
          { label: 'Metas activas', value: `${activeGoals.length}`, color: C.text },
          { label: 'Metas completadas', value: `${completedGoals.length}`, color: C.green },
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

      {/* Add form */}
      {showForm && (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '20px' }}>
            Nueva meta de ahorro
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nombre de la meta *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Ej: Fondo de emergencia"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Monto objetivo (CLP) *</label>
                <input
                  type="number" value={form.target_amount}
                  onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                  required min="1" placeholder="2000000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Fecha objetivo *</label>
                <input
                  type="date" value={form.target_date}
                  onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                  required style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Ícono</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ICONS.map(icon => (
                    <button
                      key={icon} type="button"
                      onClick={() => setForm(f => ({ ...f, icon }))}
                      style={{
                        fontSize: '18px', padding: '6px', borderRadius: '8px',
                        border: `2px solid ${form.icon === icon ? C.blue : 'transparent'}`,
                        backgroundColor: form.icon === icon ? C.blueBg : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {COLORS.map(color => (
                    <button
                      key={color} type="button"
                      onClick={() => setForm(f => ({ ...f, color }))}
                      style={{
                        width: '28px', height: '28px', borderRadius: '999px',
                        backgroundColor: color, border: 'none', cursor: 'pointer',
                        outline: form.color === color ? `3px solid ${color}` : 'none',
                        outlineOffset: '2px',
                        transform: form.color === color ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
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
                  fontWeight: 600, color: '#FFFFFF', backgroundColor: C.blue,
                  border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Guardando...' : 'Crear meta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {[1,2].map(i => (
            <div key={i} style={{ height: '180px', backgroundColor: C.surface, borderRadius: '12px', border: `1px solid ${C.border}` }} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '60px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
            Define tu primer objetivo
          </p>
          <p style={{ fontSize: '13px', color: C.muted, marginBottom: '20px', maxWidth: '320px', margin: '0 auto 20px' }}>
            Del sueño al plan concreto. Crea una meta, deposita ahorros y ve tu progreso crecer.
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              backgroundColor: C.blue, color: '#FFFFFF',
              padding: '10px 24px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
            }}
          >
            + Crear primera meta
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {goals.map(goal => {
            const progress  = calculatePercentage(goal.current_amount, goal.target_amount)
            const isCompleted = goal.status === 'completed'
            const daysLeft  = goal.target_date
              ? Math.ceil((new Date(goal.target_date + 'T00:00:00').getTime() - Date.now()) / 86400000)
              : null

            return (
              <div
                key={goal.id}
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${isCompleted ? '#A7F3D0' : C.border}`,
                  borderRadius: '12px', padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  position: 'relative',
                }}
              >
                {isCompleted && (
                  <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    backgroundColor: C.greenBg, color: C.green,
                    fontSize: '10px', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '999px',
                    border: '1px solid #A7F3D0',
                  }}>
                    Completada ✓
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      backgroundColor: goal.color + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', flexShrink: 0,
                    }}>
                      {goal.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{goal.name}</div>
                      {!isCompleted && (
                        <div style={{ fontSize: '11px', color: C.tertiary, marginTop: '2px' }}>
                          {formatDate(goal.target_date)}
                          {daysLeft !== null && daysLeft > 0 && (
                            <span style={{ color: daysLeft <= 30 ? '#F59E0B' : C.tertiary }}>
                              {' '}· {daysLeft} días
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
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

                {/* Amounts */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: C.tertiary }}>Ahorrado</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>
                      {formatCurrency(goal.current_amount)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: C.tertiary }}>Meta</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: C.muted }}>
                      {formatCurrency(goal.target_amount)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '8px', backgroundColor: '#E5E7EB', borderRadius: '999px', marginBottom: '6px' }}>
                  <div style={{
                    height: '8px', borderRadius: '999px',
                    backgroundColor: isCompleted ? C.green : goal.color,
                    width: `${Math.min(progress, 100)}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: '11px', color: C.tertiary, marginBottom: '16px' }}>
                  {progress}% · Faltan {formatCurrency(Math.max(goal.target_amount - goal.current_amount, 0))}
                </div>

                {/* Deposit */}
                {!isCompleted && (
                  depositGoalId === goal.id ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number" value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="Monto a depositar (CLP)" autoFocus
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        onClick={() => handleDeposit(goal)}
                        style={{
                          padding: '8px 14px', borderRadius: '8px', fontSize: '12px',
                          fontWeight: 600, color: '#FFFFFF', backgroundColor: goal.color,
                          border: 'none', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        Depositar
                      </button>
                      <button
                        onClick={() => { setDepositGoalId(null); setDepositAmount('') }}
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
                      onClick={() => setDepositGoalId(goal.id)}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: 600,
                        color: goal.color, border: `1px solid ${goal.color}30`,
                        backgroundColor: goal.color + '08',
                        cursor: 'pointer',
                      }}
                    >
                      + Depositar ahorro
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
