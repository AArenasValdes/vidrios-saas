/**
 * Agrupación visual del catálogo de líneas (proveedor + sistema).
 */

import {
  isVentoraCatalogKey,
  VENTORA_DEFAULT_LINE_CATALOG,
} from "@/features/cotizaciones/line-templates/services/default-line-catalog";

export const LINE_TEMPLATE_GROUP_NO_PROVIDER = "Sin proveedor";
export const LINE_TEMPLATE_GROUP_NO_SYSTEM = "Sin sistema";
/** Valor del filtro UI: todos los proveedores. */
export const LINE_TEMPLATE_PROVIDER_FILTER_ALL = "__all__";

export type LineTemplateGroupSortKey = {
  provider: string;
  system: string;
};

export type LineTemplateProviderGroup<T extends { proveedor?: string | null; nombre: string }> = {
  provider: string;
  templates: T[];
};

export function getLineTemplateProviderLabel(proveedor: string | null | undefined) {
  return proveedor?.trim() || LINE_TEMPLATE_GROUP_NO_PROVIDER;
}

/** Lista de proveedores para el filtro (con nombre primero, Sin proveedor al final). */
export function listLineTemplateProviderFilterOptions(
  providers: Array<string | null | undefined>
) {
  const named = new Set<string>();
  let hasNone = false;

  for (const provider of providers) {
    const trimmed = provider?.trim();
    if (trimmed) {
      named.add(trimmed);
    } else {
      hasNone = true;
    }
  }

  const options = Array.from(named).sort((a, b) => a.localeCompare(b, "es"));
  if (hasNone) {
    options.push(LINE_TEMPLATE_GROUP_NO_PROVIDER);
  }
  return options;
}

/** Proveedores con nombre primero; "Sin proveedor" al final. Luego sistema (sin sistema al final). */
export function compareLineTemplateGroups(
  a: LineTemplateGroupSortKey,
  b: LineTemplateGroupSortKey
) {
  const aNoProvider = a.provider === LINE_TEMPLATE_GROUP_NO_PROVIDER;
  const bNoProvider = b.provider === LINE_TEMPLATE_GROUP_NO_PROVIDER;
  if (aNoProvider !== bNoProvider) {
    return aNoProvider ? 1 : -1;
  }

  const providerSort = a.provider.localeCompare(b.provider, "es");
  if (providerSort !== 0) {
    return providerSort;
  }

  const aNoSystem = a.system === LINE_TEMPLATE_GROUP_NO_SYSTEM;
  const bNoSystem = b.system === LINE_TEMPLATE_GROUP_NO_SYSTEM;
  if (aNoSystem !== bNoSystem) {
    return aNoSystem ? 1 : -1;
  }

  return a.system.localeCompare(b.system, "es");
}

/** Agrupa líneas por proveedor, ordenadas A–Z (Sin proveedor al final). */
export function groupLineTemplatesByProvider<
  T extends { proveedor?: string | null; nombre: string }
>(templates: readonly T[]): LineTemplateProviderGroup<T>[] {
  const buckets = new Map<string, T[]>();

  for (const template of templates) {
    const provider = getLineTemplateProviderLabel(template.proveedor);
    const current = buckets.get(provider);
    if (current) {
      current.push(template);
    } else {
      buckets.set(provider, [template]);
    }
  }

  return Array.from(buckets.entries())
    .map(([provider, items]) => ({
      provider,
      templates: [...items].sort((left, right) =>
        left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" })
      ),
    }))
    .sort((left, right) =>
      compareLineTemplateGroups(
        { provider: left.provider, system: LINE_TEMPLATE_GROUP_NO_SYSTEM },
        { provider: right.provider, system: LINE_TEMPLATE_GROUP_NO_SYSTEM }
      )
    );
}

const VENTORA_CATALOG_KEY_ORDER = new Map(
  VENTORA_DEFAULT_LINE_CATALOG.map((line, index) => [line.catalogKey ?? "", index])
);

/** Orden canónico del catálogo Ventora (fallback alfabético por nombre). */
export function sortVentoraCatalogTemplates<
  T extends { catalogKey: string | null; nombre: string },
>(templates: readonly T[]): T[] {
  return [...templates].sort((left, right) => {
    const leftIndex = left.catalogKey
      ? (VENTORA_CATALOG_KEY_ORDER.get(left.catalogKey) ?? 999)
      : 999;
    const rightIndex = right.catalogKey
      ? (VENTORA_CATALOG_KEY_ORDER.get(right.catalogKey) ?? 999)
      : 999;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
    return left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" });
  });
}

export type LineTemplateCatalogOriginSection = "ventora" | "propias";

export function partitionLineTemplatesByCatalogOrigin<
  T extends { catalogKey: string | null; nombre: string },
>(templates: readonly T[]) {
  const ventora: T[] = [];
  const propias: T[] = [];

  for (const template of templates) {
    if (isVentoraCatalogKey(template.catalogKey)) {
      ventora.push(template);
    } else {
      propias.push(template);
    }
  }

  return {
    ventora: sortVentoraCatalogTemplates(ventora),
    propias: [...propias].sort((left, right) =>
      left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" })
    ),
  };
}
