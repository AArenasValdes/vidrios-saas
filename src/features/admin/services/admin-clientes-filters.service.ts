import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { SubscriptionStatus } from "@/features/subscriptions/types/subscription";

export type AccountTypeFilter = "real" | "test";

export type SubscriptionStatusFilter =
  | "active"
  | "trial_active"
  | "expiring_soon"
  | "trial_expired"
  | "subscription_expired";

export type UsageHealthFilter =
  | "no_first_quote"
  | "no_recent_activity"
  | "recent_activity"
  | "pending_payment";

export type PublicChannelFilter =
  | "page_published"
  | "page_not_configured"
  | "with_requests_30d"
  | "without_requests_30d"
  | "with_pending_requests";

export type ClientesSortField =
  | "lastActivity"
  | "expiry"
  | "cotizaciones"
  | "estado"
  | "createdAt";

export type ClientesSortDirection = "asc" | "desc";

export type ClientesFiltersState = {
  accountTypes: AccountTypeFilter[];
  subscriptionStatuses: SubscriptionStatusFilter[];
  usage: UsageHealthFilter[];
  publicChannel: PublicChannelFilter[];
  search: string;
  sortField: ClientesSortField;
  sortDirection: ClientesSortDirection;
};

export type FilterChip = {
  id: string;
  group: "accountType" | "subscriptionStatus" | "usage" | "publicChannel";
  value: string;
  label: string;
};

export type QuickViewId =
  | "recovery"
  | "activation"
  | "renewals"
  | "active_portfolio"
  | "tests";

export const EMPTY_CLIENTES_FILTERS: ClientesFiltersState = {
  accountTypes: [],
  subscriptionStatuses: [],
  usage: [],
  publicChannel: [],
  search: "",
  sortField: "lastActivity",
  sortDirection: "desc",
};

export const FILTER_LABELS = {
  accountType: {
    real: "Real",
    test: "Prueba",
  },
  subscriptionStatus: {
    active: "Activa",
    trial_active: "Trial activo",
    expiring_soon: "Por vencer",
    trial_expired: "Trial vencido",
    subscription_expired: "Suscripción vencida",
  },
  usage: {
    no_first_quote: "Sin primera cotización",
    no_recent_activity: "Sin actividad reciente",
    recent_activity: "Con actividad reciente",
    pending_payment: "Con pago pendiente",
  },
  publicChannel: {
    page_published: "Página publicada",
    page_not_configured: "Página no configurada",
    with_requests_30d: "Con solicitudes últimos 30 días",
    without_requests_30d: "Sin solicitudes últimos 30 días",
    with_pending_requests: "Con solicitudes pendientes",
  },
} as const;

export const QUICK_FILTER_CHIPS: Array<{
  label: string;
  apply: Partial<Pick<ClientesFiltersState, "accountTypes" | "subscriptionStatuses" | "usage">>;
}> = [
  { label: "Activas", apply: { subscriptionStatuses: ["active"] } },
  { label: "Por vencer", apply: { subscriptionStatuses: ["expiring_soon"] } },
  {
    label: "Vencidas",
    apply: { subscriptionStatuses: ["trial_expired", "subscription_expired"] },
  },
  { label: "Sin primera cotización", apply: { usage: ["no_first_quote"] } },
  { label: "Reales", apply: { accountTypes: ["real"] } },
  { label: "Prueba", apply: { accountTypes: ["test"] } },
];

export const QUICK_VIEWS: Record<
  QuickViewId,
  { label: string; filters: Pick<ClientesFiltersState, "accountTypes" | "subscriptionStatuses" | "usage"> }
> = {
  recovery: {
    label: "Recuperación",
    filters: {
      accountTypes: ["real"],
      subscriptionStatuses: ["trial_expired", "subscription_expired"],
      usage: [],
    },
  },
  activation: {
    label: "Activación",
    filters: {
      accountTypes: [],
      subscriptionStatuses: ["active", "trial_active"],
      usage: ["no_first_quote"],
    },
  },
  renewals: {
    label: "Renovaciones",
    filters: {
      accountTypes: ["real"],
      subscriptionStatuses: ["expiring_soon"],
      usage: [],
    },
  },
  active_portfolio: {
    label: "Cartera activa",
    filters: {
      accountTypes: ["real"],
      subscriptionStatuses: ["active"],
      usage: [],
    },
  },
  tests: {
    label: "Pruebas",
    filters: {
      accountTypes: ["test"],
      subscriptionStatuses: [],
      usage: [],
    },
  },
};

