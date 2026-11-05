/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { LineTemplateFormDraft } from "../line-template-form-wizard";
import { GlassProductMobileEditor } from "../glass-product-mobile-editor";

function draft(overrides: Partial<LineTemplateFormDraft> = {}) {
  return {
    nombre: "Float 5 mm",
    categoria: "vidrio",
    unidadCobro: "m2",
    material: "Cristal",
    espesor: "",
    glassPurchaseMode: "undecided",
    categoriaTecnica: "pendiente",
    corteManualEstado: "pending_validation",
    revisionTecnicaExplicita: false,
    pieceOrientation: "unknown",
    terminacion: "",
    planchaAnchoMm: "",
    planchaAltoMm: "",
    vidrioPrincipalRecomendado: "",
    costoBase: "",
    precioM2Sugerido: "",
    minimoCobrable: "",
    redondeoPrecio: "0",
    mermaPct: "",
    margenObjetivoPct: "",
    proveedor: "",
    lineSystem: "",
    cubicationSystem: "none",
    cubicationStatus: "sin_configurar",
    profileFrame: "",
    profileSash: "",
    profileMeeting: "",
    profileGlazingBead: "",
    profileSill: "",
    profileAccessory: "",
    deductionFrameHorizontalMm: "",
    deductionFrameVerticalMm: "",
    deductionSashHorizontalMm: "",
    deductionSashVerticalMm: "",
    deductionGlassWidthMm: "",
    deductionGlassHeightMm: "",
    vigenciaDesde: "",
    vigenciaHasta: "",
    estimationEnabled: false,
    estimationMode: "none",
    estimationFrameFactor: "",
    estimationSashFactor: "",
    estimationAccessoryUnits: "",
    cuttingEnabled: false,
    cuttingMode: "none",
    cuttingBarLengthMm: "",
    cuttingSawKerfMm: "",
    cuttingSashCount: "",
    isActive: true,
    fabricationRecipe: null,
    fabricationRecipePack: null,
    ...overrides,
  } as LineTemplateFormDraft;
}

describe("GlassProductMobileEditor", () => {
  it("guarda un producto cotizable incompleto sin exigir precio ni formato de plancha", () => {
    const onSave = jest.fn();
    render(<GlassProductMobileEditor
      sheetMode="new"
      step={1}
      onStepChange={jest.fn()}
      draft={draft()}
      onDraftChange={jest.fn()}
      saveDisabled={false}
      isSaving={false}
      onSave={onSave}
      onClose={jest.fn()}
    />);

    expect(screen.getByLabelText("Espesor técnico en milímetros")).toHaveValue("");
    expect(screen.getByLabelText("Categoría técnica del vidrio")).toHaveValue("pendiente");
    expect(screen.getByLabelText("Forma de compra del vidrio")).toHaveValue("undecided");
    expect(screen.getByRole("button", { name: "Guardar producto" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar producto" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("solo solicita formato al seleccionar plancha completa y mantiene compra a proveedor fuera del optimizador", () => {
    const onDraftChange = jest.fn();
    const onStepChange = jest.fn();
    const view = render(<GlassProductMobileEditor
      sheetMode="new"
      step={2}
      onStepChange={onStepChange}
      draft={draft({ glassPurchaseMode: "undecided" })}
      onDraftChange={onDraftChange}
      saveDisabled={false}
      isSaving={false}
      onSave={jest.fn()}
      onClose={jest.fn()}
    />);
    expect(screen.getByText(/Elige si compras el vidrio por plancha o ya cortado/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Ancho de plancha (mm)")).not.toBeInTheDocument();

    view.rerender(<GlassProductMobileEditor
      sheetMode="new"
      step={2}
      onStepChange={onStepChange}
      draft={draft({ glassPurchaseMode: "supplier_cut" })}
      onDraftChange={onDraftChange}
      saveDisabled={false}
      isSaving={false}
      onSave={jest.fn()}
      onClose={jest.fn()}
    />);
    expect(screen.getByText(/no se distribuirá como plancha de corte del taller/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Ancho de plancha (mm)")).not.toBeInTheDocument();

    view.rerender(<GlassProductMobileEditor
      sheetMode="new"
      step={2}
      onStepChange={onStepChange}
      draft={draft({ glassPurchaseMode: "full_sheet" })}
      onDraftChange={onDraftChange}
      saveDisabled={false}
      isSaving={false}
      onSave={jest.fn()}
      onClose={jest.fn()}
    />);
    expect(screen.getByLabelText("Ancho de plancha (mm)")).toBeInTheDocument();
    expect(screen.getByLabelText("Alto de plancha (mm)")).toBeInTheDocument();
    expect(screen.getByText(/La merma comercial no se usa como despunte ni como separación física/)).toBeInTheDocument();
  });

  it("permite confirmar plancha completa al editar una ficha legacy sin inferirla por sus dimensiones", () => {
    const onDraftChange = jest.fn();
    render(<GlassProductMobileEditor
      sheetMode="edit"
      step={1}
      onStepChange={jest.fn()}
      draft={draft({ glassPurchaseMode: "legacy", planchaAnchoMm: "4000", planchaAltoMm: "2200" })}
      onDraftChange={onDraftChange}
      saveDisabled={false}
      isSaving={false}
      onSave={jest.fn()}
      onClose={jest.fn()}
    />);

    const purchaseMode = screen.getByLabelText("Forma de compra del vidrio");
    expect(purchaseMode).toHaveValue("legacy");
    expect(screen.getByRole("option", { name: "Plancha completa" })).toBeInTheDocument();
    fireEvent.change(purchaseMode, { target: { value: "full_sheet" } });
    expect(onDraftChange).toHaveBeenCalledWith("glassPurchaseMode", "full_sheet");
  });
});
