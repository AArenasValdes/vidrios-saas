import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { EntityId } from "@/types/common";
import type { LandingGalleryItem } from "@/features/landing-gallery/types/landing-gallery";

type LandingGalleryRow = {
  id: EntityId;
  organization_id: EntityId;
  image_url: string;
  label: string | null;
  work_title: string | null;
  work_type: string | null;
  work_zone: string | null;
  work_badge: string | null;
  sort_order: number;
  is_visible: boolean;
  creado_en: string | null;
};

function mapRow(row: LandingGalleryRow): LandingGalleryItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    imageUrl: row.image_url,
    label: row.label ?? "",
    workTitle: row.work_title ?? "",
    workType: row.work_type ?? "",
    workZone: row.work_zone ?? "",
    workBadge: row.work_badge ?? "",
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    creadoEn: row.creado_en,
  };
}

export async function getPublicGalleryByOrganizationId(
  organizationId: EntityId
): Promise<LandingGalleryItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("public_landing_gallery")
    .select(
      "id, organization_id, image_url, label, work_title, work_type, work_zone, work_badge, sort_order, is_visible, creado_en"
    )
    .eq("organization_id", organizationId)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return [];
  }

  return (data as LandingGalleryRow[]).map(mapRow);
}
