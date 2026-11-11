import Link from "next/link";
import { CourseCatalog } from "@/components/courses";

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-[100px]">
        <p className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
        </p>
        <CourseCatalog title="Přehled kurzů" headingAs="h1" />
      </div>
    </div>
  );
}
