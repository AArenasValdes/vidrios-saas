import type {
  CotizacionLineTemplate,
  CreateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

import type { LineTemplateImportPreviewRow } from "./line-template-import.service";
import type { TechnicalCatalogLine } from "./line-template-pdf-technical.service";

function serializeProfileCodes(profiles: TechnicalCatalogLine["profiles"]) {
  return profiles
    .slice(0, 80)
    .map((profile) => (profile.label ? `${profile.code}:${profile.label}` : profile.code))
    .join("|");
}

export function buildTechnicalLineTemplateImportPreview(input: {
  lines: TechnicalCatalogLine[];
  existingTemplates: CotizacionLineTemplate[];
  manufacturer?: string | null;
  templateId?: string;
  sourceFileName?: string;
}): LineTemplateImportPreviewRow[] {
  const existingNames = new Set(
    input.existingTemplates.map((item) => item.nombre.trim().toLowerCase())
  );

  return input.lines.map((line, index) => {
    const errors: string[] = [];

    if (!line.nombre.trim()) {
      errors.push("Falta el nombre de la linea.");
    }

    if (line.profiles.length === 0) {
      errors.push("No detectamos perfiles para esta linea en el PDF.");
    }

    const payload: Omit<CreateCotizacionLineTemplateInput, "organizationId"> = {
      nombre: line.nombre,
      categoria: line.categoria,
      unidadCobro: "m2",
      material: line.categoria === "pvc" ? "PVC" : "Aluminio",
      costoBase: 0,
      precioM2Sugerido: 0,
      minimoCobrable: 0,
      redondeoPrecio: 1000,
      mermaPct: 0,
      margenObjetivoPct: null,
      proveedor: input.manufacturer ?? null,
      vidrioPrincipalRecomendado: line.vidrioResumen,
      isActive: true,
      catalogMetadata: {
        catalogSource: "pdf_technical",
        catalogTemplate: input.templateId ?? "generic_technical",
        technicalLineCode: line.lineCode,
        technicalTipo: line.tipoComponente,
        technicalProfileCount: line.profiles.length,
        technicalProfileCodes: serializeProfileCodes(line.profiles),
        technicalPages: line.pageNumbers.join(","),
        technicalAnchoMarco: line.anchoMarco,
        needsCommercialPrice: true,
        sourceFileName: input.sourceFileName ?? null,
      },
    };

    const isDuplicate = line.nombre
      ? existingNames.has(line.nombre.trim().toLowerCase())
      : false;

    const status: LineTemplateImportPreviewRow["status"] = errors.length
      ? "invalid"
      : isDuplicate
        ? "duplicate"
        : "technical";

    return {
      rowNumber: index + 1,
      status,
      errors,
      nombre: line.nombre,
      payload: errors.length ? null : payload,
      technicalProfileCount: line.profiles.length,
      technicalTipo: line.tipoComponente,
    };
  });
}

export function countTechnicalImportPreviewSummary(rows: LineTemplateImportPreviewRow[]) {
  return rows.reduce(
    (accumulator, row) => {
      if (row.status === "technical") {
        accumulator.technical += 1;
      } else if (row.status === "ready") {
        accumulator.ready += 1;
      } else if (row.status === "duplicate") {
        accumulator.duplicate += 1;
      } else {
        accumulator.invalid += 1;
      }
      return accumulator;
    },
    { technical: 0, ready: 0, duplicate: 0, invalid: 0 }
  );
}
