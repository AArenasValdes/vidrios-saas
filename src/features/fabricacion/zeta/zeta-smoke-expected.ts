import type { ConfirmedRecipe } from "@/features/fabricacion/zeta/zeta-types";

/** Expected precomputado desde evidencia Zeta — no usa el motor de Ventora. */
export type ZetaSmokeExpected = {
  recipeId: string;
  leaves: number;
  modulos: number;
  widthMm: number;
  heightMm: number;
  profiles: Array<{
    order: number;
    code: string;
    name: string;
    functionHint: string;
    quantity: number;
    lengthMm: number;
    unit: "mm";
  }>;
  glass: Array<{
    order: number;
    code: string;
    name: string;
    quantity: number;
    widthMm: number;
    heightMm: number;
  }>;
  hardware: Array<{
    order: number;
    code: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
};

function inferProfileFunction(name: string, code: string): string {
  const haystack = `${name} ${code}`.toLowerCase();
  if (haystack.includes("riel superior")) return "Riel superior";
  if (haystack.includes("riel inferior")) return "Riel inferior";
  if (haystack.includes("jamba")) return "Jamba";
  if (haystack.includes("cabezal")) return "Cabezal de hoja";
  if (haystack.includes("zócalo") || haystack.includes("zocalo")) return "Zócalo de hoja";
  if (haystack.includes("pierna")) return "Pierna de hoja";
  if (haystack.includes("traslapo") || haystack.includes("tráslapo")) return "Traslapo de hoja";
  return name.trim() || code;
}

export function buildZetaSmokeExpectedFromConfirmed(
  confirmed: ConfirmedRecipe
): ZetaSmokeExpected {
  return {
    recipeId: confirmed.id,
    leaves: confirmed.leaves,
    modulos: 1,
    widthMm: confirmed.testDimensions.widthMm,
    heightMm: confirmed.testDimensions.heightMm,
    profiles: confirmed.profiles.map((profile, order) => ({
      order,
      code: profile.code,
      name: profile.name,
      functionHint: inferProfileFunction(profile.name, profile.code),
      quantity: profile.quantity,
      lengthMm: profile.lengthMm,
      unit: "mm" as const,
    })),
    glass: confirmed.glass.map((piece, order) => ({
      order,
      code: piece.code,
      name: piece.name,
      quantity: piece.quantity,
      widthMm: piece.widthMm,
      heightMm: piece.heightMm,
    })),
    hardware: confirmed.hardware.map((item, order) => ({
      order,
      code: item.code,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    })),
  };
}
