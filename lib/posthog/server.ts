// ─────────────────────────────────────────────────────────────────────────────
// lib/posthog/server.ts
// Singleton posthog-node para server-side (Route Handlers, Server Components).
// Solo se inicializa si NEXT_PUBLIC_POSTHOG_KEY está presente.
// ─────────────────────────────────────────────────────────────────────────────

import { PostHog } from 'posthog-node'

let _client: PostHog | null = null
let _warned  = false

function getClient(): PostHog | null {
  const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

  if (!key) {
    if (!_warned) {
      console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY not set — analytics disabled')
      _warned = true
    }
    return null
  }

  if (!_client) {
    _client = new PostHog(key, {
      host,
      flushAt:       1,   // flush after every event in serverless
      flushInterval: 0,
    })
  }

  return _client
}

/**
 * Capture a server-side PostHog event.
 * Safe to call even when PostHog is not configured — silently no-ops.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): void {
  const client = getClient()
  if (!client) return

  client.capture({ distinctId, event, properties })
}

/**
 * Flush all pending events. Call before serverless function exits
 * if you need guaranteed delivery.
 */
export async function flushPostHog(): Promise<void> {
  await _client?.shutdown()
}
