/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ organizacionId: "org-1", userId: "user-1" }),
}));
jest.mock("@/features/organization-profile/hooks/use-organization-measure-unit", () => ({
  useOrganizationMeasureUnit: () => "mm",
}));
jest.mock("../../../../_hooks/use-mobile-viewport-stability", () => ({
  useMobileViewportStability: () => undefined,
}));

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { buildCatalogGlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { buildItemFromForm, mapItemToForm } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { QuoteConstructorItemPatch } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";

import { CuadernoConstructorMovil } from "../cuaderno-constructor-movil";

function glassTemplate(
  id: number,
  nombre: string,
  espesorMm: number
): CotizacionLineTemplate {
  return {
    id,
    organizationId: "org-1",
    nombre,
    categoria: "vidrio",
    unidadCobro: "m2",
    material: "Cristal",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 50000,
    minimoCobrable: 0,
    redondeoPrecio: 0,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {
      espesorMm,
      categoriaTecnica: "monolitico",
      corteManualEstado: "confirmed",
      revisionTecnicaExplicita: false,
      planchaAnchoMm: 2500,
      planchaAltoMm: 1800,
      orientacionCorte: "rotatable",
    },
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
  };
}

const glass5 = glassTemplate(3643, "Float Incoloro 5mm", 5);
const glass6 = glassTemplate(3644, "Float Incoloro 6mm", 6);

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
});

function baseItem(
  overrides: Partial<CotizacionWorkflowItem> = {}
): CotizacionWorkflowItem {
  const technicalSpec = buildCatalogGlassTechnicalSpec({
    productId: "3643",
    metadata: glass5.catalogMetadata,
  });
  return {
    id: "row-1",
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "Linea A",
    vidrio: glass5.nombre,
    nombre: "Ventana QA",
    descripcion: "",
    ancho: 1200,
    alto: 1000,
    cantidad: 3,
    unidad: "unidad",
    areaM2: 3.6,
    costoProveedorUnitario: 100000,
    costoProveedorTotal: 300000,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 300000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      logicalComponentId: "logical-window-1",
      vidrioLineTemplateId: "3643",
      glassTechnicalSpec: technicalSpec,
      guidedVisualConfig: createQuoteConstructorPresetConfig("corredera"),
    }),
    ...overrides,
  };
}

function renderConstructor(
  item: CotizacionWorkflowItem,
  onUpdateItem: (itemId: string, patch: QuoteConstructorItemPatch) => void
) {
  return render(
    <CuadernoConstructorMovil
      item={item}
      quotePricingMode="por_item"
      lineTemplates={[glass5, glass6]}
      glassOptions={["Vidrio personalizado"]}
      formatCurrencyInput={(value) => value}
      onUpdateItem={onUpdateItem}
      onClose={jest.fn()}
      onSaved={jest.fn()}
      onDuplicate={jest.fn()}
      onRemove={jest.fn()}
    />
  );
}

function openGlassSection() {
  fireEvent.click(screen.getByRole("button", { name: /Vidrio y color/ }));
}

function openCatalog() {
  fireEvent.click(screen.getByRole("button", { name: "Elegir vidrio del catálogo" }));
}

