'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function SubscribedBanner() {
  const [visible, setVisible] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      router.replace('/dashboard')
    }, 5000)
    return () => clearTimeout(timer)
  }, [router])

  if (!visible) return null

  return (
    <div
      role="alert"
      onClick={() => { setVisible(false); router.replace('/dashboard') }}
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 transition hover:bg-emerald-500/15"
    >
      <span className="text-lg">🎉</span>
      <div>
        <p className="text-sm font-semibold text-emerald-300">¡Bienvenido a Pro!</p>
        <p className="text-xs text-emerald-400/70">Tu plan está activo. Disfruta de todas las funciones premium.</p>
      </div>
      <span className="ml-auto text-xs text-emerald-600">✕</span>
    </div>
  )
}
