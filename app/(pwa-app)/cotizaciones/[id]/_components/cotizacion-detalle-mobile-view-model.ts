import type {
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  resolveCotizacionClosureState,
  resolveCotizacionWorkflowState,
} from "@/features/cotizaciones/services/cotizacion-display-state.service";
import {
  buildCotizacionMirrorFormatLabel,
  buildCotizacionMirrorPaneMeasure,
  decodeCotizacionItemPresentationMeta,
  isCotizacionMirrorDivided,
} from "@/utils/cotizacion-item-presentation";
import { repairBrokenText } from "@/utils/repair-broken-text";

const CLP_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export type CotizacionDetalleMobileItem = {
  id: string;
  code: string;
  name: string;
  meta: string;
  price: string;
};

export type CotizacionDetalleMobileViewModel = {
  code: string;
  statusClass: string;
  statusLabel: string;
  responseStatus: "pendiente" | "aprobada" | "rechazada" | "terminada";
  responseStatusClass: string;
  responseStatusLabel: string;
  responseChannelLabel: string;
  responseUpdatedLabel: string;
  total: string;
  isTotalGlobal: boolean;
  globalCost: string;
  globalMargin: string;
  globalUtility: string;
  heroSubtext: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  validity: string;
  itemsCount: number;
  items: CotizacionDetalleMobileItem[];
  subtotal: string;
  discount: string;
  iva: string;
  notes: string;
};

type BuildCotizacionDetalleMobileViewModelOptions = {
  isHydratingItems?: boolean;
};

function clp(value: number) {
  return CLP_FORMATTER.format(value);
}

function safeText(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? repairBrokenText(trimmed) : fallback;
}

function formatTrackingDate(value: string | null | undefined) {
  if (!value) {
    return "Sin registro todavia";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Sin registro todavia";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function resolveResponseChannelLabel(value: string | null | undefined) {
  if (!value?.trim()) {
    return "Sin seguimiento registrado";
  }

  if (value === "manual_app") {
    return "Marcado manualmente en la app";
  }

  if (value === "link_publico") {
    return "Respondio desde el enlace";
  }

  return repairBrokenText(value);
}

function buildItemMeta(item: CotizacionWorkflowItem) {
  const size =
    item.ancho && item.alto ? `${item.ancho} × ${item.alto} mm` : "Medidas por definir";
  const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
  const { referencia } = meta;
  const mirrorFormatLabel = isCotizacionMirrorDivided({
    tipo: item.tipo,
    mirrorFormat: meta.mirrorFormat,
    mirrorPaneCount: meta.mirrorPaneCount,
  })
    ? buildCotizacionMirrorFormatLabel({ mirrorPaneCount: meta.mirrorPaneCount })
    : null;
  const mirrorPaneMeasure = mirrorFormatLabel
    ? buildCotizacionMirrorPaneMeasure({
        ancho: item.ancho,
        alto: item.alto,
        mirrorPaneCount: meta.mirrorPaneCount,
        mirrorPaneDirection: meta.mirrorPaneDirection,
      })?.label ?? null
    : null;
  const referenceLabel = referencia.trim() ? `Línea ${referencia.trim()}` : null;
  const isGlassProduct = meta.catalogCategoria === "vidrio" || meta.material === "Cristal";
  const glassLabel = [referencia.trim(), meta.catalogEspesor, meta.catalogTerminacion]
    .filter(Boolean)
    .join(" · ");
  const displayReferenceLabel = isGlassProduct
    ? glassLabel
      ? `Producto de cristal ${glassLabel}`
      : "Producto de cristal"
    : referenceLabel;
  const lineLabel = [mirrorFormatLabel, mirrorPaneMeasure, displayReferenceLabel]
    .filter(Boolean)
    .join(" · ");

  return [size, `${item.cantidad} ud`, lineLabel].filter(Boolean).join(" · ");
}

export function buildCotizacionDetalleMobileViewModel(
  record: CotizacionWorkflowRecord,
  options: BuildCotizacionDetalleMobileViewModelOptions = {}
): CotizacionDetalleMobileViewModel {
  const displayInput = {
    estado: record.estado,
    pdfDescargadoEn: record.pdfDescargadoEn,
  };
  const status = resolveCotizacionWorkflowState(displayInput);
  const response = resolveCotizacionClosureState(displayInput);
  const isTotalGlobal = record.quotePricingMode === "total_global";
  const items = record.items.map((item, index) => ({
    id: item.id,
    code: item.codigo || `I${index + 1}`,
    name: safeText(item.nombre || item.tipo, `Componente ${index + 1}`),
    meta: buildItemMeta(item),
    price: isTotalGlobal ? "" : clp(item.precioTotal),
  }));
  const summary =
    options.isHydratingItems && items.length === 0
      ? "Cargando componentes"
      : `${items.length} componente${items.length === 1 ? "" : "s"}`;
  const subtotal = record.subtotal ?? Math.max(record.total - (record.iva ?? 0), 0);
  const discountValue =
    record.descuentoValor ??
    (record.descuentoPct > 0 ? Math.round(subtotal * (record.descuentoPct / 100)) : 0);

  return {
    code: record.codigo,
    statusClass: status.cls,
    statusLabel: status.label,
    responseStatus:
      response.label === "Aprobada"
        ? "aprobada"
        : response.label === "Rechazada"
          ? "rechazada"
          : response.label === "Terminada"
            ? "terminada"
            : "pendiente",
    responseStatusClass: response.cls,
    responseStatusLabel: response.label,
    responseChannelLabel: resolveResponseChannelLabel(record.clienteRespuestaCanal),
    responseUpdatedLabel: formatTrackingDate(record.clienteRespondioEn),
    total: clp(record.total),
    isTotalGlobal,
    globalCost: clp(record.costoTotalFabricacion ?? 0),
    globalMargin: `${record.margenGlobalPct ?? 0}%`,
    globalUtility: clp(record.utilidadTotal ?? 0),
    heroSubtext: [
      safeText(record.clienteNombre, "Sin cliente"),
      safeText(record.obra, "Sin obra"),
      summary,
    ].join(" · "),
    clientName: safeText(record.clienteNombre, "Sin cliente"),
    clientPhone: safeText(record.clienteTelefono, "Sin teléfono"),
    clientAddress: safeText(record.direccion, "Sin dirección"),
    validity: safeText(record.validez, "Sin vigencia"),
    itemsCount: items.length,
    items,
    subtotal: clp(subtotal),
    discount: clp(discountValue),
    iva: clp(record.iva ?? 0),
    notes: safeText(record.observaciones, "Sin observaciones ni cierre adicional."),
  };
}
