import { Hero } from "@/components/layout";
import CourseSection from "./CourseSection";
import ProjectAboutSection from "./ProjectAboutSection";

export default function Home() {
  return (
    <div className="bg-white">
      <Hero />
      <CourseSection />
      <ProjectAboutSection />
    </div>
  );
}
