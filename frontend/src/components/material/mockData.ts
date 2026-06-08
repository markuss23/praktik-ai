import type { Material, MaterialCategory, MaterialFolder } from "./types";

export const MOCK_CATEGORIES: MaterialCategory[] = [
  { id: "matematika", label: "Matematika" },
  { id: "fyzika", label: "Fyzika" },
  { id: "telocvik", label: "Tělocvik" },
  { id: "programovani", label: "Programování" },
  { id: "dejepis", label: "Dějepis" },
  { id: "ai-pro-ucitele", label: "AI pro učitele" },
  { id: "chemie", label: "Chemie" },
  { id: "zaklady-ai", label: "Základy AI" },
];

export const MOCK_FOLDERS: MaterialFolder[] = [
  { id: "ai_kurzy", name: "ai_kurzy" },
  { id: "prvni_rocnik", name: "prvni_rocnik" },
];

const DEFAULT_TARGETS = [
  { label: "Cílová skupina", value: "Student" },
  { label: "Cílová skupina", value: "Student" },
  { label: "Cílová skupina", value: "Student" },
  { label: "Cílová skupina", value: "Student" },
];

const DEFAULT_ATTACHMENTS = [
  { id: "att-1", name: "Graf", format: "JPG", sizeLabel: "2.7 MB" },
  { id: "att-2", name: "Úvod do derivací funkcí", format: "PDF", sizeLabel: "4.7 MB" },
];

export const MOCK_PUBLIC_MATERIALS: Material[] = [
  {
    id: "uvod-do-derivaci-funkci",
    title: "Úvod do derivací funkcí",
    description:
      "Srozumitelný úvod do diferenciálního počtu. Materiál obsahuje vysvětlení limity, definici derivace, praktické příklady a sadu úloh k procvičení s řešením.",
    difficultyLabel: "Začátečník",
    fileLabel: "PDF 4.7 MB",
    rating: 3,
    reviewsCount: 124,
    categoryId: "matematika",
    status: "approved",
    targets: DEFAULT_TARGETS,
    attachments: DEFAULT_ATTACHMENTS,
  },
  {
    id: "periodicka-tabulka",
    title: "Periodická tabulka – interaktivní výklad",
    description:
      "Materiál obsahuje strukturovaný přehled prvků, charakteristiky skupin a odkazy na doplňující videa a simulace.",
    difficultyLabel: "Začátečník",
    fileLabel: "PDF 4.7 MB",
    rating: 3,
    reviewsCount: 124,
    categoryId: "chemie",
    status: "approved",
    targets: DEFAULT_TARGETS,
    attachments: DEFAULT_ATTACHMENTS,
  },
  {
    id: "slohove-utvary-prehled",
    title: "Slohové útvary – přehled a ukázky",
    description:
      "Rozšířená verze populárního materiálu doplněná o nové ukázkové texty a kontrolní otázky na konci každé kapitoly.",
    difficultyLabel: "Začátečník",
    fileLabel: "PDF 4.7 MB",
    rating: 3,
    reviewsCount: 124,
    categoryId: "dejepis",
    status: "approved",
    targets: DEFAULT_TARGETS,
    attachments: DEFAULT_ATTACHMENTS,
  },
  {
    id: "slohove-utvary-rozsirene",
    title: "Slohové útvary – přehled a ukázky",
    description:
      "Rozšířená verze populárního materiálu doplněná o nové ukázkové texty a kontrolní otázky na konci každé kapitoly.",
    difficultyLabel: "Začátečník",
    fileLabel: "PDF 4.7 MB",
    rating: 3,
    reviewsCount: 124,
    categoryId: "dejepis",
    status: "approved",
    targets: DEFAULT_TARGETS,
    attachments: DEFAULT_ATTACHMENTS,
  },
  {
    id: "past-simple-vs-past-continuous",
    title: "Past Simple vs. Past Continuous",
    description:
      "Srovnání obou minulých časů s pravidly použití, příklady a cvičeními. Obsahuje audio nahrávky pro poslechovou část.",
    difficultyLabel: "Začátečník",
    fileLabel: "PDF 4.7 MB",
    rating: 3,
    reviewsCount: 124,
    categoryId: "ai-pro-ucitele",
    status: "approved",
    targets: DEFAULT_TARGETS,
    attachments: DEFAULT_ATTACHMENTS,
  },
];

export const MOCK_MY_MATERIALS: Material[] = [
  {
    id: "moje-uvod-do-derivaci-1",
    title: "Úvod do derivací funkcí",
    description:
      "Srozumitelný úvod do diferenciálního počtu. Materiál obsahuje vysvětlení limity, definici derivace, praktické příklady a sadu úloh k procvičení s řešením.",
    difficultyLabel: "Začátečník",
    fileLabel: "PDF 4.7 MB",
    rating: 3,
    reviewsCount: 124,
    categoryId: "matematika",
    status: "approved",
    folderId: "ai_kurzy",
    targets: DEFAULT_TARGETS,
    attachments: DEFAULT_ATTACHMENTS,
  },
  {
    id: "moje-slohove-utvary",
    title: "Slohové útvary – přehled a ukázky",
    description:
      "Rozšířená verze populárního materiálu doplněná o nové ukázkové texty a kontrolní otázky na konci každé kapitoly.",
    difficultyLabel: "Začátečník",
    fileLabel: "PDF 4.7 MB",
    rating: 3,
    reviewsCount: 124,
    categoryId: "dejepis",
    status: "in_review",
    folderId: "ai_kurzy",
    targets: DEFAULT_TARGETS,
    attachments: DEFAULT_ATTACHMENTS,
  },
  {
    id: "moje-uvod-do-derivaci-2",
    title: "Úvod do derivací funkcí",
    description:
      "Srozumitelný úvod do diferenciálního počtu. Materiál obsahuje vysvětlení limity, definici derivace, praktické příklady a sadu úloh k procvičení s řešením.",
    difficultyLabel: "Začátečník",
    fileLabel: "PDF 4.7 MB",
    rating: 3,
    reviewsCount: 124,
    categoryId: "matematika",
    status: "rejected",
    folderId: "prvni_rocnik",
    targets: DEFAULT_TARGETS,
    attachments: DEFAULT_ATTACHMENTS,
  },
];

export function getMockMaterialById(id: string): Material | undefined {
  return [...MOCK_PUBLIC_MATERIALS, ...MOCK_MY_MATERIALS].find((m) => m.id === id);
}

export function getMockCategoryById(id: string): MaterialCategory | undefined {
  return MOCK_CATEGORIES.find((c) => c.id === id);
}