const MS_DAY = 24 * 60 * 60 * 1000;
const RECENT_ACTIVITY_DAYS = 14;
const EXPIRING_SOON_DAYS = 7;
const MAX_REASONABLE_YEAR = 2100;
const SAVED_VIEWS_KEY = "ventora-admin-clientes-saved-views";

export function parseAdminIsoDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() > MAX_REASONABLE_YEAR) {
    return null;
  }

  return date;
}

export function formatStatusLabel(status: SubscriptionStatus) {
  const labels: Partial<Record<SubscriptionStatus, string>> = {
    active: "Activa",
    trial_active: "Trial activo",
    trial_expiring: "Trial por vencer",
    trial_expired: "Trial vencido",
    past_due: "Suscripción vencida",
    cancelled: "Cancelada",
  };

  return labels[status] ?? status;
}

export function pluralizeCotizaciones(count: number) {
  return count === 1 ? "1 cotización" : `${count} cotizaciones`;
}

function daysUntil(date: Date | null) {
  if (!date) {
    return null;
  }

  return Math.ceil((date.getTime() - Date.now()) / MS_DAY);
}

export function getClientExpiryDate(client: AdminClientListItem): Date | null {
  if (
    client.estadoEfectivo === "active" ||
    client.estadoEfectivo === "past_due" ||
    client.estadoEfectivo === "cancelled"
  ) {
    return parseAdminIsoDate(client.subscriptionEndsAt);
  }

  return (
    parseAdminIsoDate(client.trialEndsAt) ?? parseAdminIsoDate(client.subscriptionEndsAt)
  );
}

export function formatOperationalExpiry(client: AdminClientListItem): string {
  const expiry = getClientExpiryDate(client);
  if (!expiry) {
    return "—";
  }

  const diffDays = daysUntil(expiry);
  if (diffDays === null) {
    return "—";
  }

  const absDate = expiry.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (client.estadoEfectivo === "trial_expired") {
    return diffDays < 0 ? `Trial venció hace ${Math.abs(diffDays)} días` : `Trial vencido · ${absDate}`;
  }

  if (client.estadoEfectivo === "past_due" || client.estadoEfectivo === "cancelled") {
    return diffDays < 0
      ? `Suscripción venció hace ${Math.abs(diffDays)} días`
      : `Suscripción vencida · ${absDate}`;
  }

  if (diffDays === 0) {
    return "Vence hoy";
  }

  if (diffDays > 0 && diffDays <= 30) {
    return client.estadoEfectivo === "active"
      ? `Renueva en ${diffDays} días`
      : `Vence en ${diffDays} días`;
  }

  if (diffDays < 0) {
    return `Venció hace ${Math.abs(diffDays)} días`;
  }

  return client.estadoEfectivo === "active" ? `Renueva el ${absDate}` : absDate;
}

export function formatRelativeActivity(iso: string | null) {
  if (!iso) {
    return "Sin registro";
  }

  const date = parseAdminIsoDate(iso);
  if (!date) {
    return "Sin registro";
  }

  const diffDays = Math.floor((Date.now() - date.getTime()) / MS_DAY);
  if (diffDays <= 0) {
    return "Hoy";
  }
  if (diffDays === 1) {
    return "Ayer";
  }
  return `Hace ${diffDays} días`;
}

function isExpiringSoon(client: AdminClientListItem) {
  if (client.estadoEfectivo === "trial_expiring") {
    return true;
  }

  const expiry = getClientExpiryDate(client);
  const diff = daysUntil(expiry);
  return diff !== null && diff >= 0 && diff <= EXPIRING_SOON_DAYS;
}

function hasRecentActivity(client: AdminClientListItem) {
  if (!client.lastActivityAt) {
    return false;
  }

  const date = parseAdminIsoDate(client.lastActivityAt);
  if (!date) {
    return false;
  }

  return Date.now() - date.getTime() <= RECENT_ACTIVITY_DAYS * MS_DAY;
}

