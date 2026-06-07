/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";

import { usePasoDosAgregarGrupoMovil } from "../use-paso-dos-agregar-grupo-movil";

function ProbePasoDosAgregarGrupoMovil() {
  const wizard = usePasoDosAgregarGrupoMovil({
    items: [],
    pricingMode: "margen",
    provider: "",
    activeLineTemplates: [],
  });

  return (
    <div>
      <span data-testid="abierto">{wizard.isOpen ? "si" : "no"}</span>
      <span data-testid="paso">{String(wizard.paso)}</span>
      <span data-testid="subtipo">{wizard.draft.subtipo}</span>
      <span data-testid="cantidad">{String(wizard.draft.cantidad)}</span>
      <span data-testid="linea">{wizard.draft.referencia}</span>
      <span data-testid="vidrio">{wizard.draft.vidrio}</span>
      <span data-testid="linea-id">{wizard.draft.lineTemplateId}</span>
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
      <button type="button" onClick={() => wizard.updateMargenPct("80")}>
        margen propio
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

  it("debe recalcular valor directo al volver desde modo margen", () => {
    render(<ProbePasoDosAgregarGrupoMovil />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
      fireEvent.click(screen.getByText("cantidad"));
      fireEvent.click(screen.getByText("plantilla"));
      fireEvent.click(screen.getByText("ancho"));
      fireEvent.click(screen.getByText("alto"));
    });

    expect(screen.getByTestId("precio")).toHaveTextContent("2160000");

    act(() => {
      fireEvent.click(screen.getByText("cambiar a margen"));
    });

    expect(screen.getByTestId("modo")).toHaveTextContent("margen");
    expect(screen.getByTestId("precio")).toHaveTextContent("");

    act(() => {
      fireEvent.click(screen.getByText("cambiar a directo"));
    });

    expect(screen.getByTestId("modo")).toHaveTextContent("precio_directo");
    expect(screen.getByTestId("precio")).toHaveTextContent("2160000");
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
});
