import {
  describePerfilSheetMeasure,
  resolveLargoComercialMm,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionAccesorio,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";

export function crearRecetaFabricacionVacia(input: {
  recipeIdentityId: string;
  lineName: string;
}): FabricacionReceta {
  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "borrador",
    identidad: {
      recetaId: input.recipeIdentityId,
      codigo: `${input.lineName.trim().toUpperCase().replace(/\s+/g, "-") || "RECETA"}-V1`,
      nombre: `${input.lineName.trim() || "Linea"} - receta propia`,
      tipologia: "personalizada",
      hojas: 1,
      modulos: 1,
      apertura: null,
      herraje: null,
      variante: "estandar",
    },
    perfiles: [],
    vidrios: [],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
    },
    notasValidacion: [],
  };
}

export function crearPerfilFabricacionVacio(id: string): FabricacionComponentePerfil {
  return {
    id,
    codigoPerfil: "",
    nombrePerfil: "",
    funcion: "Perfil",
    largoComercialMm: null,
    reglaMedida: {
      base: "ancho_total",
      ajusteMm: 0,
      multiplicador: 1,
    },
    reglaCantidad: {
      tipo: "fija",
      cantidad: 1,
      multiplicador: 1,
    },
    requerido: true,
  };
}

export function crearVidrioFabricacionVacio(id: string): FabricacionVidrio {
  return {
    id,
    nombre: "Vidrio principal",
    reglaAncho: { base: "ancho_total", ajusteMm: 0, multiplicador: 1 },
    reglaAlto: { base: "alto_total", ajusteMm: 0, multiplicador: 1 },
    reglaCantidad: { tipo: "fija", cantidad: 1, multiplicador: 1 },
    requerido: true,
  };
}

export function crearAccesorioFabricacionVacio(id: string): FabricacionAccesorio {
  return {
    id,
    codigo: "",
    nombre: "Accesorio",
    reglaCantidad: { tipo: "fija", cantidad: 1, multiplicador: 1 },
    requerido: false,
  };
}

export function reorderFabricacionItems<T>(
  items: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

export function patchFabricacionPerfil(
  receta: FabricacionReceta,
  profileId: string,
  patch: (profile: FabricacionComponentePerfil) => FabricacionComponentePerfil
): FabricacionReceta {
  let changed = false;
  const perfiles = receta.perfiles.map((profile) => {
    if (profile.id !== profileId) return profile;
    const next = patch(profile);
    if (next !== profile) changed = true;
    return next;
  });
  return changed ? { ...receta, perfiles } : receta;
}

export function patchFabricacionGlassNombre(
  glass: FabricacionVidrio,
  nombre: string
): FabricacionVidrio {
  const trimmed = nombre.trim();
  if (!trimmed) {
    return {
      ...glass,
      nombre: "",
      requerido: false,
    };
  }

  return {
    ...glass,
    nombre: trimmed,
    requerido: true,
    datosPendientes: (glass.datosPendientes ?? []).filter(
      (detail) =>
        !/composici[oó]n del vidrio/i.test(detail) &&
        !/descuento de ancho y alto/i.test(detail)
    ),
  };
}

export function patchRecipeGlassNombre(
  receta: FabricacionReceta,
  glassId: string,
  nombre: string
): FabricacionReceta {
  let changed = false;
  const vidrios = receta.vidrios.map((glass) => {
    if (glass.id !== glassId) return glass;
    const next = patchFabricacionGlassNombre(glass, nombre);
    if (next !== glass) changed = true;
    return next;
  });
  return changed ? { ...receta, vidrios } : receta;
}

function profileHasWorkshopIdentity(profile: FabricacionComponentePerfil): boolean {
  return Boolean(
    profile.funcion.trim() ||
      profile.nombrePerfil.trim() ||
      profile.codigoPerfil.trim()
  );
}

/**
 * Bloqueos que impiden probar/validar geométricamente.
 * El código comercial y el largo comercial NO son críticos:
 * - código: opcional (basta función/nombre/referencia)
 * - largo comercial: progresivo (habilita barras, no bloquea despiece)
 */
export function contarBloqueosCriticosReceta(receta: FabricacionReceta) {
  const requiredProfilesWithoutIdentity = receta.perfiles.filter(
    (profile) => profile.requerido && !profileHasWorkshopIdentity(profile)
  ).length;
  const emptyRequiredGlass = receta.vidrios.filter(
    (glass) => glass.requerido && !glass.nombre.trim()
  ).length;

  return requiredProfilesWithoutIdentity + emptyRequiredGlass;
}

/** Aviso secundario: ningún perfil requerido resuelve largo comercial. */
export function tieneLargosComercialesPendientes(receta: FabricacionReceta) {
  return receta.perfiles.some(
    (profile) =>
      profile.requerido && resolveLargoComercialMm(profile, receta) <= 0
  );
}

/** Perfil listo para cubicar: medida/ajuste definidos (largo se resuelve por defecto). */
export function isProfileReadyForPauta(
  profile: FabricacionComponentePerfil,
  receta?: FabricacionReceta
): boolean {
  const sheetMeasure = describePerfilSheetMeasure(profile);
  if (sheetMeasure.pending) return false;
  if (receta) {
    return resolveLargoComercialMm(profile, receta) > 0;
  }
  return true;
}

export function countProfilesReadyForPauta(receta: FabricacionReceta) {
  return receta.perfiles.filter((profile) =>
    isProfileReadyForPauta(profile, receta)
  ).length;
}

export function countProfilesGeometricallyPending(receta: FabricacionReceta) {
  return receta.perfiles.filter(
    (profile) => describePerfilSheetMeasure(profile).pending
  ).length;
}
