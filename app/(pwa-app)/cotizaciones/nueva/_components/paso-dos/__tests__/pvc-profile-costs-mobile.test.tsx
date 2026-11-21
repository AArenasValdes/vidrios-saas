/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockResolveSupplierPresentationsForQuote = jest.fn();

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ organizacionId: "org-1", userId: "user-1" }),
}));
jest.mock("@/features/organization-profile/hooks/use-organization-measure-unit", () => ({
  useOrganizationMeasureUnit: () => "mm",
}));
jest.mock("../../../_hooks/use-mobile-viewport-stability", () => ({
  useMobileViewportStability: () => undefined,
}));
jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: () => ({ organizationId: 1, recipes: [], isLoading: false }),
}));
jest.mock("@/features/proveedor-catalogos/services/supplier-presentations.client", () => ({
  resolveSupplierPresentationsForQuote: (...args: unknown[]) => mockResolveSupplierPresentationsForQuote(...args),
}));

import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { createDefaultGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { PasoDosWizardConfiguracionMovil } from "../paso-dos-wizard-configuracion-movil";
import { CuadernoQuickEditSheet } from "../mobile-cuaderno/cuaderno-quick-edit-sheet";

beforeAll(() => {
  Object.defineProperty(window, "scrollTo", { value: jest.fn(), writable: true });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

beforeEach(() => {
  jest.clearAllMocks();
});

function templateFromCatalog(catalogKey: string, id: number): CotizacionLineTemplate {
  const def = VENTORA_DEFAULT_LINE_CATALOG.find((entry) => entry.catalogKey === catalogKey);
  if (!def) throw new Error(`No existe ${catalogKey} en VENTORA_DEFAULT_LINE_CATALOG`);
  return {
    id,
    organizationId: "org-1",
    nombre: def.nombre,
    categoria: def.categoria,
    unidadCobro: def.unidadCobro,
    material: def.material,
    vidrioPrincipalRecomendado: def.vidrioPrincipalRecomendado ?? null,
    costoBase: def.costoBase,
    precioM2Sugerido: def.precioM2Sugerido,
    minimoCobrable: def.minimoCobrable,
    redondeoPrecio: def.redondeoPrecio,
    mermaPct: def.mermaPct,
    margenObjetivoPct: def.margenObjetivoPct ?? null,
    proveedor: def.proveedor ?? null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogKey: def.catalogKey ?? null,
    catalogMetadata: def.catalogMetadata ?? null,
    activo: true,
    creadoEn: "2026-11-01T00:00:00.000Z",
    actualizadoEn: "2026-11-01T00:00:00.000Z",
    eliminadoEn: null,
  };
}

function unmappedPvcTemplate(id: number): CotizacionLineTemplate {
  return {
    ...templateFromCatalog("ventora:veratec-7400-corredera", id),
    nombre: "PVC Propia Sin Identidad",
    catalogKey: "custom:pvc-sin-familia",
    catalogMetadata: null,
  };
}

function veratecResolutionPayload(itemId: string) {
  return {
    enabled: true,
    selections: {
      [itemId]: {
        itemId,
        providerKey: "xelena",
        finishName: "Blanco",
      },
    },
    providerOptions: {
      [itemId]: [
        {
          providerKey: "xelena",
          label: "Xelena · 2026",
          pricedProfileCount: 5,
          totalProfileCount: 6,
          baseReferenceProfileCount: 0,
          coveredTechnicalCodes: ["7401", "7414", "7418", "69014STL001", "69069STL000"],
          pendingTechnicalCodes: ["6306"],
          baseReferenceTechnicalCodes: [],
          isReference: false,
          otherAvailableFinishNames: ["Nogal"],
        },
      ],
    },
    profilePrices: {
      [itemId]: [
        {
          technicalCode: "7401", profileName: "Marco corredera 2 hojas", providerKey: "xelena", providerLabel: "Xelena · 2026",
          presentationId: "xel-7401", supplierSku: "67401VER000", presentationDescription: "Marco corredera 2H · Blanco",
          purchaseUnit: "M", commercialLengthMm: 5800, netPrice: 36795, currency: "CLP", priceSource: "reference",
          priceListRevision: "2026-06", finishPriceBasis: "specific_finish", status: "priced",
        },
        {
          technicalCode: "6306", profileName: "Junquillo 4 mm", providerKey: "taller:1", providerLabel: "Mis precios",
          presentationId: "own-6306", supplierSku: "", presentationDescription: "Junquillo 4 mm · Blanco",
          purchaseUnit: "TIRA", commercialLengthMm: 5800, netPrice: 6500, currency: "CLP", priceSource: "workshop",
          priceListRevision: "taller-v1", finishPriceBasis: "specific_finish", status: "priced",
        },
      ],
    },
    providerOptionsByFinish: {},
    profilePricesByFinish: {},
    familyPreferences: {},
    canManageFamilyPreferences: true,
    canManageSupplierPrices: true,
  };
}

function kompenResolutionPayload(itemId: string) {
  return {
    enabled: true,
    selections: {},
    providerOptions: {
      [itemId]: [
        {
          providerKey: "thermowin-kompen",
          label: "Thermowin Kompen · 2026",
          pricedProfileCount: 2,
          totalProfileCount: 23,
          baseReferenceProfileCount: 0,
          coveredTechnicalCodes: ["KOM 801", "KOM 804"],
          pendingTechnicalCodes: ["KOM 802"],
          baseReferenceTechnicalCodes: [],
          isReference: false,
          otherAvailableFinishNames: ["Antracita"],
        },
      ],
    },
    profilePrices: {
      [itemId]: [
        {
          technicalCode: "KOM 801", profileName: "Marco doble riel 801", providerKey: "thermowin-kompen", providerLabel: "Thermowin Kompen · 2026",
          presentationId: "kom-801", supplierSku: "801-0003", presentationDescription: "Marco doble riel 801 · Blanco",
          purchaseUnit: "TR", commercialLengthMm: 6000, netPrice: 22838, currency: "CLP", priceSource: "reference",
          priceListRevision: "2026", finishPriceBasis: "specific_finish", status: "priced",
        },
      ],
    },
    providerOptionsByFinish: {},
    profilePricesByFinish: {},
    familyPreferences: {},
    canManageFamilyPreferences: true,
    canManageSupplierPrices: true,
  };
}

const colorOptions = [
  { label: "Blanco", hex: "#ffffff" },
  { label: "Nogal", hex: "#6f4a34" },
  { label: "Antracita", hex: "#4f555d" },
];

function guidedDraftFor(tpl: CotizacionLineTemplate, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    categoria: "Aberturas" as const,
    subtipo: "Ventana",
    hojasBase: 2 as const,
    cantidad: 1,
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    nombre: "",
    descripcion: "",
    ivaMode: "total_incluye_iva" as const,
    cobraPrecioSeparado: false,
    alcanceDetalles: [],
    pricingMode: "margen" as const,
    material: tpl.material as "Aluminio" | "PVC" | "Cristal",
    sistema: "Corredera",
    configuracion: "2 hojas",
    sheetScheme: "",
    sheetVariant: "",
    customSchemeDescription: "",
    isCustomScheme: false,
    mirrorFormat: "single" as const,
    mirrorPaneCount: null,
    mirrorPaneDirection: "vertical" as const,
    mirrorInteriorLine: "fine" as const,
    mirrorCustomPaneCount: "",
    lineTemplateId: String(tpl.id),
    catalogLineKey: tpl.catalogKey ?? "",
    catalogCategoria: tpl.categoria,
    vidrioLineTemplateId: "",
    catalogEspesor: "",
    vidrio: "Monolitico 4mm",
    referencia: tpl.nombre,
    color: "Blanco",
    colorHex: "#ffffff",
    catalogTerminacion: "Blanco",
    ancho: "1200",
    alto: "1200",
    precio: "185000",
    precioPorM2: "",
    minimoCobrable: "",
    redondeoPrecio: "1000",
    costoUnitario: "50000",
    precioUnitario: "185000",
    precioManual: "185000",
    precioEditadoManualmente: true,
    margenPct: "35",
    mermaPct: "0",
    palilloEnabled: false,
    palilloType: "",
    costInputScope: "group_total" as const,
    observaciones: "",
    supplierProviderKey: "",
    guidedVisualConfig: createDefaultGuidedVisualConfig(),
    ...overrides,
  };
}

function constructorItemFor(tpl: CotizacionLineTemplate, overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  return {
    id: "item-pvc-1",
    tipoItem: "componente",
    codigo: "V1",
    tipo: "Ventana",
    nombre: "Ventana PVC",
    descripcion: "Corredera 2H",
    sistema: "Corredera",
    configuracion: "2 hojas",
    material: tpl.material,
    color: "Blanco",
    vidrio: "Monolitico 4mm",
    lineaComercial: tpl.nombre,
    ancho: 1200,
    alto: 1200,
    cantidad: 1,
    precioUnitario: 185000,
    precioTotal: 185000,
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: String(tpl.id),
      catalogLineKey: tpl.catalogKey ?? undefined,
      material: tpl.material as "Aluminio" | "PVC",
      colorHex: "#ffffff",
      catalogTerminacion: "Blanco",
      precioEditadoManualmente: true,
      precioManual: 185000,
    }),
    ...overrides,
  };
}

