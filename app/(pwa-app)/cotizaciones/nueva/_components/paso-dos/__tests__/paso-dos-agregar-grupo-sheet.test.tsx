/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";

import { FREE_TOTAL_NOTEBOOK_CATEGORIA, FREE_TOTAL_NOTEBOOK_SUBTIPO } from "../../../_hooks/use-paso-dos-agregar-grupo";
import type { PasoDosGrupoDraft } from "../../../_hooks/use-paso-dos-agregar-grupo";
import { createDefaultGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { PasoDosAgregarGrupoSheet } from "../paso-dos-agregar-grupo-sheet";

const draft: PasoDosGrupoDraft = {
  categoria: FREE_TOTAL_NOTEBOOK_CATEGORIA,
  subtipo: FREE_TOTAL_NOTEBOOK_SUBTIPO,
  hojasBase: 2,
  cantidad: 1,
  usaCantidadPersonalizada: false,
  cantidadPersonalizada: "",
  nombre: "Mantencion de ventanas",
  descripcion: "Mantencion completa de ventanas",
  ivaMode: "total_incluye_iva",
  cobraPrecioSeparado: false,
  alcanceDetalles: [],
  pricingMode: "margen",
  priceInputMode: "unit_direct",
  material: "Aluminio",
  catalogCategoria: null,
  catalogEspesor: "",
  catalogTerminacion: "",
  colorHex: "#a8a8a8",
  sistema: "",
  configuracion: "",
  sheetScheme: "",
  sheetVariant: "",
  customSchemeDescription: "",
  isCustomScheme: false,
  mirrorFormat: "single",
  mirrorPaneCount: null,
  mirrorPaneDirection: "vertical",
  mirrorInteriorLine: "fine",
  mirrorCustomPaneCount: "",
  guidedVisualConfig: null,
  vidrio: "",
  lineTemplateId: "",
  referencia: "",
  ancho: "",
  alto: "",
  precio: "",
  precioPorM2: "",
  minimoCobrable: "",
  redondeoPrecio: "",
  precioAjustadoManual: false,
  margenPct: "",
  palilloEnabled: false,
  palilloType: "",
  costInputScope: "group_total",
};

const baseProps = {
  isOpen: true,
  variant: "embedded" as const,
  paso: 4 as const,
  entryMode: "free_total_single" as const,
  draft,
  subtypeOptions: [],
  systemOptions: [],
  glassOptions: [],
  summary: "Mantencion de ventanas",
  onClose: jest.fn(),
  onBack: jest.fn(),
  onNext: jest.fn(),
  onConfirm: jest.fn(),
  onSelectCategoria: jest.fn(),
  onSelectSubtipo: jest.fn(),
  onSelectCantidad: jest.fn(),
  onEnableCustomQuantity: jest.fn(),
  onCustomQuantityChange: jest.fn(),
  onCantidadInputChange: jest.fn(),
  onNormalizeCantidadInput: jest.fn(),
  onMaterialChange: jest.fn(),
  onNombreChange: jest.fn(),
  onDescripcionChange: jest.fn(),
  onSistemaChange: jest.fn(),
  onSheetSchemeChange: jest.fn(),
  onSheetVariantChange: jest.fn(),
  onCustomSchemeDescriptionChange: jest.fn(),
  onVidrioChange: jest.fn(),
  onCreateCustomGlass: jest.fn(),
  onPrecioChange: jest.fn(),
  onPrecioPorM2Change: jest.fn(),
  onMinimoCobrableChange: jest.fn(),
  onRedondeoPrecioChange: jest.fn(),
  onPriceInputModeChange: jest.fn(),
  onToggleCustomizeUnitPrice: jest.fn(),
  onPricingModeChange: jest.fn(),
  onMargenChange: jest.fn(),
  onAnchoChange: jest.fn(),
  onAltoChange: jest.fn(),
  onColorChange: jest.fn(),
  onCobraPrecioSeparadoChange: jest.fn(),
  onAddAlcanceDetalle: jest.fn(),
  onUpdateAlcanceDetalle: jest.fn(),
  onRemoveAlcanceDetalle: jest.fn(),
  quotePricingMode: "total_global" as const,
  totalClienteManual: 250000,
  mostrarIva: true,
  internalObservation: "",
  onGlobalTotalClienteChange: jest.fn(),
  onMostrarIvaChange: jest.fn(),
  onInternalObservationChange: jest.fn(),
  onGoToStep: jest.fn(),
  canContinueFromQuantity: true,
  canContinueFromConfig: true,
};

describe("PasoDosAgregarGrupoSheet desktop embebido", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("agrega directo el trabajo libre total y no muestra cobro separado", () => {
    render(<PasoDosAgregarGrupoSheet {...baseProps} />);

    expect(screen.queryByText("Cobrar este item por separado")).not.toBeInTheDocument();
    expect(screen.queryByText("Sumar este detalle como extra")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /agregar trabajo al presupuesto/i }));

    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(baseProps.onNext).not.toHaveBeenCalled();
  });

  it("muestra progreso segmentado con labels en variante embedded", () => {
    render(
      <PasoDosAgregarGrupoSheet
        {...baseProps}
        quotePricingMode="por_item"
        entryMode="normal"
        paso={2}
        draft={{
          ...draft,
          categoria: "Ventanas",
          subtipo: "Ventana",
          sistema: "",
          nombre: "",
          descripcion: "",
          ancho: "",
          alto: "",
          precio: "",
        }}
      />
    );

    const progress = screen.getByRole("list", { name: /Pasos de la pieza/i });

    expect(within(progress).getByText("Tipo")).toBeInTheDocument();
    expect(within(progress).getByText("Sistema")).toBeInTheDocument();
    expect(within(progress).getByText("Medidas")).toBeInTheDocument();
    expect(within(progress).getByText("Despiece")).toBeInTheDocument();
    expect(within(progress).getByText("Precio")).toBeInTheDocument();
    expect(screen.queryByText("Paso 2 de 5")).not.toBeInTheDocument();
  });

  it("muestra stepper secuencial y CTA contextual en desktop por items", () => {
    render(
      <PasoDosAgregarGrupoSheet
        {...baseProps}
        quotePricingMode="por_item"
        entryMode="normal"
        paso={1}
        draft={{
          ...draft,
          categoria: "Ventanas",
          subtipo: "Ventana",
          sistema: "",
          ancho: "",
          alto: "",
          precio: "",
        }}
      />
    );

    expect(screen.getByRole("list", { name: /Pasos de la pieza/i })).toBeInTheDocument();
    expect(screen.getByText("Frecuentes")).toBeInTheDocument();
    expect(screen.getByText("Otros trabajos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver todos los trabajos/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /\u00bfQu\u00e9 est\u00e1s cotizando/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vidrio \/ Cristal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar a sistema/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Finalizar pieza/i })).not.toBeInTheDocument();
  });

  it("bloquea avance en Personalizado sin composición y alinea copy de cierre", () => {
    const { rerender } = render(
      <PasoDosAgregarGrupoSheet
        {...baseProps}
        quotePricingMode="por_item"
        entryMode="normal"
        paso={2}
        draft={{
          ...draft,
          categoria: "Ventanas",
          subtipo: "Ventana",
          sistema: "Personalizado",
          isCustomScheme: true,
          sheetScheme: "",
          customSchemeDescription: "",
          guidedVisualConfig: null,
          ancho: "",
          alto: "",
          precio: "",
        }}
      />
    );

    expect(
      screen.getByRole("button", { name: /Continuar a medidas/i })
    ).toBeDisabled();
    expect(
      screen.getByText(/Abre el constructor o describe la composición personalizada/i)
    ).toBeInTheDocument();

    rerender(
      <PasoDosAgregarGrupoSheet
        {...baseProps}
        quotePricingMode="por_item"
        entryMode="normal"
        paso={5}
        draft={{
          ...draft,
          categoria: "Ventanas",
          subtipo: "Ventana",
          sistema: "Corredera",
          sheetScheme: "2 hojas",
          sheetVariant: "1 fija + 1 móvil",
          ancho: "1200",
          alto: "1000",
          precio: "90000",
          precioPorM2: "75000",
          minimoCobrable: "45000",
          redondeoPrecio: "1000",
          priceInputMode: "line_m2",
        }}
      />
    );

    expect(screen.getByText(/Listo para finalizar la pieza/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finalizar pieza/i })).toBeEnabled();
  });

  it("permite elegir recomendados y guardar un vidrio escrito en desktop", () => {
    const onVidrioChange = jest.fn();
    const onCreateCustomGlass = jest.fn();
    const rectSpy = jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function getMockRect() {
        if (this instanceof HTMLElement && this.getAttribute("aria-label") === "Editor de pieza activa") {
          return {
            x: 320,
            y: 96,
            width: 820,
            height: 720,
            top: 96,
            right: 1140,
            bottom: 816,
            left: 320,
            toJSON: () => ({}),
          } as DOMRect;
        }

        return {
          x: 340,
          y: 640,
          width: 490,
          height: 46,
          top: 640,
          right: 830,
          bottom: 686,
          left: 340,
          toJSON: () => ({}),
        } as DOMRect;
      });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });

    const desktopGlassProps = {
      ...baseProps,
      quotePricingMode: "por_item" as const,
      entryMode: "normal" as const,
      paso: 3 as const,
      draft: {
        ...draft,
        categoria: "Ventanas",
        subtipo: "Ventana",
        sistema: "Corredera",
        configuracion: "Ventana Corredera",
        sheetScheme: "2 hojas",
        sheetVariant: "2 moviles",
        ancho: "1500",
        alto: "1800",
        vidrio: "Incoloro monolitico 5mm",
        precio: "",
      },
      glassOptions: [
        "Incoloro monolitico 5mm",
        "Incoloro monolitico 6mm",
        "DVH 4+12+4",
        "Templado 8mm",
      ],
      onVidrioChange,
      onCreateCustomGlass,
    };

    try {
      render(
        <PasoDosAgregarGrupoSheet
          {...desktopGlassProps}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Abrir catalogo de vidrios/i }));

      const catalog = screen.getByRole("dialog", { name: /Catalogo de vidrios/i });
      expect(catalog).toBeInTheDocument();
      expect(catalog).toHaveStyle({ left: "340px", top: "190px" });

      fireEvent.click(within(catalog).getByRole("button", { name: /^DVH 4\+12\+4$/i }));
      expect(onVidrioChange).toHaveBeenCalledWith("DVH 4+12+4");

      fireEvent.click(screen.getByRole("button", { name: /Abrir catalogo de vidrios/i }));
      const input = screen.getByPlaceholderText(/Buscar/i);
      fireEvent.change(input, { target: { value: "Laminado maestro 11mm" } });

      fireEvent.click(screen.getByRole("button", { name: /Guardar Laminado maestro 11mm/i }));
      expect(onCreateCustomGlass).toHaveBeenCalledWith("Laminado maestro 11mm");
    } finally {
      rectSpy.mockRestore();
    }
  });

  it("muestra catalogo de cristales en desktop para componentes solo vidrio", () => {
    const onSelectLineTemplate = jest.fn();

    render(
      <PasoDosAgregarGrupoSheet
        {...baseProps}
        quotePricingMode="por_item"
        entryMode="normal"
        paso={3}
        draft={{
          ...draft,
          categoria: "Vidrios y cristales",
          subtipo: "Vidrio / Cristal",
          material: "Cristal",
          catalogCategoria: "vidrio",
          sistema: "Sin perfileria",
          configuracion: "Vidrio suelto",
          ancho: "1200",
          alto: "1500",
          vidrio: "Cristal templado 10 mm",
          precio: "",
          priceInputMode: "line_m2",
        }}
        visibleLineTemplates={[
          {
            id: "cr-1",
            organizationId: "org-1",
            nombre: "Cristal templado 10 mm",
            material: "Cristal",
            categoria: "vidrio",
            unidadCobro: "m2",
            precioM2Sugerido: 150000,
            minimoCobrable: 95000,
            redondeoPrecio: 1000,
            vidrioPrincipalRecomendado: null,
            catalogMetadata: {},
            isActive: true,
            creadoEn: "2026-07-14T00:00:00.000Z",
            actualizadoEn: "2026-07-14T00:00:00.000Z",
          },
        ]}
        onSelectLineTemplate={onSelectLineTemplate}
      />
    );

    expect(screen.getByText("Producto de cristal")).toBeInTheDocument();
    expect(screen.queryByLabelText("Seleccionar linea comercial")).not.toBeInTheDocument();

    const selector = screen.getByLabelText("Seleccionar producto de cristal");
    expect(selector).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByText(/Cristal templado 10 mm/i).length).toBeGreaterThan(0);

    fireEvent.click(selector);
    const picker = screen.getByRole("dialog", { name: /Elegir cristal/i });
    fireEvent.click(within(picker).getByRole("option", { name: /Cristal templado 10 mm/i }));
    expect(onSelectLineTemplate).toHaveBeenCalledWith("cr-1");
  });

  it("muestra globalError en el footer desktop del wizard", () => {
    render(
      <PasoDosAgregarGrupoSheet
        {...baseProps}
        quotePricingMode="por_item"
        entryMode="normal"
        paso={5}
        globalError="No se pudo agregar el grupo"
        draft={{
          ...draft,
          categoria: "Ventanas",
          subtipo: "Ventana",
          sistema: "Corredera",
          sheetScheme: "Personalizado",
          isCustomScheme: true,
          guidedVisualConfig: createDefaultGuidedVisualConfig({
            widthMm: 1200,
            heightMm: 1000,
          }),
          ancho: "1200",
          alto: "1000",
          precio: "90000",
          precioPorM2: "75000",
          minimoCobrable: "45000",
          redondeoPrecio: "1000",
          priceInputMode: "line_m2",
        }}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo agregar el grupo");
  });

  it("permite finalizar pieza con composición personalizada guiada y precio m²", () => {
    const onConfirm = jest.fn();

    render(
      <PasoDosAgregarGrupoSheet
        {...baseProps}
        quotePricingMode="por_item"
        entryMode="normal"
        paso={5}
        onConfirm={onConfirm}
        draft={{
          ...draft,
          categoria: "Ventanas",
          subtipo: "Ventana",
          sistema: "Corredera",
          sheetScheme: "Personalizado",
          isCustomScheme: true,
          guidedVisualConfig: createDefaultGuidedVisualConfig({
            widthMm: 1200,
            heightMm: 1000,
          }),
          ancho: "1200",
          alto: "1000",
          precio: "90000",
          precioPorM2: "75000",
          minimoCobrable: "45000",
          redondeoPrecio: "1000",
          priceInputMode: "line_m2",
        }}
      />
    );

    const finishButton = screen.getByRole("button", { name: /Finalizar pieza/i });
    expect(finishButton).toBeEnabled();
    fireEvent.click(finishButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
