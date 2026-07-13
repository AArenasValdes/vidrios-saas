import type { EntityId } from "@/types/common";
import type { CotizacionItem, CrearCotizacionItemInput } from "./cotizacion-item";
import type { QuotePricingMode } from "./quote-pricing-mode";

export type EstadoCotizacion =
  | "borrador"
  | "creada"
  | "enviada"
  | "aprobada"
  | "rechazada"
  | "terminada";

export type Cotizacion = {
  id: EntityId;
  proyectoId: EntityId | null;
  organizationId: EntityId;
  numero: string | null;
  estado: EstadoCotizacion | string;
  descuentoPct: number | null;
  flete: number | null;
  iva: number | null;
  notas: string | null;
  validoHasta: string | null;
  subtotalNeto: number | null;
  costoTotal: number | null;
  margenPct: number | null;
  utilidadTotal: number | null;
  costoMaterialesTotal?: number | null;
  costoManoObraTotal?: number | null;
  costoTrasladoTotal?: number | null;
  costoOtrosTotal?: number | null;
  mermaPct?: number | null;
  mermaTotal?: number | null;
  margenObjetivoPct?: number | null;
  precioRecomendadoNeto?: number | null;
  ivaPct?: number | null;
  financialSnapshotVersion?: number | null;
  financialSnapshotCalculadoEn?: string | null;
  costBasisStatus?: "sin_costos" | "estimado" | "manual" | string | null;
  pricingMode: QuotePricingMode;
  estadoComercial: string | null;
  approvalToken: string | null;
  approvalTokenExpiresAt: string | null;
  clienteVioEn: string | null;
  clienteRespondioEn: string | null;
  clienteRespuestaCanal: string | null;
  pdfDescargadoEn: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
  eliminadoEn: string | null;
  items: CotizacionItem[];
  total: number;
};

export type CrearCotizacionInput = {
  proyectoId?: EntityId | null;
  organizationId: EntityId;
  numero?: string | null;
  estado: EstadoCotizacion | string;
  descuentoPct?: number | null;
  flete?: number | null;
  iva?: number | null;
  notas?: string | null;
  validoHasta?: string | null;
  subtotalNeto?: number | null;
  costoTotal?: number | null;
  margenPct?: number | null;
  utilidadTotal?: number | null;
  costoMaterialesTotal?: number | null;
  costoManoObraTotal?: number | null;
  costoTrasladoTotal?: number | null;
  costoOtrosTotal?: number | null;
  mermaPct?: number | null;
  mermaTotal?: number | null;
  margenObjetivoPct?: number | null;
  precioRecomendadoNeto?: number | null;
  ivaPct?: number | null;
  financialSnapshotVersion?: number | null;
  financialSnapshotCalculadoEn?: string | null;
  costBasisStatus?: "sin_costos" | "estimado" | "manual" | string | null;
  pricingMode?: QuotePricingMode;
  estadoComercial?: string | null;
  approvalToken?: string | null;
  approvalTokenExpiresAt?: string | null;
  clienteVioEn?: string | null;
  clienteRespondioEn?: string | null;
  clienteRespuestaCanal?: string | null;
  pdfDescargadoEn?: string | null;
  items: CrearCotizacionItemInput[];
  total: number;
};
