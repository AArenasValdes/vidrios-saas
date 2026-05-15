import type { EntityId } from "@/types/common";

export type LandingGalleryItem = {
  id: EntityId;
  organizationId: EntityId;
  imageUrl: string;
  label: string;
  workTitle: string;
  workType: string;
  workZone: string;
  workBadge: string;
  sortOrder: number;
  isVisible: boolean;
  creadoEn: string | null;
};

export type CreateLandingGalleryItemInput = {
  organizationId: EntityId;
  imageUrl: string;
  label: string;
  workTitle?: string;
  workType?: string;
  workZone?: string;
  workBadge?: string;
  sortOrder?: number;
  isVisible?: boolean;
};

export type UpdateLandingGalleryItemInput = {
  label?: string;
  workTitle?: string;
  workType?: string;
  workZone?: string;
  workBadge?: string;
  sortOrder?: number;
  isVisible?: boolean;
};

export type ReorderLandingGalleryItemInput = {
  id: EntityId;
  sortOrder: number;
};
