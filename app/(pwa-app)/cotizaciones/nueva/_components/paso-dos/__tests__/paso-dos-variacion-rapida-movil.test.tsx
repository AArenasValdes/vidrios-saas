/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";

import { PasoDosVariacionRapidaMovil } from "../paso-dos-variacion-rapida-movil";

describe("PasoDosVariacionRapidaMovil", () => {
  it("muestra completo el valor común de todas las piezas", () => {
    render(
      <PasoDosVariacionRapidaMovil
        baseCode="V1"
        tipo="Ventana"
        totalItems={45}
        priceLabel="Valor unitario"
        items={[
          {
            id: "piece-1",
            label: "Pieza 1",
            ancho: "1500",
            alto: "1600",
            precio: "192.000",
            sistema: "Corredera",
          },
          {
            id: "piece-2",
            label: "Pieza 2",
            ancho: "1500",
            alto: "1600",
            precio: "192.000",
            sistema: "Corredera",
          },
        ]}
        systemOptions={["Corredera"]}
        onDraftChange={jest.fn()}
        onApplyUnitPriceToAll={jest.fn()}
        onEditFull={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByRole("textbox", { name: "Valor unitario para todas las piezas" })).toHaveValue(
      "192.000"
    );
  });
});
