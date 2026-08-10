import {
  crearRecetaFabricacionVacia,
  patchFabricacionPerfil,
  reorderFabricacionItems,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
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
});
