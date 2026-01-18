'use client';

import { AdminSidebar } from '@/components/admin';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      {/* Main content - add top padding on mobile for fixed header */}
      <div className="flex-1 pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
