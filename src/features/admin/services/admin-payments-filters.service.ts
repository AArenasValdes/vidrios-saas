import type { AdminPaymentMovement } from "@/features/admin/types/admin-payments";
import type {
  PaymentProvider,
  PaymentStatus,
} from "@/features/subscriptions/types/pago-suscripcion";

export type PaymentStatusFilter = "confirmado" | "pendiente" | "rechazado" | "reembolsado";

export type PaymentAccountFilter =
  | "requires_activation"
  | "trial_active"
  | "trial_expired"
  | "expiring_soon"
  | "subscription_active"
  | "subscription_expired";

export type PaymentMethodFilter = "manual" | "transferencia" | "webpay" | "otro";

export type PaymentPlanFilter =
  | "founder_full_annual"
  | "quote_only_annual"
  | "founder_monthly"
  | "trial";

export type PagosFiltersState = {
  paymentStatuses: PaymentStatusFilter[];
  accountStatuses: PaymentAccountFilter[];
  paymentMethods: PaymentMethodFilter[];
  plans: PaymentPlanFilter[];
  search: string;
};

export const EMPTY_PAGOS_FILTERS: PagosFiltersState = {
  paymentStatuses: [],
  accountStatuses: [],
  paymentMethods: [],
  plans: [],
  search: "",
};

export const PAGOS_FILTER_LABELS = {
  paymentStatus: {
    confirmado: "Confirmado",
    pendiente: "Pendiente de confirmación",
    rechazado: "Rechazado",
    reembolsado: "Reembolsado",
  },
  accountStatus: {
    requires_activation: "Requiere activación",
    trial_active: "Trial activo",
    trial_expired: "Trial vencido",
    expiring_soon: "Por vencer",
    subscription_active: "Suscripción activa",
    subscription_expired: "Suscripción vencida",
  },
  paymentMethod: {
    manual: "Manual",
    transferencia: "Transferencia",
    webpay: "Webpay / Transbank",
    otro: "Otro",
  },
  plan: {
    founder_full_annual: "Founder Full Anual",
    quote_only_annual: "Solo Cotización Anual",
    founder_monthly: "Founder mensual",
    trial: "Prueba gratis",
  },
} as const;

function matchesPaymentStatusFilter(status: PaymentStatus, filter: PaymentStatusFilter) {
  if (filter === "confirmado") return status === "aprobado";
  if (filter === "pendiente") return status === "pendiente";
  if (filter === "rechazado") return status === "fallido" || status === "cancelado";
  if (filter === "reembolsado") return status === "reembolsado";
  return false;
}

function matchesAccountFilter(movement: AdminPaymentMovement, filter: PaymentAccountFilter) {
  const status = movement.accountStatus;

  if (filter === "requires_activation") {
    return movement.paymentStatus === "aprobado" && status !== "active";
  }
  if (filter === "trial_active") {
    return status === "trial_active" || status === "trial_expiring";
  }
  if (filter === "trial_expired") {
    return status === "trial_expired";
  }
  if (filter === "expiring_soon") {
    return status === "trial_expiring";
  }
  if (filter === "subscription_active") {
    return status === "active";
  }
  if (filter === "subscription_expired") {
    return status === "past_due" || status === "cancelled";
  }

  return false;
}

function matchesMethodFilter(provider: PaymentProvider, filter: PaymentMethodFilter) {
  if (filter === "transferencia") return provider === "manual_transfer";
  if (filter === "webpay") return provider === "webpay_plus";
  if (filter === "manual") return provider === "manual_transfer";
  if (filter === "otro") return provider === "flow";
  return false;
}

function matchesPlanFilter(movement: AdminPaymentMovement, filter: PaymentPlanFilter) {
  const code = movement.planCode ?? "";
  if (filter === "founder_full_annual") {
    return code === "founder_full" && movement.planLabel.toLowerCase().includes("founder");
  }
  if (filter === "quote_only_annual") return code === "quote_only";
  if (filter === "founder_monthly") return code === "founder_full" && movement.planLabel.toLowerCase().includes("mensual");
  if (filter === "trial") return code === "trial";
  return false;
}

export function matchesPagosFilters(movement: AdminPaymentMovement, filters: PagosFiltersState) {
  if (filters.paymentStatuses.length > 0) {
    const match = filters.paymentStatuses.some((item) =>
      matchesPaymentStatusFilter(movement.paymentStatus, item)
    );
    if (!match) return false;
  }

  if (filters.accountStatuses.length > 0) {
    const match = filters.accountStatuses.some((item) => matchesAccountFilter(movement, item));
    if (!match) return false;
  }

  if (filters.paymentMethods.length > 0) {
    const match = filters.paymentMethods.some((item) =>
      matchesMethodFilter(movement.paymentProvider, item)
    );
    if (!match) return false;
  }

  if (filters.plans.length > 0) {
    const match = filters.plans.some((item) => matchesPlanFilter(movement, item));
    if (!match) return false;
  }

  return true;
}

