/**
 * Script to seed the database with sample courses and modules
 * Run with: npx tsx scripts/seed-data.ts
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function createCourse(data: {
  name: string;
  description?: string;
  is_active?: boolean;
  is_published?: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create course: ${response.statusText}`);
  }
  
  return response.json();
}

async function createModule(data: {
  name: string;
  description?: string;
  course_id: number;
  order: number;
  is_active?: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/modules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create module: ${response.statusText}`);
  }
  
  return response.json();
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Create Course 1: Jak komunikovat s AI?
    console.log('Creating course: Jak komunikovat s AI?');
    const course1 = await createCourse({
      name: 'Jak komunikovat s AI?',
      description: 'V kurzu Jak komunikovat s AI? se dozvíte, jak správně a účinně zadávat, aby vám AI dávala přesné a praktické odpovědi k vaší práci.',
      is_active: true,
      is_published: true,
    });
    console.log(`✅ Course created with ID: ${course1.id}\n`);

    // Create modules for Course 1
    const course1Modules = [
      {
        name: 'Co je prompt a jak funguje AI',
        description: 'Úvod do komunikace s AI',
        order: 1,
      },
      {
        name: 'Základní techniky promptování',
        description: 'Naučte se klíčové principy',
        order: 2,
      },
      {
        name: 'Praktické promptování',
        description: 'Aplikujte techniky v praxi',
        order: 3,
      },
      {
        name: 'Reflexe a pokročilé tipy',
        description: 'Zhodnoťte své dovednosti',
        order: 4,
      },
    ];

    for (const moduleData of course1Modules) {
      console.log(`Creating module: ${moduleData.name}`);
      const module = await createModule({
        ...moduleData,
        course_id: course1.id,
        is_active: true,
      });
      console.log(`✅ Module created with ID: ${module.id}`);
    }

    console.log('\n---\n');

    // Create Course 2: Pokročilé techniky práce s AI
    console.log('Creating course: Pokročilé techniky práce s AI');
    const course2 = await createCourse({
      name: 'Pokročilé techniky práce s AI',
      description: 'V tomto kurzu se naučíte, jak pomocí AI strukturovaných promptů, rolí a vícekrokového zadávání dosáhnout přesnějších a profesionálních výstupů od AI.',
      is_active: true,
      is_published: true,
    });
    console.log(`✅ Course created with ID: ${course2.id}\n`);

    // Create modules for Course 2
    const course2Modules = [
      {
        name: 'Strukturované promptování',
        description: 'Naučte se organizovat prompty',
        order: 1,
      },
      {
        name: 'Role a kontexty',
        description: 'Využití rolí v AI komunikaci',
        order: 2,
      },
      {
        name: 'Vícekrokové zadání',
        description: 'Rozdělení komplexních úkolů',
        order: 3,
      },
      {
        name: 'Optimalizace výstupů',
        description: 'Jak získat nejlepší výsledky',
        order: 4,
      },
      {
        name: 'Pokročilé strategie',
        description: 'Profesionální techniky práce s AI',
        order: 5,
      },
    ];

    for (const moduleData of course2Modules) {
      console.log(`Creating module: ${moduleData.name}`);
      const module = await createModule({
        ...moduleData,
        course_id: course2.id,
        is_active: true,
      });
      console.log(`✅ Module created with ID: ${module.id}`);
    }

    console.log('\n---\n');

    // Create Course 3: AI jako váš osobní asistent
    console.log('Creating course: AI jako váš osobní asistent');
    const course3 = await createCourse({
      name: 'AI jako váš osobní asistent',
      description: 'Zjistěte, jak využít AI jako efektivního asistenta pro správu úkolů, komplexní analýzu textů, automatizaci každodenních činností a podporu při rozhodování.',
      is_active: true,
      is_published: true,
    });
    console.log(`✅ Course created with ID: ${course3.id}\n`);

    // Create modules for Course 3
    const course3Modules = [
      {
        name: 'AI pro správu úkolů',
        description: 'Organizace práce pomocí AI',
        order: 1,
      },
      {
        name: 'Analýza textů a dokumentů',
        description: 'AI jako analytický nástroj',
        order: 2,
      },
      {
        name: 'Automatizace činností',
        description: 'Úspora času s AI',
        order: 3,
      },
      {
        name: 'Podpora rozhodování',
        description: 'AI jako poradce',
        order: 4,
      },
    ];

    for (const moduleData of course3Modules) {
      console.log(`Creating module: ${moduleData.name}`);
      const module = await createModule({
        ...moduleData,
        course_id: course3.id,
        is_active: true,
      });
      console.log(`✅ Module created with ID: ${module.id}`);
    }

    console.log('\n✨ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
