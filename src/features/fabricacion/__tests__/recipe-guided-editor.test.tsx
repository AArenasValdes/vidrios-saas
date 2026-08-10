/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";

import { RecipeGuidedEditor } from "@/features/fabricacion/components/recipe-guided-editor";
import {
  crearBaseTipologicaVentora,
  crearRecetaReferenciaL5000Corredera2H,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";
import { crearRecetaFabricacionVacia } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";

function createDataTransferMock() {
  const store = new Map<string, string>();
  return {
    dropEffect: "none",
    effectAllowed: "all",
    files: [] as File[],
    items: [] as DataTransferItem[],
    types: [] as string[],
    setData(format: string, data: string) {
      store.set(format, data);
      this.types = Array.from(store.keys());
    },
    getData(format: string) {
      return store.get(format) ?? "";
    },
    clearData() {
      store.clear();
      this.types = [];
    },
    setDragImage() {
      return undefined;
    },
  };
}

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

    expect(screen.getByText("Perfiles que componen la línea")).toBeInTheDocument();
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

  it("precarga componentes desde una base Ventora en el paso base", () => {
    let currentRecipe: FabricacionReceta = crearRecetaFabricacionVacia({
      recipeIdentityId: "recipe-1",
      lineName: "Serie 32",
    });
    const onBaseApplied = jest.fn();
    const onRecipeChange = jest.fn((nextRecipe: FabricacionReceta) => {
      currentRecipe = nextRecipe;
      view.rerender(
        <RecipeGuidedEditor
          recipe={currentRecipe}
          providerName="Alar"
          lineName="Serie 32"
          desktopActiveStep="base"
          onRecipeChange={onRecipeChange}
          onProviderNameChange={jest.fn()}
          onLineNameChange={jest.fn()}
          onBaseApplied={onBaseApplied}
        />
      );
    });

    const view = render(
      <RecipeGuidedEditor
        recipe={currentRecipe}
        providerName="Alar"
        lineName="Serie 32"
        desktopActiveStep="base"
        onRecipeChange={onRecipeChange}
        onProviderNameChange={jest.fn()}
        onLineNameChange={jest.fn()}
        onBaseApplied={onBaseApplied}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /Corredera/i }));
    expect(screen.getByText("¿Cómo quieres comenzar?")).toBeInTheDocument();
    expect(screen.getByText("Recomendado")).toBeInTheDocument();
    expect(screen.queryByText("Perfiles que componen la línea")).not.toBeInTheDocument();
    expect(screen.queryByText("Parámetros de corte del taller")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("radio", { name: /Usar base de Ventora/i })
    );

    expect(currentRecipe.identidad.tipologia).toBe("corredera");
    expect(currentRecipe.identidad.hojas).toBe(2);
    expect(currentRecipe.perfiles).toHaveLength(7);
    expect(currentRecipe.perfiles.map((profile) => profile.funcion)).toEqual([
      "Riel superior",
      "Riel inferior",
      "Jamba",
      "Zócalo",
      "Cabezal",
      "Pierna",
      "Traslapo",
    ]);
    expect(currentRecipe.perfiles.every((profile) => profile.nombrePerfil === "")).toBe(
      true
    );
    expect(currentRecipe.vidrios).toHaveLength(1);
    expect(currentRecipe.accesorios.length).toBeGreaterThan(0);
    expect(onBaseApplied).toHaveBeenCalledTimes(1);
    expect(currentRecipe.perfiles[0]).toEqual(
      expect.objectContaining({
        codigoPerfil: "",
        nombrePerfil: "",
        largoComercialMm: null,
        datosPendientes: expect.arrayContaining([
          "Confirmar codigo del perfil",
          "Confirmar ajuste o descuento en mm",
          "Confirmar largo comercial",
        ]),
      })
    );
  });

  it("en desktop permite completar la línea Marco y reordenar con el grip", () => {
    let currentRecipe: FabricacionReceta = {
      ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
      perfiles: RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.perfiles.map(
        (profile) => ({
          ...profile,
          codigoPerfil: "",
          nombrePerfil: "",
          tallerPerfilId: null,
          largoComercialMm: null,
          datosPendientes: [
            "Confirmar codigo del perfil",
            "Confirmar largo comercial",
          ],
        })
      ),
    };

    const onRecipeChange = jest.fn((nextRecipe: FabricacionReceta) => {
      currentRecipe = nextRecipe;
      view.rerender(
        <RecipeGuidedEditor
          recipe={currentRecipe}
          providerName="Alar"
          lineName="Serie 32"
          desktopActiveStep="components"
          onRecipeChange={onRecipeChange}
          onProviderNameChange={jest.fn()}
          onLineNameChange={jest.fn()}
        />
      );
    });

    const view = render(
      <RecipeGuidedEditor
        recipe={currentRecipe}
        providerName="Alar"
        lineName="Serie 32"
        desktopActiveStep="components"
        onRecipeChange={onRecipeChange}
        onProviderNameChange={jest.fn()}
        onLineNameChange={jest.fn()}
      />
    );

    expect(screen.getByText("2. Receta de fabricación")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Perfiles del marco" })).toBeInTheDocument();
    expect(
      screen.getByText(/Usa el mismo perfil en varias funciones/i)
    ).toBeInTheDocument();

    for (let index = 0; index < 8; index += 1) {
      const table = screen.getByRole("table", { name: "Perfiles del marco" });
      const row = within(table).getAllByRole("row")[index + 1]!;
      fireEvent.click(
        within(row).getByRole("button", { name: /Perfil o referencia/i })
      );
      const dialog = within(row).getByRole("dialog", {
        name: /Elegir perfil del taller/i,
      });
      fireEvent.click(within(dialog).getByRole("button", { name: /^Crear perfil$/i }));
      fireEvent.change(within(dialog).getByPlaceholderText(/Jamba L5000/i), {
        target: { value: `Perfil ${index + 1}` },
      });
      fireEvent.change(within(dialog).getByPlaceholderText("Ej. 5003"), {
        target: { value: `S32-P${index + 1}` },
      });
      fireEvent.change(within(dialog).getByPlaceholderText("Ej. 6000"), {
        target: { value: "6000" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: /Usar perfil/i }));
    }

    expect(currentRecipe.perfiles).toHaveLength(8);
    expect(
      currentRecipe.perfiles.every(
        (profile) =>
          Boolean(profile.tallerPerfilId) &&
          profile.codigoPerfil.startsWith("S32-P") &&
          profile.largoComercialMm === 6000
      )
    ).toBe(true);

    const firstFunction = currentRecipe.perfiles[0]?.funcion;
    const secondFunction = currentRecipe.perfiles[1]?.funcion;
    expect(firstFunction).toBeTruthy();
    expect(secondFunction).toBeTruthy();

    const table = screen.getByRole("table", { name: "Perfiles del marco" });
    const rows = within(table).getAllByRole("row");
    const firstGrip = within(rows[1]!).getByRole("button", {
      name: new RegExp(`Mover ${firstFunction}`, "i"),
    });
    const secondRow = rows[2]!;
    const dataTransfer = createDataTransferMock();

    fireEvent.dragStart(firstGrip, { dataTransfer });
    fireEvent.dragOver(secondRow, { dataTransfer });
    fireEvent.drop(secondRow, { dataTransfer });
    fireEvent.dragEnd(firstGrip, { dataTransfer });

    expect(currentRecipe.perfiles[0]?.funcion).toBe(secondFunction);
    expect(currentRecipe.perfiles[1]?.funcion).toBe(firstFunction);

    // Atajo teclado Alt+ArrowDown también reordena
    const movedGrip = screen.getByRole("button", {
      name: new RegExp(`Mover ${firstFunction}`, "i"),
    });
    fireEvent.keyDown(movedGrip, { key: "ArrowDown", altKey: true });
    expect(currentRecipe.perfiles[2]?.funcion).toBe(firstFunction);
  });

  it("no muestra la tabla desktop Marco cuando no hay desktopActiveStep (mobile/legacy)", () => {
    render(
      <RecipeGuidedEditor
        recipe={RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO}
        providerName="Alar"
        lineName="Serie 32"
        onRecipeChange={jest.fn()}
        onProviderNameChange={jest.fn()}
        onLineNameChange={jest.fn()}
      />
    );

    expect(screen.queryByText("2. Receta de fabricación")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: "Perfiles del marco" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mover /i })).not.toBeInTheDocument();
    expect(screen.getByText("Perfiles que componen la línea")).toBeInTheDocument();
  });

  it("smoke desktop: agregar/eliminar perfil, vidrio y accesorio", () => {
    let currentRecipe: FabricacionReceta = {
      ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
    };

    const onRecipeChange = jest.fn((nextRecipe: FabricacionReceta) => {
      currentRecipe = nextRecipe;
      view.rerender(
        <RecipeGuidedEditor
          recipe={currentRecipe}
          providerName="Alar"
          lineName="Serie 25"
          desktopActiveStep="components"
          onRecipeChange={onRecipeChange}
          onProviderNameChange={jest.fn()}
          onLineNameChange={jest.fn()}
        />
      );
    });

    const view = render(
      <RecipeGuidedEditor
        recipe={currentRecipe}
        providerName="Alar"
        lineName="Serie 25"
        desktopActiveStep="components"
        onRecipeChange={onRecipeChange}
        onProviderNameChange={jest.fn()}
        onLineNameChange={jest.fn()}
      />
    );

    const initialProfiles = currentRecipe.perfiles.length;
    fireEvent.click(screen.getByRole("button", { name: /Agregar perfil/i }));
    expect(currentRecipe.perfiles).toHaveLength(initialProfiles + 1);

    const actionsTrigger = screen.getByRole("button", {
      name: /Más opciones para Perfil/i,
    });
    fireEvent.click(actionsTrigger);
    expect(
      screen.getByRole("menu", { name: /Opciones de Perfil/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /Eliminar perfil/i }));
    expect(currentRecipe.perfiles).toHaveLength(initialProfiles);

    const glassSummary = screen.getByText((content, element) => {
      return element?.tagName === "STRONG" && content === "Vidrio";
    });
    const glassDetails = glassSummary.closest("details");
    expect(glassDetails).toBeTruthy();
    if (glassDetails && !glassDetails.open) {
      fireEvent.click(glassSummary);
    }
    const initialGlass = currentRecipe.vidrios.length;
    fireEvent.click(screen.getByRole("button", { name: /Agregar vidrio/i }));
    expect(currentRecipe.vidrios).toHaveLength(initialGlass + 1);
    const addedGlassId = currentRecipe.vidrios.at(-1)?.id;
    expect(addedGlassId).toBeTruthy();
    const addedGlassInput = screen.getByDisplayValue("Vidrio principal");
    const addedGlassRow = addedGlassInput.closest("div");
    expect(addedGlassRow).toBeTruthy();
    fireEvent.click(within(addedGlassRow as HTMLElement).getByRole("button", { name: /Eliminar/i }));
    expect(currentRecipe.vidrios.some((glass) => glass.id === addedGlassId)).toBe(false);
    expect(currentRecipe.vidrios).toHaveLength(initialGlass);

    const accessorySummary = screen.getByText((content, element) => {
      return element?.tagName === "STRONG" && content === "Accesorios";
    });
    const accessoryDetails = accessorySummary.closest("details");
    expect(accessoryDetails).toBeTruthy();
    if (accessoryDetails && !accessoryDetails.open) {
      fireEvent.click(accessorySummary);
    }
    const initialAccessories = currentRecipe.accesorios.length;
    fireEvent.click(screen.getByRole("button", { name: /Agregar accesorio/i }));
    expect(currentRecipe.accesorios).toHaveLength(initialAccessories + 1);
    const addedAccessoryId = currentRecipe.accesorios.at(-1)?.id;
    const addedAccessoryInput = screen.getByDisplayValue("Accesorio");
    const addedAccessoryRow = addedAccessoryInput.closest("div");
    expect(addedAccessoryRow).toBeTruthy();
    fireEvent.click(
      within(addedAccessoryRow as HTMLElement).getByRole("button", { name: /Eliminar/i })
    );
    expect(
      currentRecipe.accesorios.some((accessory) => accessory.id === addedAccessoryId)
    ).toBe(false);
    expect(currentRecipe.accesorios).toHaveLength(initialAccessories);
  });

  it("distingue ajuste Por confirmar, Sugerido documentado y Personalizado", () => {
    let nextId = 0;
    const baseRecipe = crearBaseTipologicaVentora({
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      lineName: "Serie genérica",
      createId: () => `base-ui-${nextId++}`,
    });

    const { rerender } = render(
      <RecipeGuidedEditor
        recipe={baseRecipe}
        providerName="Alar"
        lineName="Serie genérica"
        desktopActiveStep="components"
        onRecipeChange={jest.fn()}
        onProviderNameChange={jest.fn()}
        onLineNameChange={jest.fn()}
      />
    );

    const table = screen.getByRole("table", { name: "Perfiles del marco" });
    const pendingInputs = within(table).getAllByPlaceholderText("Por confirmar");
    // Largo comercial + ajustes sin valor conocido
    expect(pendingInputs.length).toBeGreaterThanOrEqual(7);
    expect(screen.queryByText("Sugerido")).not.toBeInTheDocument();

    nextId = 0;
    const l5000 = crearRecetaReferenciaL5000Corredera2H({
      createId: () => `l5000-ui-${nextId++}`,
    });
    let currentRecipe = l5000;
    const onRecipeChange = jest.fn((next: FabricacionReceta) => {
      currentRecipe = next;
      rerender(
        <RecipeGuidedEditor
          recipe={currentRecipe}
          providerName="Alar"
          lineName="L5000"
          desktopActiveStep="components"
          onRecipeChange={onRecipeChange}
          onProviderNameChange={jest.fn()}
          onLineNameChange={jest.fn()}
        />
      );
    });

    rerender(
      <RecipeGuidedEditor
        recipe={currentRecipe}
        providerName="Alar"
        lineName="L5000"
        desktopActiveStep="components"
        onRecipeChange={onRecipeChange}
        onProviderNameChange={jest.fn()}
        onLineNameChange={jest.fn()}
      />
    );

    expect(screen.getAllByText("Sugerido").length).toBe(7);
    expect(screen.getAllByDisplayValue("-18").length).toBe(2);
    expect(screen.getByDisplayValue("-3")).toBeInTheDocument();

    const l5000Table = screen.getByRole("table", { name: "Perfiles del marco" });
    const piernaRow = within(l5000Table)
      .getByDisplayValue("Pierna")
      .closest("[role='row']");
    expect(piernaRow).toBeTruthy();
    const ajusteInput = within(piernaRow as HTMLElement).getByDisplayValue("-18");
    fireEvent.change(ajusteInput, { target: { value: "-20" } });

    expect(screen.getByText("Personalizado")).toBeInTheDocument();
    expect(
      currentRecipe.perfiles.find((profile) => profile.funcion === "Pierna")
        ?.reglaMedida.ajusteMm
    ).toBe(-20);
  });
});
