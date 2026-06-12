export type MaterialApprovalStatus = "draft" | "approved" | "in_review" | "rejected";

export interface MaterialAttachment {
  id: string;
  name: string;
  format: string;
  sizeLabel: string;
  url?: string;
}

export interface MaterialTarget {
  label: string;
  value: string;
}

export interface MaterialCategory {
  id: string;
  label: string;
}

export interface MaterialFolder {
  id: string;
  name: string;
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
  folderId?: string;
  ownerId?: string;
  targetAudience?: string;
  educationLevel?: string;
  difficulty?: string;
  targets?: MaterialTarget[];
  attachments?: MaterialAttachment[];
}
