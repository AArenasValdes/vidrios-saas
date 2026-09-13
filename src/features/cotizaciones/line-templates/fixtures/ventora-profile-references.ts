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

/**
 * Referencias extraídas del estudio técnico aportado por el usuario.
 * Mantenerlas como referencia de catálogo: no equivalen a una receta validada
 * por el taller ni habilitan descuentos o pauta automática.
 */
const USER_TECHNICAL_STUDY_SOURCE =
  "Estudio técnico de líneas aportado por el usuario (2026-09-13)";

function studyRef(input: RefInput): LineProfileReference {
  return {
    code: input.code?.trim() || null,
    name: input.name,
    role: input.role,
    description: input.description?.trim() || input.name,
    provider: input.provider ?? null,
    source: USER_TECHNICAL_STUDY_SOURCE,
    codeStatus: input.codeStatus ?? "catalog_reference",
  };
}

function pendingStudyRef(
  input: Omit<RefInput, "code"> & { code?: null }
): LineProfileReference {
  return studyRef({
    ...input,
    code: null,
    codeStatus: "pending_validation",
  });
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

/** AL-32: códigos SODAL de proyectante; no asociar a una corredera. */
const AL32_PROJECTING_PROFILES: LineProfileReference[] = [
  studyRef({
    code: "3201",
    name: "Marco",
    role: "Marco",
    provider: "SODAL",
    description: "Marco fijo exterior; 27 × 32 mm.",
  }),
  studyRef({
    code: "3202",
    name: "Hoja proyectante",
    role: "Hoja",
    provider: "SODAL",
    description: "Hoja proyectante; 42 × 32 mm.",
  }),
  studyRef({
    code: "3204",
    name: "Palillo",
    role: "Otro",
    provider: "SODAL",
    description: "Pilar o separador entre hojas; 32 × 42,2 mm.",
  }),
  studyRef({
    code: "3205",
    name: "Marco cámara de agua",
    role: "Marco",
    provider: "SODAL",
    description: "Marco con canal de condensación; 32 × 47,6 mm.",
  }),
  studyRef({
    code: "3208",
    name: "Junquillo",
    role: "Otro",
    provider: "SODAL",
    description: "Soporte interior del vidrio; 22,5 × 15 mm.",
  }),
];

/** AL-42: códigos SODAL para proyectante, paño fijo y variantes de vidrio. */
const AL42_PROJECTING_PROFILES: LineProfileReference[] = [
  studyRef({
    code: "4202",
    name: "Hoja / marco nave",
    role: "Hoja",
    provider: "SODAL",
    description: "Hoja proyectante o nave; sección nominal 42 mm.",
  }),
  studyRef({
    code: "4203",
    name: "Junquillo",
    role: "Otro",
    provider: "SODAL",
    description: "Soporte de vidrio monolítico.",
  }),
  studyRef({
    code: "4204",
    name: "Palillo / pilar / traslapo",
    role: "Otro",
    provider: "SODAL",
    description: "Separador o traslapo entre hojas.",
  }),
  studyRef({
    code: "4206",
    name: "Junquillo termopanel",
    role: "Otro",
    provider: "SODAL",
    description: "Soporte para termopanel de 22 mm.",
  }),
  studyRef({
    code: "4209",
    name: "Marco fijo / paño fijo",
    role: "Marco",
    provider: "SODAL",
    description: "Marco para paño fijo.",
  }),
  studyRef({
    code: "4220",
    name: "Escuadra anudal NAT.",
    role: "Accesorio",
    provider: "SODAL",
    description: "Unión de esquinas a 45 grados.",
  }),
  studyRef({
    code: "4225",
    name: "Nave",
    role: "Hoja",
    provider: "SODAL",
    description: "Perfil para nave o ampliación.",
  }),
  studyRef({
    code: "4229",
    name: "Junquillo monolítico",
    role: "Otro",
    provider: "SODAL",
    description: "Alternativa para vidrio simple.",
  }),
  studyRef({
    code: "4230",
    name: "Cuña armado NAT.",
    role: "Accesorio",
    provider: "SODAL",
    description: "Cuña de armado.",
  }),
  studyRef({
    code: "4231",
    name: "Marco cámara de agua",
    role: "Marco",
    provider: "SODAL",
    description: "Marco con canal de condensación.",
  }),
  studyRef({
    code: "4250",
    name: "Hoja muro cortina",
    role: "Hoja",
    provider: "SODAL",
    description: "Hoja para aplicación en muro cortina.",
  }),
];

/** Óptima S-28: nombres útiles del estudio, códigos SODAL aún pendientes. */
const OPTIMA_S28_2H_PROFILES: LineProfileReference[] = [
  pendingStudyRef({
    name: "Marco perimetral S-28",
    role: "Marco",
    provider: "SODAL",
    description: "Marco perimetral de corredera 2 hojas; ensamblaje a 45 grados.",
  }),
  pendingStudyRef({
    name: "Hoja corredera S-28",
    role: "Hoja",
    provider: "SODAL",
  }),
  pendingStudyRef({
    name: "Traslapo central S-28",
    role: "Hoja",
    provider: "SODAL",
  }),
  pendingStudyRef({
    name: "Perfil cortagotera S-28",
    role: "Otro",
    provider: "SODAL",
  }),
  pendingStudyRef({
    name: "Felpa Fin Seal / sello estanco S-28",
    role: "Otro",
    provider: "SODAL",
  }),
];

const OPTIMA_S28_3H_PROFILES: LineProfileReference[] = [
  pendingStudyRef({
    name: "Marco perimetral triple riel S-28",
    role: "Marco",
    provider: "SODAL",
    description: "Marco de corredera 3 hojas; código SODAL pendiente.",
  }),
  pendingStudyRef({
    name: "Hoja corredera S-28",
    role: "Hoja",
    provider: "SODAL",
  }),
  pendingStudyRef({
    name: "Traslapo central S-28",
    role: "Hoja",
    provider: "SODAL",
  }),
  pendingStudyRef({
    name: "Perfil cortagotera S-28",
    role: "Otro",
    provider: "SODAL",
  }),
  pendingStudyRef({
    name: "Felpa Fin Seal / sello estanco S-28",
    role: "Otro",
    provider: "SODAL",
  }),
];

const WINHOUSE_NEW_S75_DOUBLE_RAIL_PROFILES: LineProfileReference[] = [
  pendingStudyRef({
    name: "Marco doble riel New S75",
    role: "Marco",
    provider: "WinHouse",
    description: "Marco 48 × 75 mm; código interno WinHouse pendiente.",
  }),
  pendingStudyRef({
    name: "Hoja ventana corredera 80 New S75",
    role: "Hoja",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Hoja puerta corredera 98 New S75",
    role: "Hoja",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Traslapo hoja 80/98 New S75",
    role: "Hoja",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Refuerzo Box New S75",
    role: "Refuerzo",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Junquillo New S75",
    role: "Otro",
    provider: "WinHouse",
  }),
];

const WINHOUSE_NEW_S75_TRIPLE_RAIL_PROFILES: LineProfileReference[] = [
  pendingStudyRef({
    name: "Marco triple riel New S75",
    role: "Marco",
    provider: "WinHouse",
    description: "Marco 48 × 135 mm; código interno WinHouse pendiente.",
  }),
  pendingStudyRef({
    name: "Hoja ventana corredera 80 New S75",
    role: "Hoja",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Hoja puerta corredera 98 New S75",
    role: "Hoja",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Traslapo hoja 80/98 New S75",
    role: "Hoja",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Refuerzo Box New S75",
    role: "Refuerzo",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Junquillo New S75",
    role: "Otro",
    provider: "WinHouse",
  }),
];

const WINHOUSE_S60_PROFILES: LineProfileReference[] = [
  studyRef({
    code: "7160Z00013",
    name: "Pilar fijo S60",
    role: "Marco",
    provider: "WinHouse",
    description: "Pilar fijo; 64,5 mm; ángulo 90 grados.",
  }),
  studyRef({
    code: "7160Z00016",
    name: "Perfil de elevación S60",
    role: "Marco",
    provider: "WinHouse",
    description: "Extensión del marco fijo; 60 mm.",
  }),
  studyRef({
    code: "720000200",
    name: "Ángulo de revestimiento S60",
    role: "Otro",
    provider: "WinHouse",
    description: "Ángulo de revestimiento; 150 × 50 mm.",
  }),
  studyRef({
    code: "716CZ00001",
    name: "Junquillo monolítico S60",
    role: "Otro",
    provider: "WinHouse",
    description: "Junquillo interior para vidrio monolítico de 5 mm.",
  }),
  studyRef({
    code: "716CZ00002",
    name: "Junquillo termopanel 20 S60",
    role: "Otro",
    provider: "WinHouse",
    description: "Junquillo interior para DVH de 20 mm.",
  }),
  studyRef({
    code: "716CZ00003",
    name: "Junquillo termopanel 24 S60",
    role: "Otro",
    provider: "WinHouse",
    description: "Junquillo interior para DVH de 24 mm.",
  }),
  studyRef({
    code: "726332612N",
    name: "Refuerzo múltiple S60",
    role: "Refuerzo",
    provider: "WinHouse",
    description: "Refuerzo de acero; espesor 1,2 mm.",
  }),
  studyRef({
    code: "2433242N",
    name: "Refuerzo múltiple pesado S60",
    role: "Refuerzo",
    provider: "WinHouse",
    description: "Refuerzo de acero; espesor 2,0 mm.",
  }),
  studyRef({
    code: "4040BOX15",
    name: "Refuerzo esquinero S60",
    role: "Refuerzo",
    provider: "WinHouse",
    description: "Inserto Box; espesor 1,5 mm.",
  }),
  studyRef({
    code: "78200010001",
    name: "Refuerzo de bisagra S60",
    role: "Refuerzo",
    provider: "WinHouse",
    description: "Pletina de acero para fijación de herrajes; espesor 1,35 mm.",
  }),
];

const WINHOUSE_ANDES_DOUBLE_RAIL_PROFILES: LineProfileReference[] = [
  pendingStudyRef({
    name: "Marco doble riel corredera Andes",
    role: "Marco",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Hoja corredera Andes 66",
    role: "Hoja",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Junquillo Andes hasta 19 mm",
    role: "Otro",
    provider: "WinHouse",
  }),
  studyRef({
    code: "PL-SLA-TC-H66-12",
    name: "Refuerzo hoja Andes 66",
    role: "Refuerzo",
    provider: "WinHouse",
    description: "Refuerzo de hoja; espesor reportado 1,2 mm.",
  }),
  studyRef({
    code: "PL-SLA-TC-H66-15",
    name: "Refuerzo hoja Andes 66 pesado",
    role: "Refuerzo",
    provider: "WinHouse",
    description: "Refuerzo de hoja; espesor reportado 1,5 mm.",
  }),
  studyRef({
    code: "PL-SLA-TC-MCA-12",
    name: "Refuerzo marco corredera Andes",
    role: "Refuerzo",
    provider: "WinHouse",
    description: "Refuerzo de marco; espesor reportado 1,2 mm.",
  }),
];

const WINHOUSE_ANDES_MONORAIL_PROFILES: LineProfileReference[] = [
  pendingStudyRef({
    name: "Marco monorriel corredera Andes",
    role: "Marco",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Tapa marco monorriel Andes",
    role: "Marco",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Hoja corredera Andes 54",
    role: "Hoja",
    provider: "WinHouse",
  }),
  studyRef({
    code: "PL-SLA-TC-MLT-12",
    name: "Refuerzo múltiple Andes",
    role: "Refuerzo",
    provider: "WinHouse",
    description: "Refuerzo de acero; espesor reportado 1,2 mm.",
  }),
  studyRef({
    code: "PL-SLA-TC-H54-12",
    name: "Refuerzo hoja Andes 54",
    role: "Refuerzo",
    provider: "WinHouse",
    description:
      "El estudio reporta 2,0 mm asociado a este código; confirmar espesor con WinHouse.",
  }),
  studyRef({
    code: "HL-ACC-5X5-APOC-MA",
    name: "Apoyo cerradero 5 × 5 M Andes",
    role: "Accesorio",
    provider: "WinHouse",
  }),
];

const WINHOUSE_ANDES_PROJECTING_PROFILES: LineProfileReference[] = [
  pendingStudyRef({
    name: "Marco fijo Andes S38",
    role: "Marco",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Rótula Andes 38",
    role: "Otro",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Adaptador rótula Andes",
    role: "Otro",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Poste T Andes S38",
    role: "Otro",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Hoja exterior Andes S38",
    role: "Hoja",
    provider: "WinHouse",
  }),
  pendingStudyRef({
    name: "Junquillo Andes para 4–19 mm",
    role: "Otro",
    provider: "WinHouse",
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
  "ventora:l32": AL32_PROJECTING_PROFILES,
  "ventora:l42": AL42_PROJECTING_PROFILES,
  "ventora:optima-s28-corredera-2h": OPTIMA_S28_2H_PROFILES,
  "ventora:optima-s28-corredera-3h": OPTIMA_S28_3H_PROFILES,
  "ventora:winhouse-new-s75-doble-riel": WINHOUSE_NEW_S75_DOUBLE_RAIL_PROFILES,
  "ventora:winhouse-new-s75-triple-riel": WINHOUSE_NEW_S75_TRIPLE_RAIL_PROFILES,
  "ventora:winhouse-s60": WINHOUSE_S60_PROFILES,
  "ventora:winhouse-andes-doble-riel": WINHOUSE_ANDES_DOUBLE_RAIL_PROFILES,
  "ventora:winhouse-andes-monorriel": WINHOUSE_ANDES_MONORAIL_PROFILES,
  "ventora:winhouse-andes-proyectante": WINHOUSE_ANDES_PROJECTING_PROFILES,
};

const PENDING_VALIDATION_CATALOG_KEYS = new Set<string>();

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