describe("CuadernoConstructorMovil glass identity", () => {
  it("selects catalog product 3643 by ID and emits its frozen technical specification", () => {
    const onUpdateItem = jest.fn();
    renderConstructor(baseItem({ vidrio: "Vidrio anterior" }), onUpdateItem);
    openGlassSection();
    openCatalog();

    fireEvent.click(within(screen.getByRole("listbox", { name: "Elegir vidrio del catálogo" })).getByRole("option", {
      name: /Float Incoloro 5mm/,
    }));

    expect(onUpdateItem).toHaveBeenCalledWith("row-1", expect.objectContaining({
      vidrio: "Float Incoloro 5mm",
      vidrioLineTemplateId: "3643",
      glassTechnicalSpec: expect.objectContaining({
        productId: "3643",
        thicknessMm: 5,
        category: "monolitico",
        sheetWidthMm: 2500,
        sheetHeightMm: 1800,
        pieceOrientation: "rotatable",
        manualCutStatus: "confirmed",
        provenance: "catalog",
      }),
    }));
  });

  it("replaces the previous product specification when another catalog glass is selected", () => {
    const onUpdateItem = jest.fn();
    renderConstructor(baseItem(), onUpdateItem);
    openGlassSection();
    openCatalog();

    fireEvent.click(within(screen.getByRole("listbox", { name: "Elegir vidrio del catálogo" })).getByRole("option", {
      name: /Float Incoloro 6mm/,
    }));

    expect(onUpdateItem).toHaveBeenCalledWith("row-1", expect.objectContaining({
      vidrioLineTemplateId: "3644",
      glassTechnicalSpec: expect.objectContaining({ productId: "3644", thicknessMm: 6 }),
    }));
    const patch = onUpdateItem.mock.calls[0]?.[1] as QuoteConstructorItemPatch;
    expect(patch.glassTechnicalSpec).not.toMatchObject({ productId: "3643", thicknessMm: 5 });
  });

  it("clears the catalog association and technical spec for a custom glass", () => {
    const onUpdateItem = jest.fn();
    renderConstructor(baseItem(), onUpdateItem);
    openGlassSection();
    fireEvent.click(screen.getByRole("button", { name: "Elegir vidrio personalizado o sugerido" }));
    fireEvent.click(screen.getByRole("option", { name: "Vidrio personalizado" }));

    expect(onUpdateItem).toHaveBeenCalledWith("row-1", expect.objectContaining({
      vidrio: "Vidrio personalizado",
      vidrioLineTemplateId: "",
      glassTechnicalSpec: null,
    }));
  });

  it("keeps logical component identity and physical quantity when editing other properties", () => {
    const item = baseItem();
    const onUpdateItem = jest.fn();
    renderConstructor(item, onUpdateItem);
    openGlassSection();
    fireEvent.click(screen.getByRole("button", { name: "Negro" }));

    expect(mapItemToForm(item).logicalComponentId).toBe("logical-window-1");
    expect(item.cantidad).toBe(3);
    expect(onUpdateItem).toHaveBeenCalledWith("row-1", expect.objectContaining({ colorHex: "#2a2a2a" }));
    expect(onUpdateItem.mock.calls[0]?.[1]).not.toHaveProperty("cantidad");
    expect(onUpdateItem.mock.calls[0]?.[1]).not.toHaveProperty("logicalComponentId");
  });

  it("rebuilds a single saved component with the new glass and stable logical identity", () => {
    const item = baseItem();
    const onUpdateItem = jest.fn();
    renderConstructor(item, onUpdateItem);
    openGlassSection();
    openCatalog();
    fireEvent.click(within(screen.getByRole("listbox", { name: "Elegir vidrio del catálogo" })).getByRole("option", {
      name: /Float Incoloro 6mm/,
    }));

    const patch = onUpdateItem.mock.calls[0]?.[1] as QuoteConstructorItemPatch;
    const rebuilt = buildItemFromForm(
      { ...mapItemToForm(item), ...patch },
      [item],
      item.id
    );
    const reopened = mapItemToForm(rebuilt);

    expect(reopened).toMatchObject({
      vidrio: "Float Incoloro 6mm",
      vidrioLineTemplateId: "3644",
      glassTechnicalSpec: expect.objectContaining({ productId: "3644", thicknessMm: 6 }),
      logicalComponentId: "logical-window-1",
      cantidad: "3",
    });
    expect(decodeCotizacionItemPresentationMeta(rebuilt.observaciones).logicalComponentId).toBe("logical-window-1");
    expect([rebuilt]).toHaveLength(1);
    expect(rebuilt.cantidad).toBe(3);
  });
});
