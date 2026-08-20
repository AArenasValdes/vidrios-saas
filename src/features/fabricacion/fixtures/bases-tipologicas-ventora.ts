import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionBaseMedida,
  type FabricacionReceta,
  type FabricacionReglaCantidadTipo,
  type FabricacionTipologia,
} from "@/features/fabricacion/types/fabricacion-domain";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { COMMERCIAL_TEMPLATE_PROFILE_CATALOG } from "@/features/cotizaciones/line-templates/types/fabrication-recipe-commercial-templates";

/**
 * Bases estructurales universales de Ventora.
 *
 * Tipología → estructura habitual (funciones/medidas base/cantidades).
 * NO incluyen códigos, descuentos de marca, largos comerciales ni fórmulas
 * de fabricante. El proveedor/país no cambia este motor: solo datos/parámetros
 * posteriores (biblioteca, filtros) viven fuera de aquí.
 */

export type FabricacionGrupoEstructural = "marco" | "hoja";

export type BaseTipologicaVentora = {
  id: string;
  tipologia: Extract<
    FabricacionTipologia,
    | "corredera"
    | "abatible"
    | "proyectante"
    | "pano_fijo"
    | "puerta_abatible"
    | "shower"
  >;
  label: string;
  description: string;
  hojasSugeridas: number;
  modulosSugeridos: number;
  /** Si se omite, cualquier cantidad de hojas ≥ 1 es válida. */
  hojasMin?: number;
  hojasMax?: number;
  /** Base aún estructuralmente incompleta: el Paso 2 debe completarla. */
  pendienteCompletar?: boolean;
};

type PerfilBase = {
  nombre: string;
  funcion: string;
  medida: FabricacionBaseMedida;
  cantidadTipo: FabricacionReglaCantidadTipo;
  cantidad: number;
  grupo: FabricacionGrupoEstructural;
  requerido?: boolean;
};

type VidrioBase = {
  nombre: string;
  ancho: FabricacionBaseMedida;
  alto: FabricacionBaseMedida;
  cantidadTipo: FabricacionReglaCantidadTipo;
  cantidad: number;
};

type AccesorioBase = {
  nombre: string;
  cantidadTipo: FabricacionReglaCantidadTipo;
  cantidad: number;
};

type DefinitionBase = {
  perfiles: PerfilBase[];
  vidrios: VidrioBase[];
  accesorios: AccesorioBase[];
};

export const BASES_TIPOLOGICAS_VENTORA: BaseTipologicaVentora[] = [
  {
    id: "base-ventora-corredera",
    tipologia: "corredera",
    label: "Corredera",
    description:
      "Rieles, jamba, zócalo, cabezal, pierna, traslapo, vidrio y accesorios sugeridos.",
    hojasSugeridas: 2,
    modulosSugeridos: 2,
    hojasMin: 1,
    pendienteCompletar: false,
  },
  {
    id: "base-ventora-abatible",
    tipologia: "abatible",
    label: "Abatible",
    description: "Marco perimetral, hoja abatible, vidrio y accesorios opcionales.",
    hojasSugeridas: 1,
    modulosSugeridos: 1,
    hojasMin: 1,
    hojasMax: 2,
    pendienteCompletar: true,
  },
  {
    id: "base-ventora-proyectante",
    tipologia: "proyectante",
    label: "Proyectante",
    description:
      "Marco perimetral, hoja proyectante, vidrio y accesorios opcionales.",
    hojasSugeridas: 1,
    modulosSugeridos: 1,
    pendienteCompletar: true,
  },
  {
    id: "base-ventora-fija",
    tipologia: "pano_fijo",
    label: "Fija",
    description: "Marco perimetral y vidrio fijo.",
    hojasSugeridas: 1,
    modulosSugeridos: 1,
    pendienteCompletar: true,
  },
  {
    id: "base-ventora-puerta",
    tipologia: "puerta_abatible",
    label: "Puerta",
    description:
      "Marco, hoja de puerta, vidrio o panel y accesorios opcionales.",
    hojasSugeridas: 1,
    modulosSugeridos: 1,
    hojasMin: 1,
    hojasMax: 2,
    pendienteCompletar: true,
  },
  {
    id: "base-ventora-shower",
    tipologia: "shower",
    label: "Shower",
    description: "Guías, laterales, paños y accesorios de cierre.",
    hojasSugeridas: 2,
    modulosSugeridos: 2,
    hojasMin: 1,
    pendienteCompletar: true,
  },
];

