import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Trend {
  value: number
  label: string
}

interface AhKpiProps {
  label: string
  value: string
  sub?: string
  color?: string
  icon?: ReactNode
  trend?: Trend
  compact?: boolean
  className?: string
}

function TrendIndicator({ trend }: { trend: Trend }) {
  const isPositive = trend.value >= 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
      <span style={{ color: isPositive ? '#10B981' : '#EF4444', fontSize: '11px' }}>
        {isPositive ? (
          // Arrow up
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          // Arrow down
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17 7L7 17M7 17H17M7 17V7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      <span style={{
        fontSize: '11px',
        fontWeight: 600,
        color: isPositive ? '#10B981' : '#EF4444',
      }}>
        {isPositive ? '+' : ''}{trend.value}%
      </span>
      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{trend.label}</span>
    </div>
  )
}

export function AhKpi({
  label,
  value,
  sub,
  color = '#10B981',
  icon,
  trend,
  compact = false,
  className,
}: AhKpiProps) {
  return (
    <div
      className={cn('rounded-2xl', className)}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: compact ? '14px 16px' : '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            margin: 0,
          }}>
            {label}
          </p>
          <p style={{
            fontSize: compact ? '20px' : '26px',
            fontWeight: 800,
            color: '#111827',
            margin: compact ? '4px 0 0' : '6px 0 0',
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
          }}>
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '3px 0 0' }}>
              {sub}
            </p>
          )}
          {trend && <TrendIndicator trend={trend} />}
        </div>
        {icon && (
          <div style={{
            width: compact ? '34px' : '40px',
            height: compact ? '34px' : '40px',
            borderRadius: '10px',
            backgroundColor: color + '15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export default AhKpi
