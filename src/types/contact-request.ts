export type ContactRequestStatus = "nueva" | "revisada";

export type ContactRequest = {
  id: string;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  ayuda: string;
  status: ContactRequestStatus;
  origen: string;
  ip: string | null;
  userAgent: string | null;
  creadoEn: string;
  actualizadoEn: string;
};

export type CreateContactRequestInput = {
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  ayuda: string;
  origen?: string;
  ip?: string | null;
  userAgent?: string | null;
};
