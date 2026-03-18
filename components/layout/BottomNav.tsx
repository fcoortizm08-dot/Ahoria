'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Inicio' },
  { href: '/expenses', icon: '💸', label: 'Gastos' },
  { href: '/income', icon: '💰', label: 'Ingresos' },
  { href: '/debts', icon: '📋', label: 'Deudas' },
  { href: '/goals', icon: '🎯', label: 'Metas' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#0d1117] border-t border-[#1e2d45] flex items-center px-2 pb-safe">
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-all ${
              isActive ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className={`text-[9px] font-semibold ${isActive ? 'text-blue-400' : 'text-slate-600'}`}>
              {item.label}
            </span>
            {isActive && <div className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />}
          </Link>
        )
      })}
    </nav>
  )
}
