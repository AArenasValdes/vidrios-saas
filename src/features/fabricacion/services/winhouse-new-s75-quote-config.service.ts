import {
  WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
  WINHOUSE_NEW_S75_GLASS_BANDS,
  WINHOUSE_NEW_S75_TRIPLE_CATALOG_KEY,
  WINHOUSE_NEW_S75_VARIANTS,
  type WinHouseNewS75GlassBand,
  type WinHouseNewS75Variant,
} from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function resolveWinHouseNewS75GlassBand(
  glass: string | null | undefined
): WinHouseNewS75GlassBand | null {
  const normalized = normalize(glass);
  if (!normalized || normalized.includes("laminado")) return null;

  const composition = normalized.match(/\b(\d{1,2})\s*\+\s*(\d{1,2})\s*\+\s*(\d{1,2})\b/);
  const explicitThickness = normalized.match(/\b(\d{1,2}(?:[.,]\d+)?)\s*mm\b/);
  const total = composition
    ? Number(composition[1]) + Number(composition[2]) + Number(composition[3])
    : explicitThickness
      ? Number(explicitThickness[1].replace(",", "."))
      : null;
  if (total == null) return null;

  if (!normalized.includes("termopanel") && !normalized.includes("dvh") && !composition) {
    return total >= 3.7 && total <= 6 ? "mono_4_6" : null;
  }
  if (total >= 17 && total <= 20) return "dvh_17_20";
  if (total > 20 && total <= 22) return "dvh_20_22";
  return null;
}

export function resolveWinHouseNewS75QuoteVariant(input: {
  catalogKey: string | null | undefined;
  tipologia: string | null | undefined;
  hojas: number | null | undefined;
  vidrio: string | null | undefined;
  variantHint?: string | null;
  configuration?: string | null;
  componentName?: string | null;
  system?: string | null;
}): { handled: boolean; variant: WinHouseNewS75Variant | null } {
  const isDouble = input.catalogKey === WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY;
  const isTriple = input.catalogKey === WINHOUSE_NEW_S75_TRIPLE_CATALOG_KEY;
  if (!isDouble && !isTriple) return { handled: false, variant: null };

  const detailText = normalize(
    [input.configuration, input.componentName, input.system].filter(Boolean).join(" "),
  );
  const explicitVariant = WINHOUSE_NEW_S75_VARIANTS.find(
    (variant) => variant.slug === input.variantHint?.trim(),
  );
  if (explicitVariant) {
    const selectedGlassBand = resolveWinHouseNewS75GlassBand(input.vidrio);
    if (!selectedGlassBand) return { handled: true, variant: null };
    const explicitGeometryStillCompatible =
      explicitVariant.leaves === input.hojas &&
      explicitVariant.railCount === (isTriple ? 3 : 2);
    if (explicitGeometryStillCompatible) {
      return {
        handled: true,
        variant: WINHOUSE_NEW_S75_VARIANTS.find(
          (variant) =>
            variant.geometrySlug === explicitVariant.geometrySlug &&
            variant.glassBand === selectedGlassBand,
        ) ?? null,
      };
    }
  }

  if (normalize(input.tipologia) !== "corredera" || !input.hojas) {
    return { handled: true, variant: null };
  }

  const text = detailText;
  const blade = /(?:\b98\s*mm\b|puerta)/.test(text)
    ? 98
    : /(?:\b80\s*mm\b|ventana)/.test(text)
      ? 80
      : null;
  const glassBand = resolveWinHouseNewS75GlassBand(input.vidrio);
  if (!blade || !glassBand) return { handled: true, variant: null };

  const asymmetric = text.includes("asimetr");
  let geometrySlug: string;
  if (isTriple) {
    if (input.hojas !== 3 || asymmetric) return { handled: true, variant: null };
    geometrySlug = `triple_riel_3h_simetrica_${blade}`;
  } else if (input.hojas === 2) {
    geometrySlug = `doble_riel_2h_${asymmetric ? "asimetrica" : "simetrica"}_${blade}`;
  } else if (input.hojas === 3) {
    geometrySlug = asymmetric
      ? `doble_riel_3h_asimetrica_centro_ancho_${blade}`
      : `doble_riel_3h_simetrica_${blade}`;
  } else if (input.hojas === 4 && !asymmetric) {
    geometrySlug = `doble_riel_4h_${blade}`;
  } else {
    return { handled: true, variant: null };
  }

  const variant = WINHOUSE_NEW_S75_VARIANTS.find(
    (candidate) =>
      candidate.geometrySlug === geometrySlug && candidate.glassBand === glassBand,
  );
  return { handled: true, variant: variant ?? null };
}

export function getWinHouseNewS75GlassBandLabel(band: WinHouseNewS75GlassBand): string {
  return WINHOUSE_NEW_S75_GLASS_BANDS[band].label;
}
