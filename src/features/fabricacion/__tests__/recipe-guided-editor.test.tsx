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
    expect(screen.getByText("Empezar con")).toBeInTheDocument();
    expect(screen.getByText("Lista para revisar")).toBeInTheDocument();
    expect(screen.queryByText("Perfiles que componen la línea")).not.toBeInTheDocument();
    expect(screen.queryByText("Parámetros de corte del taller")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("radio", { name: /Base Ventora disponible/i })
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
          "Confirmar ajuste o descuento en mm",
          "Confirmar cantidad con el taller",
        ]),
      })
    );
  });

  it("precarga estructura Abatible con piezas habituales y sin ajustes inventados", () => {
    let currentRecipe: FabricacionReceta = crearRecetaFabricacionVacia({
      recipeIdentityId: "recipe-ab",
      lineName: "Serie 32",
    });
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
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /Abatible/i }));
    expect(screen.getByText("Estructura preparada")).toBeInTheDocument();
    expect(screen.getByText("¿Cuántas hojas tiene esta tipología?")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("radio", { name: /Estructura preparada/i })
    );

    expect(currentRecipe.identidad.tipologia).toBe("abatible");
    expect(currentRecipe.perfiles).toHaveLength(6);
    expect(currentRecipe.perfiles[0]?.funcion).toBe("Marco superior");
    expect(
      currentRecipe.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)
    ).toBe(true);
  });

  it("en desktop permite completar perfiles humanos y reordenar con el grip", () => {
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

    expect(screen.getByText("Así fabricas esta ventana")).toBeInTheDocument();
    const profileList = screen.getByRole("list", { name: "Perfiles de fabricación" });
    expect(profileList).toBeInTheDocument();

    for (let index = 0; index < 8; index += 1) {
      const rows = within(profileList).getAllByRole("listitem");
      const row = rows[index]!;
      fireEvent.click(within(row).getByRole("button", { name: /Configurar|Editar/i }));
      fireEvent.click(
        screen.getByRole("button", { name: /Perfil o referencia/i })
      );
      const dialog = screen.getByRole("dialog", {
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
      fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));
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

    const cards = within(
      screen.getByRole("list", { name: "Perfiles de fabricación" })
    ).getAllByRole("listitem");
    const firstGrip = within(cards[0]!).getByRole("button", {
      name: new RegExp(`Mover ${firstFunction}`, "i"),
    });
    const secondCard = cards[1]!;
    const dataTransfer = createDataTransferMock();

    fireEvent.dragStart(firstGrip, { dataTransfer });
    fireEvent.dragOver(secondCard, { dataTransfer });
    fireEvent.drop(secondCard, { dataTransfer });
    fireEvent.dragEnd(firstGrip, { dataTransfer });

    expect(currentRecipe.perfiles[0]?.funcion).toBe(secondFunction);
    expect(currentRecipe.perfiles[1]?.funcion).toBe(firstFunction);

    const movedGrip = screen.getByRole("button", {
      name: new RegExp(`Mover ${firstFunction}`, "i"),
    });
    fireEvent.keyDown(movedGrip, { key: "ArrowDown", altKey: true });
    expect(currentRecipe.perfiles[2]?.funcion).toBe(firstFunction);
  });

  it("no muestra el listado desktop humano cuando no hay desktopActiveStep (mobile/legacy)", () => {
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

    expect(
      screen.queryByText("2. Perfiles y medida de corte")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Perfiles de fabricación" })
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

    const profileList = screen.getByRole("list", { name: "Perfiles de fabricación" });
    const lastRow = within(profileList).getAllByRole("listitem").at(-1)!;
    fireEvent.click(within(lastRow).getByRole("button", { name: /^Editar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Eliminar perfil/i }));
    expect(currentRecipe.perfiles).toHaveLength(initialProfiles);

    const vidrioSection = screen.getByLabelText("Vidrio");
    fireEvent.click(within(vidrioSection).getByRole("button", { name: /^Editar$/i }));
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

    const initialAccessories = currentRecipe.accesorios.length;
    fireEvent.click(screen.getByRole("button", { name: /Agregar accesorio/i }));
    expect(currentRecipe.accesorios).toHaveLength(initialAccessories + 1);
    const addedAccessoryId = currentRecipe.accesorios.at(-1)?.id;
    const accessoryRows = within(screen.getByLabelText("Accesorios")).getAllByRole("button", {
      name: /^Editar$/i,
    });
    fireEvent.click(accessoryRows.at(-1)!);
    const addedAccessoryInput = screen.getByDisplayValue("Accesorio");
    const accessoryEditor = addedAccessoryInput.closest("div")?.parentElement;
    expect(accessoryEditor).toBeTruthy();
    fireEvent.click(
      within(accessoryEditor as HTMLElement).getByRole("button", { name: /Eliminar/i })
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

    const profileList = screen.getByRole("list", { name: "Perfiles de fabricación" });
    const cards = within(profileList).getAllByRole("listitem");
    expect(cards.length).toBeGreaterThanOrEqual(7);
    expect(
      within(profileList).getAllByText(/Tira estándar/i).length
    ).toBeGreaterThanOrEqual(7);
    fireEvent.click(within(cards[0]!).getByRole("button", { name: /Configurar|Editar/i }));
    expect(screen.getByPlaceholderText("0")).toBeInTheDocument();
    expect(
      screen.getByText(/Usa negativo si tu taller descuenta mm al corte/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));
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

    const l5000List = screen.getByRole("list", { name: "Perfiles de fabricación" });
    const l5000Cards = within(l5000List).getAllByRole("listitem");
    fireEvent.click(within(l5000Cards[0]!).getByRole("button", { name: /Configurar|Editar/i }));
    expect(screen.getByText("Sugerido")).toBeInTheDocument();

    const piernaCard = within(l5000List)
      .getByText("Pierna")
      .closest("[role='listitem']");
    expect(piernaCard).toBeTruthy();
    fireEvent.click(within(piernaCard as HTMLElement).getByRole("button", { name: /Configurar|Editar/i }));
    const ajusteInput = screen.getByDisplayValue("-18");
    fireEvent.change(ajusteInput, { target: { value: "-20" } });

    expect(screen.getByText("Personalizado")).toBeInTheDocument();
    expect(
      currentRecipe.perfiles.find((profile) => profile.funcion === "Pierna")
        ?.reglaMedida.ajusteMm
    ).toBe(-20);
  });
});