export function matchesPagosSearch(movement: AdminPaymentMovement, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    String(movement.organizationId),
    String(movement.id),
    movement.empresaNombre,
    movement.correo ?? "",
    movement.reference ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function filterPagosMovements(movements: AdminPaymentMovement[], filters: PagosFiltersState) {
  return movements.filter(
    (movement) => matchesPagosFilters(movement, filters) && matchesPagosSearch(movement, filters.search)
  );
}

export type PagosFilterChip = {
  id: string;
  group: keyof PagosFiltersState;
  value: string;
  label: string;
};

export function buildPagosFilterChips(filters: PagosFiltersState): PagosFilterChip[] {
  const chips: PagosFilterChip[] = [];

  for (const value of filters.paymentStatuses) {
    chips.push({
      id: `payment-${value}`,
      group: "paymentStatuses",
      value,
      label: PAGOS_FILTER_LABELS.paymentStatus[value],
    });
  }

  for (const value of filters.accountStatuses) {
    chips.push({
      id: `account-${value}`,
      group: "accountStatuses",
      value,
      label: PAGOS_FILTER_LABELS.accountStatus[value],
    });
  }

  for (const value of filters.paymentMethods) {
    chips.push({
      id: `method-${value}`,
      group: "paymentMethods",
      value,
      label: PAGOS_FILTER_LABELS.paymentMethod[value],
    });
  }

  for (const value of filters.plans) {
    chips.push({
      id: `plan-${value}`,
      group: "plans",
      value,
      label: PAGOS_FILTER_LABELS.plan[value],
    });
  }

  return chips;
}

export function hasPagosActiveFilters(filters: PagosFiltersState) {
  return (
    filters.paymentStatuses.length > 0 ||
    filters.accountStatuses.length > 0 ||
    filters.paymentMethods.length > 0 ||
    filters.plans.length > 0 ||
    filters.search.trim().length > 0
  );
}

export function removePagosFilterChip(
  filters: PagosFiltersState,
  chip: PagosFilterChip
): PagosFiltersState {
  if (chip.group === "paymentStatuses") {
    return {
      ...filters,
      paymentStatuses: filters.paymentStatuses.filter((item) => item !== chip.value),
    };
  }
  if (chip.group === "accountStatuses") {
    return {
      ...filters,
      accountStatuses: filters.accountStatuses.filter((item) => item !== chip.value),
    };
  }
  if (chip.group === "paymentMethods") {
    return {
      ...filters,
      paymentMethods: filters.paymentMethods.filter((item) => item !== chip.value),
    };
  }
  return {
    ...filters,
    plans: filters.plans.filter((item) => item !== chip.value),
  };
}

export function pagosFiltersToSearchParams(filters: PagosFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.paymentStatuses.length) params.set("paymentStatus", filters.paymentStatuses.join(","));
  if (filters.accountStatuses.length) params.set("accountStatus", filters.accountStatuses.join(","));
  if (filters.paymentMethods.length) params.set("paymentMethod", filters.paymentMethods.join(","));
  if (filters.plans.length) params.set("plan", filters.plans.join(","));
  if (filters.search.trim()) params.set("q", filters.search.trim());
  return params;
}

export function parsePagosFiltersFromSearchParams(params: URLSearchParams): PagosFiltersState {
  return {
    ...EMPTY_PAGOS_FILTERS,
    paymentStatuses: (params.get("paymentStatus") ?? "")
      .split(",")
      .filter((v): v is PaymentStatusFilter =>
        ["confirmado", "pendiente", "rechazado", "reembolsado"].includes(v)
      ),
    accountStatuses: (params.get("accountStatus") ?? "")
      .split(",")
      .filter((v): v is PaymentAccountFilter =>
        [
          "requires_activation",
          "trial_active",
          "trial_expired",
          "expiring_soon",
          "subscription_active",
          "subscription_expired",
        ].includes(v)
      ),
    paymentMethods: (params.get("paymentMethod") ?? "")
      .split(",")
      .filter((v): v is PaymentMethodFilter =>
        ["manual", "transferencia", "webpay", "otro"].includes(v)
      ),
    plans: (params.get("plan") ?? "")
      .split(",")
      .filter((v): v is PaymentPlanFilter =>
        ["founder_full_annual", "quote_only_annual", "founder_monthly", "trial"].includes(v)
      ),
    search: params.get("q") ?? "",
  };
}

export function applyPagosKpiFilter(
  filters: PagosFiltersState,
  kpiId: string
): PagosFiltersState {
  if (kpiId === "pending") {
    return { ...filters, paymentStatuses: ["pendiente"] };
  }
  if (kpiId === "renewals") {
    return { ...filters, accountStatuses: ["expiring_soon"] };
  }
  if (kpiId === "expired") {
    return { ...filters, accountStatuses: ["trial_expired", "subscription_expired"] };
  }
  if (kpiId === "activation") {
    return { ...filters, accountStatuses: ["requires_activation"] };
  }
  if (kpiId === "revenue") {
    return { ...filters, paymentStatuses: ["confirmado"] };
  }
  return filters;
}

export function mapProviderLabel(provider: PaymentProvider) {
  if (provider === "manual_transfer") return "Transferencia";
  if (provider === "webpay_plus") return "Webpay / Transbank";
  if (provider === "flow") return "Flow";
  return "Otro";
}

export function formatPaymentStatusLabel(status: PaymentStatus | null) {
  if (!status) return "—";
  if (status === "aprobado") return "Confirmado";
  if (status === "pendiente") return "Pendiente";
  if (status === "fallido") return "Rechazado";
  if (status === "reembolsado") return "Reembolsado";
  if (status === "cancelado") return "Cancelado";
  return status;
}
