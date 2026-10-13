import {
  crearRecetaFabricacionVacia,
  crearPerfilDesdeReferenciaCatalogo,
  patchFabricacionPerfil,
  patchRecipeGlassNombre,
  reorderFabricacionItems,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { crearRecetaPlantillaVentoraProyectante } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { listVentoraGlassCatalogOptions } from "@/features/cotizaciones/new-quote/workflow-ui";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";

describe("fabricacion-receta-editor.service helpers", () => {
  it("crea un perfil con código de catálogo y mantiene pendiente su fórmula", () => {
    const profile = crearPerfilDesdeReferenciaCatalogo("p-kom701", {
      code: "KOM 701",
      name: "Marco fijo",
      role: "Marco",
      description: "Perfil publicado en catálogo",
      provider: "Thermowin Kompen",
      source: "NUEVA PRIME LINE 700 2025 · p. 2",
      codeStatus: "catalog_reference",
    });

    expect(profile).toEqual(
      expect.objectContaining({
        id: "p-kom701",
        codigoPerfil: "KOM 701",
        nombrePerfil: "Marco fijo",
        funcion: "Marco",
        requerido: true,
        datosPendientes: [
          "Elegir base de medida para este perfil.",
          "Definir descuento en mm para este perfil.",
          "Indicar cantidad por ventana para este perfil.",
        ],
      })
    );
    expect(profile.observaciones).toContain("No define fórmula de corte.");
    const evaluation = evaluarRecetaListaParaProbar({
      ...crearRecetaFabricacionVacia({ recipeIdentityId: "r2", lineName: "Prime Line 700" }),
      perfiles: [profile],
    });
    expect(evaluation.listaParaProbar).toBe(false);
    expect(evaluation.bloqueos).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Falta fórmula de medida/i),
        expect.stringMatching(/Falta descuento persistido/i),
      ])
    );
  });

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
        requerido: false,
      })
    );
    expect(evaluarRecetaListaParaProbar(withCatalogGlass).advertencias).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/Sin tipo de vidrio base/i)])
    );

    const withCustomGlass = patchRecipeGlassNombre(
      recipe,
      glass!.id,
      "DVH especial del proveedor"
    );
    expect(withCustomGlass.vidrios[0]?.nombre).toBe("DVH especial del proveedor");
    expect(withCustomGlass.vidrios[0]?.requerido).toBe(false);
  });

  it("expone el catálogo completo de vidrios Ventora para fabricación", () => {
    const options = listVentoraGlassCatalogOptions();
    expect(options.length).toBeGreaterThan(30);
    expect(options).toEqual(expect.arrayContaining(["Incoloro monolítico 4mm", "DVH 4+12+4"]));
  });
});
