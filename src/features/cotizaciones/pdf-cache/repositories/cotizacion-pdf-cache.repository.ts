import { createClient } from "@/lib/supabase/client";
import type { EntityId } from "@/types/common";

type CotizacionPdfCacheRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
};

type QuotePdfIdentity = {
  organizationId: EntityId;
  cotizacionId: EntityId;
  updatedAt: string;
};

const BUCKET_NAME = "organization-assets";

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCotizacionPdfStoragePath({
  organizationId,
  cotizacionId,
  updatedAt,
}: QuotePdfIdentity) {
  const version = sanitizeSegment(updatedAt.replace(/[:]/g, "-")) || "version";
  return `${organizationId}/quotes/${cotizacionId}/pdf-${version}.pdf`;
}

export function createCotizacionPdfCacheRepository(
  deps: CotizacionPdfCacheRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();

  return {
    buildPath(identity: QuotePdfIdentity) {
      return buildCotizacionPdfStoragePath(identity);
    },

    getPublicUrl(identity: QuotePdfIdentity) {
      const path = buildCotizacionPdfStoragePath(identity);
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

      return { path, publicUrl };
    },

    async exists(identity: QuotePdfIdentity) {
      const path = buildCotizacionPdfStoragePath(identity);
      const parts = path.split("/");
      const fileName = parts.pop();
      const folder = parts.join("/");

      if (!fileName) {
        return false;
      }

      const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, {
        limit: 20,
        search: fileName,
      });

      if (error) {
        return false;
      }

      return ((data ?? []) as Array<{ name: string }>).some((entry) => entry.name === fileName);
    },

    async upload(identity: QuotePdfIdentity, file: File) {
      const path = buildCotizacionPdfStoragePath(identity);

      const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
        upsert: true,
        contentType: file.type || "application/pdf",
      });

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

      return { path, publicUrl };
    },
  };
}

export type CotizacionPdfCacheRepository = ReturnType<
  typeof createCotizacionPdfCacheRepository
>;

let defaultCotizacionPdfCacheRepository: CotizacionPdfCacheRepository | null = null;

function getDefaultCotizacionPdfCacheRepository() {
  if (!defaultCotizacionPdfCacheRepository) {
    defaultCotizacionPdfCacheRepository = createCotizacionPdfCacheRepository();
  }

  return defaultCotizacionPdfCacheRepository;
}

export const cotizacionPdfCacheRepository: CotizacionPdfCacheRepository = {
  buildPath(...args) {
    return getDefaultCotizacionPdfCacheRepository().buildPath(...args);
  },
  getPublicUrl(...args) {
    return getDefaultCotizacionPdfCacheRepository().getPublicUrl(...args);
  },
  exists(...args) {
    return getDefaultCotizacionPdfCacheRepository().exists(...args);
  },
  upload(...args) {
    return getDefaultCotizacionPdfCacheRepository().upload(...args);
  },
};
