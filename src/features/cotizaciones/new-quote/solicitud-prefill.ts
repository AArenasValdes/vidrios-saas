import { createCotizacionWorkflowDraft } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import {
  buildWorkflowStorageKey,
  createEmptyComponentForm,
  formatDraftPhoneValue,
  type PersistedWorkflowState,
} from "@/features/cotizaciones/new-quote/workflow-ui";

export const SOLICITUD_PREFILL_CLIENT_ID_PREFIX = "solicitud-prefill:";
const SOLICITUD_PREFILL_SOURCE_KEY = "cotizacion-workflow:new:solicitud-source";

export type NuevaCotizacionSolicitudPrefill = {
  sourceSolicitudId?: string;
  clienteNombre: string;
  clienteTelefono: string;
  obra: string;
  observaciones: string;
  pricingMode?: PricingMode;
  defaultMargin?: number;
};

export function buildNuevaCotizacionSolicitudPrefillState(
  input: NuevaCotizacionSolicitudPrefill
): PersistedWorkflowState {
  const draft = createCotizacionWorkflowDraft();
  const normalizedObra = input.obra.trim() || "Solicitud comercial";
  const normalizedTelefono = input.clienteTelefono.trim()
    ? formatDraftPhoneValue(input.clienteTelefono)
    : "";
  const normalizedObservaciones = input.observaciones.trim();
  const pricingMode = input.pricingMode ?? "margen";

  const selectedClientId = input.clienteNombre.trim()
    ? `${SOLICITUD_PREFILL_CLIENT_ID_PREFIX}${input.clienteNombre
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")}`
    : "";

  return {
    version: 3,
    step: 2,
    draft: {
      ...draft,
      clienteNombre: input.clienteNombre.trim(),
      clienteTelefono: normalizedTelefono,
      obra: normalizedObra,
      observaciones: normalizedObservaciones,
      items: [],
    },
    componentForm: createEmptyComponentForm(
      [],
      "",
      pricingMode,
      input.defaultMargin
    ),
    editingItemId: null,
    selectedClientId,
    clientQuery: input.clienteNombre.trim(),
    showStep1MoreData: Boolean(normalizedTelefono || normalizedObservaciones),
  };
}

export function persistNuevaCotizacionSolicitudPrefill(
  input: NuevaCotizacionSolicitudPrefill
) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = buildWorkflowStorageKey(null, null);
  const state = buildNuevaCotizacionSolicitudPrefillState(input);

  window.localStorage.setItem(storageKey, JSON.stringify(state));

  if (input.sourceSolicitudId?.trim()) {
    window.sessionStorage.setItem(
      SOLICITUD_PREFILL_SOURCE_KEY,
      input.sourceSolicitudId.trim()
    );
  } else {
    window.sessionStorage.removeItem(SOLICITUD_PREFILL_SOURCE_KEY);
  }
}

export function getNuevaCotizacionSolicitudSourceId() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(SOLICITUD_PREFILL_SOURCE_KEY);
  return value?.trim() ? value.trim() : null;
}

export function clearNuevaCotizacionSolicitudSourceId() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SOLICITUD_PREFILL_SOURCE_KEY);
}
