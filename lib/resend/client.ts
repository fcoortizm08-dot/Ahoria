// ─────────────────────────────────────────────────────────────────────────────
// lib/resend/client.ts
// Email delivery via Resend + NotificationLog en Prisma.
// Fire-and-forget: nunca lanza errores al caller.
// ─────────────────────────────────────────────────────────────────────────────

import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@ahoria.app'

let _client: Resend | null = null
let _warned  = false

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    if (!_warned) {
      console.warn('[resend] RESEND_API_KEY not configured — emails disabled')
      _warned = true
    }
    return null
  }
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY)
  return _client
}

// ── Template types ────────────────────────────────────────────────────────────

export type EmailTemplate =
  | 'charge_reminder_72h'
  | 'charge_reminder_24h'
  | 'payment_failed'
  | 'subscription_canceled'
  | 'subscription_activated'

type TemplateData = Record<string, string | number | undefined>

function buildTemplate(
  template: EmailTemplate,
  data: TemplateData,
): { subject: string; html: string } {
  const app   = 'Ahoria'
  const dash  = data.dashboardUrl  as string ?? '#'
  const bill  = data.billingUrl    as string ?? '#'
  const upgrade = data.upgradeUrl  as string ?? '#'
  const amount  = data.amount      as string ?? '4.990'
  const periodEnd = data.periodEnd as string ?? ''

  switch (template) {
    case 'charge_reminder_72h':
      return {
        subject: `Tu suscripción ${app} Pro se renueva en 3 días`,
        html: html(`
          <h2 style="color:#60a5fa">Recordatorio de renovación</h2>
          <p>Tu suscripción <strong>${app} Pro</strong> se renovará automáticamente en <strong>3 días</strong>.</p>
          <p style="color:#94a3b8">Monto: $${amount} CLP / mes</p>
          <p>Gestiona tu suscripción en <a href="${bill}" style="color:#60a5fa">tu panel de cuenta</a>.</p>
        `),
      }
    case 'charge_reminder_24h':
      return {
        subject: `Tu suscripción ${app} Pro se renueva mañana`,
        html: html(`
          <h2 style="color:#60a5fa">Tu plan se renueva mañana</h2>
          <p>Mañana se procesará el cobro de tu suscripción <strong>${app} Pro</strong>.</p>
          <p style="color:#94a3b8">Monto: $${amount} CLP / mes</p>
          <p>Gestiona tu suscripción en <a href="${bill}" style="color:#60a5fa">tu panel de cuenta</a>.</p>
        `),
      }
    case 'payment_failed':
      return {
        subject: `No pudimos procesar tu pago — ${app} Pro`,
        html: html(`
          <h2 style="color:#f87171">Problema con tu pago</h2>
          <p>No pudimos cobrar tu suscripción <strong>${app} Pro</strong>.</p>
          <p style="color:#94a3b8">Por favor actualiza tu método de pago para mantener el acceso Pro.</p>
          <a href="${bill}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3b82f6;color:white;border-radius:8px;text-decoration:none;font-weight:600">
            Actualizar método de pago
          </a>
        `),
      }
    case 'subscription_canceled':
      return {
        subject: `Tu suscripción ${app} Pro fue cancelada`,
        html: html(`
          <h2>Suscripción cancelada</h2>
          <p>Tu suscripción <strong>${app} Pro</strong> ha sido cancelada.</p>
          ${periodEnd ? `<p style="color:#94a3b8">Seguirás con acceso Pro hasta el <strong>${periodEnd}</strong>.</p>` : ''}
          <p>Puedes reactivar tu plan en cualquier momento desde
            <a href="${upgrade}" style="color:#60a5fa">${app}</a>.
          </p>
        `),
      }
    case 'subscription_activated':
      return {
        subject: `¡Bienvenido a ${app} Pro!`,
        html: html(`
          <h2 style="color:#60a5fa">¡Tu plan Pro está activo!</h2>
          <p>Bienvenido a <strong>${app} Pro</strong>. Ya tienes acceso a todas las funciones premium.</p>
          <ul style="color:#94a3b8;line-height:2">
            <li>Transacciones ilimitadas</li>
            <li>Metas y deudas ilimitadas</li>
            <li>Exportar a CSV</li>
            <li>Analítica avanzada</li>
          </ul>
          <a href="${dash}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3b82f6;color:white;border-radius:8px;text-decoration:none;font-weight:600">
            Ir al dashboard
          </a>
        `),
      }
  }
}

function html(body: string): string {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#07090f;color:#e2e8f0">${body}</div>`
}

// ── sendEmail ─────────────────────────────────────────────────────────────────

export type SendEmailParams = {
  to:        string
  userId?:   string
  template:  EmailTemplate
  data?:     TemplateData
}

export async function sendEmail({
  to,
  userId,
  template,
  data = {},
}: SendEmailParams): Promise<void> {
  const client = getResend()
  const { subject, html: htmlBody } = buildTemplate(template, data)

  let status: 'sent' | 'failed' = 'sent'
  let errorMsg: string | undefined

  if (client) {
    try {
      await client.emails.send({ from: FROM_EMAIL, to, subject, html: htmlBody })
    } catch (err) {
      status   = 'failed'
      errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[sendEmail]', template, err)
    }
  } else {
    status   = 'failed'
    errorMsg = 'RESEND_API_KEY not configured'
  }

  if (userId) {
    prisma.notificationLog.create({
      data: {
        userId,
        channel:  'email',
        type:     template,
        subject,
        status,
        sentAt:   status === 'sent' ? new Date() : null,
        error:    errorMsg ?? null,
      },
    }).catch((err) => console.error('[sendEmail] NotificationLog:', err))
  }
}
