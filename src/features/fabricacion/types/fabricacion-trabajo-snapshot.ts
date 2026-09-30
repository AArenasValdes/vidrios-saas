import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";

export const FABRICACION_TRABAJO_SNAPSHOT_VERSION = 1 as const;

export type FabricacionTrabajoItemInput = {
  id: string;
  codigo: string;
  nombre: string;
  lineaComercial: string;
  colorHex?: string | null;
  catalogLineKey?: string | null;
  snapshot: FabricacionCotizacionSnapshot | null;
};
export type FabricacionTrabajoCorte = {
  itemId: string;
  codigoItem: string;
  nombreItem: string;
  componenteId: string;
  codigoPerfil: string;
  funcion: string;
  corte: string | null;
  largoMm: number;
};

export type FabricacionTrabajoBarra = {
  materialKey: string;
  presentationKey: string;
  codigoPerfil: string;
  nombrePerfil: string;
  acabadoKey: string;
  lineaIds: Array<number | null>;
  largoComercialMm: number;
  indice: number;
  despunteInicialMm: number;
  perdidaCorteMm: number;
  usadoMm: number;
  sobranteMm: number;
  cortes: FabricacionTrabajoCorte[];
};

/** Congela los cortes ya calculados y la distribución conjunta para una cotización. */
export type FabricacionTrabajoSnapshot = {
  schemaVersion: typeof FABRICACION_TRABAJO_SNAPSHOT_VERSION;
  tipo: "fabricacion_trabajo_snapshot";
  packing: "first_fit_decreasing_sugerido";
  capturedAt: string;
  itemCountWithPauta: number;
  totalBars: number;
  totalProfilesLinealMm: number;
  totalWasteMm: number;
  /** Punto futuro de resolución técnica → presentación por acabado/largo; aún no incluye SKUs. */
  sourcePresentations: Array<{
    technicalInputKey: string;
    presentationKey: string;
    lineTemplateId: number | null;
    catalogLineKey: string | null;
    finishKey: string;
    commercialLengthMm: number;
  }>;
  bars: FabricacionTrabajoBarra[];
};
