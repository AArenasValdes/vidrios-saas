/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import {
  listLeafModules,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import {
  countIncompleteCuadernoPieces,
  deriveCuadernoPiecePriorityStatus,
  findFirstIncompleteCuadernoPieceId,
} from "../cuaderno-piece-status";
import { PasoDosCuadernoMovil } from "../paso-dos-cuaderno-movil";

function baseItem(overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  const config = createQuoteConstructorPresetConfig("fijo");
  return {
    id: "item-1",
    codigo: "VEN-01",
    tipo: "Ventana",
    lineaComercial: "Linea A",
    vidrio: "Incoloro 5mm",
    nombre: "Ventana fija",
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
    observaciones: encodeCotizacionItemPresentationMeta({ guidedVisualConfig: config }),
    ...overrides,
  };
}

function baseLineTemplate(
  overrides: Partial<CotizacionLineTemplate> = {}
): CotizacionLineTemplate {
  return {
    id: "linea-a",
    organizationId: "org-1",
    nombre: "Linea A",
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 100000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
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

describe("cuaderno-piece-status", () => {
  it("marca Faltan datos si faltan medidas", () => {
    expect(
      deriveCuadernoPiecePriorityStatus(
        baseItem({ ancho: null as unknown as number, alto: null as unknown as number }),
        "por_item"
      )
    ).toBe("faltan_datos");
  });

  it("marca Falta precio cuando el unitario es 0 en por_item", () => {
    expect(deriveCuadernoPiecePriorityStatus(baseItem({ precioUnitario: 0 }), "por_item")).toBe(
      "falta_precio"
    );
  });

  it("marca Lista cuando la pieza está completa para resumen", () => {
    expect(deriveCuadernoPiecePriorityStatus(baseItem(), "por_item")).toBe("lista");
  });

  it("encuentra la primera incompleta y cuenta faltantes", () => {
    const items = [
      baseItem({ id: "a", precioUnitario: 90000 }),
      baseItem({ id: "b", precioUnitario: 0, nombre: "Sin precio" }),
      baseItem({ id: "c", precioUnitario: 0, nombre: "Otra" }),
    ];
    expect(findFirstIncompleteCuadernoPieceId(items, "por_item")).toBe("b");
    expect(countIncompleteCuadernoPieces(items, "por_item")).toBe(2);
  });
});

describe("PasoDosCuadernoMovil", () => {
  const onGoToSummary = jest.fn();
  const onAddPreset = jest.fn(() => "item-new");
  const onUpdateItem = jest.fn();
  const onApplyLineToItems = jest.fn();
  const onDuplicateItem = jest.fn();
  const onRemoveItem = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    items: [] as CotizacionWorkflowItem[],
    quotePricingMode: "por_item" as const,
    lineTemplates: [] as [],
    glassOptions: [] as string[],
    formatCurrencyInput: (value: string) => value,
    onAddPreset,
    onUpdateItem,
    onApplyLineToItems,
    onDuplicateItem,
    onRemoveItem,
    onGoToSummary,
    onClose,
  };

  it("muestra empty state y permite agregar tipologia con confirmacion", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} />);

    expect(screen.getByRole("heading", { name: "Constructor de piezas" })).toBeInTheDocument();
    expect(screen.getByText("Elige una tipologia y toca Agregar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar pieza" }));
    expect(screen.getByRole("dialog", { name: "Agregar pieza" })).toBeInTheDocument();
    expect(onAddPreset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Fijo" }));
    expect(onAddPreset).toHaveBeenCalledWith("fijo", undefined);
  });

  it("agrega la tipologia seleccionada", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar pieza" }));
    fireEvent.click(screen.getByRole("button", { name: "Corredera" }));
    expect(onAddPreset).toHaveBeenCalledWith("corredera", undefined);
  });

  it("aplica la linea comun a piezas existentes", () => {
    render(
      <PasoDosCuadernoMovil
        {...defaultProps}
        items={[baseItem({ id: "a" }), baseItem({ id: "b" })]}
        lineTemplates={[baseLineTemplate()]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Elegir" }));
    fireEvent.click(screen.getByRole("radio", { name: /Linea A/i }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar linea" }));

    expect(onApplyLineToItems).toHaveBeenCalledWith("linea-a");
    expect(onUpdateItem).not.toHaveBeenCalled();
  });

  it("reserva la linea global para perfiles y no mezcla cristales", () => {
    render(
      <PasoDosCuadernoMovil
        {...defaultProps}
        items={[baseItem({ id: "a" })]}
        lineTemplates={[baseLineTemplate({ id: "cristal-5", nombre: "Cristal 5mm", categoria: "vidrio", material: "Cristal" })]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Elegir" }));
    expect(screen.queryByRole("radio", { name: /Cristal 5mm/i })).not.toBeInTheDocument();
    expect(screen.getByText(/No hay lineas activas/i)).toBeInTheDocument();
  });

  it("explica cuando no hay lineas activas en la linea del trabajo", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Elegir" }));
    expect(screen.getByText(/No hay lineas activas/i)).toBeInTheDocument();
  });

  it("abre edición rápida al tocar una pieza", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByText("Ventana fija"));
    expect(screen.getByRole("dialog", { name: /editar pieza/i })).toBeInTheDocument();
  });

  it("previsualiza el color del perfil en la miniatura", () => {
    const config = createQuoteConstructorPresetConfig("corredera");
    const { container } = render(
      <PasoDosCuadernoMovil
        {...defaultProps}
        items={[
          baseItem({
            observaciones: encodeCotizacionItemPresentationMeta({
              guidedVisualConfig: config,
              colorHex: "#f58220",
              material: "PVC",
            }),
          }),
        ]}
      />
    );

    expect(container.innerHTML).toContain('stop-color="#f58220"');
  });

  it("completar faltantes abre la primera pieza incompleta", () => {
    const incomplete = baseItem({ id: "incomplete", precioUnitario: 0, nombre: "Sin precio" });
    render(<PasoDosCuadernoMovil {...defaultProps} items={[incomplete]} />);

    fireEvent.click(screen.getByRole("button", { name: "Completar faltantes" }));
    expect(screen.getByRole("dialog", { name: /editar pieza/i })).toBeInTheDocument();
    expect(onGoToSummary).not.toHaveBeenCalled();
  });

  it("continúa al resumen cuando todas las piezas están listas", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Continuar al resumen" }));
    expect(onGoToSummary).toHaveBeenCalled();
  });

  it("cambiar tipologías no duplica piezas al editar", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    expect(screen.getAllByText("Ventana fija")).toHaveLength(1);
    expect(onAddPreset).not.toHaveBeenCalled();
  });

  it("vuelve a cotizacion rapida desde el cierre del cuaderno", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Volver a cotizacion rapida" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("vuelve a la vista guiada desde el selector de carga", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("tab", { name: "Guiada" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("confirma la linea desde la edicion rapida al guardar", () => {
    render(
      <PasoDosCuadernoMovil
        {...defaultProps}
        items={[baseItem({ id: "item-1", precioUnitario: 0 })]}
        lineTemplates={[baseLineTemplate()]}
      />
    );

    fireEvent.click(screen.getByText("Ventana fija"));
    fireEvent.click(screen.getByRole("button", { name: "Elegir linea de esta pieza" }));
    fireEvent.click(screen.getByRole("option", { name: /Linea A/i }));

    expect(onUpdateItem).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Precio unitario")).toHaveValue("120000");
    expect(screen.getByRole("dialog", { name: /editar pieza/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onUpdateItem).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({
        costoProveedorUnitario: "120000",
        lineTemplateId: "linea-a",
      })
    );
  });

  it("permite cambiar material del perfil desde la edicion rapida", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByText("Ventana fija"));
    fireEvent.click(screen.getByRole("button", { name: "PVC" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onUpdateItem).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({ material: "PVC" })
    );
  });

  it("permite elegir una linea de cristal en la edicion rapida", () => {
    render(
      <PasoDosCuadernoMovil
        {...defaultProps}
        items={[baseItem({ id: "item-1", precioUnitario: 0 })]}
        lineTemplates={[
          baseLineTemplate({
            id: "cristal-5",
            nombre: "Cristal monolitico 5mm",
            categoria: "vidrio",
            material: "Cristal",
          }),
        ]}
      />
    );

    fireEvent.click(screen.getByText("Ventana fija"));
    fireEvent.click(screen.getByRole("button", { name: "Elegir linea de esta pieza" }));
    fireEvent.click(screen.getByRole("button", { name: "Cristal" }));
    fireEvent.click(screen.getByRole("option", { name: /Cristal monolitico 5mm/i }));

    expect(onUpdateItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onUpdateItem).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({ lineTemplateId: "cristal-5" })
    );
  });

  it("abre el selector de linea filtrado por el material de la pieza", () => {
    render(
      <PasoDosCuadernoMovil
        {...defaultProps}
        items={[
          baseItem({
            observaciones: encodeCotizacionItemPresentationMeta({
              guidedVisualConfig: createQuoteConstructorPresetConfig("fijo"),
              material: "PVC",
            }),
          }),
        ]}
        lineTemplates={[
          baseLineTemplate({ id: "aluminio-32", nombre: "Aluminio 32", material: "Aluminio" }),
          baseLineTemplate({ id: "pvc-25", nombre: "PVC 25", categoria: "pvc", material: "PVC" }),
        ]}
      />
    );

    fireEvent.click(screen.getByText("Ventana fija"));
    fireEvent.click(screen.getByRole("button", { name: "Elegir linea de esta pieza" }));

    expect(screen.getByText("PVC primero")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /PVC 25/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Aluminio 32/i })).not.toBeInTheDocument();
  });

  it("abre composicion desde la edicion rapida sin entrar al constructor completo", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByText("Ventana fija"));
    fireEvent.click(screen.getByRole("button", { name: /Forma y apertura/i }));
    expect(screen.getByRole("dialog", { name: /Armar composici/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Constructor" })).not.toBeInTheDocument();
    expect(onAddPreset).not.toHaveBeenCalled();
  });

  it("abre composicion desde el menu de tres puntos", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("button", { name: /acciones de/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar composicion" }));
    expect(screen.getByRole("dialog", { name: /Armar composici/i })).toBeInTheDocument();
  });

  it("edita medidas dentro de la composicion antes de usarla", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("button", { name: /acciones de/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar composicion" }));
    fireEvent.change(screen.getByLabelText("Ancho de la composicion"), {
      target: { value: "1500" },
    });
    fireEvent.blur(screen.getByLabelText("Ancho de la composicion"));
    fireEvent.change(screen.getByLabelText("Alto de la composicion"), {
      target: { value: "1100" },
    });
    fireEvent.blur(screen.getByLabelText("Alto de la composicion"));
    fireEvent.click(screen.getByRole("button", { name: "Usar esta composicion" }));

    expect(onUpdateItem).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({
        ancho: "1500",
        alto: "1100",
      })
    );
  });

  it("guarda la medida editada aunque el usuario no salga del campo", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("button", { name: /acciones de/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar composicion" }));
    fireEvent.change(screen.getByLabelText("Ancho de la composicion"), {
      target: { value: "1600" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Usar esta composicion" }));

    expect(onUpdateItem).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({
        ancho: "1600",
      })
    );
  });

  it("permite seleccionar un modulo partido y cambiarle el sistema", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("button", { name: /acciones de/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar composicion" }));
    fireEvent.click(screen.getByRole("button", { name: "Partir lado" }));
    fireEvent.click(screen.getByRole("button", { name: "M1" }));
    fireEvent.click(screen.getByRole("button", { name: "Cambiar modulo M1 a Corredera" }));
    fireEvent.click(screen.getByRole("button", { name: "Usar esta composicion" }));

    const patch = onUpdateItem.mock.calls.at(-1)?.[1] as { guidedVisualConfig: GuidedVisualConfig };
    const modules = listLeafModules(patch.guidedVisualConfig.root);
    expect(modules).toHaveLength(2);
    expect(modules.some((module) => module.type === "corredera")).toBe(true);
    expect(modules.some((module) => module.type === "fijo")).toBe(true);
  });

  it("solo permite reflejar modulos con apertura lateral y guarda el lado elegido", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("button", { name: /acciones de/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar composicion" }));

    expect(screen.getByRole("button", { name: /Reflejar no disponible/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar modulo M1 a Abatible" }));
    fireEvent.click(screen.getByRole("button", { name: /Reflejar apertura de M1/i }));
    fireEvent.click(screen.getByRole("button", { name: "Usar esta composicion" }));

    const patch = onUpdateItem.mock.calls.at(-1)?.[1] as { guidedVisualConfig: GuidedVisualConfig };
    expect(listLeafModules(patch.guidedVisualConfig.root)[0]).toMatchObject({
      type: "abatible",
      openingSide: "right",
    });
  });

  it("el menu permite pedir eliminacion", () => {
    render(<PasoDosCuadernoMovil {...defaultProps} items={[baseItem()]} />);

    fireEvent.click(screen.getByRole("button", { name: /acciones de/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(onRemoveItem).toHaveBeenCalledWith("item-1");
  });
});
