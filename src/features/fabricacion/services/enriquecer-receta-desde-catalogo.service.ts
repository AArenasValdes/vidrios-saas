import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import type {
  FabricacionAccesorio,
  FabricacionComponentePerfil,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("es-CL")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pieceName(profile: FabricacionComponentePerfil): string {
  const match = profile.observaciones?.match(/Pieza:\s*([^\.]+)/i);
  return match?.[1]?.trim() || profile.nombrePerfil || profile.funcion;
}

function pieceRole(profile: FabricacionComponentePerfil): string | null {
  const match = profile.observaciones?.match(/Grupo:\s*([^\.]+)/i);
  const group = normalize(match?.[1] ?? "");
  if (group === "marco") return "marco";
  if (group === "hoja") return "hoja";
  if (group === "puerta") return "puerta";
  if (group === "refuerzo") return "refuerzo";
  if (group === "otro") return "otro";
  return null;
}

function referenceRole(role: string): string {
  return normalize(role);
}

function words(value: string): Set<string> {
  return new Set(normalize(value).split(/\s+/).filter((word) => word.length > 2));
}

function matchScore(target: string, candidate: { name: string; role: string }): number {
  const targetWords = words(target);
  const candidateWords = words(`${candidate.name} ${candidate.role}`);
  const overlap = [...targetWords].filter((word) => candidateWords.has(word)).length;
  const normalizedTarget = normalize(target);
  const normalizedName = normalize(candidate.name);
  if (normalizedTarget && normalizedTarget === normalizedName) return 100;
  if (overlap === 0) return 0;
  return overlap * 10 + (candidateWords.has(normalizedTarget) ? 5 : 0);
}

function chooseReference(
  target: string,
  references: Array<{ code: string; name: string; role: string }>,
  targetRole?: string | null
) {
  const ranked = references
    .map((reference) => ({ reference, score: matchScore(target, reference) }))
    .map((entry) => ({
      ...entry,
      score:
        entry.score +
        (targetRole && entry.score > 0 && referenceRole(entry.reference.role) === targetRole
          ? 4
          : 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  return best?.reference ?? null;
}

function applyProfileReference(
  profile: FabricacionComponentePerfil,
  reference: { code: string; name: string },
  confident: boolean
): FabricacionComponentePerfil {
  return {
    ...profile,
    codigoPerfil: reference.code,
    nombrePerfil: profile.nombrePerfil.trim() || reference.name,
    datosPendientes: confident
      ? (profile.datosPendientes ?? []).filter((detail) => !/confirmar codigo/i.test(detail))
      : profile.datosPendientes,
    observaciones: `${profile.observaciones ?? ""} Código referencial de catálogo: ${reference.code}. Confirmar con el taller antes de validar.`.trim(),
  };
}

function applyAccessoryReference(
  accessory: FabricacionAccesorio,
  reference: { code: string; name: string }
): FabricacionAccesorio {
  return {
    ...accessory,
    codigo: reference.code,
    nombre: accessory.nombre.trim() || reference.name,
    datosPendientes: (accessory.datosPendientes ?? []).filter(
      (detail) => !/confirmar codigo/i.test(detail)
    ),
  };
}

/**
 * Copia únicamente coincidencias inequívocas desde las referencias del catálogo.
 * Las referencias ambiguas o pendientes permanecen visibles como pendientes
 * para no convertir un código informativo en una fórmula de taller.
 */
export function enriquecerRecetaDesdeCatalogo(input: {
  receta: FabricacionReceta;
  catalogKey?: string | null;
}): FabricacionReceta {
  const references = getVentoraProfileReferencesForCatalogKey(input.catalogKey);
  if (!references) return input.receta;

  const codedProfiles = references.profiles
    .filter((reference) => reference.code?.trim())
    .map((reference) => ({
      code: reference.code!.trim(),
      name: reference.name,
      role: reference.role,
    }));
  if (codedProfiles.length === 0) return input.receta;

  let changed = false;
  const perfiles = input.receta.perfiles.map((profile) => {
    if (profile.codigoPerfil.trim()) return profile;
    const target = pieceName(profile);
    const reference = chooseReference(target, codedProfiles, pieceRole(profile));
    if (!reference) return profile;
    changed = true;
    const confident = normalize(target) === normalize(reference.name) || matchScore(target, reference) >= 20;
    return applyProfileReference(profile, reference, confident);
  });

  const accessoryReferences = codedProfiles.filter((reference) =>
    references.profiles.some(
      (entry) => entry.code?.trim() === reference.code && entry.role === "Accesorio"
    )
  );
  const accesorios = input.receta.accesorios.map((accessory) => {
    if (accessory.codigo.trim()) return accessory;
    const reference = chooseReference(accessory.nombre, accessoryReferences);
    if (!reference) return accessory;
    changed = true;
    return applyAccessoryReference(accessory, reference);
  });

  return changed ? { ...input.receta, perfiles, accesorios } : input.receta;
}
