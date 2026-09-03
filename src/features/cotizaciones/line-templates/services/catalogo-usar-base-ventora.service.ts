import {
  BASES_TIPOLOGICAS_VENTORA,
  crearBaseTipologicaVentora,
  crearRecetaPlantillaVentoraCorredera2H,
  PLANTILLAS_VENTORA_CORREDERA_2H,
  resumirBaseEstructural,
  type BaseTipologicaVentora,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  crearRecetaPlantillaVentoraProyectante,
  PLANTILLAS_VENTORA_PROYECTANTE,
  type PlantillaVentoraProyectanteId,
} from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { buildProcedenciaPersistence } from "@/features/fabricacion/types/fabricacion-receta-procedencia";
import type { CreateFabricationRecipeInput } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CreateCotizacionLineTemplateInput } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { VENTORA_LINE_CATALOG_KEY_PREFIX } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

export type CatalogoInicioRapidoKind =
  | "plantilla_ventora"
  | "plantilla_verificada"
  | "base_estructural";

export type CatalogoInicioRapidoItem = {
  kind: CatalogoInicioRapidoKind;
  id: string;
  /** Nombre sugerido para la línea privada al usarla. */
  lineName: string;
  title: string;
  subtitle: string;
  badge: string;
  meta: string;
  actionLabel: string;
  tipologia: BaseTipologicaVentora["tipologia"];
  hojas: number;
  modulos: number;
  plantillaId?: PlantillaVentoraCorrederaId;
  plantillaVerificadaId?: PlantillaVentoraProyectanteId;
};

/** @deprecated Usar CatalogoInicioRapidoItem */
export type CatalogoBaseVentoraRecommendation = CatalogoInicioRapidoItem;

/** Umbral para colapsar recomendaciones y no empujar un catálogo grande. */
export const CATALOGO_BASES_COLLAPSE_THRESHOLD = 8;

function buildBaseRecommendation(
  base: BaseTipologicaVentora
): CatalogoInicioRapidoItem {
  const recipe = crearBaseTipologicaVentora({
    tipologia: base.tipologia,
    hojas: base.hojasSugeridas,
    modulos: base.modulosSugeridos,
    lineName: base.label,
    createId: (() => {
      let next = 0;
      return () => `${base.id}-preview-${next++}`;
    })(),
  });
  const summary = resumirBaseEstructural(recipe);
  const hojas = base.hojasSugeridas;
  const title = `${base.label} · ${hojas} ${hojas === 1 ? "hoja" : "hojas"}`;

  return {
    kind: "base_estructural",
    id: base.id,
    lineName: title,
    title,
    subtitle: "",
    badge: "Base estructural",
    meta: "Ajustes por confirmar",
    actionLabel: "Usar base",
    tipologia: base.tipologia,
    hojas,
    modulos: base.modulosSugeridos,
  };
}

export function listarPlantillasVerificadasVentoraParaCatalogo(): CatalogoInicioRapidoItem[] {
  return (
    Object.values(PLANTILLAS_VENTORA_PROYECTANTE) as Array<
      (typeof PLANTILLAS_VENTORA_PROYECTANTE)[PlantillaVentoraProyectanteId]
    >
  ).map((plantilla) => ({
    kind: "plantilla_verificada" as const,
    id: `plantilla-verificada-${plantilla.id.toLowerCase()}`,
    lineName: plantilla.title,
    title: plantilla.title,
    subtitle: "Aluminio",
    badge: "Base estructural",
    meta: "Pendiente validar medidas de taller",
    actionLabel: "Usar plantilla",
    tipologia: "proyectante",
    hojas: 1,
    modulos: 1,
    plantillaVerificadaId: plantilla.id,
  }));
}

/**
 * Plantillas Ventora con parámetros conocidos (ajustes documentados).
 * No aparecen como líneas privadas hasta que el usuario las usa.
 */
export function listarPlantillasVentoraParaCatalogo(): CatalogoInicioRapidoItem[] {
  return (
    Object.values(PLANTILLAS_VENTORA_CORREDERA_2H) as Array<
      (typeof PLANTILLAS_VENTORA_CORREDERA_2H)[PlantillaVentoraCorrederaId]
    >
  ).map((plantilla) => ({
    kind: "plantilla_ventora" as const,
    id: `plantilla-ventora-${plantilla.id.toLowerCase()}`,
    lineName: plantilla.label,
    title: plantilla.label,
    subtitle: "Corredera · 2 hojas",
    badge: "Plantilla Ventora",
    meta: "Ajustes incluidos",
    actionLabel: "Usar plantilla",
    tipologia: "corredera",
    hojas: 2,
    modulos: 2,
    plantillaId: plantilla.id,
  }));
}

/**
 * Solo bases estructurales listas (sin `pendienteCompletar`).
 * Ajustes desconocidos: Por confirmar en Paso 2.
 */
export function listarBasesVentoraParaCatalogo(): CatalogoInicioRapidoItem[] {
  return BASES_TIPOLOGICAS_VENTORA.filter((entry) => !entry.pendienteCompletar).map(
    buildBaseRecommendation
  );
}

/** Plantillas con datos conocidos primero; base estructural genérica después. */
export function listarInicioRapidoCatalogo(): CatalogoInicioRapidoItem[] {
  return [
    ...listarPlantillasVentoraParaCatalogo(),
    ...listarPlantillasVerificadasVentoraParaCatalogo(),
    ...listarBasesVentoraParaCatalogo(),
  ];
}

function resolveVentoraPlantillaId(
  metadata: CotizacionLineTemplate["catalogMetadata"] | null | undefined
): string | null {
  const raw = metadata?.ventoraPlantillaId;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  return normalized ? normalized.toUpperCase() : null;
}

