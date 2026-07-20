const CLOSED_SEND_STATES = new Set([
  "enviada",
  "aprobada",
  "rechazada",
  "terminada",
]);

/** Cotizaciones aún no enviadas ni cerradas (cola Por enviar). */
export function isCotizacionPendingSend(estado: string): boolean {
  return !CLOSED_SEND_STATES.has(estado.trim().toLowerCase());
}

export type DashboardPendingSendAction = "pdf" | "whatsapp";

export function resolvePendingSendAction(input: {
  pdfDescargadoEn?: string | null;
}): DashboardPendingSendAction {
  return input.pdfDescargadoEn ? "whatsapp" : "pdf";
}
