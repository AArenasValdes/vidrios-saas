import type { AdminTaskOrigin } from "@/features/admin/types/admin-tareas";

export const ORIGIN_LABELS: Record<AdminTaskOrigin, string> = {
  prospectos: "Prospecto Ventora",
  clientes: "Clientes",
  pagos: "Pagos y planes",
  activacion: "Activación",
  manual: "Manual",
  solicitud_publica: "Solicitud pública",
};
