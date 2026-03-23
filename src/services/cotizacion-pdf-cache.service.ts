import {
  buildCotizacionPdfStoragePath,
  cotizacionPdfCacheRepository,
  type CotizacionPdfCacheRepository,
} from "@/repositories/cotizacion-pdf-cache.repository";
import type { EntityId } from "@/types/common";

type CotizacionPdfCacheServiceDeps = {
  repository?: CotizacionPdfCacheRepository;
};

export type QuotePdfCacheIdentity = {
  organizationId: EntityId;
  cotizacionId: EntityId;
  updatedAt: string;
};

export function createCotizacionPdfCacheService(
  deps: CotizacionPdfCacheServiceDeps = {}
) {
  const repository = deps.repository ?? cotizacionPdfCacheRepository;

  return {
    buildStoragePath(identity: QuotePdfCacheIdentity) {
      return buildCotizacionPdfStoragePath(identity);
    },

    getPublicUrl(identity: QuotePdfCacheIdentity) {
      return repository.getPublicUrl(identity);
    },

    async resolveCachedPdf(identity: QuotePdfCacheIdentity) {
      const exists = await repository.exists(identity);

      if (!exists) {
        return null;
      }

      return repository.getPublicUrl(identity);
    },

    async persistPdf(identity: QuotePdfCacheIdentity, file: File) {
      if (file.type && file.type !== "application/pdf") {
        throw new Error("El archivo a persistir debe ser un PDF");
      }

      return repository.upload(identity, file);
    },
  };
}

export const cotizacionPdfCacheService = createCotizacionPdfCacheService();
