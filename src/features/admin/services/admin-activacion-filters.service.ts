import {
  formatOperationalExpiry,
  formatRelativeActivity,
  parseAdminIsoDate,
} from "@/features/admin/services/admin-clientes-filters.service";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type {
  ActivacionAttentionRow,
  ActivacionAttentionSegment,
  ActivacionPrimaryAction,
  ActivacionStage,
} from "@/features/admin/types/admin-activacion";
import type { SubscriptionStatus } from "@/features/subscriptions/types/subscription";
import { buildPublicLeadWhatsappUrl } from "@/utils/whatsapp";

const MS_DAY = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 7;

export type ActivacionStageFilter =
  | "account_created"
  | "no_first_quote"
  | "first_quote"
  | "pdf_generated"
  | "activation_complete";

export type ActivacionAccountStatusFilter =
  | "trial_active"
  | "trial_expiring"
  | "trial_expired"
  | "active"
  | "subscription_expired";

export type ActivacionActivityFilter =
  | "no_recent_activity"
  | "active_today"
  | "active_7d"
  | "no_activity_7d"
  | "no_activity_14d";

export type ActivacionAccountTypeFilter = "real" | "test";

export type ActivacionViewFilter = "activation" | "post_activation";

export type ActivacionFiltersState = {
  view: ActivacionViewFilter;
  stages: ActivacionStageFilter[];
  accountStatuses: ActivacionAccountStatusFilter[];
  activity: ActivacionActivityFilter[];
  accountTypes: ActivacionAccountTypeFilter[];
  search: string;
};

export type ActivacionFilterChip = {
  id: string;
  group: "stage" | "accountStatus" | "activity" | "accountType";
  value: string;
  label: string;
};

export const EMPTY_ACTIVACION_FILTERS: ActivacionFiltersState = {
  view: "activation",
  stages: [],
  accountStatuses: [],
  activity: [],
  accountTypes: [],
  search: "",
};

export const ACTIVACION_FILTER_LABELS = {
  stage: {
    account_created: "Cuenta creada",
    no_first_quote: "Sin primera cotización",
    first_quote: "Primera cotización creada",
    pdf_generated: "PDF generado o compartido",
    activation_complete: "Activación completa",
  },
  accountStatus: {
    trial_active: "Trial activo",
    trial_expiring: "Trial por vencer",
    trial_expired: "Trial vencido",
    active: "Cliente activo",
    subscription_expired: "Suscripción vencida",
  },
  activity: {
    no_recent_activity: "Sin actividad reciente",
    active_today: "Activa hoy",
    active_7d: "Activa últimos 7 días",
    no_activity_7d: "Sin actividad 7 días",
    no_activity_14d: "Sin actividad 14 días",
  },
  accountType: {
    real: "Real",
    test: "Prueba",
  },
} as const;

export function hasBasicConfigured(client: AdminClientListItem) {
  return (
    client.publicPageActive ||
    Boolean(client.telefonoPrincipal && client.correoPrincipal)
  );
}

export function resolveActivacionStage(client: AdminClientListItem): ActivacionStage {
  if (client.pdfsGeneradosCount > 0) {
    return "activation_complete";
  }

  if (client.cotizacionesCount > 0) {
    return "first_quote";
  }

  if (hasBasicConfigured(client)) {
    return "no_first_quote";
  }

  return "account_created";
}

export function resolveStageLabel(stage: ActivacionStage) {
  if (stage === "account_created") return "Cuenta creada";
  if (stage === "no_first_quote") return "Sin primera cotización";
  if (stage === "first_quote") return "Primera cotización";
  if (stage === "pdf_generated") return "PDF generado";
  return "Activación completa";
}

function daysSince(iso: string | null) {
  const date = parseAdminIsoDate(iso);
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / MS_DAY);
}

function daysUntilExpiry(client: AdminClientListItem) {
  const expiry = parseAdminIsoDate(client.trialEndsAt ?? client.subscriptionEndsAt);
  if (!expiry) return null;
  return Math.ceil((expiry.getTime() - Date.now()) / MS_DAY);
}

export function isTrialExpiringSoon(client: AdminClientListItem) {
  if (client.estadoEfectivo === "trial_expiring") {
    return true;
  }

  const days = daysUntilExpiry(client);
  return (
    days !== null &&
    days >= 0 &&
    days <= EXPIRING_SOON_DAYS &&
    (client.estadoEfectivo === "trial_active")
  );
}

function hasActivityWithinDays(client: AdminClientListItem, days: number) {
  const date = parseAdminIsoDate(client.lastActivityAt);
  if (!date) return false;
  return Date.now() - date.getTime() <= days * MS_DAY;
}

