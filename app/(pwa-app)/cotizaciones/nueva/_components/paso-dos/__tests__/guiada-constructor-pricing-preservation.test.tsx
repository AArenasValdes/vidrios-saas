/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ organizacionId: "test-org-1", userId: "test-user" }),
}));

jest.mock("@/features/organization-profile/hooks/use-organization-measure-unit", () => ({
  useOrganizationMeasureUnit: () => "mm",
}));

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  applyComponentPricingModeSelectionToForm,
  applyLineTemplateToComponentForm,
  buildItemFromForm,
  createEmptyComponentForm,
  mapItemToForm,
  reconcileWorkflowItemsPricing,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { buildPasoDosGrupoComponentForm } from "@/app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-dos-agregar-grupo";
import {
  applyLineTemplateToGrupoDraft,
  createInitialPasoDosGrupoDraft,
} from "@/app/(pwa-app)/cotizaciones/nueva/_hooks/use-paso-dos-agregar-grupo";
import { PasoDosListaMovil } from "../paso-dos-lista-movil";
import { PasoDosCuadernoMovil } from "../mobile-cuaderno/paso-dos-cuaderno-movil";

function createSerie20Template(): CotizacionLineTemplate {
  return {
    id: 20,
    organizationId: "org-1",
    nombre: "Serie 20 — Corredera 2 hojas",
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: "Incoloro monolítico 5mm",
    costoBase: 0,
    precioM2Sugerido: 60000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogKey: "ventora:l20",
    catalogMetadata: {},
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
  };
}

function buildGuidedL20Item(
  code: string,
  vidrio: string,
  template: CotizacionLineTemplate,
  existingItems: ReturnType<typeof buildItemFromForm>[]
) {
  const initial = createInitialPasoDosGrupoDraft({
    items: existingItems,
    pricingMode: "margen",
    provider: "",
  });
  const drafted = applyLineTemplateToGrupoDraft(
    {
      ...initial,
      subtipo: "Ventana",
      sistema: "Corredera",
      configuracion: "Corredera 2 hojas",
      sheetScheme: "2 hojas",
      sheetVariant: "2 móviles",
      ancho: "1400",
      alto: "1200",
      cantidad: 1,
      vidrio,
    },
    template
  );
  const form = buildPasoDosGrupoComponentForm({
    items: existingItems,
    pricingMode: "margen",
    provider: "",
    draft: { ...drafted, vidrio },
  });
  const item = buildItemFromForm(form, existingItems, null, {
    lineTemplates: [template],
    quotePricingMode: "por_item",
  });
  return { ...item, codigo: code };
}

function buildConstructorL20Item(
  code: string,
  vidrio: string,
  template: CotizacionLineTemplate,
  existingItems: ReturnType<typeof buildItemFromForm>[]
) {
  const config = createQuoteConstructorPresetConfig("corredera", {
    widthMm: 1400,
    heightMm: 1200,
  });
  const base = createEmptyComponentForm(existingItems, "", "margen", 100);
  const form = applyLineTemplateToComponentForm(
    {
      ...base,
      codigo: code,
      tipo: "Ventana",
      nombre: "Ventana corredera",
      ancho: "1400",
      alto: "1200",
      cantidad: "1",
      sistema: "Personalizado",
      configuracion: "Personalizado",
      sheetScheme: "Personalizado",
      isCustomScheme: true,
      guidedVisualConfig: config,
      vidrio,
    },
    template
  );
  return buildItemFromForm(
    { ...form, vidrio },
    existingItems,
    null,
    { lineTemplates: [template], quotePricingMode: "por_item" }
  );
}

