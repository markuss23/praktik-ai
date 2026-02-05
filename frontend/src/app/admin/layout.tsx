import { AdminSidebar } from '@/components/admin';

/**
 * Admin layout - Server Component
 * Provides the static sidebar and main content area structure
 * The sidebar is rendered on the server for fast initial load
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 pt-14 lg:pt-0 flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  );
}
