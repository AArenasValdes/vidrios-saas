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

/** Aviso secundario: falta largo comercial para pauta de barras. */
export function tieneLargosComercialesPendientes(receta: FabricacionReceta) {
  return receta.perfiles.some(
    (profile) => profile.requerido && !profile.largoComercialMm
  );
}
