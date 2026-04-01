'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const C = {
  surface: '#FFFFFF', border: '#E5E7EB', bg: '#F7F8FA',
  ai: '#8B5CF6', aiBg: '#F5F3FF', aiBorder: '#DDD6FE',
  green: '#10B981', greenBg: '#ECFDF5',
  text: '#111827', muted: '#6B7280', tertiary: '#9CA3AF',
  red: '#EF4444',
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

interface UsageInfo {
  used: number
  limit: number
  isPremium: boolean
}

const QUICK_PROMPTS = [
  { icon: '📊', text: '¿Cómo voy este mes?' },
  { icon: '💸', text: '¿En qué gasto más?' },
  { icon: '🔮', text: '¿Cuándo logro mi meta?' },
  { icon: '💡', text: 'Dame un consejo' },
  { icon: '📉', text: '¿Cómo reducir gastos?' },
  { icon: '🏦', text: 'Resúmeme este mes' },
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 2px' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: '6px', height: '6px', borderRadius: '999px',
            backgroundColor: C.tertiary,
            animation: 'bounce 1s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}

function renderBold(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#111827;font-weight:600">$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:#F3F4F6;padding:1px 4px;border-radius:4px;font-size:11px;font-family:monospace">$1</code>')
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: '4px' }} />
        if (line.match(/^[-•*]\s/)) {
          const text = line.replace(/^[-•*]\s/, '')
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: C.ai, flexShrink: 0, marginTop: '2px', fontSize: '10px' }}>•</span>
              <span style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderBold(text) }} />
            </div>
          )
        }
        if (line.match(/^\d+\.\s/)) {
          const match = line.match(/^(\d+)\.\s(.+)/)
          if (match) return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: C.ai, flexShrink: 0, fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>{match[1]}.</span>
              <span style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderBold(match[2]) }} />
            </div>
          )
        }
        return (
          <p key={i} style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: renderBold(line) }} />
        )
      })}
    </div>
  )
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 5, isPremium: false })
  const [limitReached, setLimitReached] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const aiMsg: Message   = { id: crypto.randomUUID(), role: 'assistant', content: '', isStreaming: true }

    setMessages(prev => [...prev, userMsg, aiMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.status === 429) {
        const data = await res.json()
        setUsage({ used: data.used, limit: data.limit, isPremium: false })
        setLimitReached(true)
        setMessages(prev => prev.filter(m => m.id !== aiMsg.id))
        setIsLoading(false)
        return
      }

      if (!res.ok || !res.body) throw new Error('Error en la respuesta')

      const used      = parseInt(res.headers.get('X-Messages-Used') ?? '0')
      const limit     = parseInt(res.headers.get('X-Messages-Limit') ?? '5')
      const isPremium = res.headers.get('X-Is-Premium') === 'true'
      setUsage({ used, limit, isPremium })

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, content: fullText } : m))
      }

      setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, isStreaming: false } : m))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiMsg.id ? { ...m, content: 'Lo siento, ocurrió un error. Intenta de nuevo.', isStreaming: false } : m
      ))
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [messages, isLoading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
    }}>
      {/* Left panel */}
      <div style={{
        width: '280px', flexShrink: 0,
        backgroundColor: C.surface, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '24px 20px',
        overflowY: 'auto',
      }}>
        {/* Avatar + title */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontWeight: 800, fontSize: '22px',
            marginBottom: '12px',
            boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
          }}>
            F
          </div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
            Fin — Asistente financiero
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '999px',
              backgroundColor: C.green, animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '11px', color: C.muted }}>En línea · Conoce tus finanzas</span>
          </div>
        </div>

        {/* Capabilities */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: C.tertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Puede ayudarte con
          </div>
          {[
            { icon: '📊', label: 'Análisis del mes' },
            { icon: '🔮', label: 'Proyecciones' },
            { icon: '💡', label: 'Consejos personalizados' },
            { icon: '🎯', label: 'Metas y plazos' },
            { icon: '⚠️', label: 'Alertas de gasto' },
            { icon: '🏦', label: 'Resumen financiero' },
          ].map(c => (
            <div key={c.label} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: '14px' }}>{c.icon}</span>
              <span style={{ fontSize: '12px', color: C.muted }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Quick prompts */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: C.tertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Preguntas rápidas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {QUICK_PROMPTS.map(p => (
              <button
                key={p.text}
                onClick={() => sendMessage(p.text)}
                disabled={isLoading || limitReached}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', borderRadius: '8px',
                  border: `1px solid ${C.border}`,
                  backgroundColor: C.bg, color: C.muted,
                  fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s ease',
                  opacity: isLoading || limitReached ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.backgroundColor = C.aiBg
                  el.style.borderColor = C.aiBorder
                  el.style.color = C.ai
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.backgroundColor = C.bg
                  el.style.borderColor = C.border
                  el.style.color = C.muted
                }}
              >
                <span>{p.icon}</span>
                <span>{p.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Usage */}
        {!usage.isPremium && (
          <div style={{
            marginTop: 'auto', paddingTop: '20px',
            borderTop: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '8px' }}>
              {usage.used}/{usage.limit} mensajes este mes
            </div>
            <div style={{ height: '4px', backgroundColor: '#E5E7EB', borderRadius: '999px', marginBottom: '10px' }}>
              <div style={{
                height: '4px', borderRadius: '999px', backgroundColor: C.ai,
                width: `${(usage.used / usage.limit) * 100}%`,
              }} />
            </div>
            <div style={{
              padding: '10px 12px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #F5F3FF, #EFF6FF)',
              border: '1px solid #DDD6FE',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.ai, marginBottom: '2px' }}>
                ✨ Activar Premium
              </div>
              <div style={{ fontSize: '11px', color: C.muted }}>
                Mensajes ilimitados y análisis avanzado
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: chat area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        backgroundColor: C.bg, overflow: 'hidden',
      }}>
        {/* Chat messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {isEmpty && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '18px',
                background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontWeight: 800, fontSize: '26px',
                marginBottom: '16px',
                boxShadow: '0 8px 20px rgba(139,92,246,0.25)',
              }}>
                F
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
                Hola, soy Fin 👋
              </h3>
              <p style={{ fontSize: '13px', color: C.muted, textAlign: 'center', maxWidth: '360px', lineHeight: 1.6, margin: '0 0 28px' }}>
                Tu asistente financiero personal. Puedo analizar tus ingresos, gastos y darte consejos basados en tus datos reales.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '480px' }}>
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p.text}
                    onClick={() => sendMessage(p.text)}
                    disabled={isLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px', borderRadius: '10px',
                      border: `1px solid ${C.border}`,
                      backgroundColor: C.surface, cursor: 'pointer',
                      fontSize: '12px', color: C.muted, textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.backgroundColor = C.aiBg
                      el.style.borderColor = C.aiBorder
                      el.style.color = C.ai
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.backgroundColor = C.surface
                      el.style.borderColor = C.border
                      el.style.color = C.muted
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{p.icon}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex', gap: '10px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', fontWeight: 700, fontSize: '12px',
                }}>
                  F
                </div>
              )}
              <div style={{
                maxWidth: '75%', padding: '12px 16px', borderRadius: '12px',
                ...(msg.role === 'user' ? {
                  backgroundColor: C.green,
                  color: '#FFFFFF',
                  borderTopRightRadius: '4px',
                } : {
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  borderTopLeftRadius: '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }),
              }}>
                {msg.role === 'user' ? (
                  <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.6 }}>{msg.content}</p>
                ) : msg.isStreaming && !msg.content ? (
                  <TypingDots />
                ) : (
                  <div>
                    <MessageContent content={msg.content} />
                    {msg.isStreaming && (
                      <span style={{
                        display: 'inline-block', width: '2px', height: '14px',
                        backgroundColor: C.ai, marginLeft: '2px',
                        animation: 'pulse 1s ease-in-out infinite',
                      }} />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '16px 32px 24px',
          borderTop: `1px solid ${C.border}`,
          backgroundColor: C.surface,
          flexShrink: 0,
        }}>
          {/* Usage dots (free) */}
          {!usage.isPremium && usage.limit > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {Array.from({ length: usage.limit }).map((_, i) => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '999px',
                    backgroundColor: i < usage.used ? C.ai : '#E5E7EB',
                  }} />
                ))}
                <span style={{ fontSize: '10px', color: C.tertiary, marginLeft: '4px' }}>
                  {usage.used}/{usage.limit} mensajes
                </span>
              </div>
            </div>
          )}

          {limitReached && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              backgroundColor: C.aiBg, border: `1px solid ${C.aiBorder}`,
              marginBottom: '12px', fontSize: '13px', color: C.ai, fontWeight: 500,
            }}>
              Has usado todos tus mensajes del mes. Activa Premium para continuar.
            </div>
          )}

          <div style={{
            display: 'flex', gap: '10px', alignItems: 'flex-end',
          }}>
            <div style={{
              flex: 1,
              backgroundColor: '#F9FAFB', border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '10px 14px',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={() => {}}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre tus finanzas..."
                disabled={isLoading || limitReached}
                rows={1}
                style={{
                  width: '100%', backgroundColor: 'transparent',
                  border: 'none', outline: 'none', resize: 'none',
                  fontSize: '13px', color: C.text,
                  lineHeight: 1.6, maxHeight: '120px', overflowY: 'auto',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading || limitReached}
              style={{
                width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: (!input.trim() || isLoading || limitReached) ? 'not-allowed' : 'pointer',
                background: (!input.trim() || isLoading || limitReached)
                  ? '#E5E7EB'
                  : 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                color: (!input.trim() || isLoading || limitReached) ? '#9CA3AF' : '#FFFFFF',
                transition: 'all 0.15s ease',
              }}
            >
              {isLoading
                ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF', borderRadius: '999px', animation: 'spin 0.8s linear infinite', display: 'block' }} />
                : <span style={{ fontSize: '16px', fontWeight: 700 }}>↑</span>
              }
            </button>
          </div>
          <p style={{ fontSize: '10px', color: C.tertiary, textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
            Fin usa tus datos reales · Enter para enviar · Shift+Enter nueva línea
          </p>
        </div>
      </div>
    </div>
  )
}
