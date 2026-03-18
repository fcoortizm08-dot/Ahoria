'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PremiumGate } from './PremiumGate'

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
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <div key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

function AIAvatar() {
  return (
    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0 shadow-lg shadow-violet-500/20">
      F
    </div>
  )
}

// Renderiza markdown simple: **bold**, listas, párrafos
function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />

        // Bullet list
        if (line.match(/^[-•*]\s/)) {
          const text = line.replace(/^[-•*]\s/, '')
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-violet-400 flex-shrink-0 mt-0.5 text-xs">•</span>
              <span className="text-[13px] text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderBold(text) }} />
            </div>
          )
        }

        // Numbered list
        if (line.match(/^\d+\.\s/)) {
          const [num, ...rest] = line.split(/\.\s(.+)/)
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-violet-400 flex-shrink-0 text-[11px] font-bold mt-0.5">{num}.</span>
              <span className="text-[13px] text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderBold(rest.join('. ')) }} />
            </div>
          )
        }

        return (
          <p key={i} className="text-[13px] text-slate-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderBold(line) }} />
        )
      })}
    </div>
  )
}

function renderBold(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono">$1</code>')
}

export function AIChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 5, isPremium: false })
  const [limitReached, setLimitReached] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Scroll al fondo cuando hay mensajes nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }

    const aiMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMsg, aiMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      // Límite alcanzado
      if (res.status === 429) {
        const data = await res.json()
        setUsage({ used: data.used, limit: data.limit, isPremium: false })
        setLimitReached(true)
        setMessages(prev => prev.filter(m => m.id !== aiMsg.id))
        setIsLoading(false)
        return
      }

      if (!res.ok || !res.body) {
        throw new Error('Error en la respuesta')
      }

      // Actualizar usage headers
      const used     = parseInt(res.headers.get('X-Messages-Used') ?? '0')
      const limit    = parseInt(res.headers.get('X-Messages-Limit') ?? '5')
      const isPremium = res.headers.get('X-Is-Premium') === 'true'
      setUsage({ used, limit, isPremium })

      // Leer stream
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m =>
          m.id === aiMsg.id ? { ...m, content: fullText } : m
        ))
      }

      // Finalizar streaming
      setMessages(prev => prev.map(m =>
        m.id === aiMsg.id ? { ...m, isStreaming: false } : m
      ))

    } catch (err) {
      console.error('[AI Chat]', err)
      setMessages(prev => prev.map(m =>
        m.id === aiMsg.id
          ? { ...m, content: 'Lo siento, ocurrió un error. Intenta de nuevo.', isStreaming: false }
          : m
      ))
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [messages, isLoading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Mostrar upgrade en lugar del chat si se alcanzó el límite
  if (showUpgrade || (limitReached && !usage.isPremium)) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowUpgrade(false); setLimitReached(false) }}
            className="text-slate-500 hover:text-white text-sm transition-all"
          >
            ← Volver
          </button>
        </div>
        <PremiumGate used={usage.used} limit={usage.limit} />
      </div>
    )
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Mensajes ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-4 flex flex-col gap-4">

        {/* Estado vacío con quick prompts */}
        {isEmpty && (
          <div className="flex flex-col items-center pt-4 pb-2 gap-5">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-2xl font-extrabold text-white shadow-xl shadow-violet-500/25">
                F
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-[15px]">Hola, soy Fin 👋</p>
                <p className="text-slate-500 text-[12px] mt-0.5">Tu asistente financiero personal.<br />¿En qué te puedo ayudar hoy?</p>
              </div>
            </div>

            {/* Quick prompts */}
            <div className="w-full grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p.text}
                  onClick={() => sendMessage(p.text)}
                  disabled={isLoading}
                  className="flex items-center gap-2 bg-[#0d1117] border border-[#1e2d45] hover:border-violet-500/30 hover:bg-violet-500/5 rounded-xl px-3 py-2.5 text-left transition-all group disabled:opacity-50"
                >
                  <span className="text-base flex-shrink-0">{p.icon}</span>
                  <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-all leading-tight">{p.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista de mensajes */}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <AIAvatar />}

            <div className={`max-w-[84%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white rounded-tr-sm text-[13px] leading-relaxed'
                : 'bg-[#0d1117] border border-[#1e2d45] rounded-tl-sm'
            }`}>
              {msg.role === 'user' ? (
                msg.content
              ) : msg.isStreaming && !msg.content ? (
                <TypingDots />
              ) : (
                <div>
                  <MessageContent content={msg.content} />
                  {msg.isStreaming && (
                    <span className="inline-block w-1 h-3.5 bg-violet-400 ml-0.5 animate-pulse rounded-sm" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Barra inferior ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 pt-3 border-t border-[#1e2d45]">

        {/* Indicador de uso (solo free) */}
        {!usage.isPremium && usage.limit > 0 && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: usage.limit }).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i < usage.used ? 'bg-violet-500' : 'bg-[#1e2d45]'
                }`} />
              ))}
              <span className="text-[10px] text-slate-600 ml-1">{usage.used}/{usage.limit} mensajes</span>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold transition-all"
            >
              Activar Premium ✨
            </button>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 bg-[#0d1117] border border-[#1e2d45] rounded-2xl px-3.5 py-2.5 focus-within:border-violet-500/50 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre tus finanzas..."
              disabled={isLoading || limitReached}
              rows={1}
              className="w-full bg-transparent text-[13px] text-white placeholder:text-slate-600 outline-none resize-none leading-relaxed max-h-32 overflow-y-auto"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading || limitReached}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 flex-shrink-0 active:scale-95"
            style={{ background: (!input.trim() || isLoading) ? '#1e2d45' : 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            {isLoading
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <span className="text-base">↑</span>
            }
          </button>
        </div>

        <p className="text-[10px] text-slate-700 text-center mt-2">
          Fin usa tus datos reales · Enter para enviar · Shift+Enter nueva línea
        </p>
      </div>
    </div>
  )
}
