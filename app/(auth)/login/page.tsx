'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
          Bienvenido de vuelta
        </h2>
        <p className="text-sm" style={{ color: S.muted }}>
          Ingresa para ver tu pulso financiero
        </p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: `1px solid rgba(248,113,113,0.2)`, color: S.error }}>
            <span>⚠</span> {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: S.muted }}>
            Email
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com" required autoComplete="email"
            className="w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
            style={{
              backgroundColor: S.input, border: `1px solid ${S.border}`,
              color: S.text, caretColor: S.brand,
            }}
            onFocus={e => e.target.style.borderColor = S.brand}
            onBlur={e => e.target.style.borderColor = S.border}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: S.muted }}>
            Contraseña
          </label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
            className="w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
            style={{
              backgroundColor: S.input, border: `1px solid ${S.border}`,
              color: S.text, caretColor: S.brand,
            }}
            onFocus={e => e.target.style.borderColor = S.brand}
            onBlur={e => e.target.style.borderColor = S.border}
          />
        </div>

        <button type="submit" disabled={isLoading}
          className="w-full font-bold rounded-xl py-3 text-sm transition-all mt-1 active:scale-[0.98] disabled:opacity-60"
          style={{
            background: isLoading ? S.border : 'linear-gradient(135deg, #34d399, #059669)',
            color: '#070e0a',
          }}>
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Ingresando...
            </span>
          ) : 'Ingresar a AHORIA'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: S.muted }}>
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="font-semibold transition-all hover:opacity-80" style={{ color: S.brand }}>
          Crea la tuya gratis
        </Link>
      </p>
    </div>
  )
}
