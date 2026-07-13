type CalculateLineTemplatePricingInput = {
  ancho: number | null | undefined;
  alto: number | null | undefined;
  cantidad: number | null | undefined;
  precioM2Sugerido: number | null | undefined;
  minimoCobrable: number | null | undefined;
  redondeoPrecio: number | null | undefined;
};

export type CotizacionLinePricingSummary = {
  areaM2: number | null;
  areaTotalM2: number | null;
  precioBaseUnitario: number | null;
  precioM2Sugerido: number | null;
  minimoCobrable: number | null;
  minimoAplicado: number | null;
  redondeoPrecio: number | null;
  redondeoAplicado: number | null;
  precioUnitarioSugerido: number | null;
  cantidad: number | null;
  totalSugerido: number | null;
  motivoNoCalculado: string | null;
};

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function normalizePositiveNumber(value: number | null | undefined) {
  if (!Number.isFinite(value) || Number(value) <= 0) {
    return null;
  }

  return Number(value);
}

export function roundToPriceIncrement(value: number, increment: number | null | undefined) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const safeIncrement =
    Number.isFinite(increment) && Number(increment) > 0 ? Number(increment) : 0;

  if (safeIncrement <= 0) {
    return Math.round(value);
  }

  return Math.ceil(value / safeIncrement) * safeIncrement;
}

export function calculateLineTemplatePricing(
  input: CalculateLineTemplatePricingInput
): CotizacionLinePricingSummary {
  const ancho = normalizePositiveNumber(input.ancho);
  const alto = normalizePositiveNumber(input.alto);
  const cantidad = normalizePositiveNumber(input.cantidad) ?? 1;
  const precioM2Sugerido = normalizePositiveNumber(input.precioM2Sugerido);
  const minimoCobrable =
    Number.isFinite(input.minimoCobrable) && Number(input.minimoCobrable) > 0
      ? Number(input.minimoCobrable)
      : 0;
  const redondeoPrecio =
    Number.isFinite(input.redondeoPrecio) && Number(input.redondeoPrecio) >= 0
      ? Number(input.redondeoPrecio)
      : null;

  const hasDimensions = Boolean(ancho && alto);
  const rawAreaM2 = hasDimensions ? (ancho! * alto!) / 1_000_000 : null;
  const areaM2Internal = rawAreaM2 !== null ? round(rawAreaM2, 4) : null;
  const areaM2 = areaM2Internal !== null ? round(areaM2Internal, 2) : null;
  const areaTotalM2Internal =
    areaM2Internal !== null ? round(areaM2Internal * cantidad, 4) : null;
  const areaTotalM2 =
    areaTotalM2Internal !== null ? round(areaTotalM2Internal, 2) : null;

  if (!hasDimensions || !precioM2Sugerido) {
    let motivoNoCalculado = "Completa ancho, alto y una línea válida.";

    if (!hasDimensions) {
      motivoNoCalculado = "Completa ancho y alto para calcular.";
    } else if (!precioM2Sugerido) {
      motivoNoCalculado = "La línea no tiene un precio por m² válido.";
    }

    return {
      areaM2,
      areaTotalM2,
      precioBaseUnitario: null,
      precioM2Sugerido,
      minimoCobrable: minimoCobrable > 0 ? minimoCobrable : null,
      minimoAplicado: null,
      redondeoPrecio,
      redondeoAplicado: null,
      precioUnitarioSugerido: null,
      cantidad,
      totalSugerido: null,
      motivoNoCalculado,
    };
  }

  const precioBaseUnitario = round(areaM2Internal! * precioM2Sugerido, 2);
  const precioConMinimo = Math.max(precioBaseUnitario, minimoCobrable);
  const minimoAplicado = minimoCobrable > precioBaseUnitario ? minimoCobrable : null;
  const precioUnitarioSugerido = roundToPriceIncrement(
    precioConMinimo,
    input.redondeoPrecio
  );
  const redondeoAplicado =
    precioUnitarioSugerido > precioConMinimo ? precioUnitarioSugerido - precioConMinimo : 0;
  const totalSugerido = round(precioUnitarioSugerido * cantidad, 2);

  return {
    areaM2,
    areaTotalM2,
    precioBaseUnitario: round(precioBaseUnitario, 0),
    precioM2Sugerido,
    minimoCobrable: minimoCobrable > 0 ? minimoCobrable : null,
    minimoAplicado,
    redondeoPrecio,
    redondeoAplicado,
    precioUnitarioSugerido,
    cantidad,
    totalSugerido,
    motivoNoCalculado: null,
  };
}
