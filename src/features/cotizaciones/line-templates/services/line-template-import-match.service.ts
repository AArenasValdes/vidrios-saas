import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

export type LineTemplateImportMatchKind = "exact_name" | "line_code" | "fuzzy_name";

export type LineTemplateImportMatch = {
  template: CotizacionLineTemplate;
  kind: LineTemplateImportMatchKind;
};

export function normalizeLineTemplateMatchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function extractTechnicalLineCodeCandidate(value: string): string | null {
  const normalized = normalizeLineTemplateMatchKey(value);
  if (!normalized) {
    return null;
  }

  const linePrefix = normalized.match(/(?:^|\b)(?:linea|line)\s+(\d{1,5})\b/);
  if (linePrefix?.[1]) {
    return linePrefix[1];
  }

  if (/^\d{1,5}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

export function getTemplateTechnicalLineCode(
  template: Pick<CotizacionLineTemplate, "nombre" | "catalogMetadata">
): string | null {
  const fromMetadata = template.catalogMetadata?.technicalLineCode;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata.trim();
  }
  if (typeof fromMetadata === "number" && Number.isFinite(fromMetadata)) {
    return String(fromMetadata);
  }

  return extractTechnicalLineCodeCandidate(template.nombre);
}

export function isTechnicalCatalogTemplate(
  template: Pick<CotizacionLineTemplate, "precioM2Sugerido" | "catalogMetadata">
) {
  const metadata = template.catalogMetadata ?? {};
  return (
    metadata.catalogSource === "pdf_technical" ||
    metadata.needsCommercialPrice === true ||
    Boolean(metadata.technicalLineCode) ||
    Boolean(metadata.technicalProfileCodes)
  );
}

export function isTechnicalPriceFillCandidate(
  template: Pick<CotizacionLineTemplate, "precioM2Sugerido" | "catalogMetadata">,
  incomingPrecioM2: number
) {
  if (incomingPrecioM2 <= 0) {
    return false;
  }

  if (!isTechnicalCatalogTemplate(template)) {
    return false;
  }

  return (
    template.catalogMetadata?.needsCommercialPrice === true ||
    Number(template.precioM2Sugerido) <= 0
  );
}

export function findExistingTemplateForImport(
  templates: readonly CotizacionLineTemplate[],
  nombre: string
): LineTemplateImportMatch | null {
  const normalizedNombre = normalizeLineTemplateMatchKey(nombre);
  if (!normalizedNombre) {
    return null;
  }

  const exact = templates.find(
    (template) => normalizeLineTemplateMatchKey(template.nombre) === normalizedNombre
  );
  if (exact) {
    return { template: exact, kind: "exact_name" };
  }

  const lineCode = extractTechnicalLineCodeCandidate(nombre);
  if (lineCode) {
    const byCode = templates.filter(
      (template) => getTemplateTechnicalLineCode(template) === lineCode
    );
    if (byCode.length === 1) {
      return { template: byCode[0], kind: "line_code" };
    }
  }

  const fuzzyCandidates = templates.filter((template) => {
    const templateKey = normalizeLineTemplateMatchKey(template.nombre);
    if (templateKey.length < 6 || normalizedNombre.length < 6) {
      return false;
    }

    return (
      templateKey.includes(normalizedNombre) || normalizedNombre.includes(templateKey)
    );
  });

  if (fuzzyCandidates.length === 1) {
    return { template: fuzzyCandidates[0], kind: "fuzzy_name" };
  }

  return null;
}

export function mergeCatalogMetadataForCommercialUpdate(
  existing: Record<string, string | number | boolean | null> | undefined,
  incoming: Record<string, string | number | boolean | null> | undefined,
  precioM2Sugerido: number
) {
  const next: Record<string, string | number | boolean | null> = {
    ...(existing ?? {}),
  };

  for (const [key, value] of Object.entries(incoming ?? {})) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    next[key] = value;
  }

  if (precioM2Sugerido > 0) {
    delete next.needsCommercialPrice;
  }

  return next;
}
