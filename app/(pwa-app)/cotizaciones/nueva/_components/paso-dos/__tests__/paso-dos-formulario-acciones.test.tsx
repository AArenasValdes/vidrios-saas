/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";

import { PasoDosFormularioAcciones } from "../paso-dos-formulario-acciones";

describe("PasoDosFormularioAcciones", () => {
  it("muestra un CTA de actualizacion en desktop cuando se edita una pieza", () => {
    render(
      <PasoDosFormularioAcciones
        editingItemId="item-1"
        fieldErrors={{}}
        globalError={null}
        isMobileViewport={false}
        isSaving={false}
        onResetStep2Form={jest.fn()}
        onSaveAndExit={jest.fn()}
        onAddOrUpdateItem={jest.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Guardar cambios" })
    ).toBeInTheDocument();
  });
});
