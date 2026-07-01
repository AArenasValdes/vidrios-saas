import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import { reconcileWorkflowItemsPricing } from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  getDefaultConfigurationForComponent,
  getDefaultSystemForComponent,
  resolveCanonicalComponentType,
} from "@/features/cotizaciones/services/component-catalog.service";
import { calculateComponentItem } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { OnboardingStepRecord, OnboardingStepState } from "@/features/onboarding/types/onboarding-checklist";
import type { EntityId } from "@/types/common";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";

export const ACTIVATION_DEMO = {
  clienteNombre: "Cliente de prueba",
  obra: "Ventana corredera",
  componenteNombre: "Ventana corredera de aluminio",
  ancho: 1200,
  alto: 1000,
  cantidad: 1,
  total: 180_000,
} as const;

export type ActivationFlowStatus = {
  shouldRedirect: boolean;
  quoteCount: number;
  activationState: OnboardingStepState | null;
};

export function isActivationReplayMode(searchParams?: URLSearchParams | string | null) {
  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : searchParams ??
        (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null);

  if (!params) {
    return false;
  }

  const value = (params.get("replay") ?? params.get("activacion_preview") ?? "")
    .trim()
    .toLowerCase();

  return value === "1" || value === "true" || value === "si";
}

export function buildActivationPrintHref(
  cotizacionId: string,
  options?: { isReplayMode?: boolean }
): string {
  const params = new URLSearchParams({ from: "activacion" });
  if (options?.isReplayMode) {
    params.set("replay", "1");
  }
  return `/print/cotizaciones/${cotizacionId}?${params.toString()}`;
}

export function buildActivationReturnHref(
  cotizacionId: string,
  options?: { isReplayMode?: boolean }
): string {
  const params = new URLSearchParams({
    step: "result",
    cotizacion: cotizacionId,
  });
  if (options?.isReplayMode) {
    params.set("replay", "1");
  }
  return `/activacion?${params.toString()}`;
}

export function parseActivationReturnParams(searchParams?: URLSearchParams | string | null) {
  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : searchParams ?? null;

  if (!params || params.get("step") !== "result") {
    return null;
  }

  const cotizacionId = params.get("cotizacion")?.trim();
  if (!cotizacionId) {
    return null;
  }

  return {
    cotizacionId,
    isReplayMode: isActivationReplayMode(params),
  };
}

export function resolvePrintViewerBackNavigation(input: {
  from: string | null;
  cotizacionId: string;
  isReplayMode?: boolean;
}): { href: string; label: string } {
  if (input.from === "activacion") {
    return {
      href: buildActivationReturnHref(input.cotizacionId, {
        isReplayMode: input.isReplayMode,
      }),
      label: "Volver a la guia",
    };
  }

  return {
    href: "/cotizaciones",
    label: "Volver a cotizaciones",
  };
}

export function resolveActivationFlowStatus(input: {
  rol: string | null | undefined;
  quoteCount: number;
  activationRecord: OnboardingStepRecord | null;
}): ActivationFlowStatus {
  const activationState = input.activationRecord?.estado ?? null;
  const isFinished =
    activationState === "completado" || activationState === "omitido";

  const shouldRedirect =
    input.rol === "admin" && input.quoteCount === 0 && !isFinished;

  return {
    shouldRedirect,
    quoteCount: input.quoteCount,
    activationState,
  };
}

export type ActivationQuoteSummaryItem = {
  id: string;
  title: string;
  detail: string;
  lineaComercial?: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
};

export type ActivationQuoteSummary = {
  codigo: string;
  clienteNombre: string;
  obra: string;
  items: ActivationQuoteSummaryItem[];
  subtotal: number;
  descuentoValor: number;
  neto: number;
  iva: number;
  flete: number;
  total: number;
  includesIva: boolean;
  quotePricingMode: QuotePricingMode;
};

