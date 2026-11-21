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
import {
  applyLineTemplateToComponentForm,
  buildItemFromForm,
  mapItemToForm,
  syncTemplatePricingInComponentForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import type { QuoteConstructorItemPatch } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
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

const l5000Template = buildCatalogTemplate("ventora:l5000", "tmpl-l5000", 180000);
const veratec2hTemplate = buildCatalogTemplate("ventora:veratec-7400-corredera", "tmpl-veratec-2h", 80000);
const veratec3hTemplate = buildCatalogTemplate("ventora:veratec-7400-corredera-3h", "tmpl-veratec-3h", 95000);
const kompen700Template = buildCatalogTemplate("ventora:kompen-prime-line-700", "tmpl-kom-700", 70000);

const ALL_TEMPLATES = [l5000Template, veratec2hTemplate, veratec3hTemplate, kompen700Template];

function buildSlidingItem(overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  const config = createQuoteConstructorPresetConfig("corredera");
  return {
    id: "item-1",
    codigo: "VEN-01",
    tipo: "Ventana",
    lineaComercial: "Serie 5000 — Corredera 2 hojas",
    vidrio: "Incoloro monolitico 5mm",
    nombre: "Ventana corredera",
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
      sistema: "Corredera",
      configuracion: "2 hojas",
      lineTemplateId: "tmpl-l5000",
      catalogLineKey: "ventora:l5000",
      supplierProviderKey: "alumco",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      guidedVisualConfig: config,
    }),
    ...overrides,
  };
}

function applyQuickEditPatchToItem(
  item: CotizacionWorkflowItem,
  patch: QuoteConstructorItemPatch
): CotizacionWorkflowItem {
  let form = mapItemToForm(item);
  const { markPriceManual, ...formPatch } = patch;
  if (patch.lineTemplateId !== undefined) {
    const template = ALL_TEMPLATES.find((candidate) => String(candidate.id) === patch.lineTemplateId);
    form = template
      ? applyLineTemplateToComponentForm(
          {
            ...form,
            precioAjustadoManual: markPriceManual ? form.precioAjustadoManual : false,
          },
          template,
          { fabricationRecipes: [], organizationId: 1 }
        )
      : {
          ...form,
          lineTemplateId: "",
          supplierProviderKey: "",
          referencia: "",
          precioPorM2: "",
          minimoCobrable: "",
          precioPlantillaSugerido: "",
          precioAjustadoManual: false,
          origenPrecio: "manual",
          cubicationSnapshot: null,
        };
  }
  form = { ...form, ...formPatch };
  if (patch.material) {
    form.catalogCategoria = patch.material === "PVC" ? "pvc" : "aluminio";
    form.colorHex = patch.colorHex ?? form.colorHex;
  }
  if (markPriceManual) {
    form.pricingMode = "precio_directo";
    form.precioAjustadoManual = true;
    form.origenPrecio = "manual";
  }
  if (!form.precioAjustadoManual && patch.lineTemplateId !== undefined) {
    form = syncTemplatePricingInComponentForm(form, { forceSuggestedPrice: true });
  }
  return buildItemFromForm(form, [item], item.id, {
    lineTemplates: ALL_TEMPLATES,
    fabricationRecipes: [],
    organizationId: 1,
  });
}

function formatPriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("es-CL") : "";
}

