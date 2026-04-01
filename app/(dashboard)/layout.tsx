import Sidebar from "@/components/layout/Sidebar";
import { ProfileLoader } from "@/components/common/ProfileLoader";
import { Toasts } from "@/components/common/Toasts";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F7F8FA' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: '240px', minHeight: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
      <ProfileLoader />
      <Toasts />
    </div>
  );
}
