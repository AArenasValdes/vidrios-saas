"use client";

import { useMisPrecios } from "@/features/proveedor-catalogos/hooks/use-mis-precios";
import { MisPreciosContent } from "./mis-precios-content";

export default function MisPreciosPage() {
  return <MisPreciosContent {...useMisPrecios()} />;
}
