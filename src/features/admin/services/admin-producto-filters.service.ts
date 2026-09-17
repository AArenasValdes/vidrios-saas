import type {
  ProductoAccountRow,
  ProductoFilterChip,
  ProductoFiltersState,
  ProductoFunnelStepId,
  ProductoTableFilter,
} from "@/features/admin/types/admin-producto";

export const EMPTY_PRODUCTO_FILTERS: ProductoFiltersState = {
  period: "30d",
  tableFilters: [],
  funnelStage: null,
  search: "",
};

export const PRODUCTO_FILTER_LABELS: Record<ProductoTableFilter, string> = {
  no_first_quote: "Sin primera cotización",
  quote_no_pdf: "Cotizó sin PDF",
  page_not_published: "Página sin publicar",
  requests_no_quote: "Solicitudes sin cotizar",
  setup_incomplete: "Setup incompleto",
  inactive_14d: "Sin actividad 14 días",
  no_line_templates: "Sin líneas configuradas",
};

export function parseProductoFiltersFromSearchParams(params: URLSearchParams): ProductoFiltersState {
  const period = params.get("period");
  const parsedPeriod =
    period === "7d" || period === "30d" || period === "month" ? period : "30d";

  const tableFilters = params
    .getAll("filter")
    .filter((value): value is ProductoTableFilter =>
      Object.keys(PRODUCTO_FILTER_LABELS).includes(value)
    );

  const funnelStageParam = params.get("funnel");
  const funnelStage =
    funnelStageParam &&
    [
      "account_access",
      "first_quote",
      "pdf_generated",
      "activation_complete",
      "public_page_live",
      "first_lead",
      "quote_from_request",
    ].includes(funnelStageParam)
      ? (funnelStageParam as ProductoFunnelStepId)
      : null;

  return {
    period: parsedPeriod,
    tableFilters,
    funnelStage,
    search: params.get("q")?.trim() ?? "",
  };
}

export function productoFiltersToSearchParams(filters: ProductoFiltersState) {
  const params = new URLSearchParams();
  if (filters.period !== "30d") params.set("period", filters.period);
  if (filters.search) params.set("q", filters.search);
  if (filters.funnelStage) params.set("funnel", filters.funnelStage);
  for (const filter of filters.tableFilters) {
    params.append("filter", filter);
  }
  return params;
}

function matchesTableFilter(row: ProductoAccountRow, filter: ProductoTableFilter) {
  switch (filter) {
    case "no_first_quote":
      return row.cotizacionesCount === 0;
    case "quote_no_pdf":
      return row.cotizacionesCount > 0 && row.pdfsGeneradosCount === 0;
    case "page_not_published":
      return row.setupSteps.some((step) => step.key === "page" && !step.completed);
    case "requests_no_quote":
      return row.solicitudesLast30Days > 0 && row.cotizacionesCount === 0;
    case "setup_incomplete":
      return row.setupIncompleteCount > 0;
    case "inactive_14d":
      return row.isInactive14d;
    case "no_line_templates":
      return row.lineTemplatesCount === 0;
    default:
      return true;
  }
}

function matchesFunnelStage(row: ProductoAccountRow, stage: ProductoFunnelStepId) {
  switch (stage) {
    case "account_access":
      return true;
    case "first_quote":
      return row.cotizacionesCount > 0;
    case "pdf_generated":
    case "activation_complete":
      return row.pdfsGeneradosCount > 0;
    case "public_page_live":
      return row.setupSteps.some((step) => step.key === "page" && step.completed);
    case "first_lead":
      return row.setupSteps.some((step) => step.key === "first_lead" && step.completed);
    case "quote_from_request":
      return row.hasQuoteFromRequest;
    default:
      return true;
  }
}

export function filterProductoAccounts(
  rows: ProductoAccountRow[],
  filters: ProductoFiltersState
) {
  const search = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (search && !row.empresaNombre.toLowerCase().includes(search)) {
      return false;
    }

    if (filters.funnelStage && !matchesFunnelStage(row, filters.funnelStage)) {
      return false;
    }

    if (
      filters.tableFilters.length > 0 &&
      !filters.tableFilters.every((filter) => matchesTableFilter(row, filter))
    ) {
      return false;
    }

    return true;
  });
}

export function applyProductoKpiFilter(
  filters: ProductoFiltersState,
  kpiId: string | null
): ProductoFiltersState {
  if (!kpiId) return filters;

  if (kpiId === "setup_incomplete") {
    return { ...filters, tableFilters: ["setup_incomplete"] };
  }

  return filters;
}

export function applyProductoBottleneckFilter(
  filters: ProductoFiltersState,
  filterKey: ProductoTableFilter
): ProductoFiltersState {
  return {
    ...filters,
    tableFilters: filters.tableFilters.includes(filterKey)
      ? filters.tableFilters
      : [...filters.tableFilters, filterKey],
  };
}

export function applyProductoFunnelFilter(
  filters: ProductoFiltersState,
  stageId: ProductoFunnelStepId
): ProductoFiltersState {
  return {
    ...filters,
    funnelStage: filters.funnelStage === stageId ? null : stageId,
  };
}

export function buildProductoFilterChips(filters: ProductoFiltersState): ProductoFilterChip[] {
  const chips: ProductoFilterChip[] = [];

  if (filters.search) {
    chips.push({ id: "search", label: `Buscar: ${filters.search}` });
  }

  if (filters.funnelStage) {
    chips.push({ id: `funnel:${filters.funnelStage}`, label: `Embudo: ${filters.funnelStage}` });
  }

  for (const filter of filters.tableFilters) {
    chips.push({ id: `filter:${filter}`, label: PRODUCTO_FILTER_LABELS[filter] });
  }

  return chips;
}

export function removeProductoFilterChip(
  filters: ProductoFiltersState,
  chip: ProductoFilterChip
): ProductoFiltersState {
  if (chip.id === "search") {
    return { ...filters, search: "" };
  }

  if (chip.id.startsWith("funnel:")) {
    return { ...filters, funnelStage: null };
  }

  if (chip.id.startsWith("filter:")) {
    const filterKey = chip.id.replace("filter:", "") as ProductoTableFilter;
    return {
      ...filters,
      tableFilters: filters.tableFilters.filter((item) => item !== filterKey),
    };
  }

  return filters;
}

export function hasProductoActiveFilters(filters: ProductoFiltersState) {
  return (
    filters.search.length > 0 ||
    filters.funnelStage !== null ||
    filters.tableFilters.length > 0
  );
}