function isActiveToday(client: AdminClientListItem) {
  if (!client.lastActivityAt) return false;
  return daysSince(client.lastActivityAt) === 0;
}

export function hasNoRecentActivity(client: AdminClientListItem) {
  return !hasActivityWithinDays(client, EXPIRING_SOON_DAYS);
}

function pluralizeQuotes(count: number) {
  return count === 1 ? "1 cotiz." : `${count} cotiz.`;
}

function buildWhatsappUrl(phone: string | null, message: string) {
  if (!phone) return null;
  return buildPublicLeadWhatsappUrl(phone, { mensaje: message });
}

export function isPostActivationFollowUp(client: AdminClientListItem) {
  if (client.isTestAccount) {
    return false;
  }

  return (
    client.pdfsGeneradosCount > 0 &&
    client.estadoEfectivo === "active" &&
    hasNoRecentActivity(client)
  );
}

export function needsActivacionAttention(client: AdminClientListItem) {
  if (client.isTestAccount) {
    return false;
  }

  if (isPostActivationFollowUp(client)) {
    return true;
  }

  const stage = resolveActivacionStage(client);

  if (stage === "activation_complete") {
    return false;
  }

  if (client.estadoEfectivo === "trial_expired") {
    return true;
  }

  if (isTrialExpiringSoon(client)) {
    return true;
  }

  if (stage === "account_created" || stage === "no_first_quote" || stage === "first_quote") {
    return true;
  }

  return false;
}

function resolveAttentionSegment(client: AdminClientListItem): ActivacionAttentionSegment {
  if (isPostActivationFollowUp(client)) {
    return "post_activation";
  }
  return "activation";
}

function resolvePrimaryAction(client: AdminClientListItem): ActivacionPrimaryAction {
  const stage = resolveActivacionStage(client);

  if (client.estadoEfectivo === "trial_expired" && client.cotizacionesCount === 0) {
    return "recover";
  }

  if (isTrialExpiringSoon(client) && hasNoRecentActivity(client)) {
    return "remind";
  }

  if (stage === "first_quote" && client.pdfsGeneradosCount === 0) {
    return "guide_send";
  }

  if (client.estadoEfectivo === "active" && hasNoRecentActivity(client)) {
    return "contact";
  }

  if (stage === "account_created" || stage === "no_first_quote") {
    return "activate_account";
  }

  if (client.estadoEfectivo === "trial_expired") {
    return "recover";
  }

  return "activate_account";
}

function resolveBloqueo(client: AdminClientListItem): string {
  const stage = resolveActivacionStage(client);

  if (client.estadoEfectivo === "trial_expired" && client.cotizacionesCount === 0) {
    return "Trial vencido sin uso";
  }

  if (isTrialExpiringSoon(client) && hasNoRecentActivity(client)) {
    return "Riesgo de abandono";
  }

  if (stage === "first_quote" && client.pdfsGeneradosCount === 0) {
    return "Aún no llega al primer resultado";
  }

  if (client.estadoEfectivo === "active" && hasNoRecentActivity(client)) {
    return "Sin uso reciente";
  }

  if (client.cotizacionesCount === 0) {
    return "No ha iniciado una cotización";
  }

  return "Revisar activación";
}

function resolveProximaAccion(client: AdminClientListItem, action: ActivacionPrimaryAction) {
  if (action === "activate_account") return "Impulsar primera cotización";
  if (action === "guide_send") return "Guiar envío del PDF";
  if (action === "remind") return "Recordar antes del vencimiento";
  if (action === "recover") return "Recuperar cuenta trial";
  return "Contactar por seguimiento";
}

export function buildActivacionAttentionRow(
  client: AdminClientListItem
): ActivacionAttentionRow | null {
  if (!needsActivacionAttention(client)) {
    return null;
  }

  const stage = resolveActivacionStage(client);
  const primaryAction = resolvePrimaryAction(client);
  const whatsappUrl = buildWhatsappUrl(
    client.telefonoPrincipal,
    "Hola, te escribo desde Ventora para ayudarte con tu cuenta."
  );

  return {
    id: `activacion-${client.organizationId}`,
    organizationId: client.organizationId,
    empresaNombre: client.empresaNombre,
    correo: client.correoPrincipal,
    accountStatus: client.estadoEfectivo,
    stage,
    stageLabel: resolveStageLabel(stage),
    segment: resolveAttentionSegment(client),
    usageLabel: `${pluralizeQuotes(client.cotizacionesCount)} · ${client.pdfsGeneradosCount} PDF`,
    lastActivityLabel: formatRelativeActivity(client.lastActivityAt),
    expiryLabel: formatOperationalExpiry(client),
    bloqueo: resolveBloqueo(client),
    proximaAccion: resolveProximaAccion(client, primaryAction),
    primaryAction,
    whatsappUrl,
    publicPageUrl: client.publicPageUrl,
    cotizacionesCount: client.cotizacionesCount,
    pdfsGeneradosCount: client.pdfsGeneradosCount,
    isTestAccount: client.isTestAccount,
  };
}

