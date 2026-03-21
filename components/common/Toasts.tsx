'use client'

import { useFinanceStore } from '@/store/useFinanceStore'

export function Toasts() {
  const { toasts, removeToast } = useFinanceStore()

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px',
      zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', borderRadius: '10px',
            fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            backgroundColor: t.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${t.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: t.type === 'success' ? '#065F46' : '#DC2626',
            animation: 'fadeIn 0.2s ease-out',
            minWidth: '240px',
          }}
        >
          <span style={{
            width: '20px', height: '20px', borderRadius: '999px', flexShrink: 0,
            backgroundColor: t.type === 'success' ? '#10B981' : '#EF4444',
            color: '#FFFFFF', fontSize: '11px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {t.type === 'success' ? '✓' : '✕'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
