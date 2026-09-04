import {
  ARQUETIPOS_ESTRUCTURALES,
  CATALOG_KEY_TO_ARQUETIPO,
  GRUPO_PIEZA_ESTRUCTURAL_LABELS,
  type ArquetipoEstructuralId,
  type GrupoPiezaEstructural,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import {
  PROFILE_REFERENCE_SOURCES,
  type LineProfileReference,
  type LineTemplateWorkshopProfiles,
  buildWorkshopProfilesPayload,
} from "@/features/cotizaciones/line-templates/types/line-profile-references";

type RefInput = {
  code?: string | null;
  name: string;
  role: string;
  description?: string;
  provider?: string | null;
  source?: string | null;
  codeStatus?: LineProfileReference["codeStatus"];
};

function catalogRef(input: RefInput): LineProfileReference {
  return {
    code: input.code?.trim() || null,
    name: input.name,
    role: input.role,
    description: input.description?.trim() || input.name,
    provider: input.provider ?? "SODAL",
    source: input.source ?? PROFILE_REFERENCE_SOURCES.SODAL_CATALOG,
    codeStatus: input.codeStatus ?? "catalog_reference",
  };
}

function industryRef(input: RefInput): LineProfileReference {
  return catalogRef({
    ...input,
    provider: null,
    source: PROFILE_REFERENCE_SOURCES.PERFILES_CHILE,
  });
}

function visualRef(input: RefInput): LineProfileReference {
  return catalogRef({
    ...input,
    codeStatus: "visual_reference",
  });
}

function pendingRef(name: string, role: string): LineProfileReference {
  return {
    code: null,
    name,
    role,
    description: name,
    provider: null,
    source: null,
    codeStatus: "pending_validation",
  };
}

const SERIE_5000_PROFILES: LineProfileReference[] = [
  industryRef({ code: "5001", name: "Riel inferior", role: "Marco" }),
  industryRef({ code: "5002", name: "Riel superior", role: "Marco" }),
  industryRef({ code: "5003", name: "Jamba", role: "Marco" }),
  industryRef({ code: "5004", name: "Zócalo", role: "Hoja" }),
  industryRef({ code: "5005", name: "Cabezal", role: "Hoja" }),
  industryRef({ code: "5006", name: "Traslapo", role: "Hoja" }),
  industryRef({ code: "5007", name: "Pierna", role: "Hoja" }),
];

const SERIE_20_PROFILES: LineProfileReference[] = [
  industryRef({ code: "2001", name: "Riel superior", role: "Marco" }),
  industryRef({ code: "2002", name: "Riel inferior", role: "Marco" }),
  industryRef({ code: "2009", name: "Jamba", role: "Marco" }),
  industryRef({ code: "2004", name: "Cabezal", role: "Hoja" }),
  industryRef({ code: "2005", name: "Zócalo", role: "Hoja" }),
  industryRef({ code: "2010", name: "Pierna", role: "Hoja" }),
  industryRef({ code: "2019", name: "Traslapo", role: "Hoja" }),
];

const SERIE_25_PROFILES: LineProfileReference[] = [
  industryRef({ code: "2501", name: "Riel superior", role: "Marco" }),
  industryRef({ code: "2502", name: "Riel inferior", role: "Marco" }),
  industryRef({ code: "2509", name: "Jamba", role: "Marco" }),
  industryRef({ code: "2504", name: "Cabezal", role: "Hoja" }),
  industryRef({ code: "2505", name: "Zócalo", role: "Hoja" }),
  industryRef({ code: "2507", name: "Traslapo", role: "Hoja" }),
  industryRef({ code: "2510", name: "Pierna", role: "Hoja" }),
];

const SERIE_4800_PROFILES: LineProfileReference[] = [
  catalogRef({ code: "4801", name: "Riel inferior", role: "Marco" }),
  catalogRef({ code: "4802", name: "Riel superior", role: "Marco" }),
  catalogRef({ code: "4803", name: "Jamba", role: "Marco" }),
  catalogRef({ code: "4804", name: "Zócalo", role: "Hoja" }),
  catalogRef({ code: "4805", name: "Cabezal", role: "Hoja" }),
  catalogRef({ code: "4806", name: "Traslapo", role: "Hoja" }),
  catalogRef({
    code: "4808",
    name: "Pierna con aleta",
    role: "Hoja",
    description: "Pierna con aleta",
  }),
];

/** Códigos L32 proyectante (SODAL). No usar en Serie 32 corredera comercial. */
const L32_PROYECTANTE_VISUAL_REFERENCES: LineProfileReference[] = [
  visualRef({ code: "3201", name: "Marco simple", role: "Marco", description: "L32 · Proyectante" }),
  visualRef({ code: "3202", name: "Hoja proyectante", role: "Hoja", description: "L32 · Proyectante" }),
  visualRef({ code: "3204", name: "Palillo / Pilar T", role: "Otro", description: "L32 · Proyectante" }),
  visualRef({
    code: "3205",
    name: "Marco cámara de agua",
    role: "Otro",
    description: "L32 · Proyectante",
  }),
  visualRef({ code: "3208", name: "Junquillo", role: "Otro", description: "L32 · Proyectante" }),
];

/** Códigos Serie 42 proyectante (SODAL). No usar en Serie 42 corredera comercial. */
const SERIE_42_PROYECTANTE_PROFILES: LineProfileReference[] = [
  catalogRef({
    code: "4201",
    name: "Marco proyectante",
    role: "Marco",
    description: "Marco proyectante",
  }),
  catalogRef({ code: "4202", name: "Hoja", role: "Hoja" }),
  catalogRef({ code: "4204", name: "Palillo", role: "Otro" }),
  catalogRef({ code: "4209", name: "Marco fijo", role: "Marco" }),
  catalogRef({ code: "4229", name: "Junquillo", role: "Otro" }),
  catalogRef({
    code: "4231",
    name: "Marco con cámara",
    role: "Marco",
    description: "Marco con cámara",
  }),
];

const SERIE_S33_PROFILES: LineProfileReference[] = [
  catalogRef({ code: "3301", name: "Riel", role: "Marco" }),
  catalogRef({ code: "3302", name: "Hoja", role: "Hoja" }),
  catalogRef({ code: "3303", name: "Traslapo", role: "Hoja" }),
  catalogRef({ code: "3304", name: "Cortagotera", role: "Otro" }),
  catalogRef({
    code: "3308",
    name: "Hoja termopanel",
    role: "Hoja",
    description: "Hoja termopanel",
  }),
  catalogRef({
    code: "3309",
    name: "Hoja reforzada",
    role: "Hoja",
    description: "Hoja reforzada",
  }),
];

const SERIE_S33_RPT_PROFILES: LineProfileReference[] = [
  catalogRef({
    code: "3324R",
    name: "Riel RPT",
    role: "Marco",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
  catalogRef({
    code: "3308R",
    name: "Hoja TP RPT",
    role: "Hoja",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
  catalogRef({
    code: "3303",
    name: "Traslapo",
    role: "Hoja",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
  catalogRef({
    code: "3325R",
    name: "Riel triple RPT",
    role: "Marco",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
  catalogRef({
    code: "3315R",
    name: "Hoja TP reforzada",
    role: "Hoja",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
];

const SERIE_S38_PROFILES: LineProfileReference[] = [
  catalogRef({ code: "3801", name: "Marco", role: "Marco" }),
  catalogRef({ code: "3802N", name: "Hoja", role: "Hoja" }),
  catalogRef({ code: "3803", name: "Junquillo", role: "Otro" }),
  catalogRef({ code: "3804", name: "Travesaño", role: "Otro" }),
  catalogRef({ code: "3805", name: "Cámara", role: "Otro" }),
  catalogRef({
    code: "3806",
    name: "Hoja TP",
    role: "Hoja",
    description: "Hoja termopanel",
  }),
  catalogRef({
    code: "3807",
    name: "Junquillo TP",
    role: "Otro",
    description: "Junquillo termopanel",
  }),
];

const SERIE_S38_RPT_PROFILES: LineProfileReference[] = [
  catalogRef({
    code: "381R",
    name: "Marco RPT",
    role: "Marco",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
  catalogRef({
    code: "384R",
    name: "Palillo RPT",
    role: "Otro",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
  catalogRef({
    code: "386R",
    name: "Hoja RPT",
    role: "Hoja",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
  catalogRef({
    code: "383",
    name: "Junquillo TP 20 mm",
    role: "Otro",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
  catalogRef({
    code: "387",
    name: "Junquillo TP 32 mm",
    role: "Otro",
    source: PROFILE_REFERENCE_SOURCES.SODAL_RPT_PDF,
  }),
];

const MULTISLIDE_S83_PROFILES: LineProfileReference[] = [
  catalogRef({
    code: "S831",
    name: "Riel inferior 4L",
    role: "Marco",
    description: "Riel inferior 4 hojas",
  }),
  catalogRef({ code: "S832", name: "Riel superior", role: "Marco" }),
  catalogRef({
    code: "S833",
    name: "Jamba 4L",
    role: "Marco",
    description: "Jamba 4 hojas",
  }),
  catalogRef({ code: "S834", name: "Zócalo", role: "Hoja" }),
];

const PUERTA_3200_PROFILES: LineProfileReference[] = [
  catalogRef({
    code: "3221",
    name: "Bastidor chico",
    role: "Puerta",
    description: "Bastidor chico",
  }),
  catalogRef({ code: "3222", name: "Marco", role: "Marco" }),
  catalogRef({
    code: "3223",
    name: "Tope segunda hoja",
    role: "Otro",
    description: "Tope segunda hoja",
  }),
  catalogRef({
    code: "3225",
    name: "Bastidor grande",
    role: "Puerta",
    description: "Bastidor grande",
  }),
  catalogRef({ code: "3226", name: "Palillo", role: "Otro" }),
  catalogRef({
    code: "3227",
    name: "Bastidor termopanel",
    role: "Puerta",
    description: "Bastidor termopanel",
  }),
  catalogRef({
    code: "3228",
    name: "Palillo termopanel",
    role: "Otro",
    description: "Palillo termopanel",
  }),
];

const PUERTA_4600_PROFILES: LineProfileReference[] = [
  catalogRef({
    code: "4601",
    name: "quicio mecánico",
    role: "Accesorio",
    description: "quicio mecánico (par con 4603)",
  }),
  catalogRef({
    code: "4603",
    name: "quicio mecánico complemento",
    role: "Accesorio",
    description: "quicio mecánico (par con 4601)",
  }),
  catalogRef({
    code: "4604",
    name: "quicio hidráulico MAB",
    role: "Accesorio",
    description: "quicio hidráulico MAB (par con 4602)",
  }),
  catalogRef({
    code: "4602",
    name: "quicio hidráulico MAB complemento",
    role: "Accesorio",
    description: "quicio hidráulico MAB (par con 4604)",
  }),
];

const CATALOG_KEY_PROFILE_SETS: Record<string, LineProfileReference[]> = {
  "ventora:l5000": SERIE_5000_PROFILES,
  "ventora:l20": SERIE_20_PROFILES,
  "ventora:l25": SERIE_25_PROFILES,
  "ventora:serie-4800-corredera-2h": SERIE_4800_PROFILES,
  "ventora:s33-corredera-2h": SERIE_S33_PROFILES,
  "ventora:s33-rpt-corredera-2h": SERIE_S33_RPT_PROFILES,
  "ventora:serie-42-proyectante-camara": SERIE_42_PROYECTANTE_PROFILES,
  "ventora:serie-42-proyectante-sin-camara": SERIE_42_PROYECTANTE_PROFILES,
  "ventora:s38-proyectante": SERIE_S38_PROFILES,
  "ventora:s38-rpt-proyectante": SERIE_S38_RPT_PROFILES,
  "ventora:multislide-s83-4h": MULTISLIDE_S83_PROFILES,
  "ventora:multislide-s83-8h": MULTISLIDE_S83_PROFILES,
  "ventora:serie-3200-puerta-abatible-1h": PUERTA_3200_PROFILES,
  "ventora:serie-4600-puerta-vaiven": PUERTA_4600_PROFILES,
};

const PENDING_VALIDATION_CATALOG_KEYS = new Set([
  "ventora:l32",
  "ventora:l42",
  "ventora:optima-s28-corredera-2h",
  "ventora:optima-s28-corredera-3h",
  "ventora:winhouse-new-s75-doble-riel",
  "ventora:winhouse-new-s75-triple-riel",
  "ventora:winhouse-s60",
  "ventora:winhouse-andes-doble-riel",
  "ventora:winhouse-andes-proyectante",
]);

/** Referencias visuales L32 proyectante (wizard/biblioteca). No asociar a Serie 32 corredera. */
export function getL32ProyectanteVisualReferences(): LineProfileReference[] {
  return L32_PROYECTANTE_VISUAL_REFERENCES;
}

function roleFromGrupo(grupo: GrupoPiezaEstructural): string {
  return GRUPO_PIEZA_ESTRUCTURAL_LABELS[grupo] ?? "Otro";
}

function buildPendingProfilesFromArchetype(
  archetypeId: ArquetipoEstructuralId
): LineProfileReference[] {
  const config = ARQUETIPOS_ESTRUCTURALES[archetypeId];
  return config.perfiles.map((profile) =>
    pendingRef(profile.nombre, roleFromGrupo(profile.grupo))
  );
}

export function getVentoraProfileReferencesForCatalogKey(
  catalogKey: string | null | undefined
): LineTemplateWorkshopProfiles | null {
  const key = catalogKey?.trim();
  if (!key) return null;

  const codedProfiles = CATALOG_KEY_PROFILE_SETS[key];
  if (codedProfiles) {
    return buildWorkshopProfilesPayload(codedProfiles);
  }

  if (!PENDING_VALIDATION_CATALOG_KEYS.has(key)) {
    return null;
  }

  const archetypeId = CATALOG_KEY_TO_ARQUETIPO[key];
  if (!archetypeId) return null;

  return buildWorkshopProfilesPayload(
    buildPendingProfilesFromArchetype(archetypeId)
  );
}

export function listVentoraCatalogKeysWithProfileReferences(): string[] {
  return [
    ...Object.keys(CATALOG_KEY_PROFILE_SETS),
    ...Array.from(PENDING_VALIDATION_CATALOG_KEYS),
  ];
}