export function buildActivacionAttentionRows(
  clients: AdminClientListItem[]
): ActivacionAttentionRow[] {
  return clients
    .map(buildActivacionAttentionRow)
    .filter((row): row is ActivacionAttentionRow => row !== null)
    .sort((left, right) => {
      const segmentPriority = (row: ActivacionAttentionRow) =>
        row.segment === "activation" ? 0 : 1;
      const priority = (row: ActivacionAttentionRow) => {
        if (row.accountStatus === "trial_expired") return 0;
        if (row.primaryAction === "remind") return 1;
        if (row.primaryAction === "guide_send") return 2;
        if (row.primaryAction === "activate_account") return 3;
        return 4;
      };
      const segmentDiff = segmentPriority(left) - segmentPriority(right);
      if (segmentDiff !== 0) return segmentDiff;
      return priority(left) - priority(right);
    });
}

function matchesStageFilter(client: AdminClientListItem, filter: ActivacionStageFilter) {
  const stage = resolveActivacionStage(client);
  if (filter === "pdf_generated") {
    return client.pdfsGeneradosCount > 0;
  }
  return stage === filter;
}

function matchesAccountStatusFilter(
  client: AdminClientListItem,
  filter: ActivacionAccountStatusFilter
) {
  if (filter === "trial_active") {
    return client.estadoEfectivo === "trial_active";
  }
  if (filter === "trial_expiring") {
    return isTrialExpiringSoon(client);
  }
  if (filter === "trial_expired") {
    return client.estadoEfectivo === "trial_expired";
  }
  if (filter === "active") {
    return client.estadoEfectivo === "active";
  }
  return client.estadoEfectivo === "past_due" || client.estadoEfectivo === "cancelled";
}

function matchesActivityFilter(client: AdminClientListItem, filter: ActivacionActivityFilter) {
  if (filter === "active_today") return isActiveToday(client);
  if (filter === "active_7d") return hasActivityWithinDays(client, 7);
  if (filter === "no_activity_7d") {
    const days = daysSince(client.lastActivityAt);
    return days === null || days > 7;
  }
  if (filter === "no_activity_14d") {
    const days = daysSince(client.lastActivityAt);
    return days === null || days > 14;
  }
  return hasNoRecentActivity(client);
}

function matchesAccountTypeFilter(client: AdminClientListItem, filter: ActivacionAccountTypeFilter) {
  if (filter === "test") return client.isTestAccount;
  return !client.isTestAccount;
}

