import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import {
  VENTORA_DEFAULT_LINE_CATALOG,
} from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CreateCotizacionLineTemplateInput } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  ARQUETIPOS_ESTRUCTURALES,
  crearRecetaEstructuralParaLineaComercial,
  resolveArquetipoEstructuralId,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import {
  crearRecetaPlantillaVentoraCorredera2H,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  crearRecetaPlantillaVentoraProyectante,
  type PlantillaVentoraProyectanteId,
} from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";

export type LineaFabricacionEstadoCatalogo =
  | "cotizacion_comercial"
  | "fabricacion_pendiente"
  | "fabricacion_configurada"
  | "fabricacion_validada";

export type LineaAuditoriaCatalogo = {
  catalogKey: string;
  nombre: string;
  material: string;
  sistema: string | null;
  tipologia: string;
  componentesRequeridos: number;
  perfilesConfigurados: number;
  perfilesTotales: number;
  codigosConfigurados: string[];
  descuentosConfigurados: Array<{
    pieza: string;
    ajusteMm: number | null;
    estado: "documentado" | "pendiente" | "sin_definir";
  }>;
  cotizacionComercial: true;
  fabricacionEstado: LineaFabricacionEstadoCatalogo;
  listaParaProbar: boolean;
  listaParaPautaConfiable: boolean;
  bloqueosProbar: string[];
  notas: string[];
};

const PLANTILLAS_CORREDERA: PlantillaVentoraCorrederaId[] = ["L5000", "L20", "L25"];
const PLANTILLAS_PROYECTANTE: PlantillaVentoraProyectanteId[] = ["L32", "L42"];

function readMetadata(
  line: Omit<CreateCotizacionLineTemplateInput, "organizationId">
) {
  const metadata = (line.catalogMetadata ?? {}) as Record<string, unknown>;
  return {
    lineConfiguration:
      typeof metadata.lineConfiguration === "string" ? metadata.lineConfiguration : null,
    lineSystem: typeof metadata.lineSystem === "string" ? metadata.lineSystem : null,
    ventoraPlantillaId:
      typeof metadata.ventoraPlantillaId === "string"
        ? metadata.ventoraPlantillaId
        : null,
    structuralArchetypeId:
      typeof metadata.structuralArchetypeId === "string"
        ? metadata.structuralArchetypeId
        : null,
  };
}

function resolveReferenceRecipe(
  line: Omit<CreateCotizacionLineTemplateInput, "organizationId">
): FabricacionReceta | null {
  const meta = readMetadata(line);
  const plantillaCorredera = PLANTILLAS_CORREDERA.find(
    (id) => id === meta.ventoraPlantillaId
  );
  if (plantillaCorredera) {
    return crearRecetaPlantillaVentoraCorredera2H(plantillaCorredera);
  }

  const plantillaProyectante = PLANTILLAS_PROYECTANTE.find(
    (id) => id === meta.ventoraPlantillaId
  );
  const configuracionComercial = meta.lineConfiguration?.toLowerCase() ?? "";
  const esCorrederaComercial = configuracionComercial.includes("corredera");
  if (plantillaProyectante && !esCorrederaComercial) {
    return crearRecetaPlantillaVentoraProyectante(plantillaProyectante);
  }

  return crearRecetaEstructuralParaLineaComercial({
    catalogKey: line.catalogKey,
    structuralArchetypeId: meta.structuralArchetypeId,
    lineName: line.nombre,
  });
}

function collectWorkshopCodes(catalogKey: string | null | undefined): string[] {
  const payload = getVentoraProfileReferencesForCatalogKey(catalogKey);
  if (!payload?.profiles?.length) return [];
  return payload.profiles
    .map((profile) => profile.code?.trim() || "")
    .filter(Boolean);
}

function classifyFabricacionEstado(input: {
  recipe: FabricacionReceta | null;
  listaParaProbar: boolean;
  workshopCodes: string[];
}): LineaFabricacionEstadoCatalogo {
  if (!input.recipe) {
    return "cotizacion_comercial";
  }

  if (input.listaParaProbar) {
    return "fabricacion_configurada";
  }

  const hasAnyCode =
    input.workshopCodes.length > 0 ||
    input.recipe.perfiles.some((profile) => profile.codigoPerfil?.trim());

  if (hasAnyCode || input.recipe.perfiles.length > 0) {
    return "fabricacion_pendiente";
  }

  return "cotizacion_comercial";
}

