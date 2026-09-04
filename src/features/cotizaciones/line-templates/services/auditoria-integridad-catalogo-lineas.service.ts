import { COMMERCIAL_TEMPLATE_PROFILE_CATALOG } from "@/features/cotizaciones/line-templates/types/fabrication-recipe-commercial-templates";
import {
  getVentoraProfileReferencesForCatalogKey,
  listVentoraCatalogKeysWithProfileReferences,
} from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import {
  auditarLineaCatalogoVentora,
  type LineaFabricacionEstadoCatalogo,
} from "@/features/cotizaciones/line-templates/services/auditoria-catalogo-lineas-ventora.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CreateCotizacionLineTemplateInput } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { LineProfileReference } from "@/features/cotizaciones/line-templates/types/line-profile-references";
import { CATALOG_KEY_TO_ARQUETIPO } from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import { PLANTILLAS_VENTORA_PROYECTANTE } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { crearRecetaPlantillaVentoraProyectante } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";

export type CodigoPerfilOrigen =
  | "receta_plantilla_corredera"
  | "receta_plantilla_proyectante"
  | "referencia_taller"
  | "sin_codigo";

/** Clasificación primaria mutuamente excluyente (suma exactamente 25 líneas). */
export type ClasificacionPrimariaIntegridad =
  | "codigos_documentados_no_validados"
  | "codigos_referenciales_no_ambiguos"
  | "codigos_referenciales_ambiguos"
  | "sin_codigos_tecnicos_en_fixtures"
  | "solo_comercial";

/** @deprecated Usar ClasificacionPrimariaIntegridad. */
export type LineaIntegridadClasificacion =
  | "codigos_confiables"
  | "codigos_referenciales"
  | "nomenclatura_ambigua"
  | "solo_cotizacion_comercial";

export type ConflictoCodigoPerfil = {
  codigo: string;
  lineas: Array<{ catalogKey: string; nombre: string; tipologia: string; origen: CodigoPerfilOrigen }>;
  motivo: string;
};

export type GateTecnicoLineaIntegridad = {
  listaParaProbar: boolean;
  fabricacionEstado: LineaFabricacionEstadoCatalogo;
  bloqueosProbar: string[];
};

export type LineaIntegridadCatalogo = {
  catalogKey: string;
  nombre: string;
  tipologiaComercial: string;
  sistema: string | null;
  clasificacionPrimaria: ClasificacionPrimariaIntegridad;
  /** @deprecated Usar clasificacionPrimaria. */
  clasificacion: LineaIntegridadClasificacion;
  nomenclaturaAmbigua: boolean;
  codigosDocumentadosReceta: string[];
  /** @deprecated Usar codigosDocumentadosReceta. */
  codigosConfiablesReceta: string[];
  codigosReferenciales: string[];
  gateTecnico: GateTecnicoLineaIntegridad;
  advertencias: string[];
  /** @deprecated Usar advertencias. */
  conflictos: string[];
  notas: string[];
};

export type ResumenIntegridadCatalogo = {
  clasificacionPrimaria: Record<ClasificacionPrimariaIntegridad, number>;
  totalLineas: number;
  nomenclaturaAmbigua: number;
  conCodigosReferencialesEnFixtures: number;
  gateTecnico: {
    listaParaProbar: number;
    fabricacionPendiente: number;
    fabricacionConfigurada: number;
    fabricacionValidada: number;
    soloCotizacionComercial: number;
  };
  conflictosCodigoSinEquivalencia: number;
};

const CATALOG_KEYS_NOMENCLATURA_AMBIGUA = new Set([
  "ventora:l32",
  "ventora:l42",
  "ventora:serie-3200-puerta-abatible-1h",
]);

const PLANTILLAS_CORREDERA_DOCUMENTADAS = new Set(["L5000", "L20", "L25"]);

