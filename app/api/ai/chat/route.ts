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

    // ── 5. Llamar a Claude — respuesta completa (más confiable que streaming) ─
    let aiText: string
    try {
      const response = await anthropic.messages.create({
        model: isPremium ? 'claude-sonnet-4-5-20250929' : 'claude-haiku-4-5-20251001',
        max_tokens: isPremium ? 1500 : 800,
        system: systemPrompt,
        messages: recentMessages,
      })
      aiText = response.content[0].type === 'text' ? response.content[0].text : ''
    } catch (aiErr: unknown) {
      const msg = aiErr instanceof Error ? aiErr.message : 'Error al conectar con IA'
      console.error('[Anthropic Error]', msg)
      return Response.json({ error: msg }, { status: 502 })
    }

    // ── 6. Incrementar contador de mensajes ──────────────────────────────────
    if (!isPremium) {
      await supabase
        .from('profiles')
        .update({ ai_messages_used: messagesUsed + 1 })
        .eq('id', user.id)
    }

    // ── 7. Devolver respuesta (el cliente la lee como stream) ─────────────────
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(aiText))
        controller.close()
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
