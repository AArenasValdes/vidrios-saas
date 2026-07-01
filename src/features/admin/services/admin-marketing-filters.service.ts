import type {
  MarketingChannelId,
  MarketingCommercialState,
  MarketingPeriodPreset,
} from "@/features/admin/types/admin-marketing";
import {
  MARKETING_CHANNEL_LABELS,
  MARKETING_COMMERCIAL_STATE_LABELS,
  normalizeMarketingChannel,
  resolveCommercialState,
} from "@/features/admin/services/admin-marketing.logic";
import type { MarketingProspectSnapshot } from "@/features/admin/types/admin-marketing";
import type { MarketingPublicCompanyRow } from "@/features/admin/types/admin-marketing";

export type MarketingPeriodFilter = MarketingPeriodPreset;

export type MarketingAcquisitionChannelFilter = MarketingChannelId;

export type MarketingCommercialStateFilter = MarketingCommercialState;

export type MarketingPublicPageFilter =
  | "publicada"
  | "no_configurada"
  | "con_solicitudes"
  | "sin_solicitudes"
  | "pendientes";

export type MarketingFiltersState = {
  q: string;
  period: MarketingPeriodFilter;
  customStart: string;
  customEnd: string;
  acquisitionChannels: MarketingAcquisitionChannelFilter[];
  commercialStates: MarketingCommercialStateFilter[];
  publicPageFilters: MarketingPublicPageFilter[];
};

export const EMPTY_MARKETING_FILTERS: MarketingFiltersState = {
  q: "",
  period: "30d",
  customStart: "",
  customEnd: "",
  acquisitionChannels: [],
  commercialStates: [],
  publicPageFilters: [],
};

export type MarketingFilterChip = {
  id: string;
  label: string;
  group: keyof MarketingFiltersState;
  value?: string;
};

export const MARKETING_FILTER_LABELS = {
  period: {
    "7d": "Últimos 7 días",
    "30d": "Últimos 30 días",
    month: "Este mes",
    custom: "Personalizado",
  },
  acquisitionChannels: MARKETING_CHANNEL_LABELS,
  commercialStates: MARKETING_COMMERCIAL_STATE_LABELS,
  publicPageFilters: {
    publicada: "Publicada",
    no_configurada: "No configurada",
    con_solicitudes: "Con solicitudes en el período",
    sin_solicitudes: "Sin solicitudes en el período",
    pendientes: "Con solicitudes pendientes",
  },
} as const;

function matchesSearch(
  q: string,
  values: Array<string | null | undefined>
) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => (value ?? "").toLowerCase().includes(needle));
}

export function parseMarketingFiltersFromSearchParams(
  params: URLSearchParams
): MarketingFiltersState {
  const period = params.get("period");
  const parsedPeriod: MarketingPeriodFilter =
    period === "7d" || period === "30d" || period === "month" || period === "custom"
      ? period
      : "30d";

  return {
    q: params.get("q") ?? "",
    period: parsedPeriod,
    customStart: params.get("from") ?? "",
    customEnd: params.get("to") ?? "",
    acquisitionChannels: params
      .getAll("canal")
      .filter((value): value is MarketingAcquisitionChannelFilter =>
        Object.keys(MARKETING_CHANNEL_LABELS).includes(value)
      ),
    commercialStates: params
      .getAll("estado")
      .filter((value): value is MarketingCommercialStateFilter =>
        Object.keys(MARKETING_COMMERCIAL_STATE_LABELS).includes(value)
      ),
    publicPageFilters: params
      .getAll("pagina")
      .filter((value): value is MarketingPublicPageFilter =>
        Object.keys(MARKETING_FILTER_LABELS.publicPageFilters).includes(value)
      ),
  };
}

export function marketingFiltersToSearchParams(
  filters: MarketingFiltersState
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.period !== "30d") params.set("period", filters.period);
  if (filters.period === "custom") {
    if (filters.customStart) params.set("from", filters.customStart);
    if (filters.customEnd) params.set("to", filters.customEnd);
  }
  for (const channel of filters.acquisitionChannels) params.append("canal", channel);
  for (const state of filters.commercialStates) params.append("estado", state);
  for (const page of filters.publicPageFilters) params.append("pagina", page);
  return params;
}

export function hasMarketingActiveFilters(filters: MarketingFiltersState) {
  return (
    Boolean(filters.q.trim()) ||
    filters.period !== "30d" ||
    filters.acquisitionChannels.length > 0 ||
    filters.commercialStates.length > 0 ||
    filters.publicPageFilters.length > 0
  );
}

