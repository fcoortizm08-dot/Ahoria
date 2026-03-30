'use client'

import { useState, useEffect, useCallback } from 'react'
import { FEATURE_KEYS, FREE_DEFAULTS, type FeatureKey } from '@/lib/plans'

// Shape returned by GET /api/me/entitlements
type EntitlementsResponse = {
  plan:        string
  status:      string
  isProAccess: boolean
  trialEnd:    string | null
  features:    Record<FeatureKey, string>
}

export type UseEntitlementsReturn = {
  isLoading:    boolean
  plan:         string
  status:       string
  isPro:        boolean
  trialEnd:     string | null
  /** Returns true if the user can access a boolean feature (export_csv, analytics…) */
  canAccess:    (featureKey: FeatureKey) => boolean
  /** Returns the numeric limit, or null if unlimited */
  getLimit:     (featureKey: FeatureKey) => number | null
  /** Raw feature map */
  features:     Record<FeatureKey, string>
  /** Re-fetch from server */
  refresh:      () => void
}

const DEFAULT_FEATURES: Record<FeatureKey, string> = { ...FREE_DEFAULTS }

export function useEntitlements(): UseEntitlementsReturn {
  const [isLoading, setIsLoading]   = useState(true)
  const [data, setData]             = useState<EntitlementsResponse | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch('/api/me/entitlements')
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.json() as Promise<EntitlementsResponse>
      })
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [refreshKey])

  const features = data?.features ?? DEFAULT_FEATURES

  const canAccess = useCallback(
    (featureKey: FeatureKey): boolean => {
      const value = features[featureKey]
      return value === 'true' || value === 'unlimited'
    },
    [features],
  )

  const getLimit = useCallback(
    (featureKey: FeatureKey): number | null => {
      const value = features[featureKey]
      if (value === 'unlimited') return null
      const n = parseInt(value, 10)
      return isNaN(n) ? null : n
    },
    [features],
  )

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return {
    isLoading,
    plan:     data?.plan     ?? 'free',
    status:   data?.status   ?? 'active',
    isPro:    data?.isProAccess ?? false,
    trialEnd: data?.trialEnd ?? null,
    canAccess,
    getLimit,
    features,
    refresh,
  }
}
