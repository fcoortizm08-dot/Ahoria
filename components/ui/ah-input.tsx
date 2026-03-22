'use client'

import {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
  forwardRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

// ── Shared focus / error styles ───────────────────────────────────────────────

function useFieldStyles(error?: string) {
  const [focused, setFocused] = useState(false)

  const borderColor = error ? '#EF4444' : focused ? '#10B981' : '#E5E7EB'
  const boxShadow = error
    ? focused ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'
    : focused ? '0 0 0 3px rgba(16,185,129,0.1)' : 'none'

  return { focused, setFocused, borderColor, boxShadow }
}

// ── Label + helper + error ────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label?: string; required?: boolean }) {
  if (!label) return null
  return (
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
      {label}
      {required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
    </label>
  )
}

function FieldMessage({ error, helper }: { error?: string; helper?: string }) {
  if (error) return (
    <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>{error}</p>
  )
  if (helper) return (
    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>{helper}</p>
  )
  return null
}

// ── Base field wrapper ────────────────────────────────────────────────────────

function FieldWrapper({
  label, error, helper, required, children,
}: {
  label?: string
  error?: string
  helper?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      {children}
      <FieldMessage error={error} helper={helper} />
    </div>
  )
}

// ── AhInput ───────────────────────────────────────────────────────────────────

interface AhInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  helper?: string
  error?: string
  prefix?: ReactNode
  suffix?: ReactNode
}

export const AhInput = forwardRef<HTMLInputElement, AhInputProps>(function AhInput(
  { label, helper, error, prefix, suffix, className, required, disabled, style, ...props },
  ref
) {
  const { focused, setFocused, borderColor, boxShadow } = useFieldStyles(error)

  return (
    <FieldWrapper label={label} error={error} helper={helper} required={required}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow,
          overflow: 'hidden',
        }}
      >
        {prefix && (
          <span style={{
            padding: '0 10px',
            fontSize: '13px',
            color: '#9CA3AF',
            borderRight: '1px solid #E5E7EB',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F9FAFB',
            flexShrink: 0,
            alignSelf: 'stretch',
          }}>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          disabled={disabled}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn('outline-none bg-transparent w-full', className)}
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            color: '#111827',
            cursor: disabled ? 'not-allowed' : undefined,
            ...style,
          }}
          {...props}
        />
        {suffix && (
          <span style={{
            padding: '0 10px',
            fontSize: '13px',
            color: '#9CA3AF',
            borderLeft: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F9FAFB',
            flexShrink: 0,
            alignSelf: 'stretch',
          }}>
            {suffix}
          </span>
        )}
      </div>
    </FieldWrapper>
  )
})

// ── AhSelect ─────────────────────────────────────────────────────────────────

interface AhSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helper?: string
  error?: string
}

export const AhSelect = forwardRef<HTMLSelectElement, AhSelectProps>(function AhSelect(
  { label, helper, error, className, required, disabled, children, ...props },
  ref
) {
  const { focused, setFocused, borderColor, boxShadow } = useFieldStyles(error)

  return (
    <FieldWrapper label={label} error={error} helper={helper} required={required}>
      <select
        ref={ref}
        disabled={disabled}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn('outline-none w-full appearance-none', className)}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          color: '#111827',
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
          boxShadow,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: '32px',
        }}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  )
})

// ── AhTextarea ────────────────────────────────────────────────────────────────

interface AhTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helper?: string
  error?: string
}

export const AhTextarea = forwardRef<HTMLTextAreaElement, AhTextareaProps>(function AhTextarea(
  { label, helper, error, className, required, disabled, ...props },
  ref
) {
  const { focused, setFocused, borderColor, boxShadow } = useFieldStyles(error)

  return (
    <FieldWrapper label={label} error={error} helper={helper} required={required}>
      <textarea
        ref={ref}
        disabled={disabled}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn('outline-none w-full resize-y', className)}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          color: '#111827',
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
          boxShadow,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          cursor: disabled ? 'not-allowed' : undefined,
          minHeight: '80px',
        }}
        {...props}
      />
    </FieldWrapper>
  )
})

export default AhInput
