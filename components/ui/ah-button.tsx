'use client'

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export const BTN_GRADIENTS = {
  primary: {
    background: 'linear-gradient(135deg, #10B981, #059669)',
    boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
  },
  danger: {
    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
    boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
  },
} as const

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'link'
type Size    = 'sm' | 'md' | 'lg'

interface AhButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  asChild?: boolean
  children?: ReactNode
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'py-1.5 px-3 text-xs',
  md: 'py-2 px-4 text-sm',
  lg: 'py-2.5 px-5 text-sm',
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'text-white font-semibold',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium border border-gray-200',
  danger: 'text-white font-semibold',
  ghost: 'text-gray-600 hover:bg-gray-100 font-medium',
  outline: 'bg-transparent text-gray-700 font-medium border border-gray-300 hover:bg-gray-50',
  link: 'text-emerald-600 hover:text-emerald-700 font-medium underline-offset-4 hover:underline p-0',
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      style={{ width: '14px', height: '14px', flexShrink: 0 }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export const AhButton = forwardRef<HTMLButtonElement, AhButtonProps>(function AhButton(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    asChild = false,
    className,
    children,
    style,
    ...props
  },
  ref
) {
  const Comp = asChild ? Slot : 'button'

  const gradientStyle =
    variant === 'primary'
      ? BTN_GRADIENTS.primary
      : variant === 'danger'
      ? BTN_GRADIENTS.danger
      : {}

  const isDisabled = disabled || loading

  return (
    <Comp
      ref={ref}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 cursor-pointer select-none whitespace-nowrap',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        variant === 'link' ? '' : 'active:scale-[0.98]',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      style={{ ...gradientStyle, ...style }}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </Comp>
  )
})

export default AhButton
