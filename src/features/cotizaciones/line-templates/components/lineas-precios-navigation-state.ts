export const LINEAS_PRECIOS_RESTORE_QUERY = "restaurarFabricacion";
export const FABRICATION_CATALOG_ORIGIN_QUERY = "desdeCatalogo";
export const LINEAS_PRECIOS_RESTORE_HREF =
  `/configuracion/empresa/lineas-precios?${LINEAS_PRECIOS_RESTORE_QUERY}=1`;
export const LINEAS_PRECIOS_NAVIGATION_STATE_KEY =
  "ventora:lineas-precios:navigation-state:v1";

export type LineasPreciosMobileNavigationState = {
  scope: "mine" | "providers";
  mineDrill: string | null;
  providerName: string | null;
  providerFamilyKey: string | null;
  showHiddenUniversalReferences: boolean;
  selectedLineId: string | number | null;
};

export type LineasPreciosNavigationState = {
  query: string;
  categoryFilter: string;
  statusFilter: string;
  technicalFilter: string;
  providerFilter: string;
  expandedFamilyAccordions: Record<string, boolean>;
  scrollY: number;
  mobile: LineasPreciosMobileNavigationState;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNavigationState(value: unknown): value is LineasPreciosNavigationState {
  if (!isRecord(value) || !isRecord(value.expandedFamilyAccordions) || !isRecord(value.mobile)) {
    return false;
  }

  const mobile = value.mobile;
  return (
    typeof value.query === "string" &&
    typeof value.categoryFilter === "string" &&
    typeof value.statusFilter === "string" &&
    typeof value.technicalFilter === "string" &&
    typeof value.providerFilter === "string" &&
    typeof value.scrollY === "number" &&
    Number.isFinite(value.scrollY) &&
    (mobile.scope === "mine" || mobile.scope === "providers") &&
    (mobile.mineDrill === null || typeof mobile.mineDrill === "string") &&
    (mobile.providerName === null || typeof mobile.providerName === "string") &&
    (mobile.providerFamilyKey === null || typeof mobile.providerFamilyKey === "string") &&
    typeof mobile.showHiddenUniversalReferences === "boolean" &&
    (mobile.selectedLineId === null ||
      typeof mobile.selectedLineId === "string" ||
      typeof mobile.selectedLineId === "number")
  );
}

export function saveLineasPreciosNavigationState(
  storage: StorageLike,
  state: LineasPreciosNavigationState
) {
  try {
    storage.setItem(LINEAS_PRECIOS_NAVIGATION_STATE_KEY, JSON.stringify(state));
  } catch {
    // Navigation remains usable if browser storage is disabled or full.
  }
}

export function consumeLineasPreciosNavigationState(
  storage: StorageLike
): LineasPreciosNavigationState | null {
  try {
    const rawState = storage.getItem(LINEAS_PRECIOS_NAVIGATION_STATE_KEY);
    storage.removeItem(LINEAS_PRECIOS_NAVIGATION_STATE_KEY);
    if (!rawState) return null;

    const state: unknown = JSON.parse(rawState);
    return isNavigationState(state) ? state : null;
  } catch {
    try {
      storage.removeItem(LINEAS_PRECIOS_NAVIGATION_STATE_KEY);
    } catch {
      // Ignore storage errors and fall back to the default catalog view.
    }
    return null;
  }
}
