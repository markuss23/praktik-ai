import { CourseCatalog } from "@/components/courses";

/**
 * Katalog kurzů na úvodní stránce. Samotný katalog (filtry, karty / řádky,
 * stránkování) je sdílený `CourseCatalog` — stejný běží na `/courses`
 * i v „Moje kurzy". Tady se jen zasadí do šedého pásu landing page.
 */
export default function CourseSection() {
  return (
    <div className="bg-[#F0F0F0] py-8 sm:py-12 lg:py-16">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[100px]">
        <CourseCatalog />
      </div>
    </div>
  );
}
