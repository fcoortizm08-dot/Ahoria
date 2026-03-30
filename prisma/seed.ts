import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
})

async function main() {
  // ── Plans ──────────────────────────────────────────────────────────────────
  const free = await prisma.plan.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      slug: 'free',
      name: 'Free',
      priceClp: 0,
      priceUsd: 0,
      billingCycle: 'monthly',
      trialDays: 0,
      isActive: true,
    },
  })

  const pro = await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      slug: 'pro',
      name: 'Pro',
      priceClp: 4990,
      priceUsd: 4.99,
      billingCycle: 'monthly',
      trialDays: 14,
      isActive: true,
    },
  })

  console.log('Plans:', { free: free.id, pro: pro.id })

  // ── Free plan features ─────────────────────────────────────────────────────
  const freeFeatures = [
    { featureKey: 'max_transactions_month', value: '50' },
    { featureKey: 'max_goals',              value: '2' },
    { featureKey: 'max_debts',              value: '2' },
    { featureKey: 'categories_custom',      value: '3' },
    { featureKey: 'export_csv',             value: 'false' },
    { featureKey: 'advanced_analytics',     value: 'false' },
  ]

  for (const f of freeFeatures) {
    await prisma.planFeature.upsert({
      where: { planId_featureKey: { planId: free.id, featureKey: f.featureKey } },
      update: { value: f.value },
      create: { planId: free.id, ...f },
    })
  }

  // ── Pro plan features ──────────────────────────────────────────────────────
  const proFeatures = [
    { featureKey: 'max_transactions_month', value: 'unlimited' },
    { featureKey: 'max_goals',              value: 'unlimited' },
    { featureKey: 'max_debts',              value: 'unlimited' },
    { featureKey: 'categories_custom',      value: 'unlimited' },
    { featureKey: 'export_csv',             value: 'true' },
    { featureKey: 'advanced_analytics',     value: 'true' },
  ]

  for (const f of proFeatures) {
    await prisma.planFeature.upsert({
      where: { planId_featureKey: { planId: pro.id, featureKey: f.featureKey } },
      update: { value: f.value },
      create: { planId: pro.id, ...f },
    })
  }

  console.log('Seed complete: Free + Pro plans with features.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
