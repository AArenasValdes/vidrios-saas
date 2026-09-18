import { basename } from "node:path";

import { LEGACY_SOURCE_DATE, repoRelative, SOURCE_DOC_PATH } from "./paths.ts";
import { confirmedRecipeSchema } from "./schema.ts";
import type {
  ConfirmedRecipe,
  GlassPiece,
  GlazingType,
  HardwareItem,
  ProfileCut,
  SourceEvidence,
} from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pick<T>(record: Record<string, unknown>, keys: string[]): T | undefined {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key] as T;
  }
  return undefined;
}

export function slugPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function variantFromLine(line: string): string {
  return line.replace(/^l-?\d+\s+/i, "").trim();
}

export function inferGlazing(line: string, explicit?: string | null): GlazingType {
  const haystack = `${explicit ?? ""} ${line}`.toLowerCase();
  if (haystack.includes("dvh") || haystack.includes("termopanel")) return "dvh";
  return "monolitico";
}

export function defaultGlassCode(glazing: GlazingType): string {
  return glazing === "dvh" ? "TE4104" : "CTI5";
}

export function buildRecipeId(input: {
  manufacturer: string;
  system: string;
  variant: string;
  leaves: number;
  widthMm: number;
  heightMm: number;
}): string {
  return [
    slugPart(input.variant),
    `${input.leaves}h`,
    `${input.widthMm}x${input.heightMm}`,
  ].join("_");
}

export function recipeIdFromFileName(filePath: string): string {
  return basename(filePath, ".json");
}

function normalizeSource(value: unknown): "sistema_zeta" {
  const text = asString(value)?.toLowerCase() ?? "";
  if (text === "sistema_zeta" || text === "sistema zeta") return "sistema_zeta";
  return "sistema_zeta";
}

function normalizeEvidenceType(value: unknown): "plan_de_armado" {
  const text = asString(value)?.toLowerCase() ?? "";
  if (text === "plan_de_armado") return "plan_de_armado";
  return "plan_de_armado";
}

function normalizeProfiles(value: unknown): ProfileCut[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = isRecord(item) ? item : {};
    return {
      code: asString(pick(record, ["code"])) ?? "",
      name: asString(pick(record, ["name"])) ?? "",
      position: asString(pick(record, ["position"])) ?? null,
      quantity: asNumber(pick(record, ["quantity"])) ?? 0,
      lengthMm: asNumber(pick(record, ["lengthMm", "length_mm"])) ?? 0,
      cut1Deg: asNumber(pick(record, ["cut1Deg", "cut_1_deg"])),
      cut2Deg: asNumber(pick(record, ["cut2Deg", "cut_2_deg"])),
    };
  });
}

function normalizeGlass(value: unknown): GlassPiece[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = isRecord(item) ? item : {};
    return {
      code: asString(pick(record, ["code"])) ?? "",
      name: asString(pick(record, ["name"])) ?? "",
      quantity: asNumber(pick(record, ["quantity"])) ?? 0,
      widthMm: asNumber(pick(record, ["widthMm", "width_mm"])) ?? 0,
      heightMm: asNumber(pick(record, ["heightMm", "height_mm"])) ?? 0,
    };
  });
}

function normalizeHardware(value: unknown): HardwareItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = isRecord(item) ? item : {};
    return {
      code: asString(pick(record, ["code"])) ?? "",
      name: asString(pick(record, ["name"])) ?? "",
      quantity: asNumber(pick(record, ["quantity"])) ?? 0,
      unit: asString(pick(record, ["unit"])) ?? "PZA",
    };
  });
}

function normalizeEvidence(
  record: Record<string, unknown>,
  filePath?: string,
): SourceEvidence {
  const nested = pick<unknown>(record, ["sourceEvidence", "source_evidence"]);
  const nestedRecord = isRecord(nested) ? nested : {};
  const planId =
    asString(pick(nestedRecord, ["planId", "plan_id"])) ??
    asString(pick(record, ["plan"])) ??
    null;
  const rawPath =
    asString(pick(nestedRecord, ["rawPath", "raw_path"])) ??
    (filePath
      ? `docs/fabricacion/zeta/raw/${slugPart(asString(record.manufacturer) ?? "sodal")}/${slugPart(asString(record.system) ?? "l25")}/SOURCE_MANIFEST.md`
      : null);

  return {
    projectId: asString(pick(nestedRecord, ["projectId", "project_id"])) ?? null,
    planId,
    screenshotPaths: Array.isArray(nestedRecord.screenshotPaths)
      ? nestedRecord.screenshotPaths.filter((item): item is string => typeof item === "string")
      : [],
    rawPath,
    sourceDocument:
      asString(pick(nestedRecord, ["sourceDocument", "source_document"])) ??
      repoRelative(SOURCE_DOC_PATH),
  };
}

export function normalizeRecipe(raw: unknown, filePath?: string): ConfirmedRecipe {
  if (!isRecord(raw)) {
    throw new Error("La receta no es un objeto JSON.");
  }

  const line =
    asString(pick(raw, ["line", "zeta_line"])) ??
    asString(pick(raw, ["variant"])) ??
    "";
  const variant = asString(pick(raw, ["variant"])) ?? variantFromLine(line);
  const manufacturer = asString(pick(raw, ["manufacturer"])) ?? "";
  const system = asString(pick(raw, ["system"])) ?? "";
  const leaves = asNumber(pick(raw, ["leaves"])) ?? 0;
  const dimensionsRecord = isRecord(raw.testDimensions)
    ? raw.testDimensions
    : isRecord(raw.test_dimensions)
      ? raw.test_dimensions
      : {};
  const widthMm =
    asNumber(pick(dimensionsRecord, ["widthMm", "width_mm"])) ?? 0;
  const heightMm =
    asNumber(pick(dimensionsRecord, ["heightMm", "height_mm"])) ?? 0;
  const id =
    asString(pick(raw, ["id"])) ??
    (filePath ? recipeIdFromFileName(filePath) : null) ??
    buildRecipeId({ manufacturer, system, variant, leaves, widthMm, heightMm });

  const recipe: ConfirmedRecipe = {
    id,
    manufacturer,
    system,
    line,
    variant,
    glazing: inferGlazing(line, asString(pick(raw, ["glazing"]))),
    leaves,
    topology: asString(pick(raw, ["topology"])) ?? null,
    source: normalizeSource(pick(raw, ["source"])),
    evidenceType: normalizeEvidenceType(pick(raw, ["evidenceType", "evidence"])),
    status: "confirmed",
    extractedAt: asString(pick(raw, ["extractedAt", "extracted_at"])) ?? LEGACY_SOURCE_DATE,
    testDimensions: { widthMm, heightMm },
    profiles: normalizeProfiles(raw.profiles),
    glass: normalizeGlass(raw.glass),
    hardware: normalizeHardware(raw.hardware),
    sourceEvidence: normalizeEvidence(raw, filePath),
  };

  return confirmedRecipeSchema.parse(recipe);
}

export function identityKey(input: {
  manufacturer: string;
  system: string;
  line: string;
  leaves: number;
  widthMm: number;
  heightMm: number;
}): string {
  return [
    slugPart(input.manufacturer),
    slugPart(input.system),
    slugPart(input.line),
    `${input.leaves}h`,
    `${input.widthMm}x${input.heightMm}`,
  ].join(":");
}
