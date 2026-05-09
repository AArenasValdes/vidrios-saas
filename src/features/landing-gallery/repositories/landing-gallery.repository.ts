import { createClient } from "@/lib/supabase/client";
import type { EntityId } from "@/types/common";
import type {
  CreateLandingGalleryItemInput,
  LandingGalleryItem,
  ReorderLandingGalleryItemInput,
  UpdateLandingGalleryItemInput,
} from "@/features/landing-gallery/types/landing-gallery";
import { sanitizeFileName } from "@/utils/sanitize-file-name";

type LandingGalleryRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
};

type LandingGalleryRow = {
  id: EntityId;
  organization_id: EntityId;
  image_url: string;
  label: string | null;
  sort_order: number;
  is_visible: boolean;
  creado_en: string | null;
};

const TABLE_NAME = "public_landing_gallery";
const STORAGE_BUCKET = "organization-assets";
const GALLERY_SELECT = "id, organization_id, image_url, label, sort_order, is_visible, creado_en";

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

export function createLandingGalleryRepository(deps: LandingGalleryRepositoryDeps = {}) {
  const supabase = deps.clientFactory ?? createClient();

  return {
    async listByOrganizationId(organizationId: EntityId) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(GALLERY_SELECT)
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true });

      if (error) {
        throw error;
      }

      return (data as LandingGalleryRow[]).map(mapRow);
    },

    async create(input: CreateLandingGalleryItemInput) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert({
          organization_id: input.organizationId,
          image_url: input.imageUrl,
          label: input.label || null,
          sort_order: input.sortOrder ?? 0,
          is_visible: input.isVisible ?? true,
        })
        .select(GALLERY_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapRow(data as LandingGalleryRow);
    },

    async update(id: EntityId, organizationId: EntityId, input: UpdateLandingGalleryItemInput) {
      const payload: Record<string, unknown> = {};

      if (input.label !== undefined) {
        payload.label = input.label || null;
      }
      if (input.sortOrder !== undefined) {
        payload.sort_order = input.sortOrder;
      }
      if (input.isVisible !== undefined) {
        payload.is_visible = input.isVisible;
      }

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq("id", id)
        .eq("organization_id", organizationId)
        .select(GALLERY_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapRow(data as LandingGalleryRow);
    },

    async delete(id: EntityId, organizationId: EntityId) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", id)
        .eq("organization_id", organizationId);

      if (error) {
        throw error;
      }
    },

    async reorder(organizationId: EntityId, items: ReorderLandingGalleryItemInput[]) {
      const updates = items.map((item) =>
        supabase
          .from(TABLE_NAME)
          .update({ sort_order: item.sortOrder })
          .eq("id", item.id)
          .eq("organization_id", organizationId)
      );

      const results = await Promise.allSettled(updates);
      const failed = results.filter((r) => r.status === "rejected");

      if (failed.length > 0) {
        throw new Error("No se pudieron reordenar algunas fotos de la galeria.");
      }
    },

    async uploadGalleryImage(organizationId: EntityId, file: File) {
      if (!file.type.startsWith("image/")) {
        throw new Error("La foto de galeria debe ser una imagen");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("La foto no puede pesar mas de 10 MB");
      }

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const sanitizedName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
      const storagePath = `${organizationId}/gallery/gallery-${Date.now()}-${sanitizedName}.${extension}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

      return publicUrl;
    },
  };
}

export type LandingGalleryRepository = ReturnType<typeof createLandingGalleryRepository>;

let defaultLandingGalleryRepository: LandingGalleryRepository | null = null;

function getDefaultLandingGalleryRepository() {
  if (!defaultLandingGalleryRepository) {
    defaultLandingGalleryRepository = createLandingGalleryRepository();
  }

  return defaultLandingGalleryRepository;
}

export const landingGalleryRepository: LandingGalleryRepository = {
  listByOrganizationId(...args) {
    return getDefaultLandingGalleryRepository().listByOrganizationId(...args);
  },
  create(...args) {
    return getDefaultLandingGalleryRepository().create(...args);
  },
  update(...args) {
    return getDefaultLandingGalleryRepository().update(...args);
  },
  delete(...args) {
    return getDefaultLandingGalleryRepository().delete(...args);
  },
  reorder(...args) {
    return getDefaultLandingGalleryRepository().reorder(...args);
  },
  uploadGalleryImage(...args) {
    return getDefaultLandingGalleryRepository().uploadGalleryImage(...args);
  },
};
