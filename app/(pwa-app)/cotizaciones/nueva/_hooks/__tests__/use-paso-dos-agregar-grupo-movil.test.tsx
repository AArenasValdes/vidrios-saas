/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";

import { usePasoDosAgregarGrupoMovil } from "../use-paso-dos-agregar-grupo-movil";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

const l42CatalogEntry = VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === "ventora:l42")!;
const l42Template = {
  id: "tmpl-l42",
  organizationId: 1,
  catalogKey: l42CatalogEntry.catalogKey ?? "ventora:l42",
  nombre: l42CatalogEntry.nombre,
  categoria: "aluminio" as const,
  unidadCobro: "m2" as const,
  material: "Aluminio" as const,
  vidrioPrincipalRecomendado: null,
  costoBase: 0,
  precioM2Sugerido: 185000,
  minimoCobrable: 0,
  redondeoPrecio: 1000,
  mermaPct: 0,
  margenObjetivoPct: null,
  proveedor: null,
  vigenciaDesde: null,
  vigenciaHasta: null,
  catalogMetadata: l42CatalogEntry.catalogMetadata ?? null,
  isActive: true,
  sortOrder: 1,
  creadoEn: null,
  actualizadoEn: null,
  eliminadoEn: null,
};

const catalogGlass = {
  id: 3643,
  organizationId: 1,
  catalogKey: null,
  nombre: "Float Incoloro 5mm",
  categoria: "vidrio" as const,
  unidadCobro: "m2" as const,
  material: "Cristal" as const,
  vidrioPrincipalRecomendado: null,
  costoBase: 0,
  precioM2Sugerido: 0,
  minimoCobrable: 0,
  redondeoPrecio: 0,
  mermaPct: 0,
  margenObjetivoPct: null,
  proveedor: null,
  vigenciaDesde: null,
  vigenciaHasta: null,
  catalogMetadata: { espesorMm: 5, categoriaTecnica: "monolitico", planchaAnchoMm: 2500, planchaAltoMm: 1800 },
  isActive: true,
  sortOrder: 0,
  creadoEn: null,
  actualizadoEn: null,
  eliminadoEn: null,
};

function ProbePasoDosAgregarGrupoMovil() {
  const wizard = usePasoDosAgregarGrupoMovil({
    items: [],
    pricingMode: "margen",
    provider: "",
    activeLineTemplates: [catalogGlass, l42Template],
  });

  return (
    <div>
      <span data-testid="abierto">{wizard.isOpen ? "si" : "no"}</span>
      <span data-testid="paso">{String(wizard.paso)}</span>
      <span data-testid="subtipo">{wizard.draft.subtipo}</span>
      <span data-testid="material">{wizard.draft.material}</span>
      <span data-testid="sistema">{wizard.draft.sistema}</span>
      <span data-testid="cantidad">{String(wizard.draft.cantidad)}</span>
      <span data-testid="linea">{wizard.draft.referencia}</span>
      <span data-testid="vidrio">{wizard.draft.vidrio}</span>
      <span data-testid="vidrio-id">{wizard.draft.vidrioLineTemplateId}</span>
      <span data-testid="vidrio-spec">{wizard.draft.glassTechnicalSpec?.thicknessMm ?? "pendiente"}</span>
      <span data-testid="linea-id">{wizard.draft.lineTemplateId}</span>
      <span data-testid="proveedor">{wizard.draft.supplierProviderKey}</span>
      <span data-testid="fabricacion-hojas">{wizard.draft.fabricacionHojas == null ? "" : String(wizard.draft.fabricacionHojas)}</span>
      <span data-testid="fabricacion-tipologia">{wizard.draft.fabricacionTipologia}</span>
      <span data-testid="catalog-line-key">{wizard.draft.catalogLineKey}</span>
      <span data-testid="recipe-id">{wizard.draft.fabricationRecipeId}</span>
      <span data-testid="precio">{wizard.draft.precio}</span>
      <span data-testid="modo">{wizard.draft.pricingMode}</span>
      <span data-testid="margen-pct">{wizard.draft.margenPct}</span>
      <span data-testid="precio-manual">
        {wizard.draft.precioAjustadoManual ? "si" : "no"}
      </span>
      <button type="button" onClick={() => wizard.openSheet()}>
        abrir
      </button>
      <button type="button" onClick={() => wizard.selectSubtipo("Puerta")}>
        subtipo
      </button>
      <button type="button" onClick={() => wizard.selectCantidad(4)}>
        cantidad
      </button>
      <button type="button" onClick={() => wizard.goNext()}>
        siguiente
      </button>
      <button type="button" onClick={() => wizard.goBack()}>
        atras
      </button>
      <button type="button" onClick={() => wizard.updateAncho("1500")}>
        ancho
      </button>
      <button type="button" onClick={() => wizard.updateAlto("2000")}>
        alto
      </button>
      <button type="button" onClick={() => wizard.updatePricingMode("margen")}>
        cambiar a margen
      </button>
      <button type="button" onClick={() => wizard.updatePricingMode("precio_directo")}>
        cambiar a directo
      </button>
      <button type="button" onClick={() => wizard.updatePrecio("333000")}>
        precio manual
      </button>
      <button type="button" onClick={() => wizard.selectLineTemplate("tmpl-l42")}>
        elegir l42
      </button>
      <button type="button" onClick={() => wizard.updateSistema("Proyectante")}>
        sistema proyectante
      </button>
      <button type="button" onClick={() => wizard.updateSistema("Corredera")}>
        sistema corredera
      </button>
      <button type="button" onClick={() => wizard.updateMaterial("PVC")}>
        material pvc
      </button>
      <button type="button" onClick={() => wizard.updateSupplierProviderKey("alumco")}>
        elegir alumco
      </button>
      <button type="button" onClick={() => wizard.updateMargenPct("80")}>
        margen propio
      </button>
      <button type="button" onClick={() => wizard.selectGlassProduct("3643")}>
        elegir vidrio 3643
      </button>
      <button type="button" onClick={() => wizard.updateVidrio("Vidrio personalizado")}>
        vidrio personalizado
      </button>
      <button
        type="button"
        onClick={() =>
          wizard.applyCreatedLineTemplate({
            id: "tmpl-1",
            organizationId: "org-1",
            nombre: "Línea 5000",
            material: "Aluminio",
            vidrioPrincipalRecomendado: "Templado 8mm",
            precioM2Sugerido: 180000,
            minimoCobrable: 120000,
            redondeoPrecio: 1000,
            isActive: true,
            sortOrder: 1,
            creadoEn: null,
            actualizadoEn: null,
            eliminadoEn: null,
          })
        }
      >
        plantilla
      </button>
      <button type="button" onClick={() => wizard.closeSheet()}>
        cerrar
      </button>
    </div>
  );
}

