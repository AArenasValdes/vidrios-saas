export type EstadoCotizacionWorkflow =
  | "borrador"
  | "creada"
  | "enviada"
  | "aprobada"
  | "rechazada"
  | "terminada";

export type CotizacionWorkflowItem = {
  id: string;
  codigo: string;
  tipo: string;
  vidrio: string;
  nombre: string;
  descripcion: string;
  ancho: number | null;
  alto: number | null;
  cantidad: number;
  unidad: string;
  areaM2: number | null;
  costoProveedorUnitario: number;
  costoProveedorTotal: number;
  margenPct: number;
  precioUnitario: number;
  precioTotal: number;
  observaciones: string;
};

export type CotizacionWorkflowRecord = {
  id: string;
  codigo: string;
  clientId?: string | number | null;
  projectId?: string | number | null;
  clienteNombre: string;
  clienteTelefono: string;
  obra: string;
  direccion: string;
  validez: string;
  descuentoPct: number;
  observaciones: string;
  estado: EstadoCotizacionWorkflow;
  approvalToken: string | null;
  approvalTokenExpiresAt: string | null;
  clienteVioEn: string | null;
  clienteRespondioEn: string | null;
  clienteRespuestaCanal: string | null;
  createdAt: string;
  updatedAt: string;
  items: CotizacionWorkflowItem[];
  subtotal: number;
  descuentoValor: number;
  neto: number;
  iva: number;
  flete: number;
  total: number;
};

export type CotizacionWorkflowDraft = {
  clienteNombre: string;
  clienteTelefono: string;
  obra: string;
  direccion: string;
  validez: string;
  descuentoPct: number;
  flete: number;
  observaciones: string;
  items: CotizacionWorkflowItem[];
};
