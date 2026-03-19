'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useFinanceStore } from '@/store/useFinanceStore'

const NAV = [
  { href: '/dashboard', icon: '◈', label: 'Inicio',       group: 'app' },
  { href: '/income',    icon: '↑', label: 'Ingresos',     group: 'app' },
  { href: '/expenses',  icon: '↓', label: 'Gastos',       group: 'app' },
  { href: '/debts',     icon: '◫', label: 'Deudas',       group: 'gestión' },
  { href: '/goals',     icon: '◎', label: 'Metas',        group: 'gestión' },
  { href: '/ai',        icon: '✦', label: 'Asistente IA', group: 'ia' },
  { href: '/settings',  icon: '⚙', label: 'Ajustes',      group: 'cuenta' },
]

const GROUPS = [
  { key: 'app',     label: 'App' },
  { key: 'gestión', label: 'Gestión' },
  { key: 'ia',      label: 'Inteligencia' },
  { key: 'cuenta',  label: 'Cuenta' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const profile  = useFinanceStore(s => s.profile)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'A'

  return (
    <aside className="hidden md:flex w-[220px] flex-col fixed top-0 left-0 bottom-0 z-50 py-5 px-3 overflow-y-auto"
      style={{ backgroundColor: '#0e1912', borderRight: '1px solid #1e3228' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 pb-5 mb-3" style={{ borderBottom: '1px solid #1e3228' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
          A
        </div>
        <div>
          <span className="text-[15px] font-extrabold tracking-tight" style={{ color: '#ecfdf5' }}>
            AHO<span style={{ color: '#34d399' }}>RIA</span>
          </span>
          <div className="text-[9px] font-medium" style={{ color: '#364d3f' }}>
            Ahorra ahora. Vive mejor.
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-4 flex-1">
        {GROUPS.map(({ key, label }) => {
          const items = NAV.filter(i => i.group === key)
          if (!items.length) return null
          return (
            <div key={key}>
              <p className="text-[9px] font-bold uppercase tracking-[1.4px] px-2 mb-1.5" style={{ color: '#364d3f' }}>
                {label}
              </p>
              {items.map(item => {
                const isActive = pathname === item.href
                const isAI = item.href === '/ai'
                return (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] font-medium transition-all mb-0.5 relative"
                    style={{
                      backgroundColor: isActive ? (isAI ? 'rgba(192,132,252,0.1)' : 'rgba(52,211,153,0.08)') : 'transparent',
                      color: isActive ? (isAI ? '#c084fc' : '#34d399') : (isAI ? '#9d72e8' : '#6b8f7a'),
                      border: `1px solid ${isActive ? (isAI ? 'rgba(192,132,252,0.2)' : 'rgba(52,211,153,0.15)') : 'transparent'}`,
                    }}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                        style={{ backgroundColor: isAI ? '#c084fc' : '#34d399' }} />
                    )}
                    <span className="text-sm w-4 text-center">{item.icon}</span>
                    {item.label}
                    {isAI && !isActive && (
                      <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(192,132,252,0.1)', color: '#c084fc' }}>
                        IA
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* User */}
      <div className="pt-3" style={{ borderTop: '1px solid #1e3228' }}>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] font-medium transition-all"
          style={{ color: '#6b8f7a' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a2e22'; (e.currentTarget as HTMLButtonElement).style.color = '#ecfdf5' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6b8f7a' }}
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #34d399, #818cf8)', color: '#070e0a' }}>
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="font-semibold truncate text-[11px]" style={{ color: '#ecfdf5' }}>
              {profile?.full_name ?? 'Usuario'}
            </div>
            <div className="text-[9px]" style={{ color: '#364d3f' }}>Cerrar sesión</div>
          </div>
        </button>
      </div>
    </aside>
  )
}
