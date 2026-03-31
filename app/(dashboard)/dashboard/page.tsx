import { Suspense } from 'react'
import { SubscribedBanner } from './_components/SubscribedBanner'

type Props = {
  searchParams: Promise<{ subscribed?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const params      = await searchParams
  const showBanner  = params.subscribed === 'true'

  return (
    <div className="flex flex-col gap-5">
      {showBanner && (
        <Suspense fallback={null}>
          <SubscribedBanner />
        </Suspense>
      )}
      <h1 className="text-xl font-extrabold text-white">Dashboard</h1>
      <p className="text-slate-400">Bienvenido a Ahoria</p>
    </div>
  )
}
