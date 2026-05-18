import {
  cotizacionLineTemplatesRepository,
  type CotizacionLineTemplatesRepository,
} from "@/features/cotizaciones/line-templates/repositories/cotizacion-line-templates.repository";
import {
  LINE_TEMPLATE_MATERIALS,
  type CotizacionLineTemplateMaterial,
  type CreateCotizacionLineTemplateInput,
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

function normalizeRound(value: number | null | undefined) {
  const nextValue = normalizeMoney(value ?? 1000, 1000);
  return nextValue > 0 ? nextValue : 0;
}

function normalizeTemplateName(value: string) {
  const nombre = normalizeText(value);

  if (!nombre) {
    throw new Error("El nombre comercial de la linea es obligatorio.");
  }

  return nombre.slice(0, 80);
}

function normalizeTemplateMaterial(value: string | null | undefined): CotizacionLineTemplateMaterial {
  const normalized = (value ?? "").trim();

  if ((LINE_TEMPLATE_MATERIALS as readonly string[]).includes(normalized)) {
    return normalized as CotizacionLineTemplateMaterial;
  }

  throw new Error("Debes elegir si la linea es de Aluminio o PVC.");
}

function normalizeRecommendedGlass(value: string | null | undefined) {
  const normalized = normalizeText(value ?? "");
  return normalized ? normalized.slice(0, 120) : null;
}

function normalizeCreateInput(
  input: Omit<CreateCotizacionLineTemplateInput, "organizationId">
) {
  return {
    nombre: normalizeTemplateName(input.nombre),
    material: normalizeTemplateMaterial(input.material),
    vidrioPrincipalRecomendado: normalizeRecommendedGlass(input.vidrioPrincipalRecomendado),
    precioM2Sugerido: normalizeMoney(input.precioM2Sugerido),
    minimoCobrable: normalizeMoney(input.minimoCobrable ?? 0),
    redondeoPrecio: normalizeRound(input.redondeoPrecio),
    isActive: input.isActive ?? true,
    sortOrder: Math.max(0, Math.trunc(Number(input.sortOrder ?? 0) || 0)),
  };
}

function normalizeUpdateInput(input: UpdateCotizacionLineTemplateInput) {
  const payload: UpdateCotizacionLineTemplateInput = {};

  if (input.nombre !== undefined) {
    payload.nombre = normalizeTemplateName(input.nombre);
  }
  if (input.precioM2Sugerido !== undefined) {
    payload.precioM2Sugerido = normalizeMoney(input.precioM2Sugerido);
  }
  if (input.material !== undefined) {
    payload.material = normalizeTemplateMaterial(input.material);
  }
  if (input.vidrioPrincipalRecomendado !== undefined) {
    payload.vidrioPrincipalRecomendado = normalizeRecommendedGlass(
      input.vidrioPrincipalRecomendado
    );
  }
  if (input.minimoCobrable !== undefined) {
    payload.minimoCobrable = normalizeMoney(input.minimoCobrable);
  }
  if (input.redondeoPrecio !== undefined) {
    payload.redondeoPrecio = normalizeRound(input.redondeoPrecio);
  }
  if (input.isActive !== undefined) {
    payload.isActive = Boolean(input.isActive);
  }
  if (input.sortOrder !== undefined) {
    payload.sortOrder = Math.max(0, Math.trunc(Number(input.sortOrder) || 0));
  }

  return payload;
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
        precioM2Sugerido: source.precioM2Sugerido,
        material: source.material,
        vidrioPrincipalRecomendado: source.vidrioPrincipalRecomendado,
        minimoCobrable: source.minimoCobrable,
        redondeoPrecio: source.redondeoPrecio,
        isActive: source.isActive,
        sortOrder: source.sortOrder + 1,
      });
    },

    async deleteTemplate(id: EntityId, organizationId: EntityId) {
      return repository.softDelete(id, organizationId);
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
