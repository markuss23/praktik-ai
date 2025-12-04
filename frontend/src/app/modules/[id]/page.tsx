import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { getModule, getActivities } from "@/lib/api-client";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  let module = null;
  let activities = [];
  
  try {
    module = await getModule(Number(id));
    activities = await getActivities({ moduleId: Number(id) });
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
