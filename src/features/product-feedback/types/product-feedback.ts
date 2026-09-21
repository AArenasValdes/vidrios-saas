export const PRODUCT_FEEDBACK_CATEGORIES = [
  { value: "cotizaciones", label: "Cotizaciones" },
  { value: "catalogo_precios", label: "Catálogo y precios" },
  { value: "clientes_solicitudes", label: "Clientes y solicitudes" },
  { value: "fabricacion", label: "Fabricación" },
  { value: "pagina_venta", label: "Página de venta" },
  { value: "aplicacion_movil", label: "Aplicación móvil" },
  { value: "otro", label: "Otro tema" },
] as const;

export type ProductFeedbackCategory =
  (typeof PRODUCT_FEEDBACK_CATEGORIES)[number]["value"];

export const PRODUCT_FEEDBACK_STATUSES = [
  { value: "new", label: "Nueva" },
  { value: "triage", label: "En revisión" },
  { value: "planned", label: "Planificada" },
  { value: "in_progress", label: "En desarrollo" },
  { value: "done", label: "Implementada" },
  { value: "not_planned", label: "No priorizada" },
] as const;

export type ProductFeedbackStatus =
  (typeof PRODUCT_FEEDBACK_STATUSES)[number]["value"];

export type ProductFeedbackSubmission = {
  category: ProductFeedbackCategory;
  description: string | null;
  pagePath: string | null;
};

export type ProductFeedbackSummaryItem = {
  category: ProductFeedbackCategory;
  label: string;
  mentions: number;
  workshops: number;
};

export type ProductFeedbackRecord = {
  id: string;
  organizationName: string;
  category: ProductFeedbackCategory;
  description: string | null;
  pagePath: string | null;
  status: ProductFeedbackStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductFeedbackWorkspace = {
  summary: ProductFeedbackSummaryItem[];
  suggestions: ProductFeedbackRecord[];
};

export function isProductFeedbackCategory(
  value: unknown
): value is ProductFeedbackCategory {
  return PRODUCT_FEEDBACK_CATEGORIES.some((category) => category.value === value);
}

export function isProductFeedbackStatus(
  value: unknown
): value is ProductFeedbackStatus {
  return PRODUCT_FEEDBACK_STATUSES.some((status) => status.value === value);
}