/** Equivalencias documentadas en código; no ampliar sin fuente verificable. */
const EQUIVALENCIAS_DOCUMENTADAS: Array<{
  codigo: string;
  lineas: string[];
  motivo: string;
}> = [
  {
    codigo: "3303",
    lineas: ["ventora:s33-corredera-2h", "ventora:s33-rpt-corredera-2h"],
    motivo: "Traslapo compartido entre S-33 estándar y variante RPT (misma pieza, fuente SODAL RPT).",
  },
  {
    codigo: "S831",
    lineas: ["ventora:multislide-s83-4h", "ventora:multislide-s83-8h"],
    motivo: "Misma familia MultiSlide S-83; cantidad de hojas cambia, perfiles de catálogo compartidos.",
  },
  {
    codigo: "S832",
    lineas: ["ventora:multislide-s83-4h", "ventora:multislide-s83-8h"],
    motivo: "Misma familia MultiSlide S-83; cantidad de hojas cambia, perfiles de catálogo compartidos.",
  },
  {
    codigo: "S833",
    lineas: ["ventora:multislide-s83-4h", "ventora:multislide-s83-8h"],
    motivo: "Misma familia MultiSlide S-83; cantidad de hojas cambia, perfiles de catálogo compartidos.",
  },
  {
    codigo: "S834",
    lineas: ["ventora:multislide-s83-4h", "ventora:multislide-s83-8h"],
    motivo: "Misma familia MultiSlide S-83; cantidad de hojas cambia, perfiles de catálogo compartidos.",
  },
  {
    codigo: "4201",
    lineas: [
      "ventora:serie-42-proyectante-camara",
      "ventora:serie-42-proyectante-sin-camara",
    ],
    motivo: "Misma línea Serie 42 proyectante; variante con/sin cámara.",
  },
];

function readLineMeta(line: Omit<CreateCotizacionLineTemplateInput, "organizationId">) {
  const metadata = (line.catalogMetadata ?? {}) as Record<string, unknown>;
  return {
    lineConfiguration:
      typeof metadata.lineConfiguration === "string" ? metadata.lineConfiguration : "",
    lineSystem: typeof metadata.lineSystem === "string" ? metadata.lineSystem : null,
    ventoraPlantillaId:
      typeof metadata.ventoraPlantillaId === "string" ? metadata.ventoraPlantillaId : null,
  };
}

function collectPlantillaCorrederaCodes(plantillaId: "L5000" | "L20" | "L25"): string[] {
  const catalog = COMMERCIAL_TEMPLATE_PROFILE_CATALOG[plantillaId];
  return Object.values(catalog.defaults)
    .map((entry) => entry.code?.trim())
    .filter((code): code is string => Boolean(code));
}

function collectWorkshopProfiles(catalogKey: string): LineProfileReference[] {
  const payload = getVentoraProfileReferencesForCatalogKey(catalogKey);
  return payload?.profiles ?? [];
}

function collectReferentialCodes(catalogKey: string): string[] {
  return collectWorkshopProfiles(catalogKey)
    .map((profile) => profile.code?.trim())
    .filter((code): code is string => Boolean(code));
}

function hasCodedWorkshopProfiles(catalogKey: string): boolean {
  return collectReferentialCodes(catalogKey).length > 0;
}

function collectProyectantePlantillaCodes(plantillaId: "L32" | "L42"): string[] {
  const receta = crearRecetaPlantillaVentoraProyectante(plantillaId);
  return receta.perfiles
    .map((profile) => profile.codigoPerfil?.trim())
    .filter((code): code is string => Boolean(code));
}

