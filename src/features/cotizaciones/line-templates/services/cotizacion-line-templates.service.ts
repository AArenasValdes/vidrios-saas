import {
  cotizacionLineTemplatesRepository,
  type CotizacionLineTemplatesRepository,
} from "@/features/cotizaciones/line-templates/repositories/cotizacion-line-templates.repository";
import {
  LINE_TEMPLATE_CATEGORIAS,
  LINE_TEMPLATE_MATERIALS,
  type CotizacionLineTemplate,
  type CotizacionLineTemplateCategoria,
  type CotizacionLineTemplateMaterial,
  type CotizacionLineTemplateUnidadCobro,
  type CreateCotizacionLineTemplateInput,
  type LineTemplateImportDuplicateMode,
  type LineTemplateImportResult,
  type UpdateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { EntityId } from "@/types/common";

type CotizacionLineTemplatesServiceDeps = {
  repository?: CotizacionLineTemplatesRepository;
};

function normalizeText(value: string) {
  return value.trim();
}

function normalizeMoney(value: number | null | undefined, fallback = 0) {
  const nextValue = Number(value ?? fallback);

  if (!Number.isFinite(nextValue) || nextValue < 0) {
    throw new Error("Los valores deben ser cero o mayores.");
  }

  return Math.round(nextValue);
}

function normalizePercent(value: number | null | undefined, fallback = 0) {
  const nextValue = Number(value ?? fallback);

  if (!Number.isFinite(nextValue) || nextValue < 0) {
    throw new Error("Los porcentajes deben ser cero o mayores.");
  }

  if (nextValue >= 100) {
    throw new Error("El margen objetivo debe ser menor a 100%.");
  }

  return Math.round(nextValue * 100) / 100;
}

function normalizeOptionalPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizePercent(value, 0);
}

function normalizeRound(value: number | null | undefined) {
  const nextValue = normalizeMoney(value ?? 1000, 1000);
  return nextValue > 0 ? nextValue : 0;
}

function normalizeTemplateName(value: string) {
  const nombre = normalizeText(value);

  if (!nombre) {
    throw new Error("El nombre comercial es obligatorio.");
  }

  return nombre.slice(0, 80);
}

function normalizeTemplateMaterial(value: string | null | undefined): CotizacionLineTemplateMaterial {
  const normalized = (value ?? "").trim();

  if ((LINE_TEMPLATE_MATERIALS as readonly string[]).includes(normalized)) {
    return normalized as CotizacionLineTemplateMaterial;
  }

  throw new Error("Debes elegir si el producto es de Aluminio, PVC o Cristal.");
}

function normalizeTemplateCategoria(value: string | null | undefined): CotizacionLineTemplateCategoria {
  const normalized = (value ?? "").trim().toLowerCase();

  if ((LINE_TEMPLATE_CATEGORIAS as readonly string[]).includes(normalized)) {
    return normalized as CotizacionLineTemplateCategoria;
  }

  if (normalized === "aluminio" || normalized === "aluminium") {
    return "aluminio";
  }

  throw new Error("La categoria del catalogo no es valida.");
}

function normalizeUnidadCobro(value: string | null | undefined): CotizacionLineTemplateUnidadCobro {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace("m²", "m2")
    .replace("metro_lineal", "metro_lineal")
    .replace("ml", "metro_lineal");

  if (normalized === "m2" || normalized === "m²") {
    return "m2";
  }

  if (
    normalized === "metro_lineal" ||
    normalized === "unidad" ||
    normalized === "ud" ||
    normalized === "valor_manual" ||
    normalized === "manual"
  ) {
    if (normalized === "ud") return "unidad";
    if (normalized === "manual") return "valor_manual";
    return normalized as CotizacionLineTemplateUnidadCobro;
  }

  return "m2";
}

function materialFromCategoria(categoria: CotizacionLineTemplateCategoria): CotizacionLineTemplateMaterial {
  if (categoria === "pvc") return "PVC";
  if (categoria === "vidrio") return "Cristal";
  return "Aluminio";
}

