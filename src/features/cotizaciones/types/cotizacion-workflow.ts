import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { QuoteRegionSnapshot } from "@/features/organization-region/types/quote-region-snapshot";

export type EstadoCotizacionWorkflow =
  | "borrador"
  | "creada"
  | "enviada"
  | "aprobada"
  | "rechazada"
  | "terminada";

export type QuoteStudioFinancialDraft = {
  manoObra: number;
  traslado: number;
  otrosCostos: number;
  mermaPct: number;
  margenObjetivoRealPct: number;
};

export function createQuoteStudioFinancialDraft(
  overrides: Partial<QuoteStudioFinancialDraft> = {}
): QuoteStudioFinancialDraft {
  return {
    manoObra: 0,
    traslado: 0,
    otrosCostos: 0,
    mermaPct: 0,
    margenObjetivoRealPct: 30,
    ...overrides,
  };
}

export type CotizacionWorkflowItem = {
  id: string;
  tipoItem?: "componente" | "item_libre_con_valor";
  codigo: string;
  tipo: string;
  lineaComercial: string;
  vidrio: string;
  nombre: string;
  descripcion: string;
  ancho: number | null;
  alto: number | null;
  cantidad: number;
  unidad: string;
  areaM2: number | null;
  costoProveedorUnitario: number;
  costoProveedorTotal: number;
  margenPct: number;
  precioUnitario: number;
  precioTotal: number;
  precioPorM2: number | null;
  minimoCobrable: number | null;
  redondeoPrecio: number | null;
  precioPlantillaSugerido: number | null;
  precioAjustadoManual: boolean;
  origenPrecio: "margen" | "plantilla" | "manual";
  observaciones: string;
  fabricacionSnapshot?: FabricacionCotizacionSnapshot | null;
};

export type CotizacionWorkflowRecord = {
  id: string;
  codigo: string;
  clientId?: string | number | null;
  projectId?: string | number | null;
  clienteNombre: string;
  clienteTelefono: string;
  obra: string;
  direccion: string;
  validez: string;
  descuentoPct: number;
  descuentoTipo?: "porcentaje" | "monto";
  descuentoMonto?: number;
  observaciones: string;
  estado: EstadoCotizacionWorkflow;
  approvalToken: string | null;
  approvalTokenExpiresAt: string | null;
  clienteVioEn: string | null;
  clienteRespondioEn: string | null;
  clienteRespuestaCanal: string | null;
  pdfDescargadoEn: string | null;
  regionalSnapshot?: QuoteRegionSnapshot | null;
  createdAt: string;
  updatedAt: string;
  items: CotizacionWorkflowItem[];
  subtotal: number;
  descuentoValor: number;
  neto: number;
  iva: number;
  flete: number;
  redondeoComercial?: number;
  total: number;
  quotePricingMode?: QuotePricingMode;
  costoTotalFabricacion?: number;
  margenGlobalPct?: number;
  utilidadTotal?: number;
  totalClienteManual?: number | null;
  mostrarIva?: boolean;
  quoteStudioFinancial?: QuoteStudioFinancialDraft;
};

export type CotizacionWorkflowDraft = {
  clienteNombre: string;
  clienteTelefono: string;
  obra: string;
  direccion: string;
  validez: string;
  descuentoPct: number;
  descuentoTipo?: "porcentaje" | "monto";
  descuentoMonto?: number;
  flete: number;
  observaciones: string;
  condicionesDePago?: string;
  items: CotizacionWorkflowItem[];
  quotePricingMode?: QuotePricingMode;
  costoTotalFabricacion?: number;
  margenGlobalPct?: number;
  utilidadTotal?: number;
  totalClienteManual?: number | null;
  mostrarIva?: boolean;
  quoteStudioFinancial?: QuoteStudioFinancialDraft;
};