function detectNomenclatureIssues(
  line: Omit<CreateCotizacionLineTemplateInput, "organizationId">
): string[] {
  const meta = readLineMeta(line);
  const key = line.catalogKey ?? "";
  const issues: string[] = [];
  const config = meta.lineConfiguration.toLowerCase();

  if (key === "ventora:l32" && config.includes("corredera")) {
    issues.push(
      "Serie 32 comercial = corredera 2H; L32 en biblioteca = plantilla proyectante separada (códigos 32xx no son corredera)."
    );
  }

  if (key === "ventora:l42" && config.includes("corredera")) {
    issues.push(
      "Serie 42 comercial = corredera 2H; códigos 42xx del catálogo SODAL pertenecen a Serie 42 proyectante, no a corredera."
    );
  }

  if (key === "ventora:serie-3200-puerta-abatible-1h") {
    issues.push(
      "Serie 3200 puerta usa prefijo 322x; no confundir con L32 proyectante (32xx) ni Serie 32 corredera."
    );
  }

  if (meta.ventoraPlantillaId === "L32" && config.includes("corredera")) {
    issues.push("ventoraPlantillaId L32 (proyectante) incompatible con configuración corredera.");
  }

  if (meta.ventoraPlantillaId === "L42" && config.includes("corredera")) {
    issues.push("ventoraPlantillaId L42 (proyectante) incompatible con configuración corredera.");
  }

  return issues;
}

function resolveClasificacionPrimaria(
  line: Omit<CreateCotizacionLineTemplateInput, "organizationId">
): ClasificacionPrimariaIntegridad {
  const key = line.catalogKey ?? "";
  const meta = readLineMeta(line);

  if (!CATALOG_KEY_TO_ARQUETIPO[key] && key === "ventora:l35") {
    return "solo_comercial";
  }

  if (
    meta.ventoraPlantillaId &&
    PLANTILLAS_CORREDERA_DOCUMENTADAS.has(meta.ventoraPlantillaId)
  ) {
    return "codigos_documentados_no_validados";
  }

  if (CATALOG_KEYS_NOMENCLATURA_AMBIGUA.has(key)) {
    return "codigos_referenciales_ambiguos";
  }

  if (hasCodedWorkshopProfiles(key)) {
    return "codigos_referenciales_no_ambiguos";
  }

  return "sin_codigos_tecnicos_en_fixtures";
}

function toLegacyClasificacion(
  primaria: ClasificacionPrimariaIntegridad
): LineaIntegridadClasificacion {
  switch (primaria) {
    case "codigos_documentados_no_validados":
      return "codigos_confiables";
    case "codigos_referenciales_no_ambiguos":
      return "codigos_referenciales";
    case "codigos_referenciales_ambiguos":
      return "nomenclatura_ambigua";
    case "solo_comercial":
      return "solo_cotizacion_comercial";
    case "sin_codigos_tecnicos_en_fixtures":
      return "codigos_referenciales";
  }
}

function classifyLine(
  line: Omit<CreateCotizacionLineTemplateInput, "organizationId">,
  nomenclatureIssues: string[]
): LineaIntegridadCatalogo {
  const key = line.catalogKey ?? "";
  const meta = readLineMeta(line);
  const referentialCodes = collectReferentialCodes(key);
  const clasificacionPrimaria = resolveClasificacionPrimaria(line);
  const nomenclaturaAmbigua = CATALOG_KEYS_NOMENCLATURA_AMBIGUA.has(key);

  let codigosDocumentados: string[] = [];
  const notas: string[] = [];
  const advertencias = [...nomenclatureIssues];

  if (
    meta.ventoraPlantillaId === "L5000" ||
    meta.ventoraPlantillaId === "L20" ||
    meta.ventoraPlantillaId === "L25"
  ) {
    codigosDocumentados = collectPlantillaCorrederaCodes(meta.ventoraPlantillaId);
    notas.push(
      `Códigos de receta documentados en plantilla sugerida ${meta.ventoraPlantillaId} (corredera 2H); validar en taller antes de activar.`
    );
  }

  if (clasificacionPrimaria === "codigos_referenciales_no_ambiguos") {
    notas.push(
      "Códigos visibles solo como referencia de catálogo; no precargan receta automática."
    );
  }

  if (clasificacionPrimaria === "codigos_referenciales_ambiguos") {
    advertencias.push(
      "Fabricación pendiente: no usar códigos de otra tipología como receta."
    );
    if (referentialCodes.length > 0) {
      notas.push("Códigos 322x son referenciales; no equivalen a L32 proyectante (32xx).");
    } else {
      notas.push("Sin códigos de taller; nomenclatura ambigua con otras líneas de la familia 32/42.");
    }
  }

  if (clasificacionPrimaria === "sin_codigos_tecnicos_en_fixtures") {
    notas.push("Piezas estructurales sin código técnico en fixtures; fabricación pendiente.");
  }

  if (clasificacionPrimaria === "solo_comercial") {
    notas.push("Sin arquetipo técnico ni códigos de taller en catálogo base.");
  }

  const catalogoRow = auditarLineaCatalogoVentora(line);

  return {
    catalogKey: key,
    nombre: line.nombre,
    tipologiaComercial: meta.lineConfiguration || "Sin configuración",
    sistema: meta.lineSystem ?? meta.ventoraPlantillaId,
    clasificacionPrimaria,
    clasificacion: toLegacyClasificacion(clasificacionPrimaria),
    nomenclaturaAmbigua,
    codigosDocumentadosReceta: codigosDocumentados,
    codigosConfiablesReceta: codigosDocumentados,
    codigosReferenciales: referentialCodes,
    gateTecnico: {
      listaParaProbar: catalogoRow.listaParaProbar,
      fabricacionEstado: catalogoRow.fabricacionEstado,
      bloqueosProbar: catalogoRow.bloqueosProbar,
    },
    advertencias,
    conflictos: advertencias,
    notas,
  };
}

