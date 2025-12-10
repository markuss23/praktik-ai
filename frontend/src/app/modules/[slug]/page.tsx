import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { getCourses, getModules, getActivities } from "@/lib/api-client";
import { slugify } from "@/lib/utils";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  let module = null;
  let activities = [];
  
  try {
    // Get all courses to find all modules
    const courses = await getCourses();
    const allModulesPromises = courses.map(course => 
      getModules({ courseId: course.courseId })
    );
    const allModulesArrays = await Promise.all(allModulesPromises);
    const allModules = allModulesArrays.flat();
    
    // Check if slug is a numeric ID (for backward compatibility)
    const isNumericId = /^\d+$/.test(slug);
    
    if (isNumericId) {
      // Legacy ID-based URL - find by moduleId
      module = allModules.find(m => m.moduleId === Number(slug));
    } else {
      // Slug-based URL - find by slugified title
      module = allModules.find(m => slugify(m.title) === slug);
    }
    
    if (!module) {
      notFound();
    }
    
    activities = await getActivities({ moduleId: module.moduleId });
  } catch (error) {
    console.error('Failed to fetch module data:', error);
    notFound();
  }

  if (!module) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{module.title}</h1>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Aktivity</h2>
        <div className="space-y-4">
          {activities.map((activity: any, index: number) => (
            <Card key={activity.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {index + 1}. {activity.title}
                  </CardTitle>
                  <span className="text-sm px-2 py-1 bg-gray-100 rounded">
                    {activity.kind || 'aktivita'}
                  </span>
                </div>
                <CardDescription>{activity.description || 'Bez popisu'}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
