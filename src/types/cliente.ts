import type { EntityId } from "./common";

export type Cliente = {
  id: EntityId;
  organizationId: EntityId;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  correo: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
  eliminadoEn: string | null;
};

export type EstadoClienteResumen =
  | "activo"
  | "seguimiento"
  | "prospecto"
  | "inactivo";

export type CrearClienteInput = {
  organizationId: EntityId;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  correo?: string | null;
};

export type ActualizarClienteInput = Partial<CrearClienteInput>;

export type ClienteResumen = {
  id: EntityId;
  nombre: string;
  telefono: string | null;
  direccion: string;
  referencia: string;
  obras: number;
  ultimaGestion: string;
  ultimaGestionAt: string | null;
  estado: EstadoClienteResumen;
};

export type ClienteProyectoResumen = {
  id: EntityId;
  titulo: string;
  estado: string | null;
  cotizaciones: number;
  ultimaActividadAt: string | null;
};

export type ClienteCotizacionResumen = {
  id: EntityId;
  codigo: string;
  proyectoId: EntityId | null;
  obra: string;
  estado: string;
  total: number;
  updatedAt: string | null;
};

export type ClienteDetalle = {
  cliente: Cliente;
  resumen: ClienteResumen;
  proyectos: ClienteProyectoResumen[];
  cotizaciones: ClienteCotizacionResumen[];
};
