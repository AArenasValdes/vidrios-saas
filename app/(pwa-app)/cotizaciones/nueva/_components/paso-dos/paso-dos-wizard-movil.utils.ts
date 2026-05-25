import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  normalizeBrokenText,
  repairBrokenText as repairBrokenTextShared,
} from "@/utils/repair-broken-text";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";

const VIDRIO_SEARCH_ALIASES: Record<string, string> = {
  inc: "incoloro",
  dvh: "dvh",
  termo: "termopanel",
  temp: "templado",
  lam: "laminado",
  ref: "reflectivo",
  esm: "esmerilado",
  sat: "satinado",
  cat: "catedral",
  acan: "acanalado",
  pac: "pacifico",
};

const BROKEN_TEXT_REPLACEMENTS: Array<[string, string]> = [
  ["ÃƒÆ’Ã‚Â¡", "á"],
  ["ÃƒÆ’Ã‚Â©", "é"],
  ["ÃƒÆ’Ã‚Â­", "í"],
  ["ÃƒÆ’Ã‚Â³", "ó"],
  ["ÃƒÆ’Ã‚Âº", "ú"],
  ["ÃƒÆ’Ã‚Â±", "ñ"],
  ["ÃƒÆ’Ã‚Â", "Á"],
  ["ÃƒÆ’Ã¢â‚¬Â°", "É"],
  ["ÃƒÆ’Ã‚Â", "Í"],
  ["ÃƒÆ’Ã¢â‚¬Å“", "Ó"],
  ["ÃƒÆ’Ã…Â¡", "Ú"],
  ["ÃƒÆ’Ã¢â‚¬Ëœ", "Ñ"],
  ["Ãƒâ€šÃ‚Â¿", "¿"],
  ["Ãƒâ€šÃ‚Â¡", "¡"],
  ["ÃƒÆ’Ã¢â‚¬â€", "×"],
  ["ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦", "..."],
  ["ÃƒÂ¢Ã…Â¡Ã‚Â ", "⚠"],
  ["ÃƒÂ¢Ã‹Å“Ã¢â‚¬Â¦", "★"],
  ["Ã‚Â·", "·"],
];

function normalizeGlassLabel(value: string) {
  return normalizeBrokenText(value);
}

function getGlassCategoryRank(option: string) {
  const normalized = normalizeGlassLabel(option);

  if (normalized.includes("incoloro monolit")) return 0;
  if (normalized.includes("dvh") || normalized.includes("termopanel")) return 1;
  if (normalized.includes("laminado")) return 2;
  if (normalized.includes("templado")) return 3;
  if (normalized.includes("reflectivo")) return 4;

  return 5;
}

function getGlassNumericRank(option: string) {
  const normalized = normalizeGlassLabel(option);
  const mmMatch = normalized.match(/(\d+)\s*mm/);

  if (mmMatch) {
    return Number.parseInt(mmMatch[1] ?? "999", 10);
  }

  const laminatedMatch = normalized.match(/(\d+)\+(\d+)/);

  if (laminatedMatch) {
    return Number.parseInt(laminatedMatch[1] ?? "999", 10);
  }

  return 999;
}

export function repairBrokenText(value: string) {
  return repairBrokenTextShared(
    BROKEN_TEXT_REPLACEMENTS.reduce(
      (current, [broken, fixed]) => current.replaceAll(broken, fixed),
      value
    )
  );
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getSubtypeBadge(subtipo: string) {
  const normalized = subtipo.toLowerCase();

  if (normalized.includes("ventana")) return "V";
  if (normalized.includes("puerta")) return "P";
  if (normalized.includes("shower")) return "S";
  if (normalized.includes("fijo")) return "F";
  if (normalized.includes("cierre")) return "C";
  if (normalized.includes("baranda")) return "B";
  if (normalized.includes("espejo")) return "E";
  if (normalized.includes("mesa")) return "M";

  return "G";
}

export function getColorByMaterial(material: PasoDosGrupoDraft["material"]) {
  return material === "PVC" ? "#f0eeeb" : "#8f99a8";
}

export function isPositiveNumber(value: string) {
  return Number(value) > 0;
}

export function isItemIncomplete(item: CotizacionWorkflowItem) {
  return !item.precioTotal || item.precioTotal === 0 || !item.ancho || !item.alto;
}

export function filterVidrios(query: string, options: readonly string[]) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const alias = Object.entries(VIDRIO_SEARCH_ALIASES).find(([key]) =>
    normalizedQuery.startsWith(key)
  );
  const searchTerm = alias ? alias[1] : normalizedQuery;

  return options.filter((option) => normalizeGlassLabel(option).includes(searchTerm));
}

export function sortGlassOptions(options: readonly string[]) {
  return [...options].sort((left, right) => {
    const categoryDelta = getGlassCategoryRank(left) - getGlassCategoryRank(right);

    if (categoryDelta !== 0) {
      return categoryDelta;
    }

    const numericDelta = getGlassNumericRank(left) - getGlassNumericRank(right);

    if (numericDelta !== 0) {
      return numericDelta;
    }

    return repairBrokenText(left).localeCompare(repairBrokenText(right), "es", {
      sensitivity: "base",
      numeric: true,
    });
  });
}

export function getStageTitle(stage: number) {
  if (stage === 1) return "Que vas a agregar?";
  if (stage === 2) return "Cuantas unidades?";
  return "Datos del grupo";
}

export function getVisibleSubtypeLabel(subtipo: string) {
  const cleanSubtype = repairBrokenText(subtipo).trim();

  if (cleanSubtype.toLowerCase() === "ventana 1 hoja") {
    return "Fijo";
  }

  return cleanSubtype;
}

export function getSubtypeGroupLabel(cantidad: number, subtipo: string) {
  const cleanSubtype = getVisibleSubtypeLabel(subtipo);

  if (cantidad === 1) {
    return cleanSubtype;
  }

  if (cleanSubtype.toLowerCase().endsWith("s")) {
    return cleanSubtype;
  }

  return `${cleanSubtype}s`;
}

export function getGroupStatusTitle(cantidad: number, subtipo: string, sistema: string) {
  const typeLabel = getSubtypeGroupLabel(cantidad, subtipo);
  const systemLabel = repairBrokenText(sistema).trim();

  return systemLabel ? `${cantidad} ${typeLabel} - ${systemLabel}` : `${cantidad} ${typeLabel}`;
}

export function getItemType(item: CotizacionWorkflowItem) {
  return getVisibleSubtypeLabel(item.tipo || "Componente");
}