function indexCodesAcrossCatalog(): Map<string, ConflictoCodigoPerfil> {
  const index = new Map<string, ConflictoCodigoPerfil>();

  const register = (
    codigo: string,
    catalogKey: string,
    nombre: string,
    tipologia: string,
    origen: CodigoPerfilOrigen
  ) => {
    const normalized = codigo.trim();
    if (!normalized) return;
    const current = index.get(normalized) ?? {
      codigo: normalized,
      lineas: [],
      motivo: "",
    };
    current.lineas.push({ catalogKey, nombre, tipologia, origen });
    index.set(normalized, current);
  };

  for (const line of VENTORA_DEFAULT_LINE_CATALOG) {
    const key = line.catalogKey ?? "";
    const meta = readLineMeta(line);
    const tipologia = meta.lineConfiguration || "sin tipología";

    for (const profile of collectWorkshopProfiles(key)) {
      if (!profile.code?.trim()) continue;
      register(profile.code, key, line.nombre, tipologia, "referencia_taller");
    }

    if (meta.ventoraPlantillaId === "L5000" || meta.ventoraPlantillaId === "L20" || meta.ventoraPlantillaId === "L25") {
      for (const code of collectPlantillaCorrederaCodes(meta.ventoraPlantillaId)) {
        register(code, key, line.nombre, tipologia, "receta_plantilla_corredera");
      }
    }
  }

  for (const plantillaId of ["L32", "L42"] as const) {
    for (const code of collectProyectantePlantillaCodes(plantillaId)) {
      register(
        code,
        `plantilla:${plantillaId}`,
        PLANTILLAS_VENTORA_PROYECTANTE[plantillaId].title,
        "proyectante",
        "receta_plantilla_proyectante"
      );
    }
  }

  for (const entry of index.values()) {
    if (entry.lineas.length < 2) continue;

    const tipologias = new Set(entry.lineas.map((line) => line.tipologia.toLowerCase()));
    const documented = EQUIVALENCIAS_DOCUMENTADAS.find(
      (eq) =>
        eq.codigo === entry.codigo &&
        entry.lineas.every((line) => eq.lineas.includes(line.catalogKey))
    );

    if (documented) {
      entry.motivo = documented.motivo;
      continue;
    }

    const hasRecipeCorredera = entry.lineas.some(
      (line) => line.origen === "receta_plantilla_corredera"
    );
    const hasRecipeProyectante = entry.lineas.some(
      (line) => line.origen === "receta_plantilla_proyectante"
    );
    const hasCorredera = entry.lineas.some((line) =>
      line.tipologia.toLowerCase().includes("corredera")
    );
    const hasProyectante = entry.lineas.some((line) =>
      line.tipologia.toLowerCase().includes("proyectante")
    );

    if (
      (hasRecipeCorredera && hasRecipeProyectante) ||
      (hasCorredera && hasProyectante && tipologias.size > 1)
    ) {
      entry.motivo =
        "Mismo código reutilizado entre tipologías distintas sin equivalencia documentada.";
    }
  }

  return index;
}

