import { AdminSidebar } from '@/components/admin';
import { AdminRoleGuard } from '@/components/admin/AdminRoleGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoleGuard>
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 pt-14 lg:pt-0 flex flex-col min-h-screen">
          {children}
        </main>
      </div>
    </AdminRoleGuard>
  );
}
