import { AdminSidebar } from '@/components/admin';
import { AdminRoleGuard } from '@/components/admin/AdminRoleGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoleGuard>
      <div className="flex lg:h-screen lg:overflow-hidden bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 pt-14 lg:pt-0 flex flex-col lg:h-screen lg:overflow-hidden min-h-screen lg:min-h-0">
          {children}
        </main>
      </div>
    </AdminRoleGuard>
  );
}
