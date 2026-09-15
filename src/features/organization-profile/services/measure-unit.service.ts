import {
  DEFAULT_MEASURE_UNIT,
  type MeasureUnit,
} from "@/features/organization-profile/types/measure-unit";

export function normalizeMeasureUnit(value: unknown): MeasureUnit {
  return value === "cm" ? "cm" : DEFAULT_MEASURE_UNIT;
}

export function measureUnitSuffix(unit: MeasureUnit): MeasureUnit {
  return normalizeMeasureUnit(unit);
}

export function measureDimensionFieldLabel(
  kind: "ancho" | "alto",
  unit: MeasureUnit
): string {
  const name = kind === "ancho" ? "Ancho" : "Alto";
  return `${name} (${measureUnitSuffix(unit)})`;
}

export function measureDimensionPlaceholder(
  kind: "ancho" | "alto",
  unit: MeasureUnit
): string {
  if (normalizeMeasureUnit(unit) === "cm") {
    return kind === "ancho" ? "120" : "150";
  }

  return kind === "ancho" ? "1200" : "1500";
}

export function sanitizeMeasureInput(raw: string): string {
  const next = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const firstDot = next.indexOf(".");

  if (firstDot === -1) {
    return next;
  }

  return `${next.slice(0, firstDot + 1)}${next.slice(firstDot + 1).replace(/\./g, "")}`;
}

export function isCompleteMeasureDraft(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return true;
  }

  return /^\d+(\.\d+)?$/.test(trimmed);
}

export function parseMeasureToMm(raw: string, unit: MeasureUnit): string {
  const sanitized = sanitizeMeasureInput(raw);
  if (!sanitized || sanitized === ".") {
    return "";
  }

  const value = Number(sanitized);
  if (!Number.isFinite(value) || value < 0) {
    return "";
  }

  const mm = normalizeMeasureUnit(unit) === "cm" ? value * 10 : value;
  const rounded = Math.round(mm * 1000) / 1000;
  const asInt = Math.round(mm);

  if (Math.abs(mm - asInt) < 1e-9) {
    return String(asInt);
  }

  return String(rounded);
}

export function formatMeasureFromMm(
  valueMm: string | number | null | undefined,
  unit: MeasureUnit
): string {
  if (valueMm === null || valueMm === undefined || valueMm === "") {
    return "";
  }

  const mm =
    typeof valueMm === "number"
      ? valueMm
      : Number(String(valueMm).replace(",", "."));

  if (!Number.isFinite(mm)) {
    return "";
  }

  if (normalizeMeasureUnit(unit) === "mm") {
    return String(mm).replace(/\.0+$/, "");
  }

  const cm = mm / 10;
  if (Number.isInteger(cm) || Math.abs(cm - Math.round(cm)) < 1e-9) {
    return String(Math.round(cm));
  }

  return String(Math.round(cm * 10) / 10);
}

export function formatMeasurePairFromMm(
  anchoMm: string | number | null | undefined,
  altoMm: string | number | null | undefined,
  unit: MeasureUnit,
  separator = " x "
): string | null {
  if (!anchoMm || !altoMm) {
    return null;
  }

  return `${formatMeasureFromMm(anchoMm, unit)}${separator}${formatMeasureFromMm(altoMm, unit)} ${measureUnitSuffix(unit)}`;
}
