'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const S = {
  bg:      '#070e0a',
  surface: '#0e1912',
  border:  '#1e3228',
  brand:   '#34d399',
  text:    '#ecfdf5',
  muted:   '#6b8f7a',
  input:   '#131f18',
  error:   '#f87171',
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
  const pwColors   = ['', '#f87171', '#fbbf24', '#34d399']

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
          style={{ backgroundColor: 'rgba(52,211,153,0.1)', border: `1px solid rgba(52,211,153,0.2)` }}>
          📧
        </div>
        <h2 className="text-xl font-extrabold mb-2" style={{ color: S.text }}>Revisa tu email</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: S.muted }}>
          Enviamos un enlace de activación a{' '}
          <span className="font-semibold" style={{ color: S.text }}>{email}</span>.
          <br />Haz click en el enlace para empezar a ahorrar.
        </p>
        <Link href="/login" className="text-sm font-semibold transition-all hover:opacity-80" style={{ color: S.brand }}>
          ← Ir al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 mb-8 lg:hidden">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold text-sm"
          style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>A</div>
        <span className="font-extrabold text-base" style={{ color: S.text }}>
          AHO<span style={{ color: S.brand }}>RIA</span>
        </span>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: S.text }}>
          Crea tu cuenta
        </h2>
        <p className="text-sm" style={{ color: S.muted }}>
          Plan Gratis incluido · Sin tarjeta de crédito
        </p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: `1px solid rgba(248,113,113,0.2)`, color: S.error }}>
            <span>⚠</span> {error}
          </div>
        )}

        {[
          { label: 'Nombre completo', type: 'text', value: fullName, set: setFullName, ph: 'Tu nombre', auto: 'name' },
          { label: 'Email', type: 'email', value: email, set: setEmail, ph: 'tu@email.com', auto: 'email' },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: S.muted }}>{f.label}</label>
            <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
              placeholder={f.ph} required autoComplete={f.auto}
              className="w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
              style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: S.text, caretColor: S.brand }}
              onFocus={e => e.target.style.borderColor = S.brand}
              onBlur={e => e.target.style.borderColor = S.border}
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: S.muted }}>Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres" required autoComplete="new-password"
            className="w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
            style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: S.text, caretColor: S.brand }}
            onFocus={e => e.target.style.borderColor = S.brand}
            onBlur={e => e.target.style.borderColor = S.border}
          />
          {password.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1 flex-1">
                {[1,2,3].map(i => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all"
                    style={{ backgroundColor: pwStrength >= i ? pwColors[pwStrength] : '#1e3228' }} />
                ))}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: pwColors[pwStrength] }}>
                {pwLabels[pwStrength]}
              </span>
            </div>
          )}
        </div>

        <button type="submit" disabled={isLoading}
          className="w-full font-bold rounded-xl py-3 text-sm transition-all mt-1 active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #34d399, #059669)', color: '#070e0a' }}>
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Creando tu cuenta...
            </span>
          ) : 'Empezar gratis →'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: S.muted }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold transition-all hover:opacity-80" style={{ color: S.brand }}>
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
