import type {
  FabricacionComponentePerfil,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";

export type TallerPerfilRef = {
  id: string;
  nombre: string;
  codigoComercial: string;
  largoComercialMm: number | null;
};

export const DEFAULT_LARGO_COMERCIAL_OPTIONS_MM = [6000, 5800, 6400] as const;

const STORAGE_KEY = "ventora.taller-perfiles.v1";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCode(value: string) {
  return value.trim();
}

export function createTallerPerfilId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `tp_${crypto.randomUUID()}`;
  }
  return `tp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createTallerPerfilRef(input: {
  nombre: string;
  codigoComercial?: string | null;
  largoComercialMm?: number | null;
  id?: string;
}): TallerPerfilRef {
  const nombre = normalizeName(input.nombre);
  if (!nombre) {
    throw new Error("El nombre / referencia del perfil es obligatorio.");
  }
  const largo =
    typeof input.largoComercialMm === "number" &&
    Number.isFinite(input.largoComercialMm) &&
    input.largoComercialMm > 0
      ? Math.round(input.largoComercialMm)
      : null;

  return {
    id: input.id?.trim() || createTallerPerfilId(),
    nombre,
    codigoComercial: normalizeCode(input.codigoComercial ?? ""),
    largoComercialMm: largo,
  };
}

/** Clave de material para agrupar cortes en la misma barra. */
export function resolvePerfilMaterialKey(
  profile: Pick<
    FabricacionComponentePerfil,
    "tallerPerfilId" | "codigoPerfil" | "nombrePerfil" | "funcion" | "id"
  >
): string {
  return (
    profile.tallerPerfilId?.trim() ||
    profile.codigoPerfil.trim() ||
    profile.nombrePerfil.trim() ||
    profile.funcion.trim() ||
    profile.id
  );
}

export function profileReferenceLabel(
  profile: Pick<
    FabricacionComponentePerfil,
    "nombrePerfil" | "codigoPerfil" | "tallerPerfilId"
  >
): string {
  const code = profile.codigoPerfil.trim();
  if (code) return code;
  const name = profile.nombrePerfil.trim();
  if (name) return name;
  return "";
}

export function applyTallerPerfilToComponent(
  profile: FabricacionComponentePerfil,
  tallerPerfil: TallerPerfilRef,
  options: { prefillLargo?: boolean } = {}
): FabricacionComponentePerfil {
  const prefillLargo = options.prefillLargo !== false;
  const pending = (profile.datosPendientes ?? []).filter(
    (detail) =>
      !/confirmar codigo/i.test(detail) &&
      !/confirmar largo comercial/i.test(detail)
  );

  if (!tallerPerfil.codigoComercial) {
    // Código sigue opcional: no reintroducir pendiente de código.
  }

  const nextLargo =
    prefillLargo &&
    tallerPerfil.largoComercialMm != null &&
    (profile.largoComercialMm == null || profile.largoComercialMm <= 0)
      ? tallerPerfil.largoComercialMm
      : profile.largoComercialMm;

  return {
    ...profile,
    tallerPerfilId: tallerPerfil.id,
    nombrePerfil: tallerPerfil.nombre,
    codigoPerfil: tallerPerfil.codigoComercial,
    largoComercialMm: nextLargo ?? null,
    datosPendientes: pending.length > 0 ? pending : undefined,
  };
}

export function collectTallerPerfilesFromRecipes(
  recipes: FabricacionReceta[]
): TallerPerfilRef[] {
  const byId = new Map<string, TallerPerfilRef>();

  for (const recipe of recipes) {
    for (const profile of recipe.perfiles) {
      const nombre = normalizeName(profile.nombrePerfil);
      const codigo = normalizeCode(profile.codigoPerfil);
      if (!nombre && !codigo) continue;

      const id =
        profile.tallerPerfilId?.trim() ||
        `legacy_${(nombre || codigo).toLocaleLowerCase("es-CL")}`;
      const existing = byId.get(id);
      const largo =
        typeof profile.largoComercialMm === "number" && profile.largoComercialMm > 0
          ? profile.largoComercialMm
          : null;

      if (!existing) {
        byId.set(id, {
          id,
          nombre: nombre || codigo,
          codigoComercial: codigo,
          largoComercialMm: largo,
        });
        continue;
      }

      byId.set(id, {
        ...existing,
        nombre: existing.nombre || nombre || codigo,
        codigoComercial: existing.codigoComercial || codigo,
        largoComercialMm: existing.largoComercialMm ?? largo,
      });
    }
  }

  return Array.from(byId.values()).sort((left, right) =>
    left.nombre.localeCompare(right.nombre, "es-CL")
  );
}

export function splitTallerPerfilCatalog(input: {
  catalog: TallerPerfilRef[];
  recipe: FabricacionReceta;
}): { recent: TallerPerfilRef[]; others: TallerPerfilRef[] } {
  const usedIds = new Set(
    input.recipe.perfiles
      .map((profile) => profile.tallerPerfilId?.trim())
      .filter((value): value is string => Boolean(value))
  );
  const usedNames = new Set(
    input.recipe.perfiles
      .map((profile) => normalizeName(profile.nombrePerfil).toLocaleLowerCase("es-CL"))
      .filter(Boolean)
  );

  const recent: TallerPerfilRef[] = [];
  const others: TallerPerfilRef[] = [];

  for (const entry of input.catalog) {
    const isRecent =
      usedIds.has(entry.id) ||
      usedNames.has(entry.nombre.toLocaleLowerCase("es-CL"));
    if (isRecent) recent.push(entry);
    else others.push(entry);
  }

  return { recent, others };
}

export function collectFrequentLargosMm(
  recipes: FabricacionReceta[],
  defaults: readonly number[] = DEFAULT_LARGO_COMERCIAL_OPTIONS_MM
): { usedByWorkshop: number[]; otherFrequent: number[] } {
  const counts = new Map<number, number>();
  for (const recipe of recipes) {
    for (const profile of recipe.perfiles) {
      const largo = profile.largoComercialMm;
      if (typeof largo !== "number" || !Number.isFinite(largo) || largo <= 0) {
        continue;
      }
      const rounded = Math.round(largo);
      counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
    }
  }

  const usedByWorkshop = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .map(([value]) => value);

  const usedSet = new Set(usedByWorkshop);
  const otherFrequent = defaults.filter((value) => !usedSet.has(value));

  return { usedByWorkshop, otherFrequent };
}

export function applyLargoToProfilesWithoutLength(
  recipe: FabricacionReceta,
  largoComercialMm: number
): FabricacionReceta {
  const largo = Math.round(largoComercialMm);
  if (!Number.isFinite(largo) || largo <= 0) return recipe;

  let changed = false;
  const perfiles = recipe.perfiles.map((profile) => {
    if (profile.largoComercialMm != null && profile.largoComercialMm > 0) {
      return profile;
    }
    changed = true;
    const pending = (profile.datosPendientes ?? []).filter(
      (detail) => !/largo comercial/i.test(detail)
    );
    return {
      ...profile,
      largoComercialMm: largo,
      datosPendientes: pending.length > 0 ? pending : undefined,
    };
  });

  return changed ? { ...recipe, perfiles } : recipe;
}

/** Aplica el mismo largo comercial a todos los perfiles de la receta. */
export function applyLargoToAllProfiles(
  recipe: FabricacionReceta,
  largoComercialMm: number
): FabricacionReceta {
  const largo = Math.round(largoComercialMm);
  if (!Number.isFinite(largo) || largo <= 0 || recipe.perfiles.length === 0) {
    return recipe;
  }

  const perfiles = recipe.perfiles.map((profile) => {
    const pending = (profile.datosPendientes ?? []).filter(
      (detail) => !/largo comercial/i.test(detail)
    );
    return {
      ...profile,
      largoComercialMm: largo,
      datosPendientes: pending.length > 0 ? pending : undefined,
    };
  });

  return { ...recipe, perfiles };
}

/** Largo más usado en la receta; si ninguno, null. */
export function inferDominantLargoComercialMm(recipe: FabricacionReceta): number | null {
  const counts = new Map<number, number>();
  for (const profile of recipe.perfiles) {
    const largo = profile.largoComercialMm;
    if (typeof largo !== "number" || largo <= 0) continue;
    counts.set(largo, (counts.get(largo) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return (
    Array.from(counts.entries()).sort(
      (left, right) => right[1] - left[1] || left[0] - right[0]
    )[0]?.[0] ?? null
  );
}

export function countProfilesWithoutLength(recipe: FabricacionReceta) {
  return recipe.perfiles.filter(
    (profile) => profile.largoComercialMm == null || profile.largoComercialMm <= 0
  ).length;
}

export function readStoredTallerPerfiles(): TallerPerfilRef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as Partial<TallerPerfilRef>;
        if (!row.id || !row.nombre) return null;
        return createTallerPerfilRef({
          id: String(row.id),
          nombre: String(row.nombre),
          codigoComercial: String(row.codigoComercial ?? ""),
          largoComercialMm:
            typeof row.largoComercialMm === "number" ? row.largoComercialMm : null,
        });
      })
      .filter((entry): entry is TallerPerfilRef => Boolean(entry));
  } catch {
    return [];
  }
}

export function upsertStoredTallerPerfil(perfil: TallerPerfilRef) {
  if (typeof window === "undefined") return;
  const current = readStoredTallerPerfiles();
  const next = [perfil, ...current.filter((entry) => entry.id !== perfil.id)].slice(
    0,
    80
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function mergeTallerPerfilCatalogs(
  ...groups: TallerPerfilRef[][]
): TallerPerfilRef[] {
  const byId = new Map<string, TallerPerfilRef>();
  for (const group of groups) {
    for (const entry of group) {
      const existing = byId.get(entry.id);
      if (!existing) {
        byId.set(entry.id, entry);
        continue;
      }
      byId.set(entry.id, {
        ...existing,
        nombre: existing.nombre || entry.nombre,
        codigoComercial: existing.codigoComercial || entry.codigoComercial,
        largoComercialMm: existing.largoComercialMm ?? entry.largoComercialMm,
      });
    }
  }
  return Array.from(byId.values()).sort((left, right) =>
    left.nombre.localeCompare(right.nombre, "es-CL")
  );
}
