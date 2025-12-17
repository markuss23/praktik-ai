import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourses, getModules } from "@/lib/api-client";
import { slugify } from "@/lib/utils";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  let course = null;
  let modules = [];
  
  try {
    // Get all courses and find the one matching the slug
    const courses = await getCourses();
    
    // Check if slug is a numeric ID (for backward compatibility)
    const isNumericId = /^\d+$/.test(slug);
    
    if (isNumericId) {
      // Legacy ID-based URL - find by courseId
      course = courses.find(c => c.courseId === Number(slug));
    } else {
      // Slug-based URL - find by slugified title
      course = courses.find(c => slugify(c.title) === slug);
    }
    
    if (!course) {
      notFound();
    }
    
    modules = await getModules({ courseId: course.courseId });
    
    // Filter to only show published modules
    modules = modules.filter((module: any) => module.isPublished);
  } catch (error) {
    console.error('Failed to fetch course data:', error);
    notFound();
  }
  
  if (!course) {
    notFound();
  }
  
  // Map modules to match the expected format
  const mappedModules = modules.map((module: any, index: number) => ({
    id: String(module.moduleId),
    courseId: course.courseId,
    title: module.title,
    slug: slugify(module.title),
    description: course.description,
    shortGoal: `Splnit modul ${index + 1}`,
    lessons: 3,
    status: 'completed',
    progress: 100,
  }));

  return (
    <div style={{ backgroundColor: '#F0F0F0' }}>
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 lg:px-[100px] py-4" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <p className="text-sm text-gray-500">Home / modul</p>
      </div>

      {/* Course Title */}
      <div className="px-4 sm:px-6 lg:px-[100px] pb-8 flex justify-between items-center" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <h1 className="text-black sm:text-4xl font-bold">{course.title}</h1>
        <Link 
          href={`/admin/modules/new?courseId=${course.courseId}`}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <span className="text-xl font-bold">+</span>
          <span>Nový modul</span>
        </Link>
      </div>

      {/* Modules Grid */}
      <div 
        className="px-4 sm:px-6 lg:px-[100px] pb-16"
        style={{ maxWidth: '1440px', margin: '0 auto' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {mappedModules.map((module: any, index: number) => (
            <div 
              key={module.id}
              className="bg-white hover:shadow-lg transition-all duration-300"
                style={{ 
                  width: '100%',
                  maxWidth: '600px',
                  height: '356px',
                  paddingTop: '24px',
                  paddingRight: '12px',
                  paddingBottom: '24px',
                  paddingLeft: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between px-3">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Modul {index + 1}</div>
                    <h3 className="text-xl font-semibold" style={{ color: '#8B5BA8' }}>
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Splněno</span>
                  </div>
                </div>

                {/* Short Goal */}
                <div className="px-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">Krátkodobé cíle:</div>
                      <div className="text-sm text-gray-600">{module.shortGoal}</div>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="px-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">PROGRESS</div>
                  <div className="flex gap-2">
                    {[...Array(module.lessons)].map((_, i) => (
                      <div 
                        key={i}
                        className="flex-1 h-2 rounded-full"
                        style={{ 
                          backgroundColor: i < Math.floor((module.progress / 100) * module.lessons) ? '#00C896' : '#D1D5DB'
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-right text-sm text-gray-500 mt-1">{module.progress}%</div>
                </div>

                {/* Lessons and Button */}
                <div className="px-3 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{module.lessons} lekce</span>
                  </div>
                  <Link 
                    href={`/admin/modules/${module.slug}/edit`}
                    className="text-white font-semibold py-2.5 px-5 rounded-md transition-colors flex items-center gap-2"
                    style={{ backgroundColor: '#8B5BA8' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span>Editovat modul</span>
                  </Link>
                </div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}
