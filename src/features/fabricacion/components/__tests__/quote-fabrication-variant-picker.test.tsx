/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { QuoteFabricationVariantPicker } from "../quote-fabrication-variant-picker";

function recipe(overrides: Partial<FabricationRecipeRecord> = {}): FabricationRecipeRecord {
  const id = overrides.id ?? "recipe-1";
  return {
    id,
    organizationId: 1,
    lineTemplateId: 42,
    scope: "ventora",
    providerName: "Ventora",
    lineName: "Serie 42",
    typology: "proyectante",
    leavesCount: 1,
    variant: "normal",
    version: 1,
    status: "validated",
    definition: {
      identidad: {
        recetaId: id,
        nombre: "Normal",
        codigo: "L42-NORMAL",
        tipologia: "proyectante",
        hojas: 1,
        variante: "normal",
        apertura: "proyectante",
      },
      perfiles: [{ id: "marco", codigoPerfil: "4201", reglaMedida: { ajusteMm: 0 } }],
      vidrio: [],
      accesorios: [],
      barras: [],
    },
    sourceType: "workshop",
    sourceReference: null,
    sourceName: "Taller",
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-10-15T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
    eliminadoEn: null,
    ...overrides,
  };
}

describe("QuoteFabricationVariantPicker", () => {
  it("shows a single Ventora configuration as automatically applied without technical state jargon", () => {
    render(<QuoteFabricationVariantPicker candidates={[recipe({ sourceName: "Arquetipo" })]} onSelectRecipe={jest.fn()} />);

    expect(screen.getByTestId("fabrication-choice-auto")).toHaveTextContent("Arquetipo · se aplica automáticamente");
    expect(screen.getByTestId("fabrication-choice-auto")).toHaveTextContent("se aplica automáticamente");
    expect(screen.getByTestId("fabrication-choice-auto")).not.toHaveTextContent("receta");
    expect(screen.getByTestId("fabrication-choice-auto")).not.toHaveTextContent("validada");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("distinguishes same-named provider configurations without exposing internal draft states", () => {
    const onSelectRecipe = jest.fn();
    render(
      <QuoteFabricationVariantPicker
        candidates={[
          recipe({ id: "arquetipo", providerName: "Arquetipo", sourceName: "Arquetipo", sourceReference: "arquetipo:l42", status: "testing" }),
          recipe({ id: "alar", providerName: "ALAR", sourceName: "ALAR", sourceReference: "alar:l42", status: "testing", definition: {
            identidad: { recetaId: "alar", nombre: "Normal", codigo: "L42-ALAR", tipologia: "proyectante", hojas: 1, variante: "normal", apertura: "proyectante" },
            perfiles: [{ id: "marco", codigoPerfil: "4204", reglaMedida: { ajusteMm: 0 } }], vidrio: [], accesorios: [], barras: [],
          } }),
        ]}
        onSelectRecipe={onSelectRecipe}
      />,
    );

    expect(screen.getAllByText(/Proyectante · 1 hoja/i)).toHaveLength(2);
    expect(screen.getByText(/Arquetipo · Perfiles 4201/)).toBeInTheDocument();
    expect(screen.getByText(/ALAR · Perfiles 4204/)).toBeInTheDocument();
    expect(screen.queryByText("Borrador")).not.toBeInTheDocument();
    expect(screen.queryByText("En prueba")).not.toBeInTheDocument();
    expect(screen.getByText("Configuración de fabricación")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ALAR/ }));
    expect(onSelectRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: "alar" }));
  });

  it("keeps long option lists collapsed until the user asks to change configuration", () => {
    const candidates = ["normal", "pierna_abierta", "pierna_cerrada", "reforzada"].map((variant) => recipe({
      id: variant,
      variant,
      definition: {
        identidad: { recetaId: variant, nombre: variant, codigo: variant, tipologia: "proyectante", hojas: 1, variante: variant, apertura: "proyectante" },
        perfiles: [{ id: "frame", codigoPerfil: variant, reglaMedida: { ajusteMm: 0 } }], vidrio: [], accesorios: [], barras: [],
      },
    }));
    render(<QuoteFabricationVariantPicker candidates={candidates} selectedRecipeId="normal" onSelectRecipe={jest.fn()} />);

    expect(screen.getByText("Cambiar")).toBeInTheDocument();
    expect(screen.getByText("Cambiar").closest("details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Cambiar"));
    expect(screen.getByRole("button", { name: /Pierna abierta/i })).toBeInTheDocument();
  });

  it("does not merge or hide a documented legacy option when there are no recipe records", () => {
    const onSelectLegacy = jest.fn();
    render(
      <QuoteFabricationVariantPicker
        candidates={[]}
        onSelectRecipe={jest.fn()}
        legacyOptions={[{ value: "normal", label: "Normal", detail: "2 hojas · Datos técnicos pendientes" }]}
        onSelectLegacy={onSelectLegacy}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Normal/ }));
    expect(onSelectLegacy).toHaveBeenCalledWith("normal");
  });
});
