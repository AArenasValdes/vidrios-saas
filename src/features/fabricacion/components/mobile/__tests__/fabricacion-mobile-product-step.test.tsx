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

  it("muestra picker de apertura y construcción en Serie 20", () => {
    const selected = recipe(2, "r20");
    selected.lineName = "Serie 20";
    selected.definition.identidad.variante = "pierna_abierta_jamba_2009";
    selected.definition.identidad.apertura = "corredera";
    render(
      <FabricacionMobileProductStep
        templateName="Serie 20"
        catalogKey="ventora:l20"
        selected={selected}
        draft={selected.definition}
        recipes={[selected]}
        readOnly={false}
        onDraftChange={() => undefined}
        onSelectRecipe={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "Corredera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fijos" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pierna abierta · Jamba 2009" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abatible" })).not.toBeInTheDocument();
  });

  it("muestra perfiles oficiales de Compact Sliding sin ofrecer la fórmula de un taller como base común", () => {
    const selected = recipe(2, "compact-empty");
    selected.lineName = "Compact Sliding · 2 hojas";
    selected.providerName = "VERATEC";
    selected.definition.perfiles = [];
    render(
      <FabricacionMobileProductStep
        templateName="Compact Sliding · 2 hojas"
        catalogKey="ventora:veratec-compact-sliding-2h"
        selected={selected}
        draft={selected.definition}
        recipes={[]}
        readOnly={false}
        onDraftChange={() => undefined}
      />
    );

    expect(screen.getByText("Referencias de perfil documentadas")).toBeInTheDocument();
    expect(screen.getByText(/67460VER/)).toBeInTheDocument();
    expect(screen.getByText(/no sustituyen la receta/i)).toBeInTheDocument();
    expect(screen.queryByText(/Base documental disponible/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Preparar borrador/i })).not.toBeInTheDocument();
  });

  it("muestra perfiles referenciales de EKO sin presentarlos como receta", () => {
    const selected = recipe(2, "eko-empty");
    selected.lineName = "EKO 130";
    selected.definition.perfiles = [];

    render(
      <FabricacionMobileProductStep
        templateName="EKO 130"
        catalogKey="ventora:veratec-eko-130"
        selected={selected}
        draft={selected.definition}
        recipes={[]}
        readOnly={false}
        onDraftChange={() => undefined}
      />
    );

    expect(screen.getByText("Referencias de perfil documentadas"))
      .toBeInTheDocument();
    expect(screen.getByText(/61109EKO000/)).toBeInTheDocument();
    expect(screen.getByText(/no sustituyen la receta/i)).toBeInTheDocument();
  });

  it("explica que Elevadora requiere que el taller identifique perfiles antes de definir cortes", () => {
    const selected = recipe(2, "elevadora-empty");
    selected.lineName = "Elevadora · 2 paños · 2 móviles";
    selected.definition.perfiles = [];

    render(
      <FabricacionMobileProductStep
        templateName="Elevadora · 2 paños · 2 móviles"
        catalogKey="ventora:veratec-elevadora-2h-2moviles"
        selected={selected}
        draft={selected.definition}
        recipes={[]}
        readOnly={false}
        onDraftChange={() => undefined}
      />
    );

    expect(screen.getByText(/no identifica perfiles suficientes/i))
      .toBeInTheDocument();
    expect(screen.getByText(/agrega los códigos y nombres que usa tu taller/i))
      .toBeInTheDocument();
  });
});
