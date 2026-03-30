import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { initializeFreeSubscription } from '@/lib/services/entitlements'
import { detectSecondSession } from '@/lib/services/activation'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      try {
        await initializeFreeSubscription(user.id)
      } catch (err) {
        console.error('[callback] initializeFreeSubscription failed:', err)
      }

      try {
        await detectSecondSession(user.id)
      } catch (err) {
        console.error('[callback] detectSecondSession failed:', err)
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}