'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', icon: '◈', label: 'Inicio' },
  { href: '/expenses',  icon: '↓', label: 'Gastos' },
  { href: '/ai',        icon: '✦', label: 'IA',     isAI: true },
  { href: '/income',    icon: '↑', label: 'Ingresos' },
  { href: '/goals',     icon: '◎', label: 'Metas' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden flex items-center px-1"
      style={{ backgroundColor: 'rgba(14,25,18,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #1e3228' }}>
      {NAV.map(item => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        const isAI = item.href === '/ai'
        return (
          <Link key={item.href} href={item.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all">
            {isAI ? (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: isActive ? 'linear-gradient(135deg, #c084fc, #818cf8)' : 'rgba(192,132,252,0.1)',
                  border: isActive ? 'none' : '1px solid rgba(192,132,252,0.2)',
                  boxShadow: isActive ? '0 4px 12px rgba(192,132,252,0.25)' : 'none',
                }}>
                <span className="text-sm font-bold" style={{ color: isActive ? '#070e0a' : '#c084fc' }}>✦</span>
              </div>
            ) : (
              <span className="text-xl leading-none" style={{ color: isActive ? '#34d399' : '#364d3f' }}>
                {item.icon}
              </span>
            )}
            <span className="text-[9px] font-semibold leading-none"
              style={{ color: isActive ? (isAI ? '#c084fc' : '#34d399') : '#364d3f' }}>
              {item.label}
            </span>
            {isActive && !isAI && (
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#34d399' }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
