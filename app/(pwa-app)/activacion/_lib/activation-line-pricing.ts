export type LineRoundingMode = "none" | "1000" | "5000";

export function parseActivationMoney(value: string) {
  const parsed = Number(value.replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundActivationAmount(value: number, roundingMode: LineRoundingMode) {
  const roundTo = roundingMode === "none" ? 0 : Number(roundingMode);
  if (!roundTo || !Number.isFinite(value)) return Math.round(value);
  return Math.ceil(value / roundTo) * roundTo;
}

export function formatActivationAreaM2(areaM2: number) {
  return areaM2.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function buildLineSummaryMeta(input: {
  precioM2: number;
  minimo: number;
  redondeo: LineRoundingMode;
}) {
  const parts: string[] = [];

  if (input.minimo > 0) {
    parts.push(`Min. ${input.minimo.toLocaleString("es-CL")}`);
  } else {
    parts.push("Sin minimo");
  }

  if (input.redondeo === "none") {
    parts.push("Sin redondeo");
  } else {
    parts.push(`Redondeo a $${Number(input.redondeo).toLocaleString("es-CL")}`);
  }

  return parts.join(" · ");
}

export function buildLinePricingPreview(input: {
  anchoMm: string;
  altoMm: string;
  cantidad: string;
  precioM2Raw: string;
  minimoRaw: string;
  redondeo: LineRoundingMode;
}) {
  const ancho = Number(input.anchoMm.replace(/\D/g, ""));
  const alto = Number(input.altoMm.replace(/\D/g, ""));
  const cantidad = Number(input.cantidad.replace(/\D/g, ""));
  const precioM2 = parseActivationMoney(input.precioM2Raw);
  const minimo = parseActivationMoney(input.minimoRaw);
  const resolvedCantidad = Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1;
  const areaM2 =
    Number.isFinite(ancho) && ancho > 0 && Number.isFinite(alto) && alto > 0
      ? (ancho / 1000) * (alto / 1000) * resolvedCantidad
      : 0;
  const base = areaM2 * precioM2;
  const minimumApplied = minimo > 0 && base < minimo;
  const beforeRounding = minimumApplied ? minimo : base;
  const total = roundActivationAmount(beforeRounding, input.redondeo);
  const roundingApplied = input.redondeo !== "none" && total !== beforeRounding;

  return {
    areaM2,
    precioM2,
    base,
    beforeRounding,
    total,
    minimumApplied,
    roundingApplied,
  };
}
