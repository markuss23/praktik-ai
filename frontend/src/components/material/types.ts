export type MaterialApprovalStatus = "draft" | "approved" | "in_review" | "rejected";

export interface MaterialAttachment {
  id: string;
  name: string;
  format: string;
  sizeLabel: string;
  /** ID materiálu a souboru pro stažení přes backend (vyžaduje přihlášení). */
  resourceId?: number;
  fileId?: number;
  /** Přímá URL — jen pro ukázková data; reálné přílohy se stahují přes API. */
  url?: string;
}

export interface MaterialTarget {
  label: string;
  value: string;
}

export interface MaterialCategory {
  id: string;
  label: string;
  /** Numerické ID předmětu pro serverovou filtraci (`resourceSubjectId`). */
  subjectId?: number;
}

export interface MaterialFolder {
  id: string;
  name: string;
  /** Popis sbírky (volitelný). */
  description?: string;
  /** Zda je sbírka zveřejněná pro ostatní uživatele. */
  isPublic?: boolean;
  /** ID materiálů, které sbírka obsahuje (pro odvození členství). */
  resourceIds?: string[];
  /** Počet položek ve sbírce. */
  itemCount?: number;
  /** Jméno vlastníka sbírky (jen u veřejných sbírek ostatních). */
  ownerName?: string;
}

export interface Material {
  id: string;
  title: string;
  description: string;
  difficultyLabel: string;
  fileLabel: string;
  rating: number;
  reviewsCount: number;
  categoryId: string;
  status: MaterialApprovalStatus;
  /** Zda je schválený materiál publikovaný ve veřejné databázi. */
  isPublic?: boolean;
  /** Zda autor povoluje vytváření kopií (forků) tohoto materiálu. */
  allowForks?: boolean;
  /** Zda je tento materiál sám kopií (forkem) jiného materiálu. */
  isFork?: boolean;
  folderId?: string;
  ownerId?: string;
  targetAudience?: string;
  educationLevel?: string;
  difficulty?: string;
  targets?: MaterialTarget[];
  attachments?: MaterialAttachment[];
}