describe("usePasoDosAgregarGrupoMovil", () => {
  it("debe avanzar en 3 pasos y resetear al cerrar", () => {
    render(<ProbePasoDosAgregarGrupoMovil />);

    expect(screen.getByTestId("abierto")).toHaveTextContent("no");
    expect(screen.getByTestId("paso")).toHaveTextContent("1");

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
    });

    expect(screen.getByTestId("abierto")).toHaveTextContent("si");
    expect(screen.getByTestId("paso")).toHaveTextContent("1");

    act(() => {
      fireEvent.click(screen.getByText("subtipo"));
    });

    expect(screen.getByTestId("subtipo")).toHaveTextContent("Puerta");
    expect(screen.getByTestId("paso")).toHaveTextContent("2");

    act(() => {
      fireEvent.click(screen.getByText("cantidad"));
      fireEvent.click(screen.getByText("siguiente"));
    });

    expect(screen.getByTestId("cantidad")).toHaveTextContent("4");
    expect(screen.getByTestId("paso")).toHaveTextContent("3");

    act(() => {
      fireEvent.click(screen.getByText("atras"));
    });

    expect(screen.getByTestId("paso")).toHaveTextContent("2");

    act(() => {
      fireEvent.click(screen.getByText("cerrar"));
    });

    expect(screen.getByTestId("abierto")).toHaveTextContent("no");
    expect(screen.getByTestId("paso")).toHaveTextContent("1");
  });

  it("debe aplicar una línea creada en el draft actual", () => {
    render(<ProbePasoDosAgregarGrupoMovil />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
      fireEvent.click(screen.getByText("plantilla"));
    });

    expect(screen.getByTestId("linea")).toHaveTextContent("Línea 5000");
    expect(screen.getByTestId("vidrio")).toHaveTextContent("Templado 8mm");
    expect(screen.getByTestId("linea-id")).toHaveTextContent("tmpl-1");
  });

  it("guarda la elección explícita de proveedor en el borrador", () => {
    render(<ProbePasoDosAgregarGrupoMovil />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
      fireEvent.click(screen.getByText("elegir alumco"));
    });

    expect(screen.getByTestId("proveedor")).toHaveTextContent("alumco");
  });

  it("transmite el ID y ficha del vidrio seleccionado y limpia el vínculo al escribir uno propio", () => {
    render(<ProbePasoDosAgregarGrupoMovil />);
    act(() => {
      fireEvent.click(screen.getByText("abrir"));
      fireEvent.click(screen.getByText("elegir vidrio 3643"));
    });
    expect(screen.getByTestId("vidrio")).toHaveTextContent("Float Incoloro 5mm");
    expect(screen.getByTestId("vidrio-id")).toHaveTextContent("3643");
    expect(screen.getByTestId("vidrio-spec")).toHaveTextContent("5");

    act(() => fireEvent.click(screen.getByText("vidrio personalizado")));
    expect(screen.getByTestId("vidrio")).toHaveTextContent("Vidrio personalizado");
    expect(screen.getByTestId("vidrio-id")).toBeEmptyDOMElement();
    expect(screen.getByTestId("vidrio-spec")).toHaveTextContent("pendiente");
  });

  it("debe recalcular valor directo al volver desde modo margen", () => {
    render(<ProbePasoDosAgregarGrupoMovil />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
      fireEvent.click(screen.getByText("cantidad"));
      fireEvent.click(screen.getByText("plantilla"));
      fireEvent.click(screen.getByText("ancho"));
      fireEvent.click(screen.getByText("alto"));
    });

    expect(screen.getByTestId("precio")).toHaveTextContent("540000");

    act(() => {
      fireEvent.click(screen.getByText("cambiar a margen"));
    });

    expect(screen.getByTestId("modo")).toHaveTextContent("margen");
    expect(screen.getByTestId("precio")).toHaveTextContent("");

    act(() => {
      fireEvent.click(screen.getByText("cambiar a directo"));
    });

    expect(screen.getByTestId("modo")).toHaveTextContent("precio_directo");
    expect(screen.getByTestId("precio")).toHaveTextContent("540000");
  });

  it("debe conservar precio manual sin plantilla al alternar modo móvil", () => {
    render(<ProbePasoDosAgregarGrupoMovil />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
      fireEvent.click(screen.getByText("cantidad"));
      fireEvent.click(screen.getByText("precio manual"));
    });

    expect(screen.getByTestId("linea-id")).toHaveTextContent("");
    expect(screen.getByTestId("precio")).toHaveTextContent("333000");

    act(() => {
      fireEvent.click(screen.getByText("cambiar a margen"));
      fireEvent.click(screen.getByText("margen propio"));
    });

    expect(screen.getByTestId("modo")).toHaveTextContent("margen");
    expect(screen.getByTestId("precio")).toHaveTextContent("333000");
    expect(screen.getByTestId("margen-pct")).toHaveTextContent("80");

    act(() => {
      fireEvent.click(screen.getByText("cambiar a directo"));
    });

    expect(screen.getByTestId("modo")).toHaveTextContent("precio_directo");
    expect(screen.getByTestId("precio")).toHaveTextContent("333000");
    expect(screen.getByTestId("margen-pct")).toHaveTextContent("0");
  });

  it("debe conservar precio manual con línea al alternar modo móvil", () => {
    render(<ProbePasoDosAgregarGrupoMovil />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
      fireEvent.click(screen.getByText("plantilla"));
      fireEvent.click(screen.getByText("ancho"));
      fireEvent.click(screen.getByText("alto"));
      fireEvent.click(screen.getByText("precio manual"));
    });

    expect(screen.getByTestId("linea-id")).toHaveTextContent("tmpl-1");
    expect(screen.getByTestId("precio")).toHaveTextContent("333000");
    expect(screen.getByTestId("precio-manual")).toHaveTextContent("si");

    act(() => {
      fireEvent.click(screen.getByText("cambiar a margen"));
    });

    expect(screen.getByTestId("modo")).toHaveTextContent("margen");
    expect(screen.getByTestId("precio")).toHaveTextContent("333000");

    act(() => {
      fireEvent.click(screen.getByText("cambiar a directo"));
    });

    expect(screen.getByTestId("modo")).toHaveTextContent("precio_directo");
    expect(screen.getByTestId("precio")).toHaveTextContent("333000");
    expect(screen.getByTestId("precio-manual")).toHaveTextContent("si");
  });

  it("limpia estado técnico residual (fabricacionHojas, catalogLineKey, proveedor) al cambiar sistema o material", () => {
    render(<ProbePasoDosAgregarGrupoMovil />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
      fireEvent.click(screen.getByText("sistema proyectante"));
      fireEvent.click(screen.getByText("elegir l42"));
      fireEvent.click(screen.getByText("elegir alumco"));
    });

    expect(screen.getByTestId("fabricacion-hojas")).toHaveTextContent("1");
    expect(screen.getByTestId("fabricacion-tipologia")).toHaveTextContent("proyectante");
    expect(screen.getByTestId("catalog-line-key")).toHaveTextContent("ventora:l42");
    expect(screen.getByTestId("proveedor")).toHaveTextContent("alumco");

    act(() => {
      fireEvent.click(screen.getByText("sistema corredera"));
    });

    expect(screen.getByTestId("sistema")).toHaveTextContent("Corredera");
    expect(screen.getByTestId("fabricacion-hojas")).toBeEmptyDOMElement();
    expect(screen.getByTestId("fabricacion-tipologia")).toBeEmptyDOMElement();
    expect(screen.getByTestId("catalog-line-key")).toBeEmptyDOMElement();
    expect(screen.getByTestId("recipe-id")).toBeEmptyDOMElement();

    act(() => {
      fireEvent.click(screen.getByText("material pvc"));
    });

    expect(screen.getByTestId("material")).toHaveTextContent("PVC");
    expect(screen.getByTestId("linea-id")).toBeEmptyDOMElement();
    expect(screen.getByTestId("proveedor")).toBeEmptyDOMElement();
    expect(screen.getByTestId("fabricacion-hojas")).toBeEmptyDOMElement();
    expect(screen.getByTestId("catalog-line-key")).toBeEmptyDOMElement();
  });
});
