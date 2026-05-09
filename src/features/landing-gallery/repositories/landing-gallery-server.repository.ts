import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { EntityId } from "@/types/common";
import type { LandingGalleryItem } from "@/features/landing-gallery/types/landing-gallery";

type LandingGalleryRow = {
  id: EntityId;
  organization_id: EntityId;
  image_url: string;
  label: string | null;
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
    .select("id, organization_id, image_url, label, sort_order, is_visible, creado_en")
    .eq("organization_id", organizationId)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return [];
  }

  return (data as LandingGalleryRow[]).map(mapRow);
}
