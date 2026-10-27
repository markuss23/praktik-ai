import { Hero } from "@/components/layout";
import CourseSection from "./CourseSection";
import ProjectAboutSection, { ProjectIntroSection } from "./ProjectAboutSection";
import OnboardingOverlay from "./OnboardingOverlay";
import { fetchChangelog } from "@/lib/changelog";
// import ContactSection from "./ContactSection";

export default async function Home() {
  const changelog = await fetchChangelog();

  return (
    // Celá landing page leží na jedné šedé (#F0F0F0) přes celou šířku okna —
    // i nad 1440 px, kde by jinak po stranách prosvítalo --muted z layoutu.
    <div className="mx-[calc(50%-50vw)] bg-[#F0F0F0]">
      <Hero changelog={changelog} />
      <ProjectIntroSection />
      <CourseSection />
      <ProjectAboutSection />
      {/* <ContactSection /> */}
      <OnboardingOverlay />
    </div>
  );
}
