import type { EntityId } from "./common";

export type TipoCotizacionItem = "configurado" | "manual" | "componente";

export type CotizacionItemBreakdown = {
  id: EntityId;
  cotizacionItemId: EntityId;
  organizationId: EntityId | null;
  materialId: EntityId | null;
  descripcion: string | null;
  unidad: string | null;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  precioUnitario: number;
  precioTotal: number;
  origen: string | null;
  creadoEn: string | null;
};

export type CotizacionItem = {
  id: EntityId;
  cotizacionId: EntityId | null;
  organizationId: EntityId;
  codigo: string | null;
  tipoComponente: string | null;
  orden: number | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  ancho: number | null;
  alto: number | null;
  areaM2: number | null;
  linea: string | null;
  color: string | null;
  vidrio: string | null;
  nombre: string | null;
  actualizadoEn: string | null;
  eliminadoEn: string | null;
  descripcion: string | null;
  unidad: string | null;
  observaciones: string | null;
  tipoItem: TipoCotizacionItem | string | null;
  creadoEn: string | null;
  productTypeId: EntityId | null;
  systemLineId: EntityId | null;
  configurationId: EntityId | null;
  costoUnitario: number | null;
  costoTotal: number | null;
  margenPct: number | null;
  utilidad: number | null;
  breakdown: CotizacionItemBreakdown[];
};

export type CrearCotizacionItemBreakdownInput = {
  materialId?: EntityId | null;
  descripcion?: string | null;
  unidad?: string | null;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  precioUnitario: number;
  precioTotal: number;
  origen?: string | null;
};

export type CrearCotizacionItemInput = {
  codigo?: string | null;
  tipoComponente?: string | null;
  orden?: number | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  organizationId: EntityId;
  ancho?: number | null;
  alto?: number | null;
  areaM2?: number | null;
  linea?: string | null;
  color?: string | null;
  vidrio?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  unidad?: string | null;
  observaciones?: string | null;
  tipoItem?: TipoCotizacionItem | string | null;
  productTypeId?: EntityId | null;
  systemLineId?: EntityId | null;
  configurationId?: EntityId | null;
  costoUnitario?: number | null;
  costoTotal?: number | null;
  margenPct?: number | null;
  utilidad?: number | null;
  breakdown?: CrearCotizacionItemBreakdownInput[];
};
