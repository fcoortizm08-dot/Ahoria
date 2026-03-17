'use client'

import { useEffect } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Profile } from '@/types'

export function ProfileLoader({ profile }: { profile: Profile | null }) {
  const setProfile = useFinanceStore(s => s.setProfile)
  useEffect(() => { setProfile(profile) }, [profile, setProfile])
  return null
}