function inferActivationComponentType(...labels: Array<string | null | undefined>): string {
  const haystack = labels
    .filter((label): label is string => Boolean(label?.trim()))
    .join(" ")
    .toLowerCase();

  const rules: Array<{ tokens: string[]; tipo: string }> = [
    { tokens: ["shower", "mampara"], tipo: "Shower door" },
    { tokens: ["puerta"], tipo: "Puerta" },
    { tokens: ["ventana"], tipo: "Ventana" },
    { tokens: ["espejo"], tipo: "Espejo" },
    { tokens: ["baranda"], tipo: "Baranda" },
    { tokens: ["cierre", "terraza", "logia"], tipo: "Cierre terraza/logia" },
    { tokens: ["pano", "paño"], tipo: "Paño fijo" },
  ];

  for (const rule of rules) {
    if (rule.tokens.some((token) => haystack.includes(token))) {
      return resolveCanonicalComponentType(rule.tipo);
    }
  }

  return resolveCanonicalComponentType(labels.find((label) => label?.trim())?.trim() ?? "Ventana");
}

function buildActivationItemDetail(item: CotizacionWorkflowItem): string {
  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
  const parts: string[] = [];

  if (item.ancho && item.alto) {
    parts.push(`${Math.round(item.ancho)} x ${Math.round(item.alto)} mm`);
  }

  if (item.cantidad > 0) {
    parts.push(`Cant. ${item.cantidad}`);
  }

  const lineLabel = (item.lineaComercial.trim() || presentation.sistema.trim()).replace(/^Linea\s+/i, "");
  if (lineLabel) {
    parts.push(`Linea ${lineLabel}`);
  }

  if (presentation.material) {
    parts.push(presentation.material);
  }

  return parts.join(" · ") || item.descripcion.trim() || item.tipo;
}

export function buildActivationQuoteSummary(
  record: CotizacionWorkflowRecord
): ActivationQuoteSummary {
  const quotePricingMode = record.quotePricingMode ?? "por_item";

  if (quotePricingMode === "total_global") {
    const title = record.obra.trim() || "Trabajo general";
    const detail =
      record.observaciones.trim() ||
      record.items.find((item) => item.descripcion.trim())?.descripcion.trim() ||
      record.items.find((item) => item.nombre.trim())?.nombre.trim() ||
      "Cotizacion rapida por total";

    return {
      codigo: record.codigo,
      clienteNombre: record.clienteNombre,
      obra: record.obra,
      items: [
        {
          id: "activation-total-global",
          title,
          detail,
          cantidad: 1,
          precioUnitario: record.neto,
          precioTotal: record.neto,
        },
      ],
      subtotal: record.subtotal,
      descuentoValor: record.descuentoValor,
      neto: record.neto,
      iva: record.iva,
      flete: record.flete,
      total: record.total,
      includesIva: record.iva > 0,
      quotePricingMode,
    };
  }

  const items = record.items
    .filter((item) => item.precioTotal > 0 || item.tipoItem === "item_libre_con_valor")
    .map((item) => ({
      id: item.id,
      title: item.nombre.trim() || item.tipo,
      detail: buildActivationItemDetail(item),
      lineaComercial: item.lineaComercial,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      precioTotal: item.precioTotal,
    }));

  return {
    codigo: record.codigo,
    clienteNombre: record.clienteNombre,
    obra: record.obra,
    items,
    subtotal: record.subtotal,
    descuentoValor: record.descuentoValor,
    neto: record.neto,
    iva: record.iva,
    flete: record.flete,
    total: record.total,
    includesIva: record.iva > 0,
    quotePricingMode,
  };
}

function buildActivationComponentPresentation(tipo: string) {
  const canonicalTipo = resolveCanonicalComponentType(tipo);
  const sistema = getDefaultSystemForComponent(canonicalTipo) || "A medida";
  const configuracion = getDefaultConfigurationForComponent(canonicalTipo, sistema);

  return {
    canonicalTipo,
    sistema,
    configuracion,
  };
}

