import { Sidebar } from '@/components/layout/Sidebar'
import { FAB } from '@/components/common/FAB'
import { ProfileLoader } from '@/components/common/ProfileLoader'
import { Toasts } from '@/components/common/Toasts'
import { BottomNav } from '@/components/layout/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#070e0a' }}>
      <Sidebar />
      <main className="flex-1 md:ml-[220px] min-w-0">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <ProfileLoader />
      <Toasts />
      <FAB />
      <BottomNav />
    </div>
  )
}
