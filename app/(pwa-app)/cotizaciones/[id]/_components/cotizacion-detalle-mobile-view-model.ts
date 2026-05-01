import { repairBrokenText } from "@/utils/repair-broken-text";
import type {
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
} from "@/features/cotizaciones/types/cotizacion-workflow";

const CLP_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const STATUS_META: Record<string, { cls: string; label: string }> = {
  aprobada: { cls: "stAprobada", label: "Aprobada" },
  enviada: { cls: "stEnviada", label: "Enviada" },
  borrador: { cls: "stBorrador", label: "Borrador" },
  creada: { cls: "stCreada", label: "Pendiente" },
  rechazada: { cls: "stRechazada", label: "Rechazada" },
};

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
  total: string;
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

function buildItemMeta(item: CotizacionWorkflowItem) {
  const size = item.ancho && item.alto ? `${item.ancho} × ${item.alto} mm` : "Medidas por definir";
  return `${size} · ${item.cantidad} ud`;
}

export function buildCotizacionDetalleMobileViewModel(
  record: CotizacionWorkflowRecord,
  options: BuildCotizacionDetalleMobileViewModelOptions = {}
): CotizacionDetalleMobileViewModel {
  const status = STATUS_META[record.estado] ?? STATUS_META.borrador;
  const items = record.items.map((item, index) => ({
    id: item.id,
    code: item.codigo || `I${index + 1}`,
    name: safeText(item.nombre || item.tipo, `Componente ${index + 1}`),
    meta: buildItemMeta(item),
    price: clp(item.precioTotal),
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
    total: clp(record.total),
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
