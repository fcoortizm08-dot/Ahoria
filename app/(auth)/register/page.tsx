'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError('Error al crear la cuenta. Intenta nuevamente.')
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-extrabold text-white mb-2">Revisa tu email</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Te enviamos un enlace a <span className="text-white font-semibold">{email}</span>.
          Haz click para activar tu cuenta.
        </p>
        <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm font-semibold">
          ← Volver al login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">
          Crea tu cuenta
        </h2>
        <p className="text-slate-500 text-sm">Gratis para siempre en el plan básico</p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre completo</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Tu nombre"
            required
            className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
          {password.length > 0 && (
            <div className="flex gap-1 mt-2">
              {[1,2,3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                  password.length >= i * 4
                    ? i === 1 ? 'bg-red-500' : i === 2 ? 'bg-amber-500' : 'bg-emerald-500'
                    : 'bg-slate-700'
                }`}/>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-60 mt-1"
        >
          {isLoading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
