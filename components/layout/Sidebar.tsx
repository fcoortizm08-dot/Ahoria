'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEntitlements } from '@/hooks/useEntitlements'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard', group: 'principal' },
  { href: '/income',    icon: '↑', label: 'Ingresos',  group: 'principal' },
  { href: '/expenses',  icon: '↓', label: 'Gastos',    group: 'principal' },
  { href: '/debts',     icon: '▤', label: 'Deudas',    group: 'gestion'   },
  { href: '/goals',     icon: '◎', label: 'Metas',     group: 'gestion'   },
]

export function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isPro, isLoading: entitlementsLoading } = useEntitlements()

  const showUpgrade = !entitlementsLoading && !isPro

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U'

  return (
    <aside className="w-[210px] bg-[#0d1117] border-r border-[#1e2d45] flex flex-col fixed top-0 left-0 bottom-0 z-50 py-4 px-2.5 overflow-y-auto">

      <div className="flex items-center gap-2.5 px-2 pb-4 mb-2 border-b border-[#1e2d45]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          A
        </div>
        <span className="text-sm font-bold text-white">
          Ahoria
        </span>
      </div>

      <div className="mb-1">
        <p className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#2d3f58] px-2 mb-1.5">
          Principal
        </p>
        {NAV_ITEMS.filter(i => i.group === 'principal').map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all mb-0.5 relative border',
              pathname === item.href
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                : 'text-slate-500 border-transparent hover:bg-[#111827] hover:text-slate-300'
            )}
          >
            {pathname === item.href && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-500 rounded-r-full" />
            )}
            <span className="text-sm w-4 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#2d3f58] px-2 mb-1.5 mt-2">
          Gestión
        </p>
        {NAV_ITEMS.filter(i => i.group === 'gestion').map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all mb-0.5 relative border',
              pathname === item.href
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                : 'text-slate-500 border-transparent hover:bg-[#111827] hover:text-slate-300'
            )}
          >
            {pathname === item.href && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-500 rounded-r-full" />
            )}
            <span className="text-sm w-4 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-auto pt-3 border-t border-[#1e2d45]">
        {showUpgrade && (
          <Link
            href="/upgrade"
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold mb-2 transition-all border',
              pathname === '/upgrade'
                ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                : 'text-violet-400 border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15 hover:text-violet-300',
            )}
          >
            <span className="text-sm w-4 text-center">★</span>
            Mejorar a Pro
          </Link>
        )}

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