function buildComponentWorkflowItem(input: {
  nombre: string;
  descripcion: string;
  tipo?: string;
  lineaComercial?: string;
  ancho?: number | null;
  alto?: number | null;
  cantidad?: number;
  precioTotal?: number;
  codigo?: string;
  includeMeasurements?: boolean;
}): CotizacionWorkflowItem {
  const cantidad = input.cantidad && input.cantidad > 0 ? Math.round(input.cantidad) : 1;
  const precioTotal = input.precioTotal ?? 0;
  const precioUnitario = precioTotal > 0 ? precioTotal / cantidad : 0;
  const ancho = input.includeMeasurements === false ? null : (input.ancho ?? null);
  const alto = input.includeMeasurements === false ? null : (input.alto ?? null);
  const areaM2 =
    ancho && alto
      ? Number(((ancho / 1000) * (alto / 1000) * cantidad).toFixed(2))
      : null;
  const tipo = resolveCanonicalComponentType(input.tipo ?? inferActivationComponentType(input.nombre));
  const presentation = buildActivationComponentPresentation(tipo);
  const sistema = input.lineaComercial?.trim() || presentation.sistema;

  return {
    id: `activation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipoItem: "componente",
    codigo: input.codigo ?? "V1",
    tipo: presentation.canonicalTipo,
    lineaComercial: sistema,
    vidrio: "",
    nombre: input.nombre,
    descripcion: input.descripcion,
    ancho,
    alto,
    cantidad,
    unidad: "unidad",
    areaM2,
    costoProveedorUnitario: precioUnitario,
    costoProveedorTotal: precioTotal,
    margenPct: 0,
    precioUnitario,
    precioTotal,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: true,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      referencia: sistema,
      sistema,
      configuracion: presentation.configuracion,
      pricingMode: "precio_directo",
      displayMode: "componente",
      precioAjustadoManual: true,
      origenPrecio: "manual",
    }),
  };
}

/** Prepara el borrador de activacion para guardado productivo sin perder datos. */
export function finalizeActivationDraftForSave(
  draft: CotizacionWorkflowDraft
): CotizacionWorkflowDraft {
  const quotePricingMode = draft.quotePricingMode ?? "por_item";

  return {
    ...draft,
    quotePricingMode,
    items: reconcileActivationDraftItems({
      ...draft,
      quotePricingMode,
    }),
  };
}

function simulateActivationItemDbRoundTrip(item: CotizacionWorkflowItem): CotizacionWorkflowItem {
  const reloaded = calculateComponentItem({
    id: item.id,
    codigo: item.codigo,
    tipo: item.tipo,
    lineaComercial: item.lineaComercial,
    vidrio: item.vidrio,
    nombre: item.nombre,
    descripcion: item.descripcion,
    ancho: item.ancho,
    alto: item.alto,
    cantidad: item.cantidad,
    costoProveedorUnitario: item.costoProveedorUnitario,
    margenPct: item.margenPct,
    observaciones: item.observaciones,
    precioAjustadoManual: item.precioAjustadoManual,
    origenPrecio: item.origenPrecio,
    tipoItem: "componente",
  });

  return reconcileWorkflowItemsPricing([reloaded], "por_item")[0] ?? reloaded;
}

/** Verifica persistencia tipica de un item de activacion tras guardado. */
export function verifyActivationComponentItemPersistence(
  item: CotizacionWorkflowItem
): CotizacionWorkflowItem {
  return simulateActivationItemDbRoundTrip(
    reconcileWorkflowItemsPricing([item], "por_item")[0] ?? item
  );
}

/** Conserva el precio ingresado tras el reconcile del guardado productivo. */
export function reconcileActivationDraftItems(
  draft: CotizacionWorkflowDraft
): CotizacionWorkflowItem[] {
  return reconcileWorkflowItemsPricing(
    draft.items,
    draft.quotePricingMode ?? "por_item"
  );
}

function buildActivationTotalGlobalDraft(input: {
  clienteNombre: string;
  obra: string;
  descripcion: string;
  total: number;
}): CotizacionWorkflowDraft {
  return {
    clienteNombre: input.clienteNombre.trim() || "Cliente sin nombre",
    clienteTelefono: "+56 9 ",
    obra: input.obra.trim(),
    direccion: "",
    validez: "15 dias",
    descuentoPct: 0,
    flete: 0,
    observaciones: input.descripcion.trim(),
    quotePricingMode: "total_global",
    totalClienteManual: input.total,
    mostrarIva: false,
    costoTotalFabricacion: 0,
    margenGlobalPct: 0,
    items: [],
  };
}

function buildActivationComponentDraftBase(input: {
  clienteNombre: string;
  obra: string;
  tipoTrabajo: string;
  componenteNombre: string;
  descripcion: string;
  lineaComercial?: string;
  ancho: number;
  alto: number;
  cantidad: number;
  total: number;
}): CotizacionWorkflowDraft {
  return {
    clienteNombre: input.clienteNombre.trim() || "Cliente sin nombre",
    clienteTelefono: "+56 9 ",
    obra: input.obra.trim(),
    direccion: "",
    validez: "15 dias",
    descuentoPct: 0,
    flete: 0,
    observaciones: "",
    quotePricingMode: "por_item",
    mostrarIva: true,
    items: [
      buildComponentWorkflowItem({
        nombre: input.componenteNombre.trim(),
        descripcion: input.descripcion.trim() || input.componenteNombre.trim(),
        tipo: inferActivationComponentType(input.tipoTrabajo, input.componenteNombre),
        lineaComercial: input.lineaComercial,
        ancho: input.ancho,
        alto: input.alto,
        cantidad: input.cantidad,
        precioTotal: input.total,
        codigo: "V1",
      }),
    ],
  };
}

export function buildActivationDemoDraft(): CotizacionWorkflowDraft {
  return buildActivationComponentDraftBase({
    clienteNombre: ACTIVATION_DEMO.clienteNombre,
    obra: ACTIVATION_DEMO.obra,
    tipoTrabajo: ACTIVATION_DEMO.obra,
    componenteNombre: ACTIVATION_DEMO.componenteNombre,
    descripcion: ACTIVATION_DEMO.componenteNombre,
    lineaComercial: "Corredera",
    ancho: ACTIVATION_DEMO.ancho,
    alto: ACTIVATION_DEMO.alto,
    cantidad: ACTIVATION_DEMO.cantidad,
    total: ACTIVATION_DEMO.total,
  });
}

export function buildActivationRealDraft(input: {
  clienteNombre?: string;
  tipoTrabajo: string;
  descripcion: string;
  total: number;
}): CotizacionWorkflowDraft {
  const tipoTrabajo = input.tipoTrabajo.trim();
  const descripcion = input.descripcion.trim() || tipoTrabajo;

  return buildActivationTotalGlobalDraft({
    clienteNombre: input.clienteNombre?.trim() ?? "",
    obra: tipoTrabajo,
    descripcion,
    total: input.total,
  });
}

export function buildActivationRealComponentDraft(input: {
  clienteNombre?: string;
  tipoTrabajo: string;
  componenteNombre: string;
  descripcion?: string;
  lineaComercial?: string;
  ancho: number;
  alto: number;
  cantidad?: number;
  total: number;
}): CotizacionWorkflowDraft {
  const tipoTrabajo = input.tipoTrabajo.trim();
  const componenteNombre = input.componenteNombre.trim() || tipoTrabajo;

  return buildActivationComponentDraftBase({
    clienteNombre: input.clienteNombre?.trim() ?? "",
    obra: tipoTrabajo,
    tipoTrabajo,
    componenteNombre,
    descripcion: input.descripcion?.trim() || componenteNombre,
    lineaComercial: input.lineaComercial?.trim(),
    ancho: input.ancho,
    alto: input.alto,
    cantidad: input.cantidad && input.cantidad > 0 ? input.cantidad : 1,
    total: input.total,
  });
}

export type ActivationFlowAction = "complete" | "skip";

export function resolveActivationCompletionSource(action: ActivationFlowAction) {
  return action === "skip" ? "activation_flow_skipped" : "activation_flow_completed";
}

export function resolveActivationCompletionState(
  action: ActivationFlowAction
): Extract<OnboardingStepState, "completado" | "omitido"> {
  return action === "skip" ? "omitido" : "completado";
}

export type ActivationOrganizationContext = {
  organizationId: EntityId;
};
