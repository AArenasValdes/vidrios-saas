/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { SodalL25QuoteConfigPanel } from "../sodal-l25-quote-config-panel";

jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: () => ({ recipes: [], isLoading: false }),
}));

const selectedTemplate = {
  id: 75,
  nombre: "Serie 25",
  catalogKey: "ventora:l25",
  catalogMetadata: {},
} as CotizacionLineTemplate;

function ConfigHarness() {
  const [form, setForm] = useState({
    lineTemplateId: "75",
    catalogLineKey: "ventora:l25",
    fabricacionGlazing: "monolithic",
    fabricacionLeg: "open",
    fabricacionReinforcement: "normal",
    fabricacionVariante: "monolithic_open_normal",
    fabricacionHojas: 2,
    sheetScheme: "2 hojas",
    vidrio: "Monolítico 5 mm",
  });

  return (
    <>
      <output data-testid="variant">{form.fabricacionVariante}</output>
      <SodalL25QuoteConfigPanel
        compact
        componentForm={form}
        selectedTemplate={selectedTemplate}
        onFabricacionL25ConfigChange={(change) => setForm((current) => ({ ...current, ...change }))}
      />
    </>
  );
}

describe("SodalL25QuoteConfigPanel variant synchronization", () => {
  it("recomputes the slug on consecutive unsaved leg and reinforcement changes", () => {
    render(<ConfigHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Pierna cerrada" }));
    expect(screen.getByTestId("variant")).toHaveTextContent("monolithic_closed_normal");

    fireEvent.click(screen.getByRole("button", { name: "Pierna abierta" }));
    expect(screen.getByTestId("variant")).toHaveTextContent("monolithic_open_normal");

    fireEvent.click(screen.getByRole("button", { name: "Reforzada" }));
    expect(screen.getByTestId("variant")).toHaveTextContent("monolithic_open_reinforced");
  });
});
