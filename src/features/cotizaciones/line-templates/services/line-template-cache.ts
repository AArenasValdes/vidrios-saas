import { cotizacionLineTemplatesService } from "@/features/cotizaciones/line-templates/services/cotizacion-line-templates.service";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

type TemplateCacheEntry = {
  items?: CotizacionLineTemplate[];
  fetchedAt: number;
  request?: Promise<CotizacionLineTemplate[]>;
};

const TEMPLATE_CACHE_TTL_MS = 30_000;
const templateCache = new Map<string, TemplateCacheEntry>();
const templateCacheGeneration = new Map<string, number>();

function getTemplateCacheKey(organizationId: string | number, activeOnly?: boolean) {
  return `${organizationId}:${activeOnly === true ? "active" : "all"}`;
}

export function readFreshLineTemplateCache(
  organizationId: string | number,
  activeOnly: boolean | undefined
) {
  const entry = templateCache.get(getTemplateCacheKey(organizationId, activeOnly));
  if (!entry?.items || Date.now() - entry.fetchedAt >= TEMPLATE_CACHE_TTL_MS) {
    return null;
  }

  return entry.items;
}

export function fetchLineTemplates(
  organizationId: string | number,
  activeOnly: boolean | undefined,
  force = false
) {
  const key = getTemplateCacheKey(organizationId, activeOnly);
  const current = templateCache.get(key);

  if (!force && current?.request) {
    return current.request;
  }

  if (!force && current?.items && Date.now() - current.fetchedAt < TEMPLATE_CACHE_TTL_MS) {
    return Promise.resolve(current.items);
  }

  const generation = templateCacheGeneration.get(key) ?? 0;
  const request = cotizacionLineTemplatesService
    .getTemplatesByOrganizationId(organizationId, { activeOnly })
    .then((items) => {
      if ((templateCacheGeneration.get(key) ?? 0) === generation) {
        templateCache.set(key, { items, fetchedAt: Date.now() });
      }
      return items;
    })
    .finally(() => {
      const entry = templateCache.get(key);
      if (entry?.request === request) {
        templateCache.set(key, {
          items: entry.items,
          fetchedAt: entry.fetchedAt,
        });
      }
    });

  templateCache.set(key, {
    items: current?.items,
    fetchedAt: current?.fetchedAt ?? 0,
    request,
  });

  return request;
}

export function invalidateLineTemplateCache(organizationId: string | number) {
  for (const activeOnly of [false, true]) {
    const key = getTemplateCacheKey(organizationId, activeOnly);
    templateCacheGeneration.set(key, (templateCacheGeneration.get(key) ?? 0) + 1);
    templateCache.delete(key);
  }
}