function pickLineFromSheet(lineNameRegex: RegExp, materialButtonName?: "PVC" | "Aluminio") {
  fireEvent.click(screen.getByRole("button", { name: "Elegir linea de esta pieza" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Todas" })[0]);
  if (materialButtonName) {
    fireEvent.click(
      within(screen.getByRole("group", { name: "Filtrar por material" })).getByRole("button", {
        name: materialButtonName,
      })
    );
  }
  fireEvent.click(
    within(screen.getByRole("listbox", { name: "Elegir linea de esta pieza" })).getByRole("option", {
      name: lineNameRegex,
    })
  );
}

describe("CuadernoQuickEditSheet — conservación de precio comercial manual", () => {
  beforeEach(() => {
    mockResolveSupplierPresentationsForQuote.mockReset();
    mockResolveSupplierPresentationsForQuote.mockImplementation(
      async (requests: Array<{ itemId: string; familyKey: string }>) => {
        const req = requests[0];
        if (!req) return null;
        if (req.familyKey === "universal:aluminio:l5000") {
          return {
            providerOptions: {
              [req.itemId]: [
                {
                  providerKey: "alumco",
                  label: "Alumco",
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
            familyPreferences: {},
            canManageFamilyPreferences: false,
            canManageSupplierPrices: false,
            itemErrors: {},
          };
        }
        if (req.familyKey === "veratec:sliding-7400") {
          return {
            providerOptions: {
              [req.itemId]: [
                {
                  providerKey: "xelena",
                  label: "Xelena",
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
            canManageFamilyPreferences: false,
            canManageSupplierPrices: false,
            itemErrors: {},
          };
        }
        if (req.familyKey === "thermowin:kom-700") {
          return {
            providerOptions: {
              [req.itemId]: [
                {
                  providerKey: "thermowin",
                  label: "Thermowin Kompen",
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
            familyPreferences: {},
            canManageFamilyPreferences: false,
            canManageSupplierPrices: false,
            itemErrors: {},
          };
        }
        return null;
      }
    );
  });

  it("conserva precio manual $175.000 al cambiar de Aluminio a Veratec PVC y Kompen PVC y muestra aviso discreto", async () => {
    const onSave = jest.fn();

    render(
      <CuadernoQuickEditSheet
        item={buildSlidingItem()}
        lineTemplates={ALL_TEMPLATES}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={formatPriceInput}
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

    const priceInput = screen.getByLabelText("Precio unitario");
    fireEvent.change(priceInput, { target: { value: "175000" } });
    expect(priceInput).toHaveValue("175.000");

    fireEvent.click(
      within(screen.getByRole("group", { name: "Elegir material del perfil" })).getByRole("button", {
        name: "PVC",
      })
    );
    expect(screen.getByLabelText("Precio unitario")).toHaveValue("175.000");

    pickLineFromSheet(/Veratec 7400 — Corredera 2 hojas/i);
    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "veratec:sliding-7400" })],
        { includeProviderOptions: true }
      );
    });
    expect(screen.getByLabelText("Precio unitario")).toHaveValue("175.000");
    expect(screen.getByText(/Precio manual conservado/i)).toBeInTheDocument();

    pickLineFromSheet(/Prime Line KOM 700/i);
    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "thermowin:kom-700" })],
        { includeProviderOptions: true }
      );
    });
    expect(screen.getByLabelText("Precio unitario")).toHaveValue("175.000");
    expect(screen.getByText(/Precio manual conservado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        material: "PVC",
        lineTemplateId: "tmpl-kom-700",
        costoProveedorUnitario: "175000",
        markPriceManual: true,
        supplierProviderKey: "",
      })
    );
  });

  it("actualiza el importe sugerido automáticamente cuando el precio no fue editado manualmente", async () => {
    const onSave = jest.fn();

    render(
      <CuadernoQuickEditSheet
        item={buildSlidingItem({
          precioUnitario: 216000,
          precioAjustadoManual: false,
          origenPrecio: "plantilla",
        })}
        lineTemplates={ALL_TEMPLATES}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={formatPriceInput}
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

    pickLineFromSheet(/Veratec 7400 — Corredera 2 hojas/i, "PVC");
    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "veratec:sliding-7400" })],
        { includeProviderOptions: true }
      );
    });

    expect(screen.getByLabelText("Precio unitario")).toHaveValue("96.000");
    expect(screen.queryByText(/Precio manual conservado/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    const patch = onSave.mock.calls[0]?.[0] as QuoteConstructorItemPatch;
    expect(patch.costoProveedorUnitario).toBe("96000");
    expect(patch.markPriceManual).toBeUndefined();
  });

  it("conserva un precio manual guardado previamente al reabrir el editor y cambiar material", async () => {
    const onSave = jest.fn();

    render(
      <CuadernoQuickEditSheet
        item={buildSlidingItem({
          costoProveedorUnitario: 175000,
          costoProveedorTotal: 175000,
          precioUnitario: 175000,
          precioTotal: 175000,
          precioAjustadoManual: true,
          origenPrecio: "manual",
        })}
        lineTemplates={ALL_TEMPLATES}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={formatPriceInput}
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

    fireEvent.click(
      within(screen.getByRole("group", { name: "Elegir material del perfil" })).getByRole("button", {
        name: "PVC",
      })
    );
    expect(screen.getByLabelText("Precio unitario")).toHaveValue("175.000");

    pickLineFromSheet(/Veratec 7400 — Corredera 2 hojas/i);
    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "veratec:sliding-7400" })],
        { includeProviderOptions: true }
      );
    });
    expect(screen.getByLabelText("Precio unitario")).toHaveValue("175.000");
    expect(screen.getByText(/Precio manual conservado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        material: "PVC",
        lineTemplateId: "tmpl-veratec-2h",
        costoProveedorUnitario: "175000",
        markPriceManual: true,
        supplierProviderKey: "",
      })
    );
  });

  it("conserva precio editado manualmente y proveedor compatible al cambiar a otra línea de la misma familia", async () => {
    const onSave = jest.fn();
    const veratecItem = buildSlidingItem({
      lineaComercial: "Veratec 7400 — Corredera 2 hojas",
      costoProveedorUnitario: 96000,
      costoProveedorTotal: 96000,
      precioUnitario: 96000,
      precioTotal: 96000,
      precioPorM2: 80000,
      precioPlantillaSugerido: 96000,
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
        item={veratecItem}
        lineTemplates={ALL_TEMPLATES}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={formatPriceInput}
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

    fireEvent.change(screen.getByLabelText("Precio unitario"), { target: { value: "175000" } });
    pickLineFromSheet(/Veratec 7400 — Corredera 3 hojas/i);

    await waitFor(() => {
      expect(screen.getByLabelText("Precio unitario")).toHaveValue("175.000");
    });
    expect(screen.getByText(/Precio manual conservado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        lineTemplateId: "tmpl-veratec-3h",
        costoProveedorUnitario: "175000",
        markPriceManual: true,
        supplierProviderKey: "alumetrica",
      })
    );
  });

  it("no confunde borrar explícitamente el precio con ausencia de edición y mantiene el campo vacío", async () => {
    const onSave = jest.fn();

    render(
      <CuadernoQuickEditSheet
        item={buildSlidingItem({
          precioUnitario: 216000,
          precioAjustadoManual: false,
          origenPrecio: "plantilla",
        })}
        lineTemplates={ALL_TEMPLATES}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={formatPriceInput}
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

    const priceInput = screen.getByLabelText("Precio unitario");
    fireEvent.change(priceInput, { target: { value: "" } });
    expect(priceInput).toHaveValue("");

    fireEvent.click(
      within(screen.getByRole("group", { name: "Elegir material del perfil" })).getByRole("button", {
        name: "PVC",
      })
    );
    pickLineFromSheet(/Veratec 7400 — Corredera 2 hojas/i);

    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "veratec:sliding-7400" })],
        { includeProviderOptions: true }
      );
    });

    expect(screen.getByLabelText("Precio unitario")).toHaveValue("");
    expect(screen.queryByText(/Precio manual conservado/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        lineTemplateId: "tmpl-veratec-2h",
        costoProveedorUnitario: "",
        markPriceManual: true,
      })
    );
  });

  it("reabre un ítem guardado con precio manual y preserva la marca manual al cambiar línea posteriormente", async () => {
    const firstPatches: QuoteConstructorItemPatch[] = [];
    const initialItem = buildSlidingItem();

    const { unmount } = render(
      <CuadernoQuickEditSheet
        item={initialItem}
        lineTemplates={ALL_TEMPLATES}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={formatPriceInput}
        onClose={jest.fn()}
        onSave={(patch) => firstPatches.push(patch)}
        onOpenConstructor={jest.fn()}
        onDuplicate={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText("Precio unitario"), { target: { value: "175000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const savedItem = applyQuickEditPatchToItem(initialItem, firstPatches[0]!);
    expect(savedItem.precioUnitario).toBe(175000);
    expect(savedItem.precioAjustadoManual).toBe(true);
    expect(savedItem.origenPrecio).toBe("manual");
    unmount();

    const secondPatches: QuoteConstructorItemPatch[] = [];
    render(
      <CuadernoQuickEditSheet
        item={savedItem}
        lineTemplates={ALL_TEMPLATES}
        glassOptions={["Incoloro monolitico 5mm"]}
        formatCurrencyInput={formatPriceInput}
        onClose={jest.fn()}
        onSave={(patch) => secondPatches.push(patch)}
        onOpenConstructor={jest.fn()}
        onDuplicate={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalled();
    });

    pickLineFromSheet(/Veratec 7400 — Corredera 2 hojas/i, "PVC");
    await waitFor(() => {
      expect(mockResolveSupplierPresentationsForQuote).toHaveBeenCalledWith(
        [expect.objectContaining({ familyKey: "veratec:sliding-7400" })],
        { includeProviderOptions: true }
      );
    });

    expect(screen.getByLabelText("Precio unitario")).toHaveValue("175.000");
    expect(screen.getByText(/Precio manual conservado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    const finalItem = applyQuickEditPatchToItem(savedItem, secondPatches[0]!);
    expect(finalItem.precioUnitario).toBe(175000);
    expect(finalItem.precioAjustadoManual).toBe(true);
    expect(finalItem.origenPrecio).toBe("manual");
    expect(finalItem.lineaComercial).toBe("Veratec 7400 — Corredera 2 hojas");
  });
});
