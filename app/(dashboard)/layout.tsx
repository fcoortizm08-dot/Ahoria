import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toasts } from '@/components/common/Toasts'
import { ProfileLoader } from '@/components/common/ProfileLoader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#07090f] flex">
      <ProfileLoader profile={profile} />
      <Sidebar profile={profile} />
      <main className="flex-1 ml-[210px] flex flex-col min-h-screen">
        <div className="flex-1 p-7 max-w-[1400px] w-full mx-auto">
          {children}
        </div>
      </main>
      <Toasts />
    </div>
  )
}