/** Oculta plantillas Ventora ya presentes en el catálogo comercial de la org. */
export function filterInicioRapidoCatalogoForExistingTemplates(
  items: CatalogoInicioRapidoItem[],
  templates: CotizacionLineTemplate[]
): CatalogoInicioRapidoItem[] {
  const catalogKeys = new Set(
    templates
      .map((template) => template.catalogKey?.trim())
      .filter((key): key is string => Boolean(key))
  );
  const plantillaIds = new Set(
    templates
      .map((template) => resolveVentoraPlantillaId(template.catalogMetadata))
      .filter((id): id is string => Boolean(id))
  );

  return items.filter((item) => {
    if (item.kind !== "plantilla_ventora" || !item.plantillaId) {
      return true;
    }

    const catalogKey = `${VENTORA_LINE_CATALOG_KEY_PREFIX}${item.plantillaId.toLowerCase()}`;
    if (catalogKeys.has(catalogKey)) {
      return false;
    }

    return !plantillaIds.has(item.plantillaId.toUpperCase());
  });
}

export function buildUniqueCatalogLineName(
  baseName: string,
  existingNames: string[]
): string {
  const taken = new Set(
    existingNames.map((name) => name.trim().toLowerCase()).filter(Boolean)
  );
  const normalized = baseName.trim();
  if (!taken.has(normalized.toLowerCase())) return normalized;

  let index = 2;
  while (taken.has(`${normalized} ${index}`.toLowerCase())) {
    index += 1;
  }
  return `${normalized} ${index}`;
}

export function buildLineTemplatePayloadFromInicioRapido(input: {
  item: CatalogoInicioRapidoItem;
  existingNames: string[];
}): Omit<CreateCotizacionLineTemplateInput, "organizationId"> {
  const nombre = buildUniqueCatalogLineName(input.item.lineName, input.existingNames);
  const lineSystem =
    input.item.kind === "plantilla_ventora"
      ? input.item.plantillaId ?? input.item.title
      : input.item.kind === "plantilla_verificada"
        ? input.item.plantillaVerificadaId ?? input.item.title
        : input.item.tipologia === "corredera"
          ? "Corredera"
          : input.item.title;

  return {
    nombre,
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    precioM2Sugerido: 0,
    costoBase: 0,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    // Ventora no es fabricante: la línea nace sin proveedor.
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {
      needsCommercialPrice: true,
      lineSystem,
    },
    isActive: true,
  };
}

/** @deprecated Usar buildLineTemplatePayloadFromInicioRapido */
export function buildLineTemplatePayloadFromBaseVentora(input: {
  recommendation: CatalogoInicioRapidoItem;
  existingNames: string[];
}): Omit<CreateCotizacionLineTemplateInput, "organizationId"> {
  return buildLineTemplatePayloadFromInicioRapido({
    item: input.recommendation,
    existingNames: input.existingNames,
  });
}

export function buildFabricationRecipeInputFromInicioRapido(input: {
  item: CatalogoInicioRapidoItem;
  lineTemplateId: number;
  lineName: string;
  createId?: () => string;
}): Omit<CreateFabricationRecipeInput, "organizationId" | "scope"> {
  const definition =
    input.item.kind === "plantilla_ventora" && input.item.plantillaId
      ? crearRecetaPlantillaVentoraCorredera2H(input.item.plantillaId, {
          createId: input.createId,
        })
      : input.item.kind === "plantilla_verificada" &&
          input.item.plantillaVerificadaId
        ? crearRecetaPlantillaVentoraProyectante(
            input.item.plantillaVerificadaId,
            {
              createId: input.createId,
              lineName: input.lineName,
            }
          )
      : crearBaseTipologicaVentora({
          tipologia: input.item.tipologia,
          hojas: input.item.hojas,
          modulos: input.item.modulos,
          lineName: input.lineName,
          createId: input.createId,
        });

  // Mantener el nombre de línea privada del catálogo en la identidad editable.
  const definitionWithLineName = {
    ...definition,
    identidad: {
      ...definition.identidad,
      nombre: input.lineName,
    },
  };

  const procedencia =
    input.item.kind === "plantilla_ventora"
      ? buildProcedenciaPersistence("plantilla_ventora", {
          plantillaId: input.item.plantillaId,
        })
      : input.item.kind === "plantilla_verificada"
        ? buildProcedenciaPersistence("plantilla_verificada", {
            plantillaId:
              PLANTILLAS_VENTORA_PROYECTANTE[
                input.item.plantillaVerificadaId ?? "L32"
              ].sourceReferenceId,
          })
      : buildProcedenciaPersistence("base_ventora", {
          tipologica: input.item.tipologia,
          hojas: input.item.hojas,
        });

  return {
    lineTemplateId: input.lineTemplateId,
    providerName: "",
    lineName: input.lineName,
    typology: definitionWithLineName.identidad.tipologia,
    leavesCount: definitionWithLineName.identidad.hojas,
    variant: definitionWithLineName.identidad.variante,
    definition: definitionWithLineName,
    sourceType: procedencia.sourceType,
    sourceReference: procedencia.sourceReference,
    status: "draft",
  };
}

/** @deprecated Usar buildFabricationRecipeInputFromInicioRapido */
export function buildFabricationRecipeInputFromBaseVentora(input: {
  recommendation: CatalogoInicioRapidoItem;
  lineTemplateId: number;
  lineName: string;
  createId?: () => string;
}): Omit<CreateFabricationRecipeInput, "organizationId" | "scope"> {
  return buildFabricationRecipeInputFromInicioRapido({
    item: input.recommendation,
    lineTemplateId: input.lineTemplateId,
    lineName: input.lineName,
    createId: input.createId,
  });
}