/**
 * Corredera 2 hojas — fabricación real de referencia (7 funciones).
 * Cantidades estructurales para 2 hojas: 1, 1, 2, 2, 2, 2, 2.
 * Sin descuentos de marca: ajusteMm omitido (Por confirmar), no 0 fingido.
 */
const DEFINITIONS: Record<BaseTipologicaVentora["tipologia"], DefinitionBase> = {
  corredera: {
    perfiles: [
      {
        nombre: "Riel superior",
        funcion: "Riel superior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Riel inferior",
        funcion: "Riel inferior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Jamba",
        funcion: "Jamba",
        medida: "alto_total",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "marco",
      },
      {
        nombre: "Zócalo",
        funcion: "Zócalo",
        medida: "ancho_por_hoja",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "hoja",
      },
      {
        nombre: "Cabezal",
        funcion: "Cabezal",
        medida: "ancho_por_hoja",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "hoja",
      },
      {
        nombre: "Pierna",
        funcion: "Pierna",
        medida: "alto_por_hoja",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "hoja",
      },
      {
        nombre: "Traslapo",
        funcion: "Traslapo",
        medida: "alto_por_hoja",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "hoja",
      },
    ],
    vidrios: [
      {
        nombre: "Vidrio principal",
        ancho: "ancho_por_hoja",
        alto: "alto_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
      },
    ],
    accesorios: [
      { nombre: "Carros o rodamientos", cantidadTipo: "por_hoja", cantidad: 1 },
      { nombre: "Cierre o seguro", cantidadTipo: "fija", cantidad: 1 },
      { nombre: "Felpa o sello", cantidadTipo: "fija", cantidad: 1 },
    ],
  },
  abatible: {
    perfiles: [
      {
        nombre: "Marco superior",
        funcion: "Marco superior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Marco inferior",
        funcion: "Marco inferior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Marco lateral",
        funcion: "Marco lateral",
        medida: "alto_total",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "marco",
      },
      {
        nombre: "Hoja superior",
        funcion: "Hoja superior",
        medida: "ancho_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
        grupo: "hoja",
      },
      {
        nombre: "Hoja inferior",
        funcion: "Hoja inferior",
        medida: "ancho_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
        grupo: "hoja",
      },
      {
        nombre: "Hoja lateral",
        funcion: "Hoja lateral",
        medida: "alto_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 2,
        grupo: "hoja",
      },
    ],
    vidrios: [
      {
        nombre: "Vidrio principal",
        ancho: "ancho_por_hoja",
        alto: "alto_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
      },
    ],
    accesorios: [
      { nombre: "Bisagras", cantidadTipo: "por_hoja", cantidad: 1 },
      { nombre: "Cierre o manilla", cantidadTipo: "por_hoja", cantidad: 1 },
      { nombre: "Burlete o sello", cantidadTipo: "fija", cantidad: 1 },
    ],
  },
  proyectante: {
    perfiles: [
      {
        nombre: "Marco superior",
        funcion: "Marco superior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Marco inferior",
        funcion: "Marco inferior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Marco lateral",
        funcion: "Marco lateral",
        medida: "alto_total",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "marco",
      },
      {
        nombre: "Hoja superior",
        funcion: "Hoja superior",
        medida: "ancho_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
        grupo: "hoja",
      },
      {
        nombre: "Hoja inferior",
        funcion: "Hoja inferior",
        medida: "ancho_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
        grupo: "hoja",
      },
      {
        nombre: "Hoja lateral",
        funcion: "Hoja lateral",
        medida: "alto_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 2,
        grupo: "hoja",
      },
    ],
    vidrios: [
      {
        nombre: "Vidrio principal",
        ancho: "ancho_por_hoja",
        alto: "alto_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
      },
    ],
    accesorios: [
      { nombre: "Brazos proyectantes", cantidadTipo: "por_hoja", cantidad: 1 },
      { nombre: "Cierre o manilla", cantidadTipo: "por_hoja", cantidad: 1 },
      { nombre: "Burlete o sello", cantidadTipo: "fija", cantidad: 1 },
    ],
  },
  pano_fijo: {
    perfiles: [
      {
        nombre: "Marco superior",
        funcion: "Marco superior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Marco inferior",
        funcion: "Marco inferior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Marco lateral",
        funcion: "Marco lateral",
        medida: "alto_total",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "marco",
      },
    ],
    vidrios: [
      {
        nombre: "Vidrio fijo",
        ancho: "ancho_total",
        alto: "alto_total",
        cantidadTipo: "fija",
        cantidad: 1,
      },
    ],
    accesorios: [
      { nombre: "Burlete o sello", cantidadTipo: "fija", cantidad: 1 },
    ],
  },
  puerta_abatible: {
    perfiles: [
      {
        nombre: "Marco superior",
        funcion: "Marco superior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Marco lateral",
        funcion: "Marco lateral",
        medida: "alto_total",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "marco",
      },
      {
        nombre: "Hoja horizontal",
        funcion: "Hoja horizontal",
        medida: "ancho_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 2,
        grupo: "hoja",
      },
      {
        nombre: "Hoja vertical",
        funcion: "Hoja vertical",
        medida: "alto_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 2,
        grupo: "hoja",
      },
      {
        nombre: "Zócalo / travesaño",
        funcion: "Zócalo / travesaño",
        medida: "ancho_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
        grupo: "hoja",
      },
    ],
    vidrios: [
      {
        nombre: "Vidrio o panel",
        ancho: "ancho_por_hoja",
        alto: "alto_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
      },
    ],
    accesorios: [
      { nombre: "Bisagras", cantidadTipo: "por_hoja", cantidad: 1 },
      { nombre: "Cerradura o manilla", cantidadTipo: "por_hoja", cantidad: 1 },
      { nombre: "Burlete o sello", cantidadTipo: "fija", cantidad: 1 },
    ],
  },
  shower: {
    perfiles: [
      {
        nombre: "Guía superior",
        funcion: "Guía superior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Guía inferior",
        funcion: "Guía inferior",
        medida: "ancho_total",
        cantidadTipo: "fija",
        cantidad: 1,
        grupo: "marco",
      },
      {
        nombre: "Perfil lateral",
        funcion: "Perfil lateral",
        medida: "alto_total",
        cantidadTipo: "fija",
        cantidad: 2,
        grupo: "marco",
      },
      {
        nombre: "Perfil de hoja",
        funcion: "Perfil de hoja",
        medida: "alto_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
        grupo: "hoja",
      },
    ],
    vidrios: [
      {
        nombre: "Paño de vidrio",
        ancho: "ancho_por_hoja",
        alto: "alto_por_hoja",
        cantidadTipo: "por_hoja",
        cantidad: 1,
      },
    ],
    accesorios: [
      { nombre: "Carros o rodamientos", cantidadTipo: "por_hoja", cantidad: 1 },
      { nombre: "Manilla", cantidadTipo: "fija", cantidad: 1 },
      { nombre: "Sellos", cantidadTipo: "fija", cantidad: 1 },
    ],
  },
};

