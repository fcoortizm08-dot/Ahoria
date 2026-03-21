'use client'

import { useFinanceStore } from '@/store/useFinanceStore'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function MonthSelector() {
  const { activeYear, activeMonth, goToPrevMonth, goToNextMonth } = useFinanceStore()
  const now = new Date()
  const isCurrentMonth = activeYear === now.getFullYear() && activeMonth === now.getMonth()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={goToPrevMonth}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          color: '#6B7280',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F3F4F6' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF' }}
      >
        ‹
      </button>
      <span style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#374151',
        minWidth: '140px',
        textAlign: 'center',
      }}>
        {MONTHS[activeMonth]} {activeYear}
      </span>
      <button
        onClick={goToNextMonth}
        disabled={isCurrentMonth}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          color: '#6B7280',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isCurrentMonth ? 'not-allowed' : 'pointer',
          opacity: isCurrentMonth ? 0.4 : 1,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { if (!isCurrentMonth) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F3F4F6' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF' }}
      >
        ›
      </button>
    </div>
  )
}
