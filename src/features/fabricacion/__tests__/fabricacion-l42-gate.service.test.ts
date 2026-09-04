import { patchRecipeGlassNombre } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { crearRecetaPlantillaVentoraProyectante } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { describePerfilTallerResumen } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

describe("L42 proyectante gate vs UI listo", () => {
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

  it("con piezas en Listo pero sin tipo de vidrio, sigue bloqueado", () => {
    const recipe = buildL42LikeScreenshot();
    const listos = recipe.perfiles.filter((profile) => {
      const resumen = describePerfilTallerResumen(profile);
      return Boolean(profile.codigoPerfil?.trim()) && !resumen.pendingDiscount;
    });

    expect(listos).toHaveLength(5);
    expect(evaluarRecetaListaParaProbar(recipe).bloqueos).toContain(
      "Falta vidrio definido"
    );
  });

  it("con piezas Listo y vidrio elegido del catálogo, habilita probar", () => {
    const recipe = buildL42LikeScreenshot();
    const glass = recipe.vidrios[0]!;
    const ready = patchRecipeGlassNombre(
      recipe,
      glass.id,
      "Incoloro monolítico 4mm"
    );

    expect(evaluarRecetaListaParaProbar(ready).listaParaProbar).toBe(true);
    expect(evaluarRecetaListaParaProbar(ready).bloqueos).toHaveLength(0);
  });
});
