import type { EntityId } from "./common";
import type { CotizacionItem, CrearCotizacionItemInput } from "./cotizacion-item";

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
  estadoComercial: string | null;
  approvalToken: string | null;
  approvalTokenExpiresAt: string | null;
  clienteVioEn: string | null;
  clienteRespondioEn: string | null;
  clienteRespuestaCanal: string | null;
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
  estadoComercial?: string | null;
  approvalToken?: string | null;
  approvalTokenExpiresAt?: string | null;
  clienteVioEn?: string | null;
  clienteRespondioEn?: string | null;
  clienteRespuestaCanal?: string | null;
  items: CrearCotizacionItemInput[];
  total: number;
};
