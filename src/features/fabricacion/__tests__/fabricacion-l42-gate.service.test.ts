import { patchRecipeGlassNombre } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { crearRecetaPlantillaVentoraProyectante } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { describePerfilTallerResumen } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { crearRecetaEstructuralParaLineaComercial } from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";

describe("L42 proyectante gate vs UI listo", () => {
  it("deja pendiente la receta estándar si falta una fórmula obligatoria", () => {
    const recipe = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:l42",
      lineName: "Serie 42",
    })!;
    const incomplete = {
      ...recipe,
      perfiles: recipe.perfiles.map((profile, index) =>
        index === 0
          ? {
              ...profile,
              reglaMedida: { ...profile.reglaMedida, ajusteMm: undefined },
              datosPendientes: ["Falta descuento"],
            }
          : profile
      ),
    };

    const evaluacion = evaluarRecetaListaParaProbar(incomplete);

    expect(evaluacion.listaParaProbar).toBe(false);
    expect(evaluacion.bloqueos).toEqual(
      expect.arrayContaining([expect.stringMatching(/Falta descuento persistido/i)])
    );
  });

  function buildL42LikeScreenshot() {
    let recipe = crearRecetaPlantillaVentoraProyectante("L42");
    recipe = {
      ...recipe,
      perfiles: recipe.perfiles.map((profile) => ({
        ...profile,
        reglaMedida: {
          ...profile.reglaMedida,
          ajusteMm:
            profile.codigoPerfil === "4202"
              ? -2
              : profile.codigoPerfil === "4229"
                ? -3
                : profile.codigoPerfil === "4206"
                  ? -2
                  : profile.codigoPerfil === "4209"
                    ? -5
                    : profile.codigoPerfil === "4204"
                      ? -2
                      : profile.reglaMedida.ajusteMm,
        },
        datosPendientes: (profile.datosPendientes ?? []).filter(
          (detail) => !/ajuste|descuento/i.test(detail)
        ),
      })),
    };
    return recipe;
  }

  it("con piezas en Listo pero sin tipo de vidrio, permite probar con advertencia", () => {
    const recipe = buildL42LikeScreenshot();
    const listos = recipe.perfiles.filter((profile) => {
      const resumen = describePerfilTallerResumen(profile);
      return Boolean(profile.codigoPerfil?.trim()) && !resumen.pendingDiscount;
    });

    expect(listos).toHaveLength(5);

    const evaluacion = evaluarRecetaListaParaProbar(recipe);
    expect(evaluacion.listaParaProbar).toBe(true);
    expect(evaluacion.bloqueos).toHaveLength(0);
    expect(evaluacion.advertencias).toEqual(
      expect.arrayContaining([expect.stringMatching(/Sin tipo de vidrio base/i)])
    );
  });

  it("con piezas Listo y vidrio elegido del catálogo, habilita probar sin bloqueos", () => {
    const recipe = buildL42LikeScreenshot();
    const glass = recipe.vidrios[0]!;
    const ready = patchRecipeGlassNombre(
      recipe,
      glass.id,
      "Incoloro monolítico 4mm"
    );

    const evaluacion = evaluarRecetaListaParaProbar(ready);
    expect(evaluacion.listaParaProbar).toBe(true);
    expect(evaluacion.bloqueos).toHaveLength(0);
  });
});
