import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import {
  buildPieceDomainView,
  derivePieceCommercialStatus,
  derivePieceTechnicalStatus,
  isPieceCommerciallyComplete,
  isQuoteDesktopWorkspaceMode,
  readQuoteDesktopWorkspaceModePreference,
} from "../quote-piece-domain";

function baseItem(overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  return {
    id: "item-1",
    codigo: "VEN-01",
    tipo: "Ventana",
    lineaComercial: "Linea A",
    vidrio: "Incoloro 5mm",
    nombre: "Ventana 1",
    descripcion: "",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 100000,
    costoProveedorTotal: 100000,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 100000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: "",
    ...overrides,
  };
}

function snapshot(overrides: Partial<CotizacionItemCubicationSnapshot> = {}): CotizacionItemCubicationSnapshot {
  return {
    v: 1,
    source: "auto",
    lineTemplateId: "line-1",
    system: "corredera_2_hojas",
    status: "lista_para_probar",
    widthMm: 1200,
    heightMm: 1000,
    quantity: 1,
    capturedAt: "2026-07-20T00:00:00.000Z",
    cuts: [
      {
        label: "Marco H",
        functionLabel: "Marco",
        quantity: 2,
        lengthMm: 1200,
        totalLinealMm: 2400,
      },
    ],
    bars: [{ index: 1, usedMm: 2400, wasteMm: 3600, cuts: [] }],
    totalUsedMm: 2400,
    totalWasteMm: 3600,
    wastePct: 60,
    totalProfilesLinealMm: 2400,
    glass: { widthMm: 1100, heightMm: 900, quantity: 1, totalM2: 0.99 },
    accessoryUnits: 2,
    ...overrides,
  };
}

describe("quote-piece-domain", () => {
  it("lee preferencia de modo con default Cotización rápida", () => {
    expect(isQuoteDesktopWorkspaceMode("rapida")).toBe(true);
    expect(isQuoteDesktopWorkspaceMode("constructor")).toBe(false);
    const storage = {
      getItem: () => null,
    };
    expect(readQuoteDesktopWorkspaceModePreference(storage)).toBe("rapida");
  });

  it("separa completitud de avance y badge comercial", () => {
    const withoutLine = baseItem({
      lineaComercial: "",
      observaciones: "",
    });
    expect(isPieceCommerciallyComplete(withoutLine, "por_item")).toBe(true);
    expect(derivePieceCommercialStatus(withoutLine, "por_item")).toBe("falta_linea");

    const withoutPrice = baseItem({ precioUnitario: 0, precioTotal: 0 });
    expect(isPieceCommerciallyComplete(withoutPrice, "por_item")).toBe(false);
    expect(derivePieceCommercialStatus(withoutPrice, "por_item")).toBe("falta_precio");
  });

  it("tolera piezas legacy con campos de texto faltantes", () => {
    const legacyItem = baseItem({
      nombre: undefined as unknown as string,
      lineaComercial: undefined as unknown as string,
      vidrio: undefined as unknown as string,
    });

    expect(() => buildPieceDomainView(legacyItem, "por_item")).not.toThrow();
    expect(isPieceCommerciallyComplete(legacyItem, "por_item")).toBe(false);
    expect(derivePieceCommercialStatus(legacyItem, "por_item")).toBe("falta_nombre");
  });

  it("deriva estado técnico y resumen desde snapshot [cub:]", () => {
    const item = baseItem({
      observaciones: encodeCotizacionItemPresentationMeta({
        cubicationSnapshot: snapshot(),
        lineTemplateId: "line-1",
      }),
    });
    const view = buildPieceDomainView(item, "por_item");
    expect(view.technicalStatus).toBe("referencial");
    expect(view.technicalSummary.barras).toBe(1);
    expect(view.technicalSummary.cortes).toBe(2);
    expect(view.technicalSummary.accesorios).toBe(2);
    expect(view.technicalSummary.mlPerfiles).toBe(2.4);
  });

  it("marca requiere revisión cuando el snapshot no coincide con medidas", () => {
    const item = baseItem({
      ancho: 1500,
      observaciones: encodeCotizacionItemPresentationMeta({
        cubicationSnapshot: snapshot({ widthMm: 1200 }),
        lineTemplateId: "line-1",
      }),
    });
    expect(derivePieceTechnicalStatus(item)).toBe("requiere_revision");
  });

  it("marca sin reglas cuando la línea no tiene cuttingEnabled", () => {
    const template = {
      id: "line-1",
      catalogMetadata: { cuttingEnabled: false },
    } as CotizacionLineTemplate;
    const item = baseItem({
      observaciones: encodeCotizacionItemPresentationMeta({ lineTemplateId: "line-1" }),
    });
    expect(derivePieceTechnicalStatus(item, template)).toBe("sin_reglas");
  });
});
