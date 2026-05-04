import { Hero } from "@/components/layout";
import CourseSection from "./CourseSection";
import ProjectAboutSection from "./ProjectAboutSection";
import ContactSection from "./ContactSection";

export default function Home() {
  return (
    <div className="bg-white">
      <Hero />
      <CourseSection />
      <ProjectAboutSection />
      <ContactSection />
    </div>
  );
}
