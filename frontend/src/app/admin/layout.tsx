import { AdminSidebar } from '@/components/admin';
import { AdminRoleGuard } from '@/components/admin/AdminRoleGuard';
import { CourseGenerationProvider } from '@/components/admin/CourseGenerationProvider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoleGuard>
      {/* Sledování AI generování kurzů žije nad všemi admin pohledy, aby
          polling přežil odchod z formuláře i přepnutí stránky */}
      <CourseGenerationProvider>
        <div className="flex lg:h-screen overflow-x-hidden lg:overflow-hidden bg-muted">
          <AdminSidebar />
          <main className="flex-1 min-w-0 pt-14 lg:pt-0 flex flex-col lg:h-screen overflow-x-hidden lg:overflow-hidden min-h-screen lg:min-h-0">
            {children}
          </main>
        </div>
      </CourseGenerationProvider>
    </AdminRoleGuard>
  );
}
