import type { EntityId } from "./common";

export type Project = {
  id: EntityId;
  titulo: string;
  descripcion: string | null;
  clienteId: EntityId | null;
  organizationId: EntityId;
  creadoEn: string | null;
  estado: string | null;
  actualizadoEn: string | null;
  eliminadoEn: string | null;
};

export type CrearProjectInput = {
  titulo: string;
  descripcion?: string | null;
  clienteId?: EntityId | null;
  organizationId: EntityId;
  estado?: string | null;
};

export type ActualizarProjectInput = Partial<CrearProjectInput>;
