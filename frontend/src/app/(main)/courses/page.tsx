import Link from "next/link";
import CoursesContent from "./CoursesContent";

export default function CoursesPage() {
  return (
    <div style={{ backgroundColor: '#F0F0F0' }} className="min-h-screen">
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px] py-8" style={{ maxWidth: '1440px' }}>
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-gray-700">Home</Link>
          </p>
          <h1 className="text-3xl font-bold text-black">Přehled kurzů</h1>
        </div>
        <CoursesContent />
      </div>
    </div>
  );
}
