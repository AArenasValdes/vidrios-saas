/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";

import { usePasoDosAgregarGrupoMovil } from "../use-paso-dos-agregar-grupo-movil";

function ProbePasoDosAgregarGrupoMovil() {
  const wizard = usePasoDosAgregarGrupoMovil({
    items: [],
    pricingMode: "margen",
    provider: "",
  });

  return (
    <div>
      <span data-testid="abierto">{wizard.isOpen ? "si" : "no"}</span>
      <span data-testid="paso">{String(wizard.paso)}</span>
      <span data-testid="subtipo">{wizard.draft.subtipo}</span>
      <span data-testid="cantidad">{String(wizard.draft.cantidad)}</span>
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
});