function buildResumen(lineas: LineaIntegridadCatalogo[]): ResumenIntegridadCatalogo {
  const clasificacionPrimaria: Record<ClasificacionPrimariaIntegridad, number> = {
    codigos_documentados_no_validados: 0,
    codigos_referenciales_no_ambiguos: 0,
    codigos_referenciales_ambiguos: 0,
    sin_codigos_tecnicos_en_fixtures: 0,
    solo_comercial: 0,
  };

  const gateTecnico = {
    listaParaProbar: 0,
    fabricacionPendiente: 0,
    fabricacionConfigurada: 0,
    fabricacionValidada: 0,
    soloCotizacionComercial: 0,
  };

  let nomenclaturaAmbigua = 0;
  let conCodigosReferencialesEnFixtures = 0;

  for (const line of lineas) {
    clasificacionPrimaria[line.clasificacionPrimaria] += 1;

    if (line.nomenclaturaAmbigua) {
      nomenclaturaAmbigua += 1;
    }

    if (line.codigosReferenciales.length > 0) {
      conCodigosReferencialesEnFixtures += 1;
    }

    if (line.gateTecnico.listaParaProbar) {
      gateTecnico.listaParaProbar += 1;
    }

    switch (line.gateTecnico.fabricacionEstado) {
      case "fabricacion_pendiente":
        gateTecnico.fabricacionPendiente += 1;
        break;
      case "fabricacion_configurada":
        gateTecnico.fabricacionConfigurada += 1;
        break;
      case "fabricacion_validada":
        gateTecnico.fabricacionValidada += 1;
        break;
      case "cotizacion_comercial":
        gateTecnico.soloCotizacionComercial += 1;
        break;
    }
  }

  return {
    clasificacionPrimaria,
    totalLineas: lineas.length,
    nomenclaturaAmbigua,
    conCodigosReferencialesEnFixtures,
    gateTecnico,
    conflictosCodigoSinEquivalencia: 0,
  };
}

export function auditarIntegridadCatalogoLineasVentora(): {
  lineas: LineaIntegridadCatalogo[];
  conflictosCodigo: ConflictoCodigoPerfil[];
  resumen: ResumenIntegridadCatalogo;
  /** @deprecated Usar resumen.clasificacionPrimaria. */
  resumenLegacy: Record<LineaIntegridadClasificacion, number>;
} {
  const lineas = VENTORA_DEFAULT_LINE_CATALOG.map((line) => {
    const issues = detectNomenclatureIssues(line);
    return classifyLine(line, issues);
  });

  const conflictosCodigo = Array.from(indexCodesAcrossCatalog().values()).filter(
    (entry) =>
      entry.lineas.length > 1 &&
      entry.motivo.includes("sin equivalencia documentada")
  );

  const resumen = buildResumen(lineas);
  resumen.conflictosCodigoSinEquivalencia = conflictosCodigo.length;

  const resumenLegacy: Record<LineaIntegridadClasificacion, number> = {
    codigos_confiables: 0,
    codigos_referenciales: 0,
    nomenclatura_ambigua: 0,
    solo_cotizacion_comercial: 0,
  };

  lineas.forEach((line) => {
    resumenLegacy[line.clasificacion] += 1;
  });

  return { lineas, conflictosCodigo, resumen, resumenLegacy };
}

export function listCatalogKeysInIntegrityAudit(): string[] {
  return VENTORA_DEFAULT_LINE_CATALOG.map((line) => line.catalogKey).filter(
    (key): key is string => Boolean(key?.trim())
  );
}

void listVentoraCatalogKeysWithProfileReferences;
