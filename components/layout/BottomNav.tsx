'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Inicio' },
  { href: '/expenses',  icon: '💸', label: 'Gastos' },
  { href: '/ai',        icon: '✦',  label: 'IA',     isAI: true },
  { href: '/income',    icon: '💰', label: 'Ingresos' },
  { href: '/goals',     icon: '🎯', label: 'Metas' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#0d1117]/95 backdrop-blur-sm border-t border-[#1e2d45] flex items-center px-1">
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        const isAI = item.href === '/ai'
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all ${
              isActive
                ? isAI ? 'text-violet-400' : 'text-blue-400'
                : isAI ? 'text-violet-600 hover:text-violet-400' : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            {isAI ? (
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-violet-500 shadow-lg shadow-violet-500/30'
                  : 'bg-violet-500/10 border border-violet-500/20'
              }`}>
                <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-violet-400'}`}>✦</span>
              </div>
            ) : (
              <span className="text-xl leading-none">{item.icon}</span>
            )}
            <span className={`text-[9px] font-semibold leading-none ${
              isActive ? (isAI ? 'text-violet-400' : 'text-blue-400') : isAI ? 'text-violet-600' : 'text-slate-600'
            }`}>
              {item.label}
            </span>
            {isActive && !isAI && <div className="w-1 h-1 rounded-full bg-blue-400" />}
          </Link>
        )
      })}
    </nav>
  )
}