function normalizeMaterialForCategoria(
  categoria: CotizacionLineTemplateCategoria,
  material: string | null | undefined
): CotizacionLineTemplateMaterial {
  if (categoria === "vidrio") {
    return "Cristal";
  }

  return normalizeTemplateMaterial(material ?? materialFromCategoria(categoria));
}

function normalizeUnitForCategoria(
  categoria: CotizacionLineTemplateCategoria,
  unidadCobro: string | null | undefined
): CotizacionLineTemplateUnidadCobro {
  if (categoria === "vidrio") {
    return "m2";
  }

  return normalizeUnidadCobro(unidadCobro ?? "m2");
}

function normalizeGlassMetadata(
  categoria: CotizacionLineTemplateCategoria,
  metadata: Record<string, string | number | boolean | null> | undefined
) {
  if (categoria !== "vidrio") {
    return metadata ?? {};
  }

  const next = { ...(metadata ?? {}) };
  for (const key of ["espesor", "terminacion", "descripcion"] as const) {
    if (typeof next[key] === "string") {
      const trimmed = next[key].trim();
      if (trimmed) next[key] = trimmed.slice(0, key === "espesor" ? 40 : 160);
      else delete next[key];
    }
  }

  return next;
}

function normalizeRecommendedGlass(value: string | null | undefined) {
  const normalized = normalizeText(value ?? "");
  return normalized ? normalized.slice(0, 120) : null;
}