describe("Preservación de precios entre Guiada, Edición puntual y Constructor", () => {
  it("cambiar a Costo + recargo al editar V3 no duplica V1-V4 ni altera el payload persistible", () => {
    const serie20 = createSerie20Template();
    const v1 = buildGuidedL20Item("V1", "Incoloro monolítico 5mm", serie20, []);
    const v2 = buildGuidedL20Item("V2", "Incoloro monolítico 4mm", serie20, [v1]);
    const v3 = buildGuidedL20Item("V3", "Incoloro monolítico 6mm", serie20, [v1, v2]);
    const v4 = buildGuidedL20Item("V4", "DVH 4+12+4", serie20, [v1, v2, v3]);

    const guidedItems = [v1, v2, v3, v4];
    expect(guidedItems.map((item) => item.precioTotal)).toEqual([
      101000, 101000, 101000, 101000,
    ]);

    // Simula abrir V3 en Edición puntual y tocar Costo + recargo antes de cancelar con Volver.
    const editedV3Form = applyComponentPricingModeSelectionToForm({
      current: mapItemToForm(v3),
      pricingMode: "margen",
      items: guidedItems,
      provider: "",
      defaultMargin: 100,
    });
    expect(editedV3Form.pricingMode).toBe("margen");
    expect(editedV3Form.costoProveedorUnitario).toBe("");

    // El estado comercial de V1-V4 y la reconciliación de persistencia conservan $101.000.
    expect(guidedItems.map((item) => item.precioTotal)).toEqual([
      101000, 101000, 101000, 101000,
    ]);

    const constructorItems: typeof guidedItems = [];
    for (const [code, glass] of [
      ["V5", "Float Incoloro 5mm"],
      ["V6", "Incoloro monolítico 4mm"],
      ["V7", "Incoloro monolítico 6mm"],
      ["V8", "Incoloro monolítico 6mm"],
      ["V9", "DVH 4+12+4"],
    ] as const) {
      constructorItems.push(
        buildConstructorL20Item(code, glass, serie20, [...guidedItems, ...constructorItems])
      );
    }

    const combined = [...guidedItems, ...constructorItems];
    expect(combined.map((item) => item.precioTotal)).toEqual(Array(9).fill(101000));

    const persisted = reconcileWorkflowItemsPricing(combined, "por_item", {
      lineTemplates: [serie20],
    });
    expect(persisted.map((item) => item.precioUnitario)).toEqual(Array(9).fill(101000));
    expect(persisted.map((item) => item.precioTotal)).toEqual(Array(9).fill(101000));
  });

  it("alternar Guiada <-> Constructor conserva V1-V4 y V5-V9 en $101.000 visibles", () => {
    const serie20 = createSerie20Template();
    const v1 = buildGuidedL20Item("V1", "Incoloro monolítico 5mm", serie20, []);
    const v2 = buildGuidedL20Item("V2", "Incoloro monolítico 4mm", serie20, [v1]);
    const v3 = buildGuidedL20Item("V3", "Incoloro monolítico 6mm", serie20, [v1, v2]);
    const v4 = buildGuidedL20Item("V4", "DVH 4+12+4", serie20, [v1, v2, v3]);

    const constructorItems: typeof v1[] = [];
    for (const [code, glass] of [
      ["V5", "Incoloro monolítico 5mm"],
      ["V6", "Incoloro monolítico 4mm"],
      ["V7", "Incoloro monolítico 6mm"],
      ["V8", "Incoloro monolítico 6mm"],
      ["V9", "DVH 4+12+4"],
    ] as const) {
      constructorItems.push(
        buildConstructorL20Item(code, glass, serie20, [v1, v2, v3, v4, ...constructorItems])
      );
    }
    const items = [v1, v2, v3, v4, ...constructorItems];
    const onEnterConstructor = jest.fn();
    const onCloseConstructor = jest.fn();

    const { rerender } = render(
      <PasoDosListaMovil
        items={items}
        subtotal="$909.000"
        total="$1.081.710"
        quotePricingMode="por_item"
        totalClienteManual={null}
        mostrarIva
        isWizardOpen={false}
        adjustedItems={{}}
        onOpenWizard={jest.fn()}
        onOpenFreeValueItemForm={jest.fn()}
        onGoToSummary={jest.fn()}
        onSaveAndExit={jest.fn()}
        onEditItem={jest.fn()}
        onRemoveItem={jest.fn()}
        onReturnToModeSelector={jest.fn()}
        onOpenCuaderno={onEnterConstructor}
        fabricationRecipes={[]}
        fabricationOrganizationId={null}
      />
    );

    const guiadaAntes = screen.getAllByRole("article");
    expect(guiadaAntes).toHaveLength(9);
    guiadaAntes.forEach((card) => {
      expect(within(card).getByText("$101.000")).toBeInTheDocument();
      expect(within(card).queryByText("$202.000")).not.toBeInTheDocument();
    });

    rerender(
      <PasoDosCuadernoMovil
        items={items}
        quotePricingMode="por_item"
        lineTemplates={[serie20]}
        glassOptions={[]}
        formatCurrencyInput={(value) => value}
        onAddPreset={jest.fn(() => null)}
        onUpdateItem={jest.fn()}
        onApplyLineToItems={jest.fn()}
        onDuplicateItem={jest.fn()}
        onRemoveItem={jest.fn()}
        onGoToSummary={jest.fn()}
        onClose={onCloseConstructor}
        onReturnToModeSelector={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole("tab", { name: "Guiada" }));
    expect(onCloseConstructor).toHaveBeenCalledTimes(1);

    rerender(
      <PasoDosListaMovil
        items={items}
        subtotal="$909.000"
        total="$1.081.710"
        quotePricingMode="por_item"
        totalClienteManual={null}
        mostrarIva
        isWizardOpen={false}
        adjustedItems={{}}
        onOpenWizard={jest.fn()}
        onOpenFreeValueItemForm={jest.fn()}
        onGoToSummary={jest.fn()}
        onSaveAndExit={jest.fn()}
        onEditItem={jest.fn()}
        onRemoveItem={jest.fn()}
        onReturnToModeSelector={jest.fn()}
        onOpenCuaderno={onEnterConstructor}
        fabricationRecipes={[]}
        fabricationOrganizationId={null}
      />
    );

    const guiadaDespues = screen.getAllByRole("article");
    expect(guiadaDespues).toHaveLength(9);
    guiadaDespues.forEach((card) => {
      expect(within(card).getByText("$101.000")).toBeInTheDocument();
      expect(within(card).queryByText("$202.000")).not.toBeInTheDocument();
    });
  });
});