function hasPendingPayment(client: AdminClientListItem) {
  return (
    !client.ultimoPagoAt &&
    (client.estadoEfectivo === "trial_active" ||
      client.estadoEfectivo === "trial_expiring" ||
      client.estadoEfectivo === "past_due")
  );
}

export function matchesSubscriptionStatusFilter(
  client: AdminClientListItem,
  filter: SubscriptionStatusFilter
) {
  switch (filter) {
    case "active":
      return client.estadoEfectivo === "active";
    case "trial_active":
      return client.estadoEfectivo === "trial_active";
    case "expiring_soon":
      return isExpiringSoon(client);
    case "trial_expired":
      return client.estadoEfectivo === "trial_expired";
    case "subscription_expired":
      return client.estadoEfectivo === "past_due" || client.estadoEfectivo === "cancelled";
    default:
      return false;
  }
}

export function matchesUsageHealthFilter(
  client: AdminClientListItem,
  filter: UsageHealthFilter
) {
  switch (filter) {
    case "no_first_quote":
      return client.cotizacionesCount === 0;
    case "no_recent_activity":
      return !hasRecentActivity(client);
    case "recent_activity":
      return hasRecentActivity(client);
    case "pending_payment":
      return hasPendingPayment(client);
    default:
      return false;
  }
}

export function matchesAccountTypeFilter(
  client: AdminClientListItem,
  filter: AccountTypeFilter
) {
  return filter === "test" ? client.isTestAccount : !client.isTestAccount;
}

export function matchesPublicChannelFilter(
  client: AdminClientListItem,
  filter: PublicChannelFilter
) {
  const channel = client.publicChannel;

  if (filter === "page_published") {
    return channel.pageStatusLabel === "Publicada";
  }
  if (filter === "page_not_configured") {
    return channel.pageStatusLabel === "No configurada";
  }
  if (filter === "with_requests_30d") {
    return channel.solicitudesLast30Days > 0;
  }
  if (filter === "without_requests_30d") {
    return channel.solicitudesLast30Days === 0;
  }
  if (filter === "with_pending_requests") {
    return channel.solicitudesPending > 0;
  }
  return true;
}

export function matchesClientesFilters(
  client: AdminClientListItem,
  filters: ClientesFiltersState
) {
  if (filters.accountTypes.length > 0) {
    const match = filters.accountTypes.some((item) =>
      matchesAccountTypeFilter(client, item)
    );
    if (!match) {
      return false;
    }
  }

  if (filters.subscriptionStatuses.length > 0) {
    const match = filters.subscriptionStatuses.some((item) =>
      matchesSubscriptionStatusFilter(client, item)
    );
    if (!match) {
      return false;
    }
  }

  if (filters.usage.length > 0) {
    const match = filters.usage.some((item) => matchesUsageHealthFilter(client, item));
    if (!match) {
      return false;
    }
  }

  if (filters.publicChannel.length > 0) {
    const match = filters.publicChannel.some((item) =>
      matchesPublicChannelFilter(client, item)
    );
    if (!match) {
      return false;
    }
  }

  return true;
}

