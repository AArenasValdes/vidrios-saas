/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { RecipeGuidedEditor } from "@/features/fabricacion/components/recipe-guided-editor";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";

describe("RecipeGuidedEditor", () => {
  it("edita una receta con controles guiados sin exponer JSON", () => {
    const onRecipeChange = jest.fn();

    render(
      <RecipeGuidedEditor
        recipe={RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO}
        providerName="Proveedor"
        lineName="L5000"
        onRecipeChange={onRecipeChange}
        onProviderNameChange={jest.fn()}
        onLineNameChange={jest.fn()}
      />
    );

    expect(screen.getByText("Que se corta y como se mide")).toBeInTheDocument();
    expect(screen.getAllByText("Dimension base").length).toBeGreaterThan(0);
    expect(screen.queryByText(/json/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Variante"), {
      target: { value: "termopanel" },
    });
    expect(onRecipeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        identidad: expect.objectContaining({ variante: "termopanel" }),
      })
    );

    fireEvent.change(screen.getAllByLabelText("Solo con hojas")[0], {
      target: { value: "2" },
    });
    expect(onRecipeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        perfiles: expect.arrayContaining([
          expect.objectContaining({
            reglaMedida: expect.objectContaining({
              condicion: expect.objectContaining({ hojas: 2 }),
            }),
          }),
        ]),
      })
    );

    fireEvent.change(screen.getAllByLabelText("Multiplicador de medida")[0], {
      target: { value: "1.5" },
    });
    expect(onRecipeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        perfiles: expect.arrayContaining([
          expect.objectContaining({
            reglaMedida: expect.objectContaining({ multiplicador: 1.5 }),
          }),
        ]),
      })
    );
  });

  it("bloquea los campos de una version validada", () => {
    render(
      <RecipeGuidedEditor
        recipe={{
          ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
          estado: "validada",
        }}
        providerName="Proveedor"
        lineName="L5000"
        readOnly
        onRecipeChange={jest.fn()}
        onProviderNameChange={jest.fn()}
        onLineNameChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText("Variante")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Agregar perfil" })
    ).not.toBeInTheDocument();
  });
});
