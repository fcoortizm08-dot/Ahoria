import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildFinancialContext, buildSystemPrompt } from '@/lib/ai/buildFinancialContext'
import { NextRequest } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // ── 2. Rate limit / Premium check ────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, ai_messages_used, ai_messages_limit, full_name')
      .eq('id', user.id)
      .single()

    const isPremium      = profile?.is_premium ?? false
    const messagesUsed   = profile?.ai_messages_used ?? 0
    const messagesLimit  = isPremium ? 999 : (profile?.ai_messages_limit ?? 5)

    if (!isPremium && messagesUsed >= messagesLimit) {
      return Response.json({
        error: 'limit_reached',
        used: messagesUsed,
        limit: messagesLimit,
      }, { status: 429 })
    }

    // ── 3. Parse request ─────────────────────────────────────────────────────
    const body = await req.json()
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = body.messages ?? []

    if (!messages.length || !messages[messages.length - 1].content.trim()) {
      return Response.json({ error: 'Mensaje vacío' }, { status: 400 })
    }

    // Limitar historial a últimos 10 mensajes para controlar tokens
    const recentMessages = messages.slice(-10)

    // ── 4. Construir contexto financiero ─────────────────────────────────────
    const financialCtx = await buildFinancialContext(user.id)
    const systemPrompt = buildSystemPrompt(financialCtx)

    // ── 5. Llamar a Claude (streaming) ───────────────────────────────────────
    const stream = anthropic.messages.stream({
      model: isPremium ? 'claude-sonnet-4-5' : 'claude-haiku-4-5',
      max_tokens: isPremium ? 1500 : 800,
      system: systemPrompt,
      messages: recentMessages,
    })

    // ── 6. Incrementar contador de mensajes ──────────────────────────────────
    if (!isPremium) {
      await supabase
        .from('profiles')
        .update({ ai_messages_used: messagesUsed + 1 })
        .eq('id', user.id)
    }

    // ── 7. Hacer streaming de la respuesta ───────────────────────────────────
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-AI-Model': isPremium ? 'sonnet' : 'haiku',
        'X-Messages-Used': String(messagesUsed + 1),
        'X-Messages-Limit': String(messagesLimit),
        'X-Is-Premium': String(isPremium),
      },
    })

  } catch (err) {
    console.error('[AI Chat Error]', err)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
