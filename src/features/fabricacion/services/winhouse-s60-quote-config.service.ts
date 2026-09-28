import {
  WINHOUSE_S60_CANDIDATE_VARIANTS,
  WINHOUSE_S60_CATALOG_KEY,
  WINHOUSE_S60_VARIANTS,
} from "@/features/fabricacion/fixtures/winhouse-s60-recipes";

type S60Variant = (typeof WINHOUSE_S60_VARIANTS)[keyof typeof WINHOUSE_S60_VARIANTS];

export type WinHouseS60Tipologia = "pano_fijo" | "proyectante" | "abatible";

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Resuelve la tipología desde la pieza de la cotización. La configuración
 * comercial S60 dice "Abatible / doble contacto" incluso cuando se está
 * cotizando un paño fijo, así que no se debe usar ese texto como tipología.
 */
export function resolveWinHouseS60QuoteTypology(input: {
  selectedTypology?: string | null;
  componentType?: string | null;
  componentName?: string | null;
  description?: string | null;
}): WinHouseS60Tipologia | null {
  const componentIdentity = normalize(
    [input.componentType, input.componentName, input.description]
      .filter(Boolean)
      .join(" ")
  );

  if (componentIdentity.includes("pano fijo")) return "pano_fijo";
  if (componentIdentity.includes("proyectante")) return "proyectante";
  if (/\bfijo\b/.test(componentIdentity)) return "pano_fijo";

  const selected = normalize(input.selectedTypology);
  if (selected === "pano_fijo" || selected === "proyectante" || selected === "abatible") {
    return selected;
  }
  if (componentIdentity.includes("abatible")) return "abatible";
  return null;
}

export function resolveWinHouseS60QuoteAperture(variant: string | null) {
  return (
    WINHOUSE_S60_CANDIDATE_VARIANTS.find((candidate) => candidate.slug === variant)
      ?.aperture ?? null
  );
}

function getTermopanelThicknessMm(glass: string): number | null {
  const range = glass.match(/(?:termopanel|dvh|doble\s+vidrio)[^\d]*(17\s*[-–]\s*20|22\s*[-–]\s*24)\s*mm?/i);
  if (range) return range[1].includes("17") ? 20 : 24;

  const composition = glass.match(/\b(\d{1,2})\s*\+\s*(\d{1,2})\s*\+\s*(\d{1,2})\b/);
  if (!composition) return null;
  return Number(composition[1]) + Number(composition[2]) + Number(composition[3]);
}

/** Resuelve la variante S60 desde el vidrio final de cotización y la tipología elegida. */
export function resolveWinHouseS60QuoteVariant(input: {
  catalogKey: string | null | undefined;
  tipologia: string | null | undefined;
  hojas: number | null | undefined;
  vidrio: string | null | undefined;
}): { handled: boolean; variant: S60Variant | null } {
  if (input.catalogKey !== WINHOUSE_S60_CATALOG_KEY) {
    return { handled: false, variant: null };
  }

  const glass = normalize(input.vidrio);
  const typology = normalize(input.tipologia);
  const isFixed = typology.includes("fijo");
  const isProjected = typology.includes("proyectante");
  const isDoubleCasement = typology.includes("abatible") && input.hojas === 2;
  if (!glass || (!isFixed && !isProjected && !isDoubleCasement)) {
    return { handled: true, variant: null };
  }

  const termopanelThickness = getTermopanelThicknessMm(glass);
  if (termopanelThickness != null) {
    const thicknessGroup =
      termopanelThickness >= 17 && termopanelThickness <= 20
        ? "1720"
        : termopanelThickness >= 22 && termopanelThickness <= 24
          ? "2224"
          : null;
    if (!thicknessGroup) return { handled: true, variant: null };

    if (isFixed) {
      return {
        handled: true,
        variant:
          thicknessGroup === "1720"
            ? WINHOUSE_S60_VARIANTS.fijoTermopanel1720
            : WINHOUSE_S60_VARIANTS.fijoTermopanel2224,
      };
    }
    if (isProjected) {
      return {
        handled: true,
        variant:
          thicknessGroup === "1720"
            ? WINHOUSE_S60_VARIANTS.proyectanteTermopanel1720
            : WINHOUSE_S60_VARIANTS.proyectanteTermopanel2224,
      };
    }
    return {
      handled: true,
      variant:
        thicknessGroup === "1720"
          ? WINHOUSE_S60_VARIANTS.abatibleDobleTermopanel1720
          : WINHOUSE_S60_VARIANTS.abatibleDobleTermopanel2224,
    };
  }

  const monoThickness = glass.match(/(?:monolitico|monolithic)[^\d]*(4|5)\s*mm?/i)?.[1];
  if (!monoThickness || glass.includes("laminado") || glass.includes("termopanel") || glass.includes("dvh")) {
    return { handled: true, variant: null };
  }
  if (isFixed) {
    return { handled: true, variant: WINHOUSE_S60_VARIANTS.fijoMonolitico };
  }
  if (isProjected) {
    return { handled: true, variant: WINHOUSE_S60_VARIANTS.proyectanteMonolitico };
  }
  return { handled: true, variant: null };
}
