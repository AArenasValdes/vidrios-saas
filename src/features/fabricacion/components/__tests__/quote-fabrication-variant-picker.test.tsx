/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { buildSodalL25VariantSlug } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
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
  it("shows the short variant and technical state without recipe provenance", () => {
    render(<QuoteFabricationVariantPicker candidates={[recipe({ sourceName: "Arquetipo" })]} onSelectRecipe={jest.fn()} />);

    expect(screen.getByTestId("fabrication-choice-auto")).toHaveTextContent("Normal");
    expect(screen.getByTestId("fabrication-choice-auto")).toHaveTextContent("Despiece disponible");
    expect(screen.getByTestId("fabrication-choice-auto")).not.toHaveTextContent("Arquetipo");
    expect(screen.getByTestId("fabrication-choice-auto")).not.toHaveTextContent("receta");
    expect(screen.getByTestId("fabrication-choice-auto")).not.toHaveTextContent("validada");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps technical options distinct without exposing recipe provenance", () => {
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

    expect(screen.getAllByText("Normal")).toHaveLength(2);
    expect(screen.getByText(/Perfiles 4201/)).toBeInTheDocument();
    expect(screen.getByText(/Perfiles 4204/)).toBeInTheDocument();
    expect(screen.queryByText("Borrador")).not.toBeInTheDocument();
    expect(screen.getAllByText(/En prueba · Perfiles/)).toHaveLength(2);
    expect(screen.queryByText("Arquetipo")).not.toBeInTheDocument();
    expect(screen.queryByText("ALAR")).not.toBeInTheDocument();
    expect(screen.getByText("Configuración de fabricación")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Perfiles 4204/ }));
    expect(onSelectRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: "alar" }));
  });

  it("uses short L42 variant names while preserving different profile sets and statuses", () => {
    const onSelectRecipe = jest.fn();
    render(<QuoteFabricationVariantPicker candidates={[
      recipe({ id: "l42-normal", variant: "normal", status: "validated", definition: {
        identidad: { recetaId: "l42-normal", nombre: "Normal", codigo: "L42-NORMAL", tipologia: "proyectante", hojas: 1, variante: "normal", apertura: "proyectante" },
        perfiles: ["4201", "4202", "4229"].map((code) => ({ id: code, codigoPerfil: code, reglaMedida: { ajusteMm: 0 } })), vidrio: [], accesorios: [], barras: [],
      } }),
      recipe({ id: "l42-sin-camara", variant: "arquetipo_sin_camara_monolitico", status: "testing", definition: {
        identidad: { recetaId: "l42-sin-camara", nombre: "Sin cámara", codigo: "L42-SIN-CAMARA", tipologia: "proyectante", hojas: 1, variante: "arquetipo_sin_camara_monolitico", apertura: "proyectante" },
        perfiles: ["4209", "4202", "4229"].map((code) => ({ id: code, codigoPerfil: code, reglaMedida: { ajusteMm: 0 } })), vidrio: [], accesorios: [], barras: [],
      } }),
    ]} onSelectRecipe={onSelectRecipe} />);

    expect(screen.getByRole("button", { name: /Normal.*4201/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sin cámara.*En prueba.*4209/ })).toBeInTheDocument();
    expect(screen.queryByText(/Arquetipo|SODAL|Ventora/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sin cámara/ }));
    expect(onSelectRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: "l42-sin-camara" }));
  });

  it("keeps L25 labels concise while preserving glazing, leg, reinforcement, and leaves", () => {
    const candidates = [
      { id: "l25-open", glazing: "monolithic" as const, leg: "open" as const, reinforcement: "normal" as const, leaves: 2 },
      { id: "l25-closed", glazing: "monolithic" as const, leg: "closed" as const, reinforcement: "normal" as const, leaves: 2 },
      { id: "l25-dvh-reinforced", glazing: "dvh" as const, leg: "open" as const, reinforcement: "reinforced" as const, leaves: 3 },
    ].map((variant) => recipe({
      id: variant.id,
      lineTemplateId: 25,
      lineName: "L25",
      variant: "normal",
      leavesCount: variant.leaves,
      status: "validated",
      definition: {
        identidad: {
          recetaId: variant.id,
          nombre: "L25",
          codigo: variant.id,
          tipologia: "corredera",
          hojas: variant.leaves,
          variante: buildSodalL25VariantSlug(variant),
          apertura: "corredera",
        },
        perfiles: [{ id: "perfil", codigoPerfil: variant.id, reglaMedida: { ajusteMm: 0 } }],
        vidrio: [], accesorios: [], barras: [],
      },
    }));

    render(<QuoteFabricationVariantPicker candidates={candidates} onSelectRecipe={jest.fn()} />);

    expect(screen.getByRole("button", { name: /Abierta · 2H · Monolítico · Normal/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cerrada · 2H · Monolítico · Normal/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abierta · 3H · DVH · Reforzada/ })).toBeInTheDocument();
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
