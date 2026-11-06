import type { FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";

export function inferirTipologiaFabricacionPieza(input: {
  tipo?: string | null;
  sistema?: string | null;
  configuracion?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
}): FabricacionTipologia | null {
  const source = [
    input.tipo,
    input.sistema,
    input.configuracion,
    input.nombre,
    input.descripcion,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Shower puede aparecer como "Puerta · Shower corredera"; su tipología
  // específica debe prevalecer sobre la clasificación genérica de puerta/corredera.
  if (source.includes("shower")) return "shower";

  // Una puerta plegable comparte la categoría comercial "Puerta", pero su
  // receta se identifica como puerta abatible con apertura plegable.
  if (source.includes("puerta") && source.includes("plegable")) {
    return "puerta_abatible";
  }
  if (source.includes("puerta") && source.includes("corredera")) {
    return "puerta_corredera";
  }
  if (source.includes("puerta") && source.includes("abatible")) {
    return "puerta_abatible";
  }
  if (source.includes("corredera")) return "corredera";
  if (source.includes("proyectante")) return "proyectante";
  if (source.includes("abatible")) return "abatible";
  if (
    source.includes("fijo") ||
    source.includes("pano fijo") ||
    source.includes("paño fijo")
  ) {
    return "pano_fijo";
  }
  return null;
}

/**
 * Detecta un conflicto explícito conocido sin intentar convertir una tipología
 * comercial desconocida en otra receta. Pivotante no es equivalente a corredera.
 */
export function hasPivotanteSlidingRecipeConflict(input: {
  commercialType?: string | null;
  commercialSystem?: string | null;
  commercialConfiguration?: string | null;
  commercialName?: string | null;
  technicalTypology?: string | null;
  technicalOpening?: string | null;
}): boolean {
  const commercial = [input.commercialType, input.commercialSystem, input.commercialConfiguration, input.commercialName]
    .filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
  const technical = [input.technicalTypology, input.technicalOpening]
    .filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
  return commercial.includes("pivotante") && /corredera/.test(technical);
}
