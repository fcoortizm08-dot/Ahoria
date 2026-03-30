# Checklist de producción AHORIA

## Variables de entorno requeridas en Vercel
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] DATABASE_URL (puerto 6543, pgbouncer=true)
- [ ] DIRECT_URL (puerto 5432)
- [ ] MP_ACCESS_TOKEN
- [ ] MP_PUBLIC_KEY
- [ ] MP_WEBHOOK_SECRET
- [ ] MP_PLAN_ID
- [ ] NEXT_PUBLIC_POSTHOG_KEY
- [ ] NEXT_PUBLIC_POSTHOG_HOST
- [ ] RESEND_API_KEY
- [ ] RESEND_FROM_EMAIL
- [ ] SENTRY_DSN
- [ ] NEXT_PUBLIC_SENTRY_DSN
- [ ] NEXT_PUBLIC_APP_URL
- [ ] NEXT_PUBLIC_BILLING_ENABLED=false

## Antes de activar billing (BILLING_ENABLED=true)
- [ ] Cuenta Mercado Pago Developers creada
- [ ] Aplicación MP creada en panel developers
- [ ] Plan de suscripción mensual creado en MP ($4.990 CLP)
- [ ] MP_PLAN_ID copiado del plan creado
- [ ] MP_ACCESS_TOKEN de producción configurado
- [ ] MP_WEBHOOK_SECRET generado y configurado
- [ ] URL del webhook registrada en MP: https://tudominio.com/api/billing/mercado-pago/webhook
- [ ] Flujo completo probado en sandbox primero
- [ ] NEXT_PUBLIC_BILLING_ENABLED=true en Vercel

## Supabase producción
- [ ] RLS activo en las 8 tablas billing
- [ ] plans tiene 2 filas (free, pro_monthly)
- [ ] plan_features tiene 12 filas
- [ ] Redirect URL configurada: https://tudominio.com/auth/callback

## PostHog
- [ ] Proyecto creado en posthog.com
- [ ] NEXT_PUBLIC_POSTHOG_KEY configurado
- [ ] Verificar eventos llegando en Live Events

## Resend
- [ ] Dominio verificado en resend.com
- [ ] RESEND_API_KEY configurado
- [ ] RESEND_FROM_EMAIL configurado

## Sentry
- [ ] Proyecto Next.js creado en sentry.io
- [ ] SENTRY_DSN configurado
- [ ] Verificar que errores aparecen en dashboard

## Deploy
- [ ] Repo pusheado a GitHub
- [ ] Proyecto creado en Vercel conectado al repo
- [ ] Todas las env vars configuradas en Vercel
- [ ] npm run build pasa sin errores
- [ ] Smoke test en producción: registro → login → dashboard

## Orden de activación de flags
1. BILLING_ENABLED=false (deploy inicial)
2. Probar todo el flujo sin billing
3. PAYWALL_ENABLED=true (paywall visible, sin cobro)
4. Probar que gates funcionan
5. BILLING_ENABLED=true (cobro real activado)
