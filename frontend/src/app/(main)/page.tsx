import { Hero } from "@/components/layout";
import ChangelogAccordion from "./ChangelogAccordion";
import CourseSection from "./CourseSection";
import ProjectAboutSection from "./ProjectAboutSection";
import { fetchChangelog } from "@/lib/changelog";
// import ContactSection from "./ContactSection"; — před zapnutím povolit i /api/contact (CONTACT_FORM_ENABLED)

export default async function Home() {
  const changelog = await fetchChangelog();

  return (
    <div className="bg-card">
      <Hero />
      <ChangelogAccordion markdown={changelog} />
      <CourseSection />
      <ProjectAboutSection />
      {/* <ContactSection /> */}
    </div>
  );
}