const commonPending = [
  "Confirmar ajuste o descuento en mm",
  "Confirmar cantidad con el taller",
];

const structuralAccessoryPending = [
  "Confirmar accesorio usado por el taller",
  "Confirmar cantidad con el taller",
  "Confirmar codigo y cantidad",
];

/** Tipologías que piden 1 o 2 hojas antes de preparar la estructura. */
export const TIPOLOGIAS_CON_SELECTOR_HOJAS: BaseTipologicaVentora["tipologia"][] = [
  "abatible",
  "puerta_abatible",
];

export function esBaseTipologicaValidada(meta: BaseTipologicaVentora): boolean {
  return !meta.pendienteCompletar;
}

export function esBaseTipologicaEstructural(meta: BaseTipologicaVentora): boolean {
  return meta.pendienteCompletar === true;
}

export function tipologiaPideSelectorHojas(
  tipologia: FabricacionTipologia
): boolean {
  return TIPOLOGIAS_CON_SELECTOR_HOJAS.includes(
    tipologia as BaseTipologicaVentora["tipologia"]
  );
}

function matchesHojas(base: BaseTipologicaVentora, hojas: number): boolean {
  const count = Math.max(1, hojas);
  if (base.hojasMin != null && count < base.hojasMin) return false;
  if (base.hojasMax != null && count > base.hojasMax) return false;
  return true;
}