export function buildMarketingFilterChips(filters: MarketingFiltersState): MarketingFilterChip[] {
  const chips: MarketingFilterChip[] = [];

  if (filters.period !== "30d") {
    chips.push({
      id: "period",
      label: MARKETING_FILTER_LABELS.period[filters.period],
      group: "period",
    });
  }

  for (const channel of filters.acquisitionChannels) {
    chips.push({
      id: `canal:${channel}`,
      label: MARKETING_CHANNEL_LABELS[channel],
      group: "acquisitionChannels",
      value: channel,
    });
  }

  for (const state of filters.commercialStates) {
    chips.push({
      id: `estado:${state}`,
      label: MARKETING_COMMERCIAL_STATE_LABELS[state],
      group: "commercialStates",
      value: state,
    });
  }

  for (const page of filters.publicPageFilters) {
    chips.push({
      id: `pagina:${page}`,
      label: MARKETING_FILTER_LABELS.publicPageFilters[page],
      group: "publicPageFilters",
      value: page,
    });
  }

  return chips;
}

export function removeMarketingFilterChip(
  filters: MarketingFiltersState,
  chip: MarketingFilterChip
): MarketingFiltersState {
  if (chip.group === "period") {
    return { ...filters, period: "30d", customStart: "", customEnd: "" };
  }

  if (chip.group === "acquisitionChannels" && chip.value) {
    return {
      ...filters,
      acquisitionChannels: filters.acquisitionChannels.filter((item) => item !== chip.value),
    };
  }

  if (chip.group === "commercialStates" && chip.value) {
    return {
      ...filters,
      commercialStates: filters.commercialStates.filter((item) => item !== chip.value),
    };
  }

  if (chip.group === "publicPageFilters" && chip.value) {
    return {
      ...filters,
      publicPageFilters: filters.publicPageFilters.filter((item) => item !== chip.value),
    };
  }

  return filters;
}

export function filterMarketingProspects(
  prospects: MarketingProspectSnapshot[],
  filters: MarketingFiltersState
) {
  return prospects.filter((prospect) => {
    if (
      filters.acquisitionChannels.length > 0 &&
      !filters.acquisitionChannels.includes(prospect.channelId)
    ) {
      return false;
    }

    if (
      filters.commercialStates.length > 0 &&
      !filters.commercialStates.includes(prospect.commercialState)
    ) {
      return false;
    }

    if (
      !matchesSearch(filters.q, [
        prospect.empresa,
        prospect.contactoNombre,
        prospect.fuente,
        MARKETING_CHANNEL_LABELS[prospect.channelId],
      ])
    ) {
      return false;
    }

    return true;
  });
}

export function filterMarketingPublicCompanies(
  rows: MarketingPublicCompanyRow[],
  filters: MarketingFiltersState
) {
  return rows.filter((row) => {
    if (filters.publicPageFilters.length > 0) {
      const matches = filters.publicPageFilters.some((filter) => {
        if (filter === "publicada") return row.pageStatus === "publicada";
        if (filter === "no_configurada") {
          return row.pageStatus === "no_configurada" || row.pageStatus === "borrador";
        }
        if (filter === "con_solicitudes") return row.solicitudesInPeriod > 0;
        if (filter === "sin_solicitudes") return row.solicitudesInPeriod === 0;
        if (filter === "pendientes") return row.solicitudesPending > 0;
        return false;
      });
      if (!matches) return false;
    }

    if (
      !matchesSearch(filters.q, [
        row.empresaNombre,
        row.pageStatusLabel,
        row.recommendedLabel,
        row.slug,
      ])
    ) {
      return false;
    }

    return true;
  });
}

export function applyMarketingKpiFilter(
  filters: MarketingFiltersState,
  filterKey: string | undefined
): MarketingFiltersState {
  if (!filterKey) return filters;

  if (filterKey === "prospecto") {
    return { ...filters, commercialStates: ["prospecto"] };
  }
  if (filterKey === "demo_agendada") {
    return { ...filters, commercialStates: ["demo_agendada"] };
  }
  if (filterKey === "trial_iniciado") {
    return { ...filters, commercialStates: ["trial_iniciado"] };
  }
  if (filterKey === "cliente_pagado") {
    return { ...filters, commercialStates: ["cliente_pagado"] };
  }
  if (filterKey === "publicada") {
    return { ...filters, publicPageFilters: ["publicada"] };
  }
  if (filterKey === "no_configurada") {
    return { ...filters, publicPageFilters: ["no_configurada"] };
  }
  if (filterKey === "con_solicitudes") {
    return { ...filters, publicPageFilters: ["con_solicitudes"] };
  }
  if (filterKey === "pendientes") {
    return { ...filters, publicPageFilters: ["pendientes"] };
  }

  return filters;
}

export function applyMarketingFunnelFilter(
  filters: MarketingFiltersState,
  stageId: string
): MarketingFiltersState {
  const map: Record<string, MarketingCommercialStateFilter[]> = {
    prospectos: ["prospecto"],
    contactados: ["contactado"],
    demo: ["demo_agendada"],
    trial: ["trial_iniciado"],
    pagado: ["cliente_pagado"],
  };
  const next = map[stageId];
  if (!next) return filters;
  return { ...filters, commercialStates: next };
}

export function applyMarketingChannelFilter(
  filters: MarketingFiltersState,
  channelId: MarketingChannelId
): MarketingFiltersState {
  return { ...filters, acquisitionChannels: [channelId] };
}

export { normalizeMarketingChannel, resolveCommercialState };
