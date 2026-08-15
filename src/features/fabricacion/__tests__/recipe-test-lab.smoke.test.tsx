/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RecipeTestLab } from "@/features/fabricacion/components/recipe-test-lab";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function buildRecipeRecord(): FabricationRecipeRecord {
  return {
    id: "recipe-smoke-1",
    organizationId: 1,
    lineTemplateId: 25,
    scope: "organization",
    providerName: "Aluar",
    lineName: "Serie 25",
    typology: "corredera",
    leavesCount: 2,
    variant: "estandar",
    version: 1,
    status: "testing",
    definition: RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
    sourceType: "manual",
    sourceReference: null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("RecipeTestLab smoke — Probar fabricación", () => {
  it("calcula fabricación, compara con taller y permite dejar lista para cotizar", async () => {
    const onSaveTest = jest.fn().mockResolvedValue(undefined);
    const onActivate = jest.fn().mockResolvedValue(undefined);

    render(
      <RecipeTestLab
        recipe={buildRecipeRecord()}
        tests={[]}
        isSaving={false}
        desktopActiveStep="test"
        onSaveTest={onSaveTest}
        onActivate={onActivate}
        onBackToRecipe={jest.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: /Prueba tu fabricación/i,
      })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Hojas/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Módulos/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Variante/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Ancho mm"), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText("Alto mm"), {
      target: { value: "1200" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Calcular materiales/i })
    );

    expect(
      await screen.findByRole("heading", {
        name: /Necesitas \d+ tiras? de/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/Pauta de corte/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /¿Coincide con tu taller\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Todo coincide con tu fabricación/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Coincide/i).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/Medida esperada/i)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Dejar lista para cotizar/i })
    );

    await waitFor(() => {
      expect(onSaveTest).toHaveBeenCalledTimes(1);
    });
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onSaveTest).toHaveBeenCalledWith(
      expect.objectContaining({
        isRequired: true,
        input: expect.objectContaining({
          anchoTotalMm: 1500,
          altoTotalMm: 1200,
          hojas: 2,
        }),
        expectedOutput: expect.objectContaining({
          calculable: true,
        }),
      })
    );
  });
});