/**
 * Resuelve la base tipológica Ventora para una tipología y cantidad de hojas.
 * Incluye bases estructurales (pendienteCompletar) y la Corredera validada.
 * Personalizada → null.
 */
export function resolverBaseEstructuralVentora(input: {
  tipologia: FabricacionTipologia;
  hojas: number;
}): BaseTipologicaVentora | null {
  if (input.tipologia === "personalizada") return null;
  const base = BASES_TIPOLOGICAS_VENTORA.find(
    (entry) => entry.tipologia === input.tipologia
  );
  if (!base) return null;
  if (!matchesHojas(base, input.hojas)) return null;
  return base;
}

export function resumirBaseEstructural(recipe: FabricacionReceta): {
  title: string;
  countsLabel: string;
  funciones: number;
  vidrios: number;
  accesorios: number;
} {
  const tipologicaLabel =
    BASES_TIPOLOGICAS_VENTORA.find(
      (entry) => entry.tipologia === recipe.identidad.tipologia
    )?.label ?? recipe.identidad.tipologia.replaceAll("_", " ");
  const hojas = recipe.identidad.hojas;
  const funciones = recipe.perfiles.length;
  const vidrios = recipe.vidrios.length;
  const accesorios = recipe.accesorios.length;

  return {
    title: `Base ${tipologicaLabel} · ${hojas} ${hojas === 1 ? "hoja" : "hojas"}`,
    countsLabel: [
      `${funciones} ${funciones === 1 ? "función" : "funciones"}`,
      `${vidrios} ${vidrios === 1 ? "vidrio" : "vidrios"}`,
      accesorios > 0 ? "accesorios sugeridos" : "sin accesorios",
    ].join(" · "),
    funciones,
    vidrios,
    accesorios,
  };
}

/**
 * Plantillas Ventora con parámetros conocidos (Corredera · 2 hojas).
 * Distintas de la Base estructural genérica: aquí sí hay ajustes sugeridos.
 * Orden de perfiles: Riel superior, Riel inferior, Jamba, Zócalo, Cabezal, Pierna, Traslapo.
 */
export type PlantillaVentoraCorrederaId = "L5000" | "L20" | "L25";

const CORREDERA_PROFILE_KEYS = [
  "riel_superior",
  "riel_inferior",
  "jamba",
  "zocalo",
  "cabezal",
  "pierna",
  "traslapo",
] as const;

export const PLANTILLAS_VENTORA_CORREDERA_2H: Record<
  PlantillaVentoraCorrederaId,
  {
    id: PlantillaVentoraCorrederaId;
    label: string;
    ajustesMm: readonly number[];
  }
> = {
  L5000: {
    id: "L5000",
    label: "L5000",
    ajustesMm: [0, 0, -3, -2, -2, -18, -18],
  },
  L20: {
    id: "L20",
    label: "L20",
    ajustesMm: [-12, -12, 0, -2, -2, -27, -27],
  },
  L25: {
    id: "L25",
    label: "L25",
    ajustesMm: [-16, -16, 0, 0, 0, -35, -35],
  },
};

/** @deprecated Usar PLANTILLAS_VENTORA_CORREDERA_2H.L5000.ajustesMm */
export const AJUSTES_REFERENCIA_L5000_CORREDERA_2H_MM =
  PLANTILLAS_VENTORA_CORREDERA_2H.L5000.ajustesMm;

export function buildAjusteDocumentadoVentoraObs(
  plantillaId: PlantillaVentoraCorrederaId
): string {
  return `Ajuste documentado en Ventora (referencia ${plantillaId}).`;
}

/** @deprecated Usar buildAjusteDocumentadoVentoraObs("L5000") */
export const AJUSTE_DOCUMENTADO_VENTORA_OBS =
  buildAjusteDocumentadoVentoraObs("L5000");

/**
 * Aplica ajustes conocidos de una plantilla Ventora sobre la base Corredera.
 * Marca el ajuste como sugerido real (no genérico desconocido).
 * No inventa códigos de perfil ni largos comerciales.
 */
