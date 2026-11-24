/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import { PautaCubicacionPanel } from "../pauta-cubicacion-panel";
import { createEmptyComponentForm, buildItemFromForm, mapItemToForm } from "@/features/cotizaciones/new-quote/workflow-ui";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { resolveUniversalPricedLineFallback } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

const mockUseRecipes = jest.fn();
jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: () => mockUseRecipes(),
}));

const line = {
  id: 210,
  nombre: "Serie 42 Proyectante",
  categoria: "aluminio",
  material: "Aluminio",
  catalogKey: "ventora:l42",
  catalogMetadata: { familyKey: "universal:aluminio:l42" },
} as CotizacionLineTemplate;

function formFor(config: ReturnType<typeof createQuoteConstructorPresetConfig>) {
  return {
    ...createEmptyComponentForm([], "", "precio_directo"),
    codigo: "V1",
    tipo: "Ventana proyectante",
    nombre: "Ventana",
    ancho: "1200",
    alto: "1000",
    cantidad: "1",
    lineTemplateId: "210",
    catalogLineKey: "ventora:l42",
    sistema: "Proyectante",
    vidrio: "Vidrio monolítico 4 mm",
    fabricacionConfiguracionId: "ventora:l42:proyectante",
    fabricacionTipologia: "proyectante",
    fabricacionHojas: 1,
    fabricacionModulos: 1,
    fabricacionApertura: "proyectante",
    fabricacionVariante: "normal",
    guidedVisualConfig: config,
  };
}

function renderPanel(form: ReturnType<typeof formFor>, onSnapshot: jest.Mock) {
  return render(<PautaCubicacionPanel
    componentForm={form}
    selectedTemplate={line}
    onCubicationSnapshotChange={jest.fn()}
    onFabricacionSnapshotChange={onSnapshot}
    onFabricationRecipeIdChange={jest.fn()}
    onFabricacionContextoChange={jest.fn()}
  />);
}

describe("cotización de Serie 42 en el panel de fabricación", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  beforeEach(() => {
    const recipe = resolveUniversalPricedLineFallback({ catalogKey: "ventora:l42", lineTemplateId: 210, organizationId: 3, lineName: "Serie 42", variant: "normal", leavesCount: 1, recipes: [] });
    if (!recipe) throw new Error("Falta fixture universal L42");
    mockUseRecipes.mockReturnValue({ organizationId: 3, recipes: [recipe], isLoading: false, error: null });
    global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) })) as jest.Mock;
  });

  it("mantiene identidad y dimensiones al pasar de Constructor al panel de Guiada", async () => {
    const form = formFor(createQuoteConstructorPresetConfig("proyectante", { widthMm: 1200, heightMm: 1000 }));
    const item = buildItemFromForm(form, [], "piece-1", { lineTemplates: [line], fabricationRecipes: [], organizationId: 3 });
    const reopened = mapItemToForm(item);
    expect(reopened).toMatchObject({
      lineTemplateId: "210", catalogLineKey: "ventora:l42", ancho: "1200", alto: "1000",
      fabricacionTipologia: "proyectante", fabricacionHojas: 1, fabricacionVariante: "normal",
    });
    expect(reopened.guidedVisualConfig?.root).toBeTruthy();
    const onSnapshot = jest.fn();
    renderPanel(reopened, onSnapshot);
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      recipeId: "ventora:universal:l42:normal",
      input: expect.objectContaining({ anchoTotalMm: 1200, altoTotalMm: 1000, hojas: 1 }),
    })));
    expect(screen.getByText(/Serie 42 Proyectante/)).toBeInTheDocument();
  });

  it("resuelve la L42 universal al no haber recetas persistidas", async () => {
    // El hook puede devolver temporalmente una lista vacía mientras siembra en segundo plano.
    mockUseRecipes.mockReturnValue({ organizationId: 3, recipes: [], isLoading: false, error: null });
    const onSnapshot = jest.fn();
    renderPanel(formFor(createQuoteConstructorPresetConfig("proyectante")), onSnapshot);
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      recipeId: "ventora:universal:l42:normal",
    })));
  });

  it("no genera snapshot automático cuando Constructor modifica la composición", async () => {
    const form = formFor({ ...createQuoteConstructorPresetConfig("proyectante"), quickCompositionStructural: true });
    const onSnapshot = jest.fn();
    renderPanel(form, onSnapshot);
    await waitFor(() => expect(screen.getByText(/composición/i)).toBeInTheDocument());
    expect(onSnapshot.mock.calls.every(([value]) => value == null)).toBe(true);
  });
});



