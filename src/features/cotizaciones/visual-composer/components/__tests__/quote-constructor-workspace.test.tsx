/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { useState } from "react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { useOrganizationMeasureUnit } from "@/features/organization-profile/hooks/use-organization-measure-unit";
import { WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY } from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { QuoteConstructorWorkspace } from "../quote-constructor-workspace";
import * as fabricationResolutionService from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { buildItemFromForm, mapItemToForm } from "@/features/cotizaciones/new-quote/workflow-ui";
import { preserveExplicitFabricationSnapshot } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";

jest.mock("@/features/fabricacion/services/fabricacion-despiece-cotizacion.service", () => ({
  ...jest.requireActual("@/features/fabricacion/services/fabricacion-despiece-cotizacion.service"),
  resolveFabricacionDespieceForQuoteItem: jest.fn(),
}));

jest.mock("@/features/cotizaciones/visual-composer/components/guided-visual-composer", () => ({
  GuidedVisualComposer: ({ open }: { open?: boolean }) =>
    open ? <div role="dialog">Composición guiada</div> : null,
}));

jest.mock("@/features/organization-profile/hooks/use-organization-measure-unit", () => ({
  useOrganizationMeasureUnit: jest.fn(() => "mm"),
}));

jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: () => ({
    organizationId: null,
    recipes: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    isLoading: false,
  }),
}));

function item(id: string, code: string): CotizacionWorkflowItem {
  return {
    id,
    codigo: code,
    tipo: "Ventana",
    lineaComercial: "",
    vidrio: "Incoloro 5mm",
    nombre: `Ventana ${code}`,
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
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: "#111827",
      material: "Aluminio",
      guidedVisualConfig: createQuoteConstructorPresetConfig("fijo"),
    }),
  };
}

function lineTemplate(
  overrides: Partial<CotizacionLineTemplate> = {}
): CotizacionLineTemplate {
  return {
    id: "linea-l5000",
    organizationId: "org-1",
    nombre: "L5000",
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 100000,
    minimoCobrable: 0,
    redondeoPrecio: 0,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {},
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
    ...overrides,
  };
}

function itemWithLine(
  id: string,
  code: string,
  template: CotizacionLineTemplate
): CotizacionWorkflowItem {
  return {
    ...item(id, code),
    lineaComercial: template.nombre,
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: "#111827",
      material: template.material,
      lineTemplateId: String(template.id),
      guidedVisualConfig: createQuoteConstructorPresetConfig("fijo"),
    }),
  };
}

function renderWorkspace(overrides: Partial<ComponentProps<typeof QuoteConstructorWorkspace>> = {}) {
  const props: ComponentProps<typeof QuoteConstructorWorkspace> = {
    items: [item("a", "VEN-01"), item("b", "VEN-02"), item("c", "VEN-03")],
    quotePricingMode: "por_item",
    lineTemplates: [],
    glassOptions: ["Incoloro 5mm"],
    activeItemId: "a",
    totalClienteManual: null,
    formatCurrencyInput: (value) => value,
    onActiveItemChange: jest.fn(),
    onAddPreset: jest.fn(),
    onUpdateItem: jest.fn(),
    onDuplicateItem: jest.fn(),
    onRemoveItem: jest.fn(),
    onMoveItem: jest.fn(),
    onEditAdvanced: jest.fn(),
    onRecalculateTemplatePrice: jest.fn(),
    onGlobalTotalChange: jest.fn(),
    onGoToSummary: jest.fn(),
    onOpenDespieceReview: jest.fn(),
    ...overrides,
  };
  render(<QuoteConstructorWorkspace {...props} />);
  return props;
}

