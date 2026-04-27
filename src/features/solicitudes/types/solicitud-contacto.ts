export type AyudaSolicitudContacto = "demo" | "cotizacion" | "ventas";

export type EstadoSolicitudContacto =
  | "nueva"
  | "contactada"
  | "cerrada"
  | "descartada";

export type SolicitudContacto = {
  id: string;
  nombre: string;
  empresa: string;
  correo: string;
  telefono: string;
  ayuda: AyudaSolicitudContacto;
  estado: EstadoSolicitudContacto;
  origen: string;
  ip: string | null;
  userAgent: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
};

export type CrearSolicitudContactoInput = {
  nombre: string;
  empresa: string;
  correo: string;
  telefono: string;
  ayuda: AyudaSolicitudContacto;
  origen?: string;
  ip?: string | null;
  userAgent?: string | null;
};