function normalizeOptionalDate(value: string | null | undefined) {
  const normalized = normalizeText(value ?? "");
  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("La vigencia debe tener formato de fecha valido.");
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeProveedor(value: string | null | undefined) {
  const normalized = normalizeText(value ?? "");
  return normalized ? normalized.slice(0, 120) : null;
}

function normalizeCreateInput(
  input: Omit<CreateCotizacionLineTemplateInput, "organizationId">
) {
  const categoria = normalizeTemplateCategoria(input.categoria ?? input.material?.toLowerCase());
  const material = normalizeMaterialForCategoria(categoria, input.material);
  const precioM2Sugerido = normalizeMoney(input.precioM2Sugerido);

  if (categoria === "vidrio" && precioM2Sugerido <= 0) {
    throw new Error("El precio por m2 del cristal debe ser mayor a cero.");
  }

  return {
    nombre: normalizeTemplateName(input.nombre),
    categoria,
    unidadCobro: normalizeUnitForCategoria(categoria, input.unidadCobro),
    material,
    vidrioPrincipalRecomendado: normalizeRecommendedGlass(input.vidrioPrincipalRecomendado),
    costoBase: normalizeMoney(input.costoBase ?? 0),
    precioM2Sugerido,
    minimoCobrable: normalizeMoney(input.minimoCobrable ?? 0),
    redondeoPrecio: normalizeRound(input.redondeoPrecio),
    mermaPct: normalizePercent(input.mermaPct ?? 0),
    margenObjetivoPct: normalizeOptionalPercent(input.margenObjetivoPct),
    proveedor: normalizeProveedor(input.proveedor),
    vigenciaDesde: normalizeOptionalDate(input.vigenciaDesde),
    vigenciaHasta: normalizeOptionalDate(input.vigenciaHasta),
    catalogMetadata: normalizeGlassMetadata(categoria, input.catalogMetadata),
    isActive: input.isActive ?? true,
    sortOrder: Math.max(0, Math.trunc(Number(input.sortOrder ?? 0) || 0)),
  };
}

function normalizeUpdateInput(input: UpdateCotizacionLineTemplateInput) {
  const payload: UpdateCotizacionLineTemplateInput = {};

  if (input.nombre !== undefined) {
    payload.nombre = normalizeTemplateName(input.nombre);
  }
  if (input.categoria !== undefined) {
    payload.categoria = normalizeTemplateCategoria(input.categoria);
  }
  if (input.unidadCobro !== undefined) {
    payload.unidadCobro = normalizeUnitForCategoria(
      payload.categoria ?? "aluminio",
      input.unidadCobro
    );
  }
  if (input.precioM2Sugerido !== undefined) {
    payload.precioM2Sugerido = normalizeMoney(input.precioM2Sugerido);
  }
  if (input.material !== undefined) {
    payload.material = normalizeMaterialForCategoria(payload.categoria ?? "aluminio", input.material);
  }
  if (input.vidrioPrincipalRecomendado !== undefined) {
    payload.vidrioPrincipalRecomendado = normalizeRecommendedGlass(
      input.vidrioPrincipalRecomendado
    );
  }
  if (input.costoBase !== undefined) {
    payload.costoBase = normalizeMoney(input.costoBase);
  }
  if (input.minimoCobrable !== undefined) {
    payload.minimoCobrable = normalizeMoney(input.minimoCobrable);
  }
  if (input.redondeoPrecio !== undefined) {
    payload.redondeoPrecio = normalizeRound(input.redondeoPrecio);
  }
  if (input.mermaPct !== undefined) {
    payload.mermaPct = normalizePercent(input.mermaPct);
  }
  if (input.margenObjetivoPct !== undefined) {
    payload.margenObjetivoPct = normalizeOptionalPercent(input.margenObjetivoPct);
  }
  if (input.proveedor !== undefined) {
    payload.proveedor = normalizeProveedor(input.proveedor);
  }
  if (input.vigenciaDesde !== undefined) {
    payload.vigenciaDesde = normalizeOptionalDate(input.vigenciaDesde);
  }
  if (input.vigenciaHasta !== undefined) {
    payload.vigenciaHasta = normalizeOptionalDate(input.vigenciaHasta);
  }
  if (input.catalogMetadata !== undefined) {
    payload.catalogMetadata = normalizeGlassMetadata(
      payload.categoria ?? "aluminio",
      input.catalogMetadata
    );
  }
  if (input.isActive !== undefined) {
    payload.isActive = Boolean(input.isActive);
  }
  if (input.sortOrder !== undefined) {
    payload.sortOrder = Math.max(0, Math.trunc(Number(input.sortOrder) || 0));
  }

  if (payload.categoria === "vidrio") {
    payload.material = "Cristal";
    payload.unidadCobro = "m2";
    payload.catalogMetadata = normalizeGlassMetadata(
      "vidrio",
      payload.catalogMetadata ?? input.catalogMetadata
    );
    if (payload.precioM2Sugerido !== undefined && payload.precioM2Sugerido <= 0) {
      throw new Error("El precio por m2 del cristal debe ser mayor a cero.");
    }
  }

  return payload;
}

function findTemplateByName(templates: CotizacionLineTemplate[], nombre: string) {
  const normalized = nombre.trim().toLowerCase();
  return (
    templates.find((item) => item.nombre.trim().toLowerCase() === normalized) ?? null
  );
}

export function createCotizacionLineTemplatesService(
  deps: CotizacionLineTemplatesServiceDeps = {}
) {
  const repository = deps.repository ?? cotizacionLineTemplatesRepository;

  return {
    async getTemplatesByOrganizationId(organizationId: EntityId, options?: { activeOnly?: boolean }) {
      return repository.listByOrganizationId(organizationId, options);
    },

    async createTemplate(
      organizationId: EntityId,
      input: Omit<CreateCotizacionLineTemplateInput, "organizationId">
    ) {
      const normalized = normalizeCreateInput(input);
      const current = await repository.listByOrganizationId(organizationId);

      return repository.create({
        organizationId,
        ...normalized,
        sortOrder:
          input.sortOrder !== undefined
            ? normalized.sortOrder
            : current.length > 0
              ? Math.max(...current.map((item) => item.sortOrder)) + 1
              : 0,
      });
    },

    async updateTemplate(
      id: EntityId,
      organizationId: EntityId,
      input: UpdateCotizacionLineTemplateInput
    ) {
      return repository.update(id, organizationId, normalizeUpdateInput(input));
    },

    async duplicateTemplate(id: EntityId, organizationId: EntityId) {
      const source = await repository.getById(id, organizationId);

      if (!source) {
        throw new Error("No encontramos la linea que quieres duplicar.");
      }

      const siblings = await repository.listByOrganizationId(organizationId);
      const duplicateNameBase = `${source.nombre} copia`;
      let duplicateName = duplicateNameBase;
      let index = 2;

      while (
        siblings.some(
          (item) => item.nombre.trim().toLowerCase() === duplicateName.trim().toLowerCase()
        )
      ) {
        duplicateName = `${duplicateNameBase} ${index}`;
        index += 1;
      }

      return repository.create({
        organizationId,
        nombre: duplicateName,
        categoria: source.categoria,
        unidadCobro: source.unidadCobro,
        precioM2Sugerido: source.precioM2Sugerido,
        material: source.material,
        vidrioPrincipalRecomendado: source.vidrioPrincipalRecomendado,
        costoBase: source.costoBase,
        minimoCobrable: source.minimoCobrable,
        redondeoPrecio: source.redondeoPrecio,
        mermaPct: source.mermaPct,
        margenObjetivoPct: source.margenObjetivoPct,
        proveedor: source.proveedor,
        vigenciaDesde: source.vigenciaDesde,
        vigenciaHasta: source.vigenciaHasta,
        catalogMetadata: source.catalogMetadata,
        isActive: source.isActive,
        sortOrder: source.sortOrder + 1,
      });
    },

    async deleteTemplate(id: EntityId, organizationId: EntityId) {
      return repository.softDelete(id, organizationId);
    },

    async importTemplates(
      organizationId: EntityId,
      rows: Array<Omit<CreateCotizacionLineTemplateInput, "organizationId">>,
      options: { duplicateMode: LineTemplateImportDuplicateMode }
    ): Promise<LineTemplateImportResult> {
      const current = await repository.listByOrganizationId(organizationId);
      const result: LineTemplateImportResult = {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };

      for (const [index, row] of rows.entries()) {
        try {
          const normalized = normalizeCreateInput(row);
          const duplicate = findTemplateByName(current, normalized.nombre);

          if (duplicate && options.duplicateMode === "skip") {
            result.skipped += 1;
            continue;
          }

          if (duplicate && options.duplicateMode === "update") {
            const updated = await repository.update(duplicate.id, organizationId, normalized);
            const currentIndex = current.findIndex((item) => item.id === duplicate.id);
            if (currentIndex >= 0) {
              current[currentIndex] = updated;
            }
            result.updated += 1;
            continue;
          }

          const created = await repository.create({
            organizationId,
            ...normalized,
            sortOrder:
              current.length > 0 ? Math.max(...current.map((item) => item.sortOrder)) + 1 : 0,
          });
          current.push(created);
          result.created += 1;
        } catch (error) {
          result.failed += 1;
          result.errors.push(
            `Fila ${index + 1}: ${
              error instanceof Error ? error.message : "No se pudo importar la linea."
            }`
          );
        }
      }

      return result;
    },

    buildTemplateFromSuggestedPrice(input: {
      nombre: string;
      material: CotizacionLineTemplateMaterial;
      precioM2Sugerido: number;
      minimoCobrable?: number;
      redondeoPrecio?: number;
      isActive?: boolean;
    }): Omit<CreateCotizacionLineTemplateInput, "organizationId"> {
      return normalizeCreateInput(input);
    },
  };
}

export const cotizacionLineTemplatesService = createCotizacionLineTemplatesService();

export type CotizacionLineTemplatesService = ReturnType<
  typeof createCotizacionLineTemplatesService
>;
