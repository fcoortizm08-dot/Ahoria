'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const C = {
  border: '#E5E7EB', green: '#10B981', greenDk: '#059669', greenBg: '#ECFDF5',
  text: '#111827', muted: '#6B7280', tertiary: '#9CA3AF',
  red: '#EF4444', redBg: '#FEF2F2', amber: '#F59E0B',
  surface: '#FFFFFF',
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError('No pudimos crear tu cuenta. Intenta nuevamente.')
      setIsLoading(false)
      return
    }
    setSuccess(true)
    setIsLoading(false)
  }

  const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const pwLabels   = ['', 'Débil', 'Buena', 'Fuerte']
  const pwColors   = ['', C.red, C.amber, C.green]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: `1px solid ${C.border}`, borderRadius: '8px',
    backgroundColor: C.surface, color: C.text,
    fontSize: '14px', outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
  }

  if (success) {
    return (
      <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          backgroundColor: C.greenBg, border: '1px solid #A7F3D0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', margin: '0 auto 20px',
        }}>
          📧
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.text, margin: '0 0 10px' }}>
          Revisa tu email
        </h2>
        <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.7, marginBottom: '24px' }}>
          Enviamos un enlace de activación a{' '}
          <span style={{ fontWeight: 700, color: C.text }}>{email}</span>.
          <br />
          Haz click en el enlace para empezar a ahorrar.
        </p>
        <Link href="/login" style={{ fontSize: '13px', color: C.green, fontWeight: 700, textDecoration: 'none' }}>
          ← Ir al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: '380px' }}>
      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 mb-8 lg:hidden">
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFFFFF', fontWeight: 800, fontSize: '16px',
        }}>A</div>
        <span style={{ fontSize: '18px', fontWeight: 800, color: C.text }}>
          AHO<span style={{ color: C.green }}>RIA</span>
        </span>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: C.text, letterSpacing: '-0.5px', margin: '0 0 6px' }}>
          Crea tu cuenta
        </h2>
        <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>
          Plan Gratis incluido · Sin tarjeta de crédito
        </p>
      </div>

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 14px', borderRadius: '8px',
            backgroundColor: C.redBg, border: '1px solid #FECACA',
            color: C.red, fontSize: '13px', fontWeight: 500,
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        {[
          { label: 'Nombre completo', type: 'text', value: fullName, set: setFullName, ph: 'Tu nombre completo', auto: 'name' },
          { label: 'Email', type: 'email', value: email, set: setEmail, ph: 'tu@email.com', auto: 'email' },
        ].map(f => (
          <div key={f.label}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.muted, marginBottom: '6px' }}>
              {f.label}
            </label>
            <input
              type={f.type} value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.ph} required autoComplete={f.auto}
              style={inputStyle}
              onFocus={e => {
                e.target.style.borderColor = C.green
                e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'
              }}
              onBlur={e => {
                e.target.style.borderColor = C.border
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>
        ))}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.muted, marginBottom: '6px' }}>
            Contraseña
          </label>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres" required autoComplete="new-password"
            style={inputStyle}
            onFocus={e => {
              e.target.style.borderColor = C.green
              e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'
            }}
            onBlur={e => {
              e.target.style.borderColor = C.border
              e.target.style.boxShadow = 'none'
            }}
          />
          {password.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{
                    height: '4px', flex: 1, borderRadius: '999px',
                    backgroundColor: pwStrength >= i ? pwColors[pwStrength] : '#E5E7EB',
                    transition: 'background-color 0.2s ease',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: pwColors[pwStrength], minWidth: '40px' }}>
                {pwLabels[pwStrength]}
              </span>
            </div>
          )}
        </div>

        <button
          type="submit" disabled={isLoading}
          style={{
            width: '100%', fontWeight: 700, borderRadius: '8px',
            padding: '12px', fontSize: '14px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFFFFF',
            border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'opacity 0.15s ease', marginTop: '4px',
            boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
          }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{
                width: '14px', height: '14px', borderRadius: '999px',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF',
                animation: 'spin 0.8s linear infinite', display: 'block',
              }} />
              Creando tu cuenta...
            </span>
          ) : 'Empezar gratis →'}
        </button>
      </form>

      <p style={{ fontSize: '11px', color: C.tertiary, textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
        Al registrarte aceptas nuestros{' '}
        <span style={{ color: C.green, cursor: 'pointer' }}>términos de servicio</span>
        {' '}y{' '}
        <span style={{ color: C.green, cursor: 'pointer' }}>política de privacidad</span>.
      </p>

      <p style={{ textAlign: 'center', fontSize: '13px', color: C.muted, marginTop: '16px' }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" style={{ color: C.green, fontWeight: 700, textDecoration: 'none' }}>
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