function matchesSearch(client: AdminClientListItem, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [
    client.empresaNombre,
    client.correoPrincipal,
    client.telefonoPrincipal,
    String(client.organizationId),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

export function matchesActivacionFilters(
  client: AdminClientListItem,
  filters: ActivacionFiltersState
) {
  if (!matchesSearch(client, filters.search)) {
    return false;
  }

  if (filters.stages.length > 0) {
    const match = filters.stages.some((item) => matchesStageFilter(client, item));
    if (!match) return false;
  }

  if (filters.accountStatuses.length > 0) {
    const match = filters.accountStatuses.some((item) => matchesAccountStatusFilter(client, item));
    if (!match) return false;
  }

  if (filters.activity.length > 0) {
    const match = filters.activity.some((item) => matchesActivityFilter(client, item));
    if (!match) return false;
  }

  if (filters.accountTypes.length > 0) {
    const match = filters.accountTypes.some((item) => matchesAccountTypeFilter(client, item));
    if (!match) return false;
  }

  return true;
}

export function filterActivacionAttentionRows(
  rows: ActivacionAttentionRow[],
  clients: AdminClientListItem[],
  filters: ActivacionFiltersState
) {
  const clientById = new Map(clients.map((client) => [client.organizationId, client]));

  return rows.filter((row) => {
    if (filters.view === "post_activation") {
      if (row.segment !== "post_activation") return false;
    } else if (row.segment !== "activation") {
      return false;
    }

    const client = clientById.get(row.organizationId);
    if (!client) return false;
    return matchesActivacionFilters(client, filters);
  });
}

export function hasActivacionActiveFilters(filters: ActivacionFiltersState) {
  return (
    filters.stages.length > 0 ||
    filters.accountStatuses.length > 0 ||
    filters.activity.length > 0 ||
    filters.accountTypes.length > 0
  );
}

export function buildActivacionFilterChips(filters: ActivacionFiltersState): ActivacionFilterChip[] {
  const chips: ActivacionFilterChip[] = [];

  for (const value of filters.stages) {
    chips.push({
      id: `stage-${value}`,
      group: "stage",
      value,
      label: ACTIVACION_FILTER_LABELS.stage[value],
    });
  }

  for (const value of filters.accountStatuses) {
    chips.push({
      id: `status-${value}`,
      group: "accountStatus",
      value,
      label: ACTIVACION_FILTER_LABELS.accountStatus[value],
    });
  }

  for (const value of filters.activity) {
    chips.push({
      id: `activity-${value}`,
      group: "activity",
      value,
      label: ACTIVACION_FILTER_LABELS.activity[value],
    });
  }

  for (const value of filters.accountTypes) {
    chips.push({
      id: `type-${value}`,
      group: "accountType",
      value,
      label: ACTIVACION_FILTER_LABELS.accountType[value],
    });
  }

  return chips;
}

export function removeActivacionFilterChip(
  filters: ActivacionFiltersState,
  chip: ActivacionFilterChip
): ActivacionFiltersState {
  if (chip.group === "stage") {
    return { ...filters, stages: filters.stages.filter((item) => item !== chip.value) };
  }
  if (chip.group === "accountStatus") {
    return {
      ...filters,
      accountStatuses: filters.accountStatuses.filter((item) => item !== chip.value),
    };
  }
  if (chip.group === "activity") {
    return { ...filters, activity: filters.activity.filter((item) => item !== chip.value) };
  }
  return {
    ...filters,
    accountTypes: filters.accountTypes.filter((item) => item !== chip.value),
  };
}

export function parseActivacionFiltersFromSearchParams(
  params: URLSearchParams
): ActivacionFiltersState {
  const readList = <T extends string>(key: string): T[] => {
    const raw = params.get(key);
    if (!raw) return [];
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean) as T[];
  };

  const parsed: ActivacionFiltersState = {
    view: params.get("view") === "post_activation" ? "post_activation" : "activation",
    stages: readList<ActivacionStageFilter>("stage"),
    accountStatuses: readList<ActivacionAccountStatusFilter>("status"),
    activity: readList<ActivacionActivityFilter>("activity"),
    accountTypes: readList<ActivacionAccountTypeFilter>("type"),
    search: params.get("q") ?? "",
  };

  return parsed;
}

export function activacionFiltersToSearchParams(filters: ActivacionFiltersState) {
  const params = new URLSearchParams();
  if (filters.view === "post_activation") params.set("view", "post_activation");
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.stages.length) params.set("stage", filters.stages.join(","));
  if (filters.accountStatuses.length) params.set("status", filters.accountStatuses.join(","));
  if (filters.activity.length) params.set("activity", filters.activity.join(","));
  if (filters.accountTypes.length) params.set("type", filters.accountTypes.join(","));
  return params;
}

export function applyActivacionKpiFilter(
  filters: ActivacionFiltersState,
  kpiId: string
): ActivacionFiltersState {
  if (kpiId === "new_accounts") {
    return {
      ...filters,
      view: "activation",
      accountTypes: ["real"],
      stages: ["account_created"],
    };
  }
  if (kpiId === "no_first_quote") {
    return {
      ...filters,
      view: "activation",
      stages: ["no_first_quote", "account_created"],
      accountTypes: ["real"],
    };
  }
  if (kpiId === "quote_no_pdf") {
    return { ...filters, view: "activation", stages: ["first_quote"], accountTypes: ["real"] };
  }
  if (kpiId === "trials_at_risk") {
    return {
      ...filters,
      view: "activation",
      accountStatuses: ["trial_expiring"],
      activity: ["no_activity_7d"],
      accountTypes: ["real"],
    };
  }
  if (kpiId === "completed") {
    return {
      ...filters,
      view: "post_activation",
      activity: ["no_activity_7d"],
      accountTypes: ["real"],
    };
  }
  return filters;
}

export function mapAccountStatusLabel(status: SubscriptionStatus) {
  if (status === "trial_active") return "Trial activo";
  if (status === "trial_expiring") return "Trial por vencer";
  if (status === "trial_expired") return "Trial vencido";
  if (status === "active") return "Cliente activo";
  if (status === "past_due" || status === "cancelled") return "Suscripción vencida";
  return status;
}

export function primaryActionLabel(action: ActivacionPrimaryAction) {
  if (action === "activate_account") return "Activar cuenta";
  if (action === "guide_send") return "Guiar envío";
  if (action === "remind") return "Recordar";
  if (action === "recover") return "Recuperar";
  return "Contactar";
}

export function isNewAccount(client: AdminClientListItem, withinDays = 7) {
  const days = daysSince(client.createdAt);
  return days !== null && days <= withinDays && !client.isTestAccount;
}
