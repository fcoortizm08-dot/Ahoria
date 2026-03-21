'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Profile } from '@/types'

const C = {
  surface: '#FFFFFF', border: '#E5E7EB', bg: '#F7F8FA',
  green: '#10B981', greenBg: '#ECFDF5',
  ai: '#8B5CF6', aiBg: '#F5F3FF', aiBorder: '#DDD6FE',
  red: '#EF4444', redBg: '#FEF2F2',
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

const TABS = ['Perfil', 'Metas financieras', 'Preferencias', 'Suscripción', 'Seguridad'] as const
type Tab = typeof TABS[number]

export default function SettingsPage() {
  const { profile, setProfile, addToast } = useFinanceStore()
  const [activeTab, setActiveTab] = useState<Tab>('Perfil')
  const [form, setForm] = useState({ full_name: '', monthly_income_goal: '', savings_goal_pct: '' })
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        monthly_income_goal: profile.monthly_income_goal ? String(profile.monthly_income_goal) : '',
        savings_goal_pct: profile.savings_goal_pct ? String(profile.savings_goal_pct) : '30',
      })
    }
    const loadEmail = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setEmail(user.email)
    }
    loadEmail()
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const updates: Partial<Profile> = {
      full_name: form.full_name,
      monthly_income_goal: form.monthly_income_goal ? Number(form.monthly_income_goal) : 0,
      savings_goal_pct: form.savings_goal_pct ? Number(form.savings_goal_pct) : 30,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
    if (error) { addToast('Error al guardar los cambios', 'error') }
    else { setProfile(data); addToast('Perfil actualizado correctamente') }
    setSaving(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'A'

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, margin: '0 0 4px' }}>Configuración</h1>
        <p style={{ fontSize: '13px', color: C.muted, margin: 0 }}>
          Personaliza tu perfil y preferencias de AHORIA
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px' }}>
        {/* Left nav */}
        <div>
          {/* Avatar */}
          <div style={{
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '12px', padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: '16px', textAlign: 'center',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '999px',
              background: 'linear-gradient(135deg, #10B981, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontWeight: 700, fontSize: '18px',
              margin: '0 auto 10px',
            }}>
              {initials}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>
              {profile?.full_name ?? 'Usuario'}
            </div>
            <div style={{ fontSize: '11px', color: C.tertiary, marginTop: '2px' }}>
              Plan Gratuito
            </div>
          </div>

          {/* Tabs nav */}
          <div style={{
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            {TABS.map((tab, idx) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '11px 16px', fontSize: '13px', fontWeight: 500,
                  border: 'none', cursor: 'pointer',
                  borderBottom: idx < TABS.length - 1 ? `1px solid ${C.border}` : 'none',
                  backgroundColor: activeTab === tab ? C.greenBg : 'transparent',
                  color: activeTab === tab ? C.green : C.muted,
                  borderLeft: `3px solid ${activeTab === tab ? C.green : 'transparent'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Right content */}
        <div>
          {activeTab === 'Perfil' && (
            <div style={{
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '28px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '20px' }}>
                Información del perfil
              </h2>
              <form onSubmit={handleSave}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={labelStyle}>Nombre completo</label>
                    <input
                      value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Tu nombre"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      value={email} disabled
                      style={{ ...inputStyle, backgroundColor: '#F9FAFB', color: C.tertiary, cursor: 'not-allowed' }}
                    />
                    <p style={{ fontSize: '11px', color: C.tertiary, marginTop: '4px', marginBottom: 0 }}>
                      El email no se puede cambiar
                    </p>
                  </div>
                </div>
                <button
                  type="submit" disabled={saving}
                  style={{
                    padding: '9px 24px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 600, color: '#FFFFFF', backgroundColor: C.green,
                    border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'Metas financieras' && (
            <div style={{
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '28px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '20px' }}>
                Metas financieras
              </h2>
              <form onSubmit={handleSave}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                  <div>
                    <label style={labelStyle}>Ingreso mensual objetivo (CLP)</label>
                    <input
                      type="number"
                      value={form.monthly_income_goal}
                      onChange={e => setForm(f => ({ ...f, monthly_income_goal: e.target.value }))}
                      placeholder="Ej: 1500000" min="0"
                      style={inputStyle}
                    />
                    <p style={{ fontSize: '11px', color: C.tertiary, marginTop: '4px', marginBottom: 0 }}>
                      Se usa como referencia en el dashboard
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Meta de ahorro:{' '}
                      <span style={{ color: C.green, fontWeight: 700 }}>{form.savings_goal_pct}%</span>
                    </label>
                    <input
                      type="range"
                      value={form.savings_goal_pct}
                      onChange={e => setForm(f => ({ ...f, savings_goal_pct: e.target.value }))}
                      min="0" max="80" step="5"
                      style={{ width: '100%', accentColor: C.green }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: C.tertiary, marginTop: '4px' }}>
                      <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span>
                    </div>
                    <p style={{ fontSize: '11px', color: C.tertiary, marginTop: '4px', marginBottom: 0 }}>
                      Recomendado: al menos 20% de tus ingresos
                    </p>
                  </div>
                </div>
                <button
                  type="submit" disabled={saving}
                  style={{
                    padding: '9px 24px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 600, color: '#FFFFFF', backgroundColor: C.green,
                    border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'Preferencias' && (
            <div style={{
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '28px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '20px' }}>
                Preferencias
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Moneda</div>
                  <div style={{ fontSize: '12px', color: C.muted }}>Peso Chileno (CLP)</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Idioma</div>
                  <div style={{ fontSize: '12px', color: C.muted }}>Español (Chile)</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Zona horaria</div>
                  <div style={{ fontSize: '12px', color: C.muted }}>América/Santiago (GMT-3)</div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: C.tertiary, marginTop: '16px' }}>
                Más opciones de personalización próximamente.
              </p>
            </div>
          )}

          {activeTab === 'Suscripción' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Current plan */}
              <div style={{
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '12px', padding: '28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '16px' }}>
                  Plan actual
                </h2>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '10px',
                  backgroundColor: C.greenBg, border: '1px solid #A7F3D0',
                  marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '24px' }}>🌱</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.green }}>Plan Gratuito</div>
                    <div style={{ fontSize: '12px', color: '#059669' }}>Dashboard · Ingresos · Gastos · 5 mensajes IA/mes</div>
                  </div>
                </div>
              </div>

              {/* Premium CTA */}
              <div style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
                borderRadius: '12px', padding: '28px',
                color: '#FFFFFF',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>✨</span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>AHORIA Premium</h3>
                </div>
                <p style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.6, marginBottom: '20px' }}>
                  Mensajes IA ilimitados, análisis avanzado, proyecciones, alertas inteligentes y más.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {[
                    '✓ Mensajes IA ilimitados con Fin',
                    '✓ Análisis profundo de patrones',
                    '✓ Alertas de presupuesto automáticas',
                    '✓ Proyecciones financieras avanzadas',
                    '✓ Exportar reportes en PDF',
                  ].map(f => (
                    <div key={f} style={{ fontSize: '12px', opacity: 0.95 }}>{f}</div>
                  ))}
                </div>
                <button style={{
                  backgroundColor: '#FFFFFF', color: C.ai,
                  padding: '10px 24px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
                }}>
                  Actualizar a Premium — $4.990/mes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Seguridad' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Password */}
              <div style={{
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '12px', padding: '28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '20px' }}>
                  Contraseña
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelStyle}>Contraseña actual</label>
                    <input type="password" placeholder="••••••••" style={inputStyle} disabled />
                  </div>
                  <div>
                    <label style={labelStyle}>Nueva contraseña</label>
                    <input type="password" placeholder="••••••••" style={inputStyle} disabled />
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: C.tertiary, marginBottom: '16px' }}>
                  El cambio de contraseña estará disponible próximamente.
                </p>
                <button
                  disabled
                  style={{
                    padding: '9px 24px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 600, color: '#FFFFFF', backgroundColor: C.green,
                    border: 'none', cursor: 'not-allowed', opacity: 0.5,
                  }}
                >
                  Cambiar contraseña
                </button>
              </div>

              {/* Danger zone */}
              <div style={{
                backgroundColor: C.surface, border: `1px solid #FECACA`,
                borderRadius: '12px', padding: '28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '16px' }}>
                  Sesión y cuenta
                </h2>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 600, color: C.red, border: `1px solid #FECACA`,
                    backgroundColor: C.redBg, cursor: 'pointer', marginBottom: '12px',
                  }}
                >
                  Cerrar sesión
                </button>
                <button
                  disabled
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 600, color: C.tertiary, border: `1px solid ${C.border}`,
                    backgroundColor: 'transparent', cursor: 'not-allowed',
                  }}
                >
                  Eliminar cuenta (próximamente)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
