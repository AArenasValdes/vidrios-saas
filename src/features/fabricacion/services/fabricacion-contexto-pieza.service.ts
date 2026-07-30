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

  if (source.includes("puerta") && source.includes("corredera")) {
    return "puerta_corredera";
  }
  if (source.includes("puerta") && source.includes("abatible")) {
    return "puerta_abatible";
  }
  if (source.includes("corredera")) return "corredera";
  if (source.includes("proyectante")) return "proyectante";
  if (source.includes("abatible")) return "abatible";
  if (source.includes("shower")) return "shower";
  if (
    source.includes("fijo") ||
    source.includes("pano fijo") ||
    source.includes("paño fijo")
  ) {
    return "pano_fijo";
  }
  return null;
}