export function aplicarAjustesPlantillaVentora(
  recipe: FabricacionReceta,
  plantillaId: PlantillaVentoraCorrederaId
): FabricacionReceta {
  const plantilla = PLANTILLAS_VENTORA_CORREDERA_2H[plantillaId];
  const profileCatalog = COMMERCIAL_TEMPLATE_PROFILE_CATALOG[plantillaId];
  const obsDocumentado = buildAjusteDocumentadoVentoraObs(plantillaId);
  const codigoRef = `${plantillaId}-2H-REF`;

  return {
    ...recipe,
    identidad: {
      ...recipe.identidad,
      nombre: recipe.identidad.nombre.includes(plantillaId)
        ? recipe.identidad.nombre
        : `${recipe.identidad.nombre.replace(/\s*-\s*base.*$/i, "").trim() || plantillaId} - referencia ${plantillaId}`,
      codigo: recipe.identidad.codigo.includes(plantillaId)
        ? recipe.identidad.codigo
        : codigoRef,
    },
    perfiles: recipe.perfiles.map((profile, index) => {
      const ajusteMm = plantilla.ajustesMm[index] ?? 0;
      const profileKey = CORREDERA_PROFILE_KEYS[index];
      const profileDefault = profileKey
        ? profileCatalog.defaults[profileKey]
        : undefined;
      const alternatives = profileKey
        ? profileCatalog.alternatives[profileKey] ?? []
        : [];
      const variantNote = alternatives.length
        ? `Variantes disponibles: ${alternatives
            .map((option) => `${option.code} · ${option.label}`)
            .join("; ")}.`
        : "";
      const complementNote =
        profileKey === "traslapo" && profileCatalog.complements?.length
          ? `Complementos opcionales: ${profileCatalog.complements
              .map((option) => `${option.code} · ${option.label}`)
              .join("; ")}.`
          : "";
      const pending = (profile.datosPendientes ?? []).filter(
        (detail) => !/ajuste|descuento/i.test(detail)
      );
      const obsBase = (profile.observaciones ?? "")
        .replace(/\s*Ajuste documentado en Ventora[^.]*\.\s*/gi, " ")
        .replace(/\s*Asignar perfil físico, ajuste y largo comercial en el Paso 2\.\s*/gi, " ")
        .trim();
      return {
        ...profile,
        // Solo aplica referencias documentadas de la plantilla elegida; el taller
        // puede reemplazarlas o quitarlas, sin heredar códigos de otra línea.
        codigoPerfil: profile.codigoPerfil || profileDefault?.code || "",
        nombrePerfil:
          profile.nombrePerfil || profileDefault?.label || profile.funcion,
        largoComercialMm: profile.largoComercialMm ?? null,
        reglaMedida: {
          ...profile.reglaMedida,
          ajusteMm,
        },
        observaciones: [obsBase, obsDocumentado, variantNote, complementNote]
          .filter(Boolean)
          .join(" "),
        datosPendientes: pending.length > 0 ? pending : undefined,
      };
    }),
    configuracionCorte: {
      ...(recipe.configuracionCorte ?? {
        perdidaCorteMm: null,
        despunteInicialMm: null,
        sobranteMinimoAprovechableMm: null,
      }),
      largoComercialDefaultMm:
        recipe.configuracionCorte?.largoComercialDefaultMm ??
        VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: [
      `Plantilla Ventora ${plantillaId} · Corredera 2 hojas. Ajustes documentados; validar con fabricación real del taller.`,
      ...(recipe.notasValidacion ?? []).filter(
        (note) =>
          !/Base estructural Ventora/i.test(note) &&
          !/Plantilla Ventora|Referencia técnica/i.test(note)
      ),
    ],
  };
}

/** @deprecated Usar aplicarAjustesPlantillaVentora(recipe, "L5000") */
export function aplicarAjustesReferenciaL5000(
  recipe: FabricacionReceta
): FabricacionReceta {
  return aplicarAjustesPlantillaVentora(recipe, "L5000");
}

/** Receta de plantilla Ventora: estructura Corredera + ajustes documentados. */
export function crearRecetaPlantillaVentoraCorredera2H(
  plantillaId: PlantillaVentoraCorrederaId,
  input?: { createId?: () => string }
): FabricacionReceta {
  const base = crearBaseTipologicaVentora({
    tipologia: "corredera",
    hojas: 2,
    modulos: 2,
    lineName: plantillaId,
    createId: input?.createId,
  });
  return aplicarAjustesPlantillaVentora(base, plantillaId);
}

/** Receta L5000 conocida: estructura Corredera + ajustes documentados. */
export function crearRecetaReferenciaL5000Corredera2H(input?: {
  createId?: () => string;
}): FabricacionReceta {
  return crearRecetaPlantillaVentoraCorredera2H("L5000", input);
}

export function crearBaseTipologicaVentora(input: {
  tipologia: BaseTipologicaVentora["tipologia"];
  hojas: number;
  modulos: number;
  lineName: string;
  createId?: () => string;
}): FabricacionReceta {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const meta = resolverBaseEstructuralVentora({
    tipologia: input.tipologia,
    hojas: input.hojas,
  });
  if (!meta) {
    throw new Error(
      `No hay una base preparada para ${input.tipologia} con ${input.hojas} hojas.`
    );
  }

  const base = DEFINITIONS[input.tipologia];
  const label = meta.label;
  const hojas = Math.max(1, input.hojas);
  const modulos = Math.max(1, input.modulos);

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    // Nunca "validada": una base precargada es borrador estructural.
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: createId(),
      codigo: `${input.lineName.trim().toUpperCase().replace(/\s+/g, "-") || "RECETA"}-${hojas}H-V1`,
      nombre: `${input.lineName.trim() || "Linea"} - base ${label.toLocaleLowerCase("es-CL")}`,
      tipologia: input.tipologia,
      hojas,
      modulos,
      apertura: input.tipologia,
      herraje: null,
      variante: "estandar",
    },
    perfiles: base.perfiles.map((profile) => ({
      id: createId(),
      codigoPerfil: "",
      // Sin perfil físico asignado: solo hay función estructural.
      nombrePerfil: "",
      funcion: profile.funcion,
      largoComercialMm: null,
      reglaMedida: {
        base: profile.medida,
        // Sin ajuste conocido: no inventar 0 como recomendación técnica.
        multiplicador: 1,
      },
      reglaCantidad: {
        tipo: profile.cantidadTipo,
        cantidad: profile.cantidad,
        multiplicador: 1,
      },
      requerido: profile.requerido ?? true,
      observaciones: [
        `Grupo estructural: ${profile.grupo}.`,
        "Función y medida base sugeridas por Ventora.",
        "Opcional: asigna perfil físico o ajuste si tu taller trabaja distinto.",
      ].join(" "),
      datosPendientes: [...commonPending],
    })),
    vidrios: base.vidrios.map((glass) => ({
      id: createId(),
      nombre: glass.nombre,
      reglaAncho: { base: glass.ancho, ajusteMm: 0, multiplicador: 1 },
      reglaAlto: { base: glass.alto, ajusteMm: 0, multiplicador: 1 },
      reglaCantidad: {
        tipo: glass.cantidadTipo,
        cantidad: glass.cantidad,
        multiplicador: 1,
      },
      requerido: false,
      observaciones:
        "Vidrio opcional sugerido. Confirmar descuentos y composición en el Paso 2.",
      datosPendientes: [
        "Confirmar descuento de ancho y alto",
        "Confirmar cantidad con el taller",
        "Confirmar composicion del vidrio",
      ],
    })),
    accesorios: base.accesorios.map((accessory) => ({
      id: createId(),
      codigo: "",
      nombre: accessory.nombre,
      reglaCantidad: {
        tipo: accessory.cantidadTipo,
        cantidad: accessory.cantidad,
        multiplicador: 1,
      },
      requerido: false,
      observaciones: meta.pendienteCompletar
        ? "Accesorio estructural sugerido. Confirmar modelo y cantidad real en el Paso 2."
        : "Accesorio opcional sugerido. Confirmar modelo y cantidad en el Paso 2.",
      datosPendientes: meta.pendienteCompletar
        ? [...structuralAccessoryPending]
        : [
            "Confirmar accesorio usado por el taller",
            "Confirmar codigo y cantidad",
          ],
    })),
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: meta.pendienteCompletar
      ? [
          "Estructura preparada por Ventora: piezas habituales de la tipología.",
          "Falta configurar medidas de corte, ajustes y referencias comerciales.",
          "No está técnicamente validada. El maestro revisa, prueba una medida y activa en el Paso 3.",
        ]
      : [
          "Base estructural Ventora: tipología habitual, no línea de fabricante.",
          "No está técnicamente validada. El maestro revisa, prueba una medida y activa en el Paso 3.",
        ],
  };
}