function guidedPropsFor(
  tpl: CotizacionLineTemplate,
  draftOverrides: Partial<Record<string, unknown>> = {}
) {
  return {
    activePricingMode: "margen" as const,
    colorOptions,
    displayConfigurationOptions: ["2 hojas"],
    displaySystemOptions: ["Corredera"],
    draft: guidedDraftFor(tpl, draftOverrides),
    formattedPriceValue: "$ 185.000",
    glassCatalogGroups: [],
    glassOptions: ["Monolitico 4mm", "Incoloro 4mm"],
    internalObservation: "",
    isEditing: false,
    isRecommendedGlass: () => false,
    isSavingLineTemplate: false,
    canCreateCustomGlass: false,
    linePricingSummary: {
      areaM2: 1.44,
      areaTotalM2: 1.44,
      precioBaseUnitario: 185000,
      precioM2Sugerido: 128472,
      minimoCobrable: null,
      minimoAplicado: false,
      redondeoPrecio: null,
      redondeoAplicado: false,
      precioUnitarioSugerido: 185000,
      cantidad: 1,
      totalSugerido: 185000,
      motivoNoCalculado: null,
    },
    lineTemplateOptions: [tpl],
    lineTemplates: [tpl],
    materialOptions: ["Aluminio", "PVC", "Cristal"],
    mostrarIva: true,
    onAddAlcanceDetalle: jest.fn(),
    onAltoChange: jest.fn(),
    onAnchoChange: jest.fn(),
    onApplyCreatedLineTemplate: jest.fn(),
    onCancelEdit: jest.fn(),
    onChange: jest.fn(),
    onCobraPrecioSeparadoChange: jest.fn(),
    onColorChange: jest.fn(),
    onConfiguracionChange: jest.fn(),
    onCostInputScopeChange: jest.fn(),
    onCreateLineTemplate: jest.fn(),
    onCustomSchemeDescriptionChange: jest.fn(),
    onDescripcionChange: jest.fn(),
    onGlobalTotalClienteChange: jest.fn(),
    onInternalObservationChange: jest.fn(),
    onMargenChange: jest.fn(),
    onMaterialChange: jest.fn(),
    onMirrorCustomPaneCountChange: jest.fn(),
    onMirrorFormatChange: jest.fn(),
    onMirrorInteriorLineChange: jest.fn(),
    onMirrorPaneCountChange: jest.fn(),
    onMirrorPaneDirectionChange: jest.fn(),
    onMostrarIvaChange: jest.fn(),
    onNombreChange: jest.fn(),
    onOpenNewPiece: jest.fn(),
    onPalilloEnabledChange: jest.fn(),
    onPalilloTypeChange: jest.fn(),
    onPrecioChange: jest.fn(),
    onPricingModeChange: jest.fn(),
    onQuickCompositionAdjustment: jest.fn(),
    onRemoveAlcanceDetalle: jest.fn(),
    onSave: jest.fn(),
    onSelectLineTemplate: jest.fn(),
    onSheetSchemeChange: jest.fn(),
    onSheetVariantChange: jest.fn(),
    onSistemaChange: jest.fn(),
    onSupplierProviderKeyChange: jest.fn(),
    onUpdateAlcanceDetalle: jest.fn(),
    onVidrioChange: jest.fn(),
    priceHelp: "Costo interno.",
    pricePreview: {
      calculado: true,
      areaM2: 1.44,
      precioBaseUnitario: 185000,
      precioM2Sugerido: 128472,
      minimoCobrable: null,
      minimoAplicado: false,
      redondeoPrecio: null,
      redondeoAplicado: false,
      precioUnitarioSugerido: 185000,
      cantidad: 1,
      totalSugerido: 185000,
      motivoNoCalculado: null,
    },
    quotePricingMode: "por_item" as const,
    recommendedVidrios: [],
    subtypeOptions: ["Ventana", "Espejo", "Cubierta de mesa"],
    totalClienteManual: null,
  };
}

