import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

/**
 * Přehled kurzů se přestěhoval na `/kurzy` (víc filtrů, stav v URL).
 * Staré odkazy na `/courses` sem dál vedou; detail `/courses/[slug]` zůstává.
 */
export default function CoursesPage() {
  redirect(ROUTES.COURSE_CATALOG);
}
