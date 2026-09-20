export type SolicitudesMobilePane = "bandeja" | "pagina";

const MOBILE_PANE_STORAGE_KEY = "vidrios-saas:solicitudes-mobile-pane";
const PAGE_NUDGE_STORAGE_PREFIX = "vidrios-saas:solicitudes-page-nudge:";

const paneListeners = new Set<() => void>();

function isMobilePane(value: string | null): value is SolicitudesMobilePane {
  return value === "bandeja" || value === "pagina";
}

export function readSolicitudesMobilePane(): SolicitudesMobilePane | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(MOBILE_PANE_STORAGE_KEY);
    return isMobilePane(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function subscribeSolicitudesMobilePane(listener: () => void) {
  paneListeners.add(listener);
  return () => {
    paneListeners.delete(listener);
  };
}

export function persistSolicitudesMobilePane(pane: SolicitudesMobilePane) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(MOBILE_PANE_STORAGE_KEY, pane);
    paneListeners.forEach((listener) => listener());
  } catch {
    return;
  }
}

export function getSolicitudesPageNudgeStorageKey(
  organizationId: string | number | null | undefined
) {
  if (!organizationId) {
    return null;
  }

  return `${PAGE_NUDGE_STORAGE_PREFIX}${String(organizationId)}`;
}

export function isSolicitudesPageNudgeDismissed(storageKey: string | null) {
  if (typeof window === "undefined" || !storageKey) {
    return false;
  }

  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export function persistSolicitudesPageNudgeDismissed(storageKey: string | null) {
  if (typeof window === "undefined" || !storageKey) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    return;
  }
}
