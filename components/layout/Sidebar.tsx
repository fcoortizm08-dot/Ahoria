'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard',    group: 'principal' },
  { href: '/income',    icon: '↑', label: 'Ingresos',     group: 'principal' },
  { href: '/expenses',  icon: '↓', label: 'Gastos',       group: 'principal' },
  { href: '/debts',     icon: '▤', label: 'Deudas',       group: 'gestion'   },
  { href: '/goals',     icon: '◎', label: 'Metas',        group: 'gestion'   },
  { href: '/ai',        icon: '✦', label: 'Asistente IA', group: 'ia'        },
  { href: '/settings',  icon: '⚙', label: 'Ajustes',      group: 'cuenta'    },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const profile = useFinanceStore(s => s.profile)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'

  const groups = [
    { key: 'principal', label: 'Principal' },
    { key: 'gestion',   label: 'Gestión' },
    { key: 'ia',        label: 'Inteligencia' },
    { key: 'cuenta',    label: 'Cuenta' },
  ]

  return (
    <aside className="hidden md:flex w-[210px] bg-[#0d1117] border-r border-[#1e2d45] flex-col fixed top-0 left-0 bottom-0 z-50 py-4 px-2.5 overflow-y-auto">

      <div className="flex items-center gap-2.5 px-2 pb-4 mb-2 border-b border-[#1e2d45]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          F
        </div>
        <span className="text-sm font-bold text-white">
          Fin<span className="text-blue-400">Track</span> Pro
        </span>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {groups.map(({ key, label }) => {
          const items = NAV_ITEMS.filter(i => i.group === key)
          if (!items.length) return null
          return (
            <div key={key}>
              <p className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#2d3f58] px-2 mb-1.5">
                {label}
              </p>
              {items.map(item => {
                const isActive = pathname === item.href
                const isAI = item.href === '/ai'
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all mb-0.5 relative border',
                      isAI && !isActive
                        ? 'text-violet-400 border-violet-500/10 hover:bg-violet-500/10 hover:border-violet-500/20'
                        : isActive
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                        : 'text-slate-500 border-transparent hover:bg-[#111827] hover:text-slate-300'
                    )}
                  >
                    {isActive && !isAI && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-500 rounded-r-full" />
                    )}
                    {isActive && isAI && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-violet-500 rounded-r-full" />
                    )}
                    <span className="text-sm w-4 text-center">{item.icon}</span>
                    {item.label}
                    {isAI && !isActive && (
                      <span className="ml-auto text-[8px] font-bold text-violet-400 bg-violet-500/10 rounded-full px-1.5 py-0.5 leading-none">
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

      <div className="pt-3 border-t border-[#1e2d45]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-[#111827] hover:text-slate-300 transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 text-left">
            <div className="text-white text-[11px] font-semibold truncate">
              {profile?.full_name ?? 'Usuario'}
            </div>
            <div className="text-slate-600 text-[10px]">Cerrar sesión</div>
          </div>
        </button>
      </div>
    </aside>
  )
}