function buildDiscountRows(recipe: FabricacionReceta | null) {
  if (!recipe) return [];

  return recipe.perfiles.map((profile) => {
    const pieza =
      profile.codigoPerfil?.trim() ||
      profile.nombrePerfil?.trim() ||
      profile.funcion?.trim() ||
      "Perfil";
    const pending = (profile.datosPendientes ?? []).some((detail) =>
      /descuento|ajuste/i.test(detail)
    );
    const ajusteMm = profile.reglaMedida.ajusteMm ?? null;

    return {
      pieza,
      ajusteMm,
      estado: pending
        ? ("pendiente" as const)
        : ajusteMm != null
          ? ("documentado" as const)
          : ("sin_definir" as const),
    };
  });
}

function buildNotas(
  line: Omit<CreateCotizacionLineTemplateInput, "organizationId">,
  recipe: FabricacionReceta | null
): string[] {
  const meta = readMetadata(line);
  const notas: string[] = [];

  if (!resolveArquetipoEstructuralId({ catalogKey: line.catalogKey })) {
    notas.push("Sin arquetipo técnico precargado: solo cotización comercial por m².");
  }

  if (
    meta.ventoraPlantillaId === "L32" &&
    meta.lineConfiguration?.toLowerCase().includes("corredera")
  ) {
    notas.push(
      "La línea comercial es corredera; la plantilla L32 en código es proyectante (referencia aparte)."
    );
  }

  if (recipe?.estado === "ejemplo_no_validado") {
    notas.push("Ninguna receta del catálogo está validada en taller hasta prueba real.");
  }

  return notas;
}

export function auditarLineaCatalogoVentora(
  line: Omit<CreateCotizacionLineTemplateInput, "organizationId">
): LineaAuditoriaCatalogo {
  const meta = readMetadata(line);
  const archetypeId = resolveArquetipoEstructuralId({
    catalogKey: line.catalogKey,
    structuralArchetypeId: meta.structuralArchetypeId,
  });
  const archetype = archetypeId ? ARQUETIPOS_ESTRUCTURALES[archetypeId] : null;
  const recipe = resolveReferenceRecipe(line);
  const workshopCodes = collectWorkshopCodes(line.catalogKey);
  const probar = recipe
    ? evaluarRecetaListaParaProbar(recipe)
    : { listaParaProbar: false, bloqueos: ["Sin receta técnica de referencia"] };

  const codigosFromRecipe =
    recipe?.perfiles
      .map((profile) => profile.codigoPerfil?.trim() || "")
      .filter(Boolean) ?? [];
  const codigosConfigurados = Array.from(
    new Set([...workshopCodes, ...codigosFromRecipe])
  );

  const perfilesTotales = recipe?.perfiles.length ?? 0;
  const perfilesConfigurados =
    recipe?.perfiles.filter((profile) => Boolean(profile.codigoPerfil?.trim())).length ??
    workshopCodes.length;

  const componentesRequeridos =
    (recipe?.perfiles.filter((profile) => profile.requerido).length ?? 0) +
    (recipe?.accesorios.filter((accessory) => accessory.requerido).length ?? 0) +
    (recipe?.vidrios.filter((glass) => glass.requerido).length ?? 0);

  const fabricacionEstado = classifyFabricacionEstado({
    recipe,
    listaParaProbar: probar.listaParaProbar,
    workshopCodes,
  });

  return {
    catalogKey: line.catalogKey ?? "",
    nombre: line.nombre,
    material: line.material,
    sistema: meta.lineSystem ?? meta.ventoraPlantillaId,
    tipologia:
      recipe?.identidad.tipologia ??
      archetype?.tipologia ??
      meta.lineConfiguration ??
      "Sin tipología técnica",
    componentesRequeridos,
    perfilesConfigurados,
    perfilesTotales,
    codigosConfigurados,
    descuentosConfigurados: buildDiscountRows(recipe),
    cotizacionComercial: true,
    fabricacionEstado,
    listaParaProbar: probar.listaParaProbar,
    listaParaPautaConfiable: false,
    bloqueosProbar: probar.bloqueos,
    notas: buildNotas(line, recipe),
  };
}

export function auditarCatalogoLineasVentora(): LineaAuditoriaCatalogo[] {
  return VENTORA_DEFAULT_LINE_CATALOG.map(auditarLineaCatalogoVentora);
}

export function agruparAuditoriaCatalogoPorEstado(
  rows: LineaAuditoriaCatalogo[] = auditarCatalogoLineasVentora()
) {
  return {
    cotizacionComercial: rows.filter((row) => row.cotizacionComercial),
    fabricacionPendiente: rows.filter(
      (row) => row.fabricacionEstado === "fabricacion_pendiente"
    ),
    fabricacionConfigurada: rows.filter(
      (row) => row.fabricacionEstado === "fabricacion_configurada"
    ),
    fabricacionValidada: rows.filter(
      (row) => row.fabricacionEstado === "fabricacion_validada"
    ),
    soloCotizar: rows.filter(
      (row) => row.fabricacionEstado === "cotizacion_comercial"
    ),
  };
}