describe("Costos de perfiles PVC en móvil (Guiada y Constructor)", () => {
  it("muestra proveedor, precios por código, costo privado y advertencias para Veratec PVC en Guiada sin alterar precio manual", async () => {
    const veratec = templateFromCatalog("ventora:veratec-7400-corredera", 7400);
    mockResolveSupplierPresentationsForQuote.mockResolvedValue(veratecResolutionPayload("guided-line-provider-preview"));

    render(<PasoDosWizardConfiguracionMovil {...(guidedPropsFor(veratec, { supplierProviderKey: "xelena" }) as never)} />);

    const providerSelect = await screen.findByLabelText("Proveedor de compra para esta línea") as HTMLSelectElement;
    expect(providerSelect).toHaveValue("");
    expect(providerSelect.options[0]?.textContent).toMatch(/Xelena/i);
    expect(screen.getByText(/Mis costos · 1\/\d+ listos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar precios" }));
    fireEvent.click(screen.getByRole("button", { name: /Guardados/i }));
    expect(screen.getByLabelText("Precio 6306")).toHaveValue("6.500");
    fireEvent.click(screen.getByRole("button", { name: "Proveedor" }));
    expect(screen.getByText(/\$36\.795/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("$ 185.000")).toBeInTheDocument();
  });

  it("muestra proveedor y precios por código para Veratec PVC en Constructor conservando precio comercial manual", async () => {
    const veratec = templateFromCatalog("ventora:veratec-7400-corredera", 7400);
    mockResolveSupplierPresentationsForQuote.mockResolvedValue(veratecResolutionPayload("item-pvc-1"));

    render(
      <CuadernoQuickEditSheet
        item={constructorItemFor(veratec, {
          observaciones: encodeCotizacionItemPresentationMeta({
            lineTemplateId: String(veratec.id),
            catalogLineKey: veratec.catalogKey ?? undefined,
            material: "PVC",
            colorHex: "#ffffff",
            catalogTerminacion: "Blanco",
            supplierProviderKey: "xelena",
            precioEditadoManualmente: true,
            precioManual: 185000,
          }),
        })}
        lineTemplates={[veratec]}
        glassOptions={["Monolitico 4mm"]}
        formatCurrencyInput={(v) => v}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onOpenConstructor={jest.fn()}
        onDuplicate={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    const providerSelect = await screen.findByLabelText("Proveedor de compra para esta pieza") as HTMLSelectElement;
    expect(providerSelect).toHaveValue("");
    expect(providerSelect.options[0]?.textContent).toMatch(/Xelena/i);
    expect(screen.getByText(/Cobertura por perfil pendiente de configuración técnica/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("185000")).toBeInTheDocument();
  });

  it("muestra costos Thermowin/Kompen PVC en Guiada y Constructor sin inventar receta", async () => {
    const kompen = templateFromCatalog("ventora:kompen-form-line-800", 800);
    mockResolveSupplierPresentationsForQuote.mockResolvedValue(kompenResolutionPayload("guided-line-provider-preview"));

    const { unmount } = render(<PasoDosWizardConfiguracionMovil {...(guidedPropsFor(kompen) as never)} />);

    expect(await screen.findByLabelText("Proveedor de compra para esta línea")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar precios" }));
    fireEvent.click(screen.getByRole("button", { name: "Proveedor" }));
    expect(screen.getByText(/\$22\.838/)).toBeInTheDocument();
    unmount();

    mockResolveSupplierPresentationsForQuote.mockResolvedValue(kompenResolutionPayload("item-pvc-1"));
    render(
      <CuadernoQuickEditSheet
        item={constructorItemFor(kompen)}
        lineTemplates={[kompen]}
        glassOptions={["Monolitico 4mm"]}
        formatCurrencyInput={(v) => v}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onOpenConstructor={jest.fn()}
        onDuplicate={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    const providerSelect = await screen.findByLabelText("Proveedor de compra para esta pieza");
    expect(providerSelect).toBeInTheDocument();
    expect(screen.getByText(/Cobertura por perfil pendiente de configuración técnica/i)).toBeInTheDocument();
  });

  it("no habilita costos para Espejo, Cubierta de mesa, Cristal ni líneas PVC sin familia reconocida", async () => {
    const veratec = templateFromCatalog("ventora:veratec-7400-corredera", 7400);
    const unmapped = unmappedPvcTemplate(9999);
    const crystal: CotizacionLineTemplate = {
      ...veratec,
      id: 9001,
      nombre: "Incoloro 4mm",
      categoria: "vidrio",
      material: "Cristal",
      catalogKey: "ventora:vidrio-incoloro-4",
      catalogMetadata: null,
    };

    for (const [subtipo, tpl] of [
      ["Espejo", crystal],
      ["Cubierta de mesa", crystal],
      ["Ventana", unmapped],
    ] as const) {
      const { unmount } = render(
        <PasoDosWizardConfiguracionMovil {...(guidedPropsFor(tpl, { subtipo, material: tpl.material }) as never)} />
      );
      expect(screen.queryByRole("region", { name: "Costos de fabricación" })).not.toBeInTheDocument();
      unmount();

      const { unmount: unmountSheet } = render(
        <CuadernoQuickEditSheet
          item={constructorItemFor(tpl, { tipo: subtipo, material: tpl.material })}
          lineTemplates={[tpl]}
          glassOptions={["Incoloro 4mm"]}
          formatCurrencyInput={(v) => v}
          onClose={jest.fn()}
          onSave={jest.fn()}
          onOpenConstructor={jest.fn()}
          onDuplicate={jest.fn()}
          onRemove={jest.fn()}
        />
      );
      expect(screen.queryByRole("region", { name: "Costos de fabricación" })).not.toBeInTheDocument();
      unmountSheet();
    }

    await waitFor(() => expect(mockResolveSupplierPresentationsForQuote).not.toHaveBeenCalled());
  });
});
