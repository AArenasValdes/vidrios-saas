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
