'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const C = {
  border: '#E5E7EB', green: '#10B981', greenDk: '#059669', greenBg: '#ECFDF5',
  text: '#111827', muted: '#6B7280', tertiary: '#9CA3AF',
  red: '#EF4444', redBg: '#FEF2F2',
  surface: '#FFFFFF',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos. Verifica tus datos.')
      setIsLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: `1px solid ${C.border}`, borderRadius: '8px',
    backgroundColor: C.surface, color: C.text,
    fontSize: '14px', outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ width: '100%', maxWidth: '380px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: C.text, letterSpacing: '-0.5px', margin: '0 0 6px' }}>
          Bienvenido de vuelta
        </h2>
        <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>
          Ingresa para ver tu pulso financiero
        </p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 14px', borderRadius: '8px',
            backgroundColor: C.redBg, border: `1px solid #FECACA`,
            color: C.red, fontSize: '13px', fontWeight: 500,
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.muted, marginBottom: '6px' }}>
            Email
          </label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com" required autoComplete="email"
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

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.muted }}>
              Contraseña
            </label>
            <button
              type="button"
              style={{
                fontSize: '12px', color: C.green, background: 'none',
                border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0,
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
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

        <button
          type="submit" disabled={isLoading}
          style={{
            width: '100%', fontWeight: 700, borderRadius: '8px',
            padding: '12px', fontSize: '14px',
            background: isLoading ? C.border : 'linear-gradient(135deg, #10B981, #059669)',
            color: isLoading ? C.muted : '#FFFFFF',
            border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease', marginTop: '4px',
            boxShadow: isLoading ? 'none' : '0 2px 6px rgba(16,185,129,0.3)',
          }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{
                width: '14px', height: '14px', borderRadius: '999px',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF',
                animation: 'spin 0.8s linear infinite', display: 'block',
              }} />
              Ingresando...
            </span>
          ) : 'Ingresar a AHORIA'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: C.muted, marginTop: '20px' }}>
        ¿No tienes cuenta?{' '}
        <Link href="/register" style={{ color: C.green, fontWeight: 700, textDecoration: 'none' }}>
          Crea la tuya gratis
        </Link>
      </p>
    </div>
  )
}
