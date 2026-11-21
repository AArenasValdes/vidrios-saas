/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const mockResolveSupplierPresentationsForQuote = jest.fn();

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ organizacionId: "1", userId: "test-user" }),
}));

jest.mock("@/features/organization-profile/hooks/use-organization-measure-unit", () => ({
  useOrganizationMeasureUnit: () => "mm",
}));

jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: () => ({
    recipes: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock("@/features/proveedor-catalogos/services/supplier-presentations.client", () => ({
  resolveSupplierPresentationsForQuote: (...args: unknown[]) =>
    mockResolveSupplierPresentationsForQuote(...args),
}));

import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import { CuadernoQuickEditSheet } from "../cuaderno-quick-edit-sheet";

function buildCatalogTemplate(
  catalogKey: string,
  id: string,
  precioM2Sugerido: number
): CotizacionLineTemplate {
  const entry = VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === catalogKey);
  if (!entry) {
    throw new Error(`Missing catalog entry: ${catalogKey}`);
  }
  return {
    id,
    organizationId: "1",
    catalogKey: entry.catalogKey ?? null,
    nombre: entry.nombre,
    categoria: entry.categoria ?? (entry.material === "PVC" ? "pvc" : "aluminio"),
    unidadCobro: entry.unidadCobro ?? "m2",
    material: entry.material,
    vidrioPrincipalRecomendado: entry.vidrioPrincipalRecomendado ?? null,
    costoBase: 0,
    precioM2Sugerido,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: entry.proveedor ?? null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: entry.catalogMetadata
      ? { ...entry.catalogMetadata, needsCommercialPrice: false }
      : null,
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
  };
}

const l42Template = buildCatalogTemplate("ventora:l42", "tmpl-l42", 180000);
const veratec2hTemplate = buildCatalogTemplate("ventora:veratec-7400-corredera", "tmpl-veratec-2h", 210000);
const veratec3hTemplate = buildCatalogTemplate("ventora:veratec-7400-corredera-3h", "tmpl-veratec-3h", 230000);
const kompen700Template = buildCatalogTemplate("ventora:kompen-prime-line-700", "tmpl-kom-700", 240000);

function buildAluminumItem(overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  const config = createQuoteConstructorPresetConfig("proyectante");
  return {
    id: "item-alu-1",
    codigo: "VEN-01",
    tipo: "Ventana",
    lineaComercial: "Serie 42 — Proyectante / paño fijo",
    vidrio: "Incoloro monolitico 5mm",
    nombre: "Ventana proyectante",
    descripcion: "",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 216000,
    costoProveedorTotal: 216000,
    margenPct: 0,
    precioUnitario: 216000,
    precioTotal: 216000,
    precioPorM2: 180000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    precioPlantillaSugerido: 216000,
    precioAjustadoManual: false,
    origenPrecio: "plantilla",
    observaciones: encodeCotizacionItemPresentationMeta({
      material: "Aluminio",
      colorHex: "#a8a8a8",
      sistema: "Proyectante",
      configuracion: "Normal",
      lineTemplateId: "tmpl-l42",
      catalogLineKey: "ventora:l42",
      supplierProviderKey: "alumco",
      fabricacionTipologia: "proyectante",
      fabricacionHojas: 1,
      guidedVisualConfig: config,
    }),
    ...overrides,
  };
}

describe("CuadernoQuickEditSheet — proveedor residual entre familias", () => {
  beforeEach(() => {
    mockResolveSupplierPresentationsForQuote.mockReset();
    mockResolveSupplierPresentationsForQuote.mockImplementation(
      async (requests: Array<{ itemId: string; familyKey: string }>) => {
        const req = requests[0];
        if (!req) return null;
        if (req.familyKey === "universal:aluminio:l42") {
          return {
            providerOptions: {
              [req.itemId]: [
                {
                  providerKey: "alumco",
                  label: "Alumco",
                  pricedProfileCount: 3,
                  totalProfileCount: 3,
                  baseReferenceProfileCount: 3,
                  isReference: false,
                  otherAvailableFinishNames: [],
                },
              ],
            },
            profilePrices: { [req.itemId]: [] },
            providerOptionsByFinish: {},
            profilePricesByFinish: {},
            familyPreferences: {},
            canManageFamilyPreferences: true,
            canManageSupplierPrices: true,
            itemErrors: {},
          };
        }
        if (req.familyKey === "veratec:sliding-7400") {
          return {
            providerOptions: {
              [req.itemId]: [
                {
                  providerKey: "veratec",
                  label: "Veratec",
                  pricedProfileCount: 5,
                  totalProfileCount: 5,
                  baseReferenceProfileCount: 5,
                  isReference: false,
                  otherAvailableFinishNames: [],
                },
                {
                  providerKey: "alumetrica",
                  label: "Alumétrica",
                  pricedProfileCount: 5,
                  totalProfileCount: 5,
                  baseReferenceProfileCount: 5,
                  isReference: false,
                  otherAvailableFinishNames: [],
                },
              ],
            },
            profilePrices: { [req.itemId]: [] },
            providerOptionsByFinish: {},
            profilePricesByFinish: {},
            familyPreferences: {},
            canManageFamilyPreferences: true,
            canManageSupplierPrices: true,
            itemErrors: {},
          };
        }
        if (req.familyKey === "thermowin:kom-700") {
          return {
            providerOptions: {
              [req.itemId]: [
                {
                  providerKey: "thermowin",
                  label: "Thermowin",
                  pricedProfileCount: 4,
                  totalProfileCount: 4,
                  baseReferenceProfileCount: 4,
                  isReference: false,
                  otherAvailableFinishNames: [],
                },
              ],
            },
            profilePrices: { [req.itemId]: [] },
            providerOptionsByFinish: {},
            profilePricesByFinish: {},
            familyPreferences: { "thermowin:kom-700": "thermowin" },
            canManageFamilyPreferences: true,
            canManageSupplierPrices: true,
            itemErrors: {},
          };
        }
        return null;
      }
    );
  });

  it("limpia alumco de UI y patch.supplierProviderKey al cambiar de Aluminio/Alumco a Veratec PVC", async () => {
    const onSave = jest.fn();

    render(
      <CuadernoQuickEditSheet
        item={buildAluminumItem()}
        lineTemplates={[l42Template, veratec2hTemplate, veratec3hTemplate, kompen700Template]}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={(value) => value}
        onClose={jest.fn()}
        onSave={onSave}
        onOpenConstructor={jest.fn()}
        onDuplicate={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "universal:aluminio:l42" })],
        { includeProviderOptions: true }
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Elegir linea de esta pieza" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Todas" })[0]);
    fireEvent.click(
      within(screen.getByRole("group", { name: "Filtrar por material" })).getByRole("button", {
        name: "PVC",
      })
    );
    fireEvent.click(
      within(screen.getByRole("listbox", { name: "Elegir linea de esta pieza" })).getByRole("option", {
        name: /Veratec 7400 — Corredera 2 hojas/i,
      })
    );

    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "veratec:sliding-7400" })],
        { includeProviderOptions: true }
      );
    });

    expect(screen.queryByText(/Proveedor guardado.*sin cobertura/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Dejar alumco como predeterminado/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        lineTemplateId: "tmpl-veratec-2h",
        supplierProviderKey: "",
      })
    );
  });

  it("limpia alumco al cambiar a material PVC y luego elegir Kompen KOM 700, sin mostrar proveedor residual", async () => {
    const onSave = jest.fn();

    render(
      <CuadernoQuickEditSheet
        item={buildAluminumItem()}
        lineTemplates={[l42Template, veratec2hTemplate, kompen700Template]}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={(value) => value}
        onClose={jest.fn()}
        onSave={onSave}
        onOpenConstructor={jest.fn()}
        onDuplicate={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "PVC" }));
    fireEvent.click(screen.getByRole("button", { name: "Elegir linea de esta pieza" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Todas" })[0]);
    fireEvent.click(
      within(screen.getByRole("listbox", { name: "Elegir linea de esta pieza" })).getByRole("option", {
        name: /Prime Line KOM 700/i,
      })
    );

    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "thermowin:kom-700" })],
        { includeProviderOptions: true }
      );
    });

    expect(screen.queryByText(/Proveedor guardado.*sin cobertura/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Dejar alumco como predeterminado/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        material: "PVC",
        lineTemplateId: "tmpl-kom-700",
        supplierProviderKey: "",
      })
    );
  });

  it("conserva proveedor seleccionado dentro de la misma familia Veratec 7400 (2H -> 3H)", async () => {
    const onSave = jest.fn();
    const veratec2hItem = buildAluminumItem({
      lineaComercial: "Veratec 7400 — Corredera 2 hojas",
      nombre: "Ventana corredera",
      observaciones: encodeCotizacionItemPresentationMeta({
        material: "PVC",
        colorHex: "#f0eeeb",
        sistema: "Corredera",
        configuracion: "2 hojas",
        lineTemplateId: "tmpl-veratec-2h",
        catalogLineKey: "ventora:veratec-7400-corredera",
        supplierProviderKey: "alumetrica",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        guidedVisualConfig: createQuoteConstructorPresetConfig("corredera"),
      }),
    });

    render(
      <CuadernoQuickEditSheet
        item={veratec2hItem}
        lineTemplates={[l42Template, veratec2hTemplate, veratec3hTemplate, kompen700Template]}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={(value) => value}
        onClose={jest.fn()}
        onSave={onSave}
        onOpenConstructor={jest.fn()}
        onDuplicate={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "veratec:sliding-7400" })],
        { includeProviderOptions: true }
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Elegir linea de esta pieza" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Todas" })[0]);
    fireEvent.click(
      within(screen.getByRole("listbox", { name: "Elegir linea de esta pieza" })).getByRole("option", {
        name: /Veratec 7400 — Corredera 3 hojas/i,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        lineTemplateId: "tmpl-veratec-3h",
        supplierProviderKey: "alumetrica",
      })
    );
  });

  it("limpia supplierProviderKey y catalogLineKey al cambiar de material Aluminio a PVC sin elegir línea todavía", async () => {
    const onSave = jest.fn();

    render(
      <CuadernoQuickEditSheet
        item={buildAluminumItem()}
        lineTemplates={[l42Template, veratec2hTemplate]}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={(value) => value}
        onClose={jest.fn()}
        onSave={onSave}
        onOpenConstructor={jest.fn()}
        onDuplicate={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "PVC" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        material: "PVC",
        lineTemplateId: "",
        catalogLineKey: "",
        supplierProviderKey: "",
      })
    );
  });
});
