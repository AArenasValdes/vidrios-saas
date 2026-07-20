/**
 * Agrupación visual del catálogo de líneas (proveedor + sistema).
 */

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
