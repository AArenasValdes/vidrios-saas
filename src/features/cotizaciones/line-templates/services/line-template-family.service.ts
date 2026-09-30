import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

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

export function resolveLineTemplateFamily(template: CotizacionLineTemplate) {
  const explicitKey = metadataFamilyKey(template);
  if (explicitKey) {
    return (
      LINE_TEMPLATE_FAMILIES.find((family) => family.key === explicitKey) ?? {
        key: explicitKey,
        label: template.nombre,
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
  const groups = new Map<string, LineTemplateFamilyGroup>();
  for (const template of templates) {
    const family = resolveLineTemplateFamily(template);
    const isOwn = !template.catalogKey?.startsWith("ventora:");
    const key = isOwn ? `own:${family.key}` : family.key;
    const group = groups.get(key);
    if (group) group.templates.push(template);
    else groups.set(key, { key, label: family.label, templates: [template], isOwn });
  }
  return [...groups.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "es", { sensitivity: "base" })
  );
}
