import {
  crearRecetaFabricacionVacia,
  patchFabricacionPerfil,
  patchRecipeGlassNombre,
  reorderFabricacionItems,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { crearRecetaPlantillaVentoraProyectante } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { listVentoraGlassCatalogOptions } from "@/features/cotizaciones/new-quote/workflow-ui";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";

describe("fabricacion-receta-editor.service helpers", () => {
  it("reordena perfiles de forma segura", () => {
    const ids = ["a", "b", "c", "d"];
    expect(reorderFabricacionItems(ids, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(reorderFabricacionItems(ids, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(reorderFabricacionItems(ids, 1, 1)).toBe(ids);
    expect(reorderFabricacionItems(ids, -1, 2)).toBe(ids);
    expect(reorderFabricacionItems(ids, 0, 99)).toBe(ids);
  });

  it("parchea un perfil sin mutar los demás", () => {
    const base = crearRecetaFabricacionVacia({
      recipeIdentityId: "r1",
      lineName: "Serie 32",
    });
    const recipe = {
      ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
      identidad: {
        ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.identidad,
        recetaId: base.identidad.recetaId,
      },
    };
    const firstId = recipe.perfiles[0]?.id;
    expect(firstId).toBeTruthy();

    const next = patchFabricacionPerfil(recipe, firstId!, (profile) => ({
      ...profile,
      codigoPerfil: "S32-RS",
      largoComercialMm: 6000,
    }));

    expect(next.perfiles[0]).toEqual(
      expect.objectContaining({
        id: firstId,
        codigoPerfil: "S32-RS",
        largoComercialMm: 6000,
      })
    );
    expect(next.perfiles.slice(1)).toEqual(recipe.perfiles.slice(1));
  });

  it("marca el vidrio como requerido al elegir tipo del catálogo o personalizado", () => {
    const recipe = crearRecetaPlantillaVentoraProyectante("L42");
    const glass = recipe.vidrios[0];
    expect(glass?.requerido).toBe(false);

    const withCatalogGlass = patchRecipeGlassNombre(
      recipe,
      glass!.id,
      "Incoloro monolítico 4mm"
    );
    expect(withCatalogGlass.vidrios[0]).toEqual(
      expect.objectContaining({
        nombre: "Incoloro monolítico 4mm",
        requerido: true,
      })
    );
    expect(evaluarRecetaListaParaProbar(withCatalogGlass).bloqueos).not.toContain(
      "Falta vidrio definido"
    );

    const withCustomGlass = patchRecipeGlassNombre(
      recipe,
      glass!.id,
      "DVH especial del proveedor"
    );
    expect(withCustomGlass.vidrios[0]?.nombre).toBe("DVH especial del proveedor");
    expect(withCustomGlass.vidrios[0]?.requerido).toBe(true);
  });

  it("expone el catálogo completo de vidrios Ventora para fabricación", () => {
    const options = listVentoraGlassCatalogOptions();
    expect(options.length).toBeGreaterThan(30);
    expect(options).toEqual(expect.arrayContaining(["Incoloro monolítico 4mm", "DVH 4+12+4"]));
  });
});
