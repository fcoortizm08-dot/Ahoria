import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface AhSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
}

// ── Base skeleton ─────────────────────────────────────────────────────────────

export function AhSkeleton({ width, height, className, style, ...props }: AhSkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-gray-100 rounded-xl', className)}
      style={{ width, height, ...style }}
      {...props}
    />
  )
}

// ── KPI skeleton ──────────────────────────────────────────────────────────────

export function AhSkeletonKpi({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-2xl p-5', className)}
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <AhSkeleton height={10} width={80} className="rounded-full mb-3" />
          <AhSkeleton height={28} width={120} className="rounded-lg mb-2" />
          <AhSkeleton height={10} width={60} className="rounded-full" />
        </div>
        <AhSkeleton width={40} height={40} className="rounded-xl" />
      </div>
    </div>
  )
}

// ── Card skeleton ─────────────────────────────────────────────────────────────

export function AhSkeletonCard({ height = 200, className }: { height?: number; className?: string }) {
  return (
    <div
      className={cn('rounded-2xl p-5', className)}
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', height }}
    >
      <AhSkeleton height={16} width="50%" className="rounded-lg mb-3" />
      <AhSkeleton height={12} width="30%" className="rounded-full mb-6" />
      <AhSkeleton height={12} width="100%" className="rounded-full mb-2" />
      <AhSkeleton height={12} width="80%" className="rounded-full mb-2" />
      <AhSkeleton height={12} width="60%" className="rounded-full" />
    </div>
  )
}

// ── Text skeleton ─────────────────────────────────────────────────────────────

export function AhSkeletonText({
  width = '100%',
  lines = 1,
  className,
}: {
  width?: string | number
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <AhSkeleton
          key={i}
          height={12}
          width={i === lines - 1 && lines > 1 ? '60%' : width}
          className="rounded-full"
        />
      ))}
    </div>
  )
}

// ── Avatar skeleton ───────────────────────────────────────────────────────────

export function AhSkeletonAvatar({
  size = 40,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <AhSkeleton
      width={size}
      height={size}
      className={cn('rounded-full flex-shrink-0', className)}
    />
  )
}

// ── Row skeleton ──────────────────────────────────────────────────────────────

export function AhSkeletonRow({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-3 py-3', className)}
      style={{ borderBottom: '1px solid #F3F4F6' }}
    >
      <AhSkeletonAvatar size={36} />
      <div style={{ flex: 1 }}>
        <AhSkeleton height={12} width="50%" className="rounded-full mb-2" />
        <AhSkeleton height={10} width="30%" className="rounded-full" />
      </div>
      <AhSkeleton height={12} width={60} className="rounded-full" />
    </div>
  )
}

// ── Full page skeleton ────────────────────────────────────────────────────────

export function AhSkeletonPage({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <AhSkeleton height={28} width={200} className="rounded-lg mb-2" />
        <AhSkeleton height={14} width={300} className="rounded-full" />
      </div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <AhSkeletonKpi />
        <AhSkeletonKpi />
        <AhSkeletonKpi />
      </div>
      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <AhSkeletonCard height={220} />
        <AhSkeletonCard height={220} />
      </div>
    </div>
  )
}

export default AhSkeleton
