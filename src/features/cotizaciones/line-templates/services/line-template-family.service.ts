import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  normalizeUniversalAluminumFamilyKey,
  resolveDefaultLineSupplierFamilyKey,
} from "@/features/cotizaciones/line-templates/services/default-line-catalog";

export type LineTemplateFamily = {
  key: string;
  label: string;
  catalogKeys: readonly string[];
};

/** Familias declaradas por identidad estable; no se derivan de nombres ni sufijos. */
export const LINE_TEMPLATE_FAMILIES: readonly LineTemplateFamily[] = [
  {
    key: "ventora:winhouse-new-s75",
    label: "New S75",
    catalogKeys: [
      "ventora:winhouse-new-s75-doble-riel",
      "ventora:winhouse-new-s75-triple-riel",
    ],
  },
];

export type LineTemplateFamilyGroup = {
  key: string;
  label: string;
  templates: CotizacionLineTemplate[];
  isOwn: boolean;
};

function metadataFamilyKey(template: CotizacionLineTemplate): string | null {
  const value = template.catalogMetadata?.familyKey;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Usa metadata propia primero y la identidad canónica del catálogo como respaldo para plantillas antiguas. */
export function resolveSupplierFamilyKeyForLineTemplate(
  template: CotizacionLineTemplate | null | undefined
): string | null {
  if (!template) return null;
  return normalizeUniversalAluminumFamilyKey(metadataFamilyKey(template)) ??
    resolveDefaultLineSupplierFamilyKey(template.catalogKey);
}

function metadataFamilyLabel(template: CotizacionLineTemplate): string | null {
  const value = template.catalogMetadata?.familyLabel;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveLineTemplateFamily(template: CotizacionLineTemplate) {
  const explicitKey = normalizeUniversalAluminumFamilyKey(metadataFamilyKey(template)) ?? metadataFamilyKey(template);
  if (explicitKey) {
    const explicitLabel = metadataFamilyLabel(template);
    return (
      LINE_TEMPLATE_FAMILIES.find((family) => family.key === explicitKey) ?? {
        key: explicitKey,
        label: explicitLabel ?? template.nombre,
        catalogKeys: [],
      }
    );
  }

  const family = LINE_TEMPLATE_FAMILIES.find((entry) =>
    entry.catalogKeys.includes(template.catalogKey ?? "")
  );
  return family ?? {
    key: template.catalogKey ?? `own:${String(template.organizationId)}:${String(template.id)}`,
    label: template.nombre,
    catalogKeys: template.catalogKey ? [template.catalogKey] : [],
  };
}

/** Las líneas propias quedan en grupos propios; solo una declaración explícita las agrupa. */
export function groupLineTemplatesByFamily(
  templates: readonly CotizacionLineTemplate[]
): LineTemplateFamilyGroup[] {
  const groups: LineTemplateFamilyGroup[] = [];
  const usedKeys = new Set<string>();
  let previousBaseKey: string | null = null;
  for (const template of templates) {
    const isOwn = !template.catalogKey?.startsWith("ventora:");
    const family = resolveLineTemplateFamily(template);
    const baseKey = isOwn
      ? `own:${String(template.organizationId)}`
      : family.key;
    const previousGroup = groups.at(-1);
    // Group adjacent entries only: the picker keeps the catalog's established
    // order while avoiding a repeated "Mis líneas" heading for consecutive private lines.
    if (previousGroup && previousBaseKey === baseKey) {
      previousGroup.templates.push(template);
    } else {
      let key = baseKey;
      if (usedKeys.has(key)) {
        key = `${baseKey}:${String(template.id)}:${groups.length}`;
        while (usedKeys.has(key)) key = `${key}:next`;
      }
      usedKeys.add(key);
      groups.push({
        key,
        label: isOwn ? "Mis líneas" : family.label,
        templates: [template],
        isOwn,
      });
    }
    previousBaseKey = baseKey;
  }
  return groups;
}
