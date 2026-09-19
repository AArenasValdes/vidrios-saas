/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { FabricacionMobileProductStep } from "@/features/fabricacion/components/mobile/fabricacion-mobile-product-step";
import { crearBaseTipologicaVentora } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function recipe(hojas: 2 | 3 | 4, id: string): FabricationRecipeRecord {
  const definition = crearBaseTipologicaVentora({
    tipologia: "corredera",
    hojas,
    modulos: 2,
    lineName: "L25",
  });
  definition.identidad.variante = "dvh_open_reinforced";
  return {
    id,
    organizationId: 1,
    scope: "organization",
    lineTemplateId: 207,
    providerName: "Sodal",
    lineName: "L25",
    typology: "corredera",
    leavesCount: hojas,
    variant: "dvh_open_reinforced",
    version: 1,
    status: "validated",
    definition,
    sourceType: "manual",
    sourceReference: `zeta:confirmed:sodal/l25/dvh_pierna_abierta_reforzada_${hojas}h_3000x1500`,
    sourceName: null,
    sourceRevision: null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("FabricacionMobileProductStep", () => {
  it("muestra L25 como línea con 2, 3 y 4 hojas listas", () => {
    const selected = recipe(3, "r3");
    const recipes = [recipe(2, "r2"), selected, recipe(4, "r4")];
    render(
      <FabricacionMobileProductStep
        templateName="L25"
        catalogKey="ventora:l25"
        selected={selected}
        draft={selected.definition}
        recipes={recipes}
        readOnly={false}
        onDraftChange={() => undefined}
        onSelectRecipe={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: /2 hojas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3 hojas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /4 hojas/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Resumen del producto")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Configuración" })).toBeInTheDocument();
    expect(screen.queryByText("Lista")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("dvh_open_reinforced")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abatible" })).not.toBeInTheDocument();
  });

  it("cambia a la receta de 2 hojas sin mutar la de 3", () => {
    const selected = recipe(3, "r3");
    const twoLeaves = recipe(2, "r2");
    const onSelectRecipe = jest.fn();
    render(
      <FabricacionMobileProductStep
        templateName="L25"
        catalogKey="ventora:l25"
        selected={selected}
        draft={selected.definition}
        recipes={[twoLeaves, selected, recipe(4, "r4")]}
        readOnly={false}
        onDraftChange={() => undefined}
        onSelectRecipe={onSelectRecipe}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /2 hojas/i }));
    expect(onSelectRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: "r2", leavesCount: 2 })
    );
  });
});