export function matchesClientesSearch(client: AdminClientListItem, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const haystack = [
    String(client.organizationId),
    client.empresaNombre,
    client.correoPrincipal ?? "",
    client.telefonoPrincipal ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function filterAndSortClientesList(
  clients: AdminClientListItem[],
  filters: ClientesFiltersState
) {
  const filtered = clients.filter(
    (client) => matchesClientesFilters(client, filters) && matchesClientesSearch(client, filters.search)
  );

  const direction = filters.sortDirection === "asc" ? 1 : -1;

  return [...filtered].sort((left, right) => {
    let comparison = 0;

    switch (filters.sortField) {
      case "lastActivity": {
        const leftTime = parseAdminIsoDate(left.lastActivityAt)?.getTime() ?? 0;
        const rightTime = parseAdminIsoDate(right.lastActivityAt)?.getTime() ?? 0;
        comparison = leftTime - rightTime;
        break;
      }
      case "expiry": {
        const leftTime = getClientExpiryDate(left)?.getTime() ?? 0;
        const rightTime = getClientExpiryDate(right)?.getTime() ?? 0;
        comparison = leftTime - rightTime;
        break;
      }
      case "cotizaciones":
        comparison = left.cotizacionesCount - right.cotizacionesCount;
        break;
      case "estado":
        comparison = left.estadoEfectivo.localeCompare(right.estadoEfectivo);
        break;
      case "createdAt": {
        const leftTime = parseAdminIsoDate(left.createdAt)?.getTime() ?? 0;
        const rightTime = parseAdminIsoDate(right.createdAt)?.getTime() ?? 0;
        comparison = leftTime - rightTime;
        break;
      }
      default:
        comparison = 0;
    }

    if (comparison === 0) {
      return left.organizationId - right.organizationId;
    }

    return comparison * direction;
  });
}

export function buildActiveFilterChips(filters: ClientesFiltersState): FilterChip[] {
  const chips: FilterChip[] = [];

  for (const value of filters.accountTypes) {
    chips.push({
      id: `accountType-${value}`,
      group: "accountType",
      value,
      label: FILTER_LABELS.accountType[value],
    });
  }

  for (const value of filters.subscriptionStatuses) {
    chips.push({
      id: `subscriptionStatus-${value}`,
      group: "subscriptionStatus",
      value,
      label: FILTER_LABELS.subscriptionStatus[value],
    });
  }

  for (const value of filters.usage) {
    chips.push({
      id: `usage-${value}`,
      group: "usage",
      value,
      label: FILTER_LABELS.usage[value],
    });
  }

  for (const value of filters.publicChannel) {
    chips.push({
      id: `publicChannel-${value}`,
      group: "publicChannel",
      value,
      label: FILTER_LABELS.publicChannel[value],
    });
  }

  return chips;
}

export function hasActiveFilters(filters: ClientesFiltersState) {
  return (
    filters.accountTypes.length > 0 ||
    filters.subscriptionStatuses.length > 0 ||
    filters.usage.length > 0 ||
    filters.publicChannel.length > 0 ||
    filters.search.trim().length > 0
  );
}

export function toggleFilterValue<T extends string>(
  current: T[],
  value: T
): T[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

export function removeFilterChip(
  filters: ClientesFiltersState,
  chip: FilterChip
): ClientesFiltersState {
  if (chip.group === "accountType") {
    return {
      ...filters,
      accountTypes: filters.accountTypes.filter((item) => item !== chip.value),
    };
  }

  if (chip.group === "subscriptionStatus") {
    return {
      ...filters,
      subscriptionStatuses: filters.subscriptionStatuses.filter(
        (item) => item !== chip.value
      ),
    };
  }

  if (chip.group === "publicChannel") {
    return {
      ...filters,
      publicChannel: filters.publicChannel.filter((item) => item !== chip.value),
    };
  }

  return {
    ...filters,
    usage: filters.usage.filter((item) => item !== chip.value),
  };
}

export function applyQuickView(viewId: QuickViewId): ClientesFiltersState {
  const view = QUICK_VIEWS[viewId];
  return {
    ...EMPTY_CLIENTES_FILTERS,
    accountTypes: [...view.filters.accountTypes],
    subscriptionStatuses: [...view.filters.subscriptionStatuses],
    usage: [...view.filters.usage],
  };
}

export function filtersToSearchParams(filters: ClientesFiltersState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.accountTypes.length > 0) {
    params.set("accountType", filters.accountTypes.join(","));
  }

  if (filters.subscriptionStatuses.length > 0) {
    params.set("subscriptionStatus", filters.subscriptionStatuses.join(","));
  }

  if (filters.usage.length > 0) {
    params.set("usage", filters.usage.join(","));
  }

  if (filters.publicChannel.length > 0) {
    params.set("publicChannel", filters.publicChannel.join(","));
  }

  if (filters.search.trim()) {
    params.set("q", filters.search.trim());
  }

  if (filters.sortField !== EMPTY_CLIENTES_FILTERS.sortField) {
    params.set("sort", filters.sortField);
  }

  if (filters.sortDirection !== EMPTY_CLIENTES_FILTERS.sortDirection) {
    params.set("sortDir", filters.sortDirection);
  }

  return params;
}

export function parseClientesFiltersFromSearchParams(
  params: URLSearchParams
): ClientesFiltersState {
  const accountTypes = (params.get("accountType") ?? "")
    .split(",")
    .filter((value): value is AccountTypeFilter => value === "real" || value === "test");

  const subscriptionStatuses = (params.get("subscriptionStatus") ?? "")
    .split(",")
    .filter((value): value is SubscriptionStatusFilter =>
      [
        "active",
        "trial_active",
        "expiring_soon",
        "trial_expired",
        "subscription_expired",
      ].includes(value)
    );

  const usage = (params.get("usage") ?? "")
    .split(",")
    .filter((value): value is UsageHealthFilter =>
      [
        "no_first_quote",
        "no_recent_activity",
        "recent_activity",
        "pending_payment",
      ].includes(value)
    );

  const publicChannel = (params.get("publicChannel") ?? "")
    .split(",")
    .filter((value): value is PublicChannelFilter =>
      [
        "page_published",
        "page_not_configured",
        "with_requests_30d",
        "without_requests_30d",
        "with_pending_requests",
      ].includes(value)
    );

  const sortField = params.get("sort");
  const sortDirection = params.get("sortDir");
  const view = params.get("view") as QuickViewId | null;

  let base = { ...EMPTY_CLIENTES_FILTERS };

  if (view && view in QUICK_VIEWS) {
    base = applyQuickView(view);
  }

  return {
    ...base,
    accountTypes: accountTypes.length > 0 ? accountTypes : base.accountTypes,
    subscriptionStatuses:
      subscriptionStatuses.length > 0 ? subscriptionStatuses : base.subscriptionStatuses,
    usage: usage.length > 0 ? usage : base.usage,
    publicChannel: publicChannel.length > 0 ? publicChannel : base.publicChannel,
    search: params.get("q") ?? "",
    sortField:
      sortField === "lastActivity" ||
      sortField === "expiry" ||
      sortField === "cotizaciones" ||
      sortField === "estado" ||
      sortField === "createdAt"
        ? sortField
        : base.sortField,
    sortDirection: sortDirection === "asc" || sortDirection === "desc" ? sortDirection : base.sortDirection,
  };
}

export type SavedClientesView = {
  id: string;
  name: string;
  filters: Pick<ClientesFiltersState, "accountTypes" | "subscriptionStatuses" | "usage">;
};

export function listSavedClientesViews(): SavedClientesView[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SavedClientesView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveClientesView(name: string, filters: ClientesFiltersState): SavedClientesView[] {
  const nextView: SavedClientesView = {
    id: `view-${Date.now()}`,
    name: name.trim(),
    filters: {
      accountTypes: [...filters.accountTypes],
      subscriptionStatuses: [...filters.subscriptionStatuses],
      usage: [...filters.usage],
    },
  };

  const views = [...listSavedClientesViews(), nextView];
  window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  return views;
}

export type ClientesKpiTone = "green" | "blue" | "amber" | "red" | "violet";

export type ClientesKpiCard = {
  id: "active" | "trials" | "expiring" | "expired" | "no-quote";
  label: string;
  value: number;
  subtitle: string;
  insight: string;
  tone: ClientesKpiTone;
  badge?: string;
  toggle: {
    accountTypes?: AccountTypeFilter[];
    subscriptionStatuses?: SubscriptionStatusFilter[];
    usage?: UsageHealthFilter[];
  };
};

function countWithoutRecentActivity(clients: AdminClientListItem[]) {
  return clients.filter((client) => !hasRecentActivity(client)).length;
}

export function buildClientesKpis(clients: AdminClientListItem[]): ClientesKpiCard[] {
  const realClients = clients.filter((client) => !client.isTestAccount);
  const activeClients = realClients.filter((client) => client.estadoEfectivo === "active");
  const trialClients = realClients.filter(
    (client) =>
      client.estadoEfectivo === "trial_active" || client.estadoEfectivo === "trial_expiring"
  );
  const expiringClients = realClients.filter((client) => isExpiringSoon(client));
  const expiredClients = realClients.filter(
    (client) =>
      client.estadoEfectivo === "trial_expired" ||
      client.estadoEfectivo === "past_due" ||
      client.estadoEfectivo === "cancelled"
  );
  const noQuoteClients = realClients.filter((client) => client.cotizacionesCount === 0);

  const expiredTrialCount = expiredClients.filter(
    (client) => client.estadoEfectivo === "trial_expired"
  ).length;
  const expiredSubscriptionCount = expiredClients.filter(
    (client) =>
      client.estadoEfectivo === "past_due" || client.estadoEfectivo === "cancelled"
  ).length;
  const trialsExpiringCount = trialClients.filter(
    (client) => client.estadoEfectivo === "trial_expiring"
  ).length;
  const activeWithoutActivity = countWithoutRecentActivity(activeClients);

  return [
    {
      id: "active",
      label: "Clientes activos",
      value: activeClients.length,
      subtitle: "Cuentas pagadas y operativas",
      insight:
        activeWithoutActivity > 0
          ? `${activeWithoutActivity} sin actividad reciente`
          : "Cartera en operación",
      tone: "green",
      badge: activeClients.length > 0 ? "Sano" : undefined,
      toggle: {
        subscriptionStatuses: ["active"],
        accountTypes: ["real"],
      },
    },
    {
      id: "trials",
      label: "Trials activos",
      value: trialClients.length,
      subtitle: "En evaluación",
      insight:
        trialsExpiringCount > 0
          ? `${trialsExpiringCount} vencen pronto`
          : "Oportunidad de conversión",
      tone: "blue",
      badge: trialClients.length > 0 ? "Oportunidad" : undefined,
      toggle: { subscriptionStatuses: ["trial_active"] },
    },
    {
      id: "expiring",
      label: "Por vencer",
      value: expiringClients.length,
      subtitle: "Requieren recordatorio",
      insight:
        expiringClients.length > 0
          ? `${expiringClients.length} cuentas en ventana crítica`
          : "Sin urgencias de renovación",
      tone: "amber",
      badge: expiringClients.length > 0 ? "Atención" : undefined,
      toggle: { subscriptionStatuses: ["expiring_soon"] },
    },
    {
      id: "expired",
      label: "Vencidas",
      value: expiredClients.length,
      subtitle: "Requieren recuperación",
      insight:
        expiredTrialCount > 0 && expiredSubscriptionCount > 0
          ? `${expiredTrialCount} trial · ${expiredSubscriptionCount} suscripción`
          : expiredClients.length > 0
            ? `${expiredClients.length} cuentas por recuperar`
            : "Sin cuentas vencidas",
      tone: "red",
      badge: expiredClients.length > 0 ? "Riesgo" : undefined,
      toggle: {
        subscriptionStatuses: ["trial_expired", "subscription_expired"],
      },
    },
    {
      id: "no-quote",
      label: "Sin primera cotización",
      value: noQuoteClients.length,
      subtitle: "Requieren activación",
      insight:
        noQuoteClients.length > 0
          ? `${noQuoteClients.length} sin uso del producto`
          : "Todas generaron cotizaciones",
      tone: "violet",
      badge: noQuoteClients.length > 0 ? "Activación" : undefined,
      toggle: { usage: ["no_first_quote"], accountTypes: ["real"] },
    },
  ];
}

function buildWhatsappUrl(phone: string | null) {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(
    "Hola, te escribo desde Ventora sobre tu cuenta."
  )}`;
}

export type ClientesAttentionRow = {
  id: string;
  organizationId: number;
  empresa: string;
  estadoEfectivo: AdminClientListItem["estadoEfectivo"];
  planLabel: string;
  usoLabel: string;
  ultimaActividad: string;
  vencimiento: string;
  proximaAccion: string;
  actionLabel: string;
  actionType:
    | "whatsapp"
    | "extend"
    | "payment"
    | "detail"
    | "archive_test"
    | "lost";
  whatsappUrl: string | null;
};

function buildAttentionRow(client: AdminClientListItem): ClientesAttentionRow | null {
  if (client.isTestAccount) {
    return null;
  }

  const whatsappUrl = buildWhatsappUrl(client.telefonoPrincipal);
  let proximaAccion = "Revisar cuenta";
  let actionLabel = "Ver ficha";
  let actionType: ClientesAttentionRow["actionType"] = "detail";

  if (client.estadoEfectivo === "trial_expired") {
    proximaAccion =
      client.cotizacionesCount > 0
        ? "Contactar: ya usó el producto"
        : "Ofrecer configuración inicial";
    actionLabel = client.cotizacionesCount > 0 && whatsappUrl ? "WhatsApp" : "Registrar pago";
    actionType =
      client.cotizacionesCount > 0 && whatsappUrl ? "whatsapp" : "payment";
  } else if (client.estadoEfectivo === "past_due" || client.estadoEfectivo === "cancelled") {
    proximaAccion = "Registrar o confirmar pago";
    actionLabel = "Registrar pago";
    actionType = "payment";
  } else if (isExpiringSoon(client)) {
    proximaAccion = "Enviar recordatorio de renovación";
    actionLabel = whatsappUrl ? "WhatsApp" : "Extender trial";
    actionType = whatsappUrl ? "whatsapp" : "extend";
  } else if (client.cotizacionesCount === 0) {
    proximaAccion = "Ofrecer configuración inicial";
    actionLabel = whatsappUrl ? "WhatsApp" : "Ver ficha";
    actionType = whatsappUrl ? "whatsapp" : "detail";
  } else if (!hasRecentActivity(client) && client.estadoEfectivo === "active") {
    proximaAccion = "Enviar seguimiento";
    actionLabel = whatsappUrl ? "WhatsApp" : "Ver ficha";
    actionType = whatsappUrl ? "whatsapp" : "detail";
  } else if (hasPendingPayment(client)) {
    proximaAccion = "Registrar o confirmar pago";
    actionLabel = "Registrar pago";
    actionType = "payment";
  } else {
    return null;
  }

  return {
    id: `attention-${client.organizationId}`,
    organizationId: client.organizationId,
    empresa: client.empresaNombre,
    estadoEfectivo: client.estadoEfectivo,
    planLabel: client.planLabel,
    usoLabel: pluralizeCotizaciones(client.cotizacionesCount),
    ultimaActividad: formatRelativeActivity(client.lastActivityAt),
    vencimiento: formatOperationalExpiry(client),
    proximaAccion,
    actionLabel,
    actionType,
    whatsappUrl,
  };
}

export function buildClientesAttentionRows(
  clients: AdminClientListItem[]
): ClientesAttentionRow[] {
  return clients
    .map(buildAttentionRow)
    .filter((row): row is ClientesAttentionRow => row !== null);
}

export function filtersIncludeAttentionRow(
  filters: ClientesFiltersState,
  row: ClientesAttentionRow,
  clients: AdminClientListItem[]
) {
  const client = clients.find((item) => item.organizationId === row.organizationId);
  if (!client) {
    return true;
  }

  return matchesClientesFilters(client, filters) && matchesClientesSearch(client, filters.search);
}

export function toggleQuickFilterChip(
  filters: ClientesFiltersState,
  apply: Partial<Pick<ClientesFiltersState, "accountTypes" | "subscriptionStatuses" | "usage">>
): ClientesFiltersState {
  const next = { ...filters };

  if (apply.accountTypes?.length) {
    const value = apply.accountTypes[0];
    next.accountTypes = toggleFilterValue(next.accountTypes, value);
  }

  if (apply.subscriptionStatuses?.length) {
    const allSelected = apply.subscriptionStatuses.every((item) =>
      next.subscriptionStatuses.includes(item)
    );
    next.subscriptionStatuses = allSelected
      ? next.subscriptionStatuses.filter(
          (item) => !apply.subscriptionStatuses!.includes(item)
        )
      : [...new Set([...next.subscriptionStatuses, ...apply.subscriptionStatuses])];
  }

  if (apply.usage?.length) {
    const value = apply.usage[0];
    next.usage = toggleFilterValue(next.usage, value);
  }

  return next;
}

export function isQuickChipActive(
  filters: ClientesFiltersState,
  apply: Partial<Pick<ClientesFiltersState, "accountTypes" | "subscriptionStatuses" | "usage">>
) {
  if (apply.accountTypes?.length) {
    return apply.accountTypes.every((item) => filters.accountTypes.includes(item));
  }

  if (apply.subscriptionStatuses?.length) {
    return apply.subscriptionStatuses.every((item) =>
      filters.subscriptionStatuses.includes(item)
    );
  }

  if (apply.usage?.length) {
    return apply.usage.every((item) => filters.usage.includes(item));
  }

  return false;
}