describe("QuoteConstructorWorkspace", () => {
  afterEach(() => {
    jest.mocked(useOrganizationMeasureUnit).mockReturnValue("mm");
    jest.mocked(fabricationResolutionService.resolveFabricacionDespieceForQuoteItem).mockImplementation(
      jest.requireActual<typeof import("@/features/fabricacion/services/fabricacion-despiece-cotizacion.service")>(
        "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service"
      ).resolveFabricacionDespieceForQuoteItem
    );
  });

  it("muestra presets y varias piezas en el mismo cuaderno", () => {
    const props = renderWorkspace();
    expect(screen.getByLabelText("Más tipologías")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Puerta: elegir entre abatible y corredera")
    ).toBeInTheDocument();
    expect(screen.getByText(/Agregar pieza/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar otra pieza" })).toBeInTheDocument();
    expect(screen.getAllByText("VEN-01").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VEN-02").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VEN-03").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Corredera" }));
    expect(props.onAddPreset).toHaveBeenCalledWith("corredera");

    fireEvent.click(screen.getByLabelText("Más tipologías"));
    fireEvent.click(screen.getByRole("button", { name: "Guillotina" }));
    expect(props.onAddPreset).toHaveBeenCalledWith("guillotina");

    const doorTrigger = screen.getByLabelText(
      "Puerta: elegir entre abatible y corredera"
    );
    fireEvent.click(doorTrigger);
    const doorMenu = doorTrigger.closest("details");
    expect(doorMenu).not.toBeNull();
    fireEvent.click(
      within(doorMenu as HTMLDetailsElement).getByRole("button", {
        name: "Puerta corredera",
      })
    );
    expect(props.onAddPreset).toHaveBeenCalledWith("puerta_corredera");
  });

  it("sincroniza una salida resuelta una sola vez aunque el padre reconstruya el item", () => {
    const snapshot = {
      schemaVersion: 1,
      tipo: "fabricacion_receta_snapshot",
      recipeId: "confirmed-fallback",
      recipeDefinitionId: "definition-1",
      recipeVersion: 1,
      recipeStatus: "validated",
      recipeScope: "global",
      lineTemplateId: null,
      recipeIdentity: {
        recetaId: "definition-1", codigo: "L5000", nombre: "L5000",
        tipologia: "corredera", hojas: 2, modulos: 2, herraje: null, variante: "normal",
      },
      input: {
        anchoTotalMm: 1200, altoTotalMm: 1000, cantidad: 1,
        hojas: 2, modulos: 2, variante: "normal",
      },
      selectedVariant: "normal",
      result: {
        engineVersion: 1, recetaId: "definition-1", recetaVersion: 1,
        estadoReceta: "validada", entradaNormalizada: null, perfiles: [], vidrios: [],
        accesorios: [], advertencias: [], totalLinealMm: 0, totalVidrioM2: 0, calculable: true,
      },
      pauta: [], vidrios: [], advertencias: [], calculatedAt: "2026-10-25T00:00:00.000Z",
    } as unknown as FabricacionCotizacionSnapshot;
    jest.mocked(fabricationResolutionService.resolveFabricacionDespieceForQuoteItem).mockReturnValue({
        estado: "calculado", formal: snapshot, cubication: null, recipe: null,
        barsAvailable: true, preliminary: false, message: null,
      });

    const props = {
      items: [item("a", "VEN-01")],
      quotePricingMode: "por_item" as const,
      lineTemplates: [],
      glassOptions: [],
      activeItemId: "a",
      totalClienteManual: null,
      formatCurrencyInput: (value: string) => value,
      onActiveItemChange: jest.fn(),
      onAddPreset: jest.fn(),
      onDuplicateItem: jest.fn(),
      onRemoveItem: jest.fn(),
      onMoveItem: jest.fn(),
      onEditAdvanced: jest.fn(),
      onRecalculateTemplatePrice: jest.fn(),
      onGlobalTotalChange: jest.fn(),
      onGoToSummary: jest.fn(),
      onOpenDespieceReview: jest.fn(),
    } satisfies Omit<ComponentProps<typeof QuoteConstructorWorkspace>, "onUpdateItem">;
    const onUpdateItem = jest.fn();

    function ParentHarness() {
      const [items, setItems] = useState(props.items);
      const updateItem = (itemId: string, patch: Parameters<NonNullable<ComponentProps<typeof QuoteConstructorWorkspace>["onUpdateItem"]>>[1]) => {
        onUpdateItem(itemId, patch);
        setItems((current) => current.map((currentItem) => {
          if (currentItem.id !== itemId) return currentItem;
          const rebuilt = buildItemFromForm(mapItemToForm(currentItem), current, itemId);
          return preserveExplicitFabricationSnapshot(rebuilt, patch.fabricacionSnapshot);
        }));
      };
      return <QuoteConstructorWorkspace {...props} items={items} onUpdateItem={updateItem} />;
    }

    render(<ParentHarness />);

    expect(onUpdateItem).toHaveBeenCalledTimes(1);
    expect(onUpdateItem).toHaveBeenCalledWith("a", expect.objectContaining({ fabricacionSnapshot: snapshot }));
  });

  it("mantiene la ficha del vidrio al editar el ancho y limpia la asociación al cambiar a vidrio escrito", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
    const glass = lineTemplate({
      id: 3643,
      nombre: "Float Incoloro 5mm",
      categoria: "vidrio",
      material: "Cristal",
      catalogMetadata: {
        espesorMm: 5,
        categoriaTecnica: "monolitico",
        corteManualEstado: "pending_validation",
        planchaAnchoMm: 2500,
        planchaAltoMm: 1800,
        orientacionCorte: "unknown",
      },
    });
    const props = renderWorkspace({ lineTemplates: [glass], glassOptions: ["Vidrio personalizado"] });

    fireEvent.change(screen.getByLabelText("Vincular vidrio del catálogo"), { target: { value: "3643" } });
    expect(props.onUpdateItem).toHaveBeenCalledWith("a", expect.objectContaining({
      vidrio: "Float Incoloro 5mm",
      vidrioLineTemplateId: "3643",
      glassTechnicalSpec: expect.objectContaining({ productId: "3643", thicknessMm: 5, manualCutStatus: "pending_validation" }),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Elegir tipo de vidrio" }));
    fireEvent.click(screen.getByRole("option", { name: "Vidrio personalizado" }));
    expect(props.onUpdateItem).toHaveBeenLastCalledWith("a", expect.objectContaining({
      vidrio: "Vidrio personalizado",
      vidrioLineTemplateId: "",
      glassTechnicalSpec: null,
    }));
  });

  it("confirma medidas inline y expone acciones de orden", () => {
    const props = renderWorkspace();
    const widthInputs = screen.getAllByLabelText(/Ancho/);
    fireEvent.change(widthInputs[0], { target: { value: "1500" } });
    fireEvent.blur(widthInputs[0]);
    expect(props.onUpdateItem).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({ ancho: "1500" })
    );

    fireEvent.click(screen.getByRole("button", { name: "Acciones de VEN-01" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover pieza a la derecha" }));
    expect(props.onMoveItem).toHaveBeenCalledWith("a", 1);
  });

  it("usa la misma barra de colores del modo presupuesto", () => {
    const props = renderWorkspace();

    expect(screen.getByRole("group", { name: "Colores del perfil" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar Negro" }));

    expect(props.onUpdateItem).toHaveBeenCalledWith("a", { colorHex: "#2a2a2a" });
  });

  it("muestra progreso real y estados específicos", () => {
    renderWorkspace({
      items: [
        item("a", "VEN-01"),
        { ...item("b", "VEN-02"), precioUnitario: 0, precioTotal: 0 },
      ],
      activeItemId: "b",
    });

    expect(screen.getAllByText("1/2 piezas listas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Falta precio").length).toBeGreaterThan(0);
    expect(screen.getByText(/Falta completar 1 dato/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Precio unitario" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Faltan precios en 1 pieza" })).toBeInTheDocument();
  });

  it("permite confirmar una pieza completa y pasar a la siguiente pendiente", () => {
    const onActiveItemChange = jest.fn();
    renderWorkspace({
      items: [
        item("a", "VEN-01"),
        { ...item("b", "VEN-02"), precioUnitario: 0, precioTotal: 0 },
      ],
      activeItemId: "a",
      onActiveItemChange,
    });

    expect(screen.getByText(/Lista para confirmar/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Confirmar pieza lista/i }));
    expect(onActiveItemChange).toHaveBeenCalledWith("b");
  });

  it("usa total global sin exponer precio por pieza", () => {
    const props = renderWorkspace({ quotePricingMode: "total_global", totalClienteManual: 450000 });
    expect(screen.queryByLabelText(/Precio unitario/)).not.toBeInTheDocument();
    const totalInput = screen.getByLabelText(/Total del presupuesto/);
    fireEvent.change(totalInput, { target: { value: "500000" } });
    fireEvent.blur(totalInput);
    expect(props.onGlobalTotalChange).toHaveBeenCalledWith("500000");
  });

  it("no expone selector global ni aplicar línea a varias piezas", () => {
    const l5000 = lineTemplate();
    const serie20 = lineTemplate({
      id: "linea-serie20",
      nombre: "Serie 20",
      categoria: "pvc",
      material: "PVC",
    });
    renderWorkspace({
      items: [
        itemWithLine("a", "VEN-01", l5000),
        itemWithLine("b", "VEN-02", serie20),
        item("c", "VEN-03"),
      ],
      lineTemplates: [l5000, serie20],
      activeItemId: "a",
      embeddedInQuoteStudio: true,
    });

    expect(screen.queryByLabelText("Línea para nuevas piezas")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aplicar a \d+ piezas?/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revisar fabricación" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Línea de VEN-01")).toBeInTheDocument();
    expect(screen.getByText("L5000 · Aluminio")).toBeInTheDocument();
    expect(screen.getByText("Serie 20 · PVC")).toBeInTheDocument();
    expect(screen.getByLabelText("Elegir línea de VEN-03")).toBeInTheDocument();
    expect(screen.queryByText("Sin línea")).not.toBeInTheDocument();
  });

  it("sugiere en la pieza nueva la línea de la pieza activa, sin tocar las anteriores", () => {
    const l5000 = lineTemplate();
    const serie20 = lineTemplate({
      id: "linea-serie20",
      nombre: "Serie 20",
      categoria: "pvc",
      material: "PVC",
    });
    const l25 = lineTemplate({
      id: "linea-l25",
      nombre: "L25",
    });
    const props = renderWorkspace({
      items: [
        itemWithLine("a", "VEN-01", l5000),
        itemWithLine("b", "VEN-02", serie20),
        itemWithLine("c", "VEN-03", l25),
      ],
      lineTemplates: [l5000, serie20, l25],
      activeItemId: "b",
    });

    fireEvent.click(screen.getByRole("button", { name: "Fijo" }));
    expect(props.onAddPreset).toHaveBeenCalledWith("fijo", "linea-serie20");
    expect(props.onUpdateItem).not.toHaveBeenCalled();
  });

  it("al cambiar la línea de la pieza activa no actualiza las demás", () => {
    const l5000 = lineTemplate();
    const serie20 = lineTemplate({
      id: "linea-serie20",
      nombre: "Serie 20",
      categoria: "pvc",
      material: "PVC",
    });
    const l25 = lineTemplate({
      id: "linea-l25",
      nombre: "L25",
    });
    const props = renderWorkspace({
      items: [
        itemWithLine("a", "VEN-01", l5000),
        itemWithLine("b", "VEN-02", serie20),
        itemWithLine("c", "VEN-03", l25),
      ],
      lineTemplates: [l5000, serie20, l25],
      activeItemId: "b",
    });

    fireEvent.click(screen.getByLabelText("Línea de VEN-02"));
    fireEvent.click(screen.getAllByRole("button", { name: "Todas" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Todas" }).at(-1)!);
    fireEvent.click(screen.getByRole("option", { name: /L25/i }));

    expect(props.onUpdateItem).toHaveBeenCalledTimes(1);
    expect(props.onUpdateItem).toHaveBeenCalledWith("b", { lineTemplateId: "linea-l25" });
    expect(props.onUpdateItem).not.toHaveBeenCalledWith(
      "a",
      expect.anything()
    );
    expect(props.onUpdateItem).not.toHaveBeenCalledWith(
      "c",
      expect.anything()
    );
  });

  it("cambia la línea desde la card de esa pieza y no toca las demás", () => {
    const l5000 = lineTemplate();
    const serie20 = lineTemplate({
      id: "linea-serie20",
      nombre: "Serie 20",
      categoria: "pvc",
      material: "PVC",
    });
    const l25 = lineTemplate({
      id: "linea-l25",
      nombre: "L25",
    });
    const onActiveItemChange = jest.fn();
    const props = renderWorkspace({
      items: [
        itemWithLine("a", "VEN-01", l5000),
        itemWithLine("b", "VEN-02", serie20),
        itemWithLine("c", "VEN-03", l25),
      ],
      lineTemplates: [l5000, serie20, l25],
      activeItemId: "a",
      onActiveItemChange,
    });

    fireEvent.click(screen.getByLabelText("Cambiar línea de VEN-02"));
    expect(onActiveItemChange).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getAllByRole("button", { name: "Todas" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Todas" }).at(-1)!);
    fireEvent.click(screen.getByRole("option", { name: /L25/i }));

    expect(props.onUpdateItem).toHaveBeenCalledTimes(1);
    expect(props.onUpdateItem).toHaveBeenCalledWith("b", { lineTemplateId: "linea-l25" });
    expect(props.onUpdateItem).not.toHaveBeenCalledWith("a", expect.anything());
    expect(props.onUpdateItem).not.toHaveBeenCalledWith("c", expect.anything());
  });

  it("abre el selector existente desde + Elegir línea en una pieza sin asignar", () => {
    const l5000 = lineTemplate();
    const props = renderWorkspace({
      items: [item("a", "VEN-01"), itemWithLine("b", "VEN-02", l5000)],
      lineTemplates: [l5000],
      activeItemId: "b",
    });

    fireEvent.click(screen.getByLabelText("Elegir línea de VEN-01"));
    fireEvent.click(screen.getByRole("button", { name: "Mis líneas" }));
    fireEvent.click(screen.getByRole("option", { name: /L5000/i }));

    expect(props.onUpdateItem).toHaveBeenCalledTimes(1);
    expect(props.onUpdateItem).toHaveBeenCalledWith("a", { lineTemplateId: "linea-l5000" });
    expect(props.onUpdateItem).not.toHaveBeenCalledWith("b", expect.anything());
  });

  it("abre el modal de composición al tocar el croquis de una pieza", () => {
    renderWorkspace({ items: [item("a", "VEN-01")], activeItemId: "a" });

    fireEvent.click(screen.getByRole("button", { name: "Abrir composición de VEN-01" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("en Quote Studio mueve Revisar fabricación al header de piezas y deja un solo CTA de avance", () => {
    renderWorkspace({
      embeddedInQuoteStudio: true,
      inspectorRailSlot: (
        <button type="button">Continuar al resumen</button>
      ),
    });

    expect(screen.queryByRole("button", { name: "Revisar fabricación" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revisar cotizaci.n/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Abrir configuraci.n guiada/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Continuar al resumen" })).toHaveLength(1);
  });

  it("permite elegir geometría y hojas de corte New S75 desde la cotización rápida", () => {
    const template = lineTemplate({
      id: 226,
      nombre: "WinHouse New S75 — Doble riel",
      categoria: "pvc",
      material: "PVC",
      catalogKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
    });
    const quoteItem: CotizacionWorkflowItem = {
      ...itemWithLine("s75", "S75-01", template),
      tipo: "Ventana corredera",
      vidrio: "DVH 4+10+5",
      lineaComercial: template.nombre,
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#ffffff",
        material: "PVC",
        lineTemplateId: "226",
        guidedVisualConfig: createQuoteConstructorPresetConfig("corredera"),
      }),
    };
    const props = renderWorkspace({
      items: [quoteItem],
      lineTemplates: [template],
      activeItemId: "s75",
    });

    fireEvent.click(screen.getByRole("button", { name: /Cubicación y despiece/ }));
    const selector = screen.getByLabelText("Configuración de corte WinHouse New S75");
    expect(selector.querySelectorAll("option")).toHaveLength(10);
    fireEvent.change(selector, {
      target: { value: "doble_riel_4h_80" },
    });

    expect(props.onUpdateItem).toHaveBeenCalledWith(
      "s75",
      expect.objectContaining({
        catalogLineKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
        fabricacionVariante: "doble_riel_4h_80_dvh_17_20",
        fabricacionHojas: 4,
        fabricacionModulos: 4,
        fabricationRecipeId: "",
        fabricacionSnapshot: null,
        cubicationSnapshot: null,
      })
    );
  });

  it("resuelve el despiece S75 desde la línea seleccionada aunque el ítem antiguo no guarde su ID", () => {
    const template = lineTemplate({
      id: 226,
      nombre: "WinHouse New S75 — Doble riel",
      categoria: "pvc",
      material: "PVC",
      catalogKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
    });
    const quoteItem: CotizacionWorkflowItem = {
      ...itemWithLine("s75-legacy", "S75-02", template),
      tipo: "Ventana",
      nombre: "Ventana corredera",
      lineaComercial: template.nombre,
      vidrio: "DVH 4+10+5",
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#ffffff",
        material: "PVC",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 4,
        fabricacionModulos: 4,
        fabricacionVariante: "doble_riel_4h_80_dvh_17_20",
        guidedVisualConfig: createQuoteConstructorPresetConfig("corredera"),
      }),
    };
    renderWorkspace({
      items: [quoteItem],
      lineTemplates: [template],
      activeItemId: "s75-legacy",
    });

    fireEvent.click(screen.getByRole("button", { name: /Cubicación y despiece/ }));

    expect(screen.getByText("Despiece calculado")).toBeInTheDocument();
    expect(screen.getByText("Cortes", { exact: true })).toBeInTheDocument();
  });

  it("pide el ancho A al elegir una geometría S75 asimétrica de dos hojas", () => {
    jest.mocked(useOrganizationMeasureUnit).mockReturnValue("cm");
    const template = lineTemplate({
      id: 226,
      nombre: "WinHouse New S75 — Doble riel",
      categoria: "pvc",
      material: "PVC",
      catalogKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
    });
    const quoteItem: CotizacionWorkflowItem = {
      ...itemWithLine("s75", "S75-01", template),
      ancho: 180,
      tipo: "Ventana corredera",
      vidrio: "DVH 4+10+5",
      lineaComercial: template.nombre,
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#ffffff",
        material: "PVC",
        lineTemplateId: "226",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionVariante: "doble_riel_2h_asimetrica_80_dvh_17_20",
        fabricacionAnchoHojaAMm: 700,
        guidedVisualConfig: createQuoteConstructorPresetConfig("corredera"),
      }),
    };
    const props = renderWorkspace({
      items: [quoteItem],
      lineTemplates: [template],
      activeItemId: "s75",
    });

    fireEvent.click(screen.getByRole("button", { name: /Cubicación y despiece/ }));
    const widthA = screen.getByLabelText("Ancho hoja A WinHouse New S75 (mm)");
    fireEvent.change(widthA, { target: { value: "750" } });
    fireEvent.blur(widthA);

    expect(props.onUpdateItem).toHaveBeenCalledWith(
      "s75",
      expect.objectContaining({
        fabricacionAnchoHojaAMm: 750,
        fabricationRecipeId: "",
        fabricacionSnapshot: null,
        cubicationSnapshot: null,
      })
    );
  });

  it("no escribe medidas inválidas y bloquea el CTA hasta corregir", () => {
    const props = renderWorkspace({ items: [item("a", "VEN-01")] });
    const widthInput = screen.getAllByLabelText(/Ancho/)[0];

    fireEvent.change(widthInput, { target: { value: "150" } });
    fireEvent.blur(widthInput);

    expect(props.onUpdateItem).not.toHaveBeenCalled();
    expect(screen.getAllByText("Ancho mínimo 200 mm").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Faltan medidas").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Revisar pendientes|Faltan/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Revisar cotización" })
    ).not.toBeInTheDocument();

    fireEvent.change(widthInput, { target: { value: "1500" } });
    fireEvent.blur(widthInput);

    expect(props.onUpdateItem).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({
        ancho: "1500",
        guidedVisualConfig: expect.objectContaining({ widthMm: 1500 }),
      })
    );
    expect(screen.queryByText("Ancho mínimo 200 mm")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revisar cotización" })).toBeInTheDocument();
  });

  it("no escribe cantidad inválida y conserva el draft al cambiar de pieza", () => {
    const onActiveItemChange = jest.fn();
    const props = renderWorkspace({
      items: [item("a", "VEN-01"), item("b", "VEN-02")],
      onActiveItemChange,
    });

    const quantityInputs = screen.getAllByLabelText(/Cantidad/);
    fireEvent.change(quantityInputs[0], { target: { value: "0" } });
    fireEvent.blur(quantityInputs[0]);

    expect(props.onUpdateItem).not.toHaveBeenCalled();
    expect(screen.getAllByText("Cantidad inválida").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText("VEN-02")[0]);
    expect(onActiveItemChange).toHaveBeenCalledWith("b");

    const quantityAfterSwitch = screen.getAllByLabelText(/Cantidad/)[0] as HTMLInputElement;
    expect(quantityAfterSwitch.value).toBe("0");
    expect(screen.getAllByText("Cantidad inválida").length).toBeGreaterThan(0);
  });
});
