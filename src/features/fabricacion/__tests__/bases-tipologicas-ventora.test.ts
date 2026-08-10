import {
  BASES_TIPOLOGICAS_VENTORA,
  crearBaseTipologicaVentora,
  resolverBaseEstructuralVentora,
  resumirBaseEstructural,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { fabricacionRecetaSchema } from "@/features/fabricacion/schemas/fabricacion-schemas";
import { contarBloqueosCriticosReceta } from "@/features/fabricacion/services/fabricacion-receta-editor.service";

describe("bases estructurales universales de Ventora", () => {
  it("solo ofrece Corredera como base lista; el resto queda pendiente", () => {
    expect(
      BASES_TIPOLOGICAS_VENTORA.filter((entry) => !entry.pendienteCompletar).map(
        (entry) => entry.tipologia
      )
    ).toEqual(["corredera"]);

    expect(
      resolverBaseEstructuralVentora({ tipologia: "corredera", hojas: 2 })?.id
    ).toBe("base-ventora-corredera");
    expect(
      resolverBaseEstructuralVentora({ tipologia: "abatible", hojas: 1 })
    ).toBeNull();
    expect(
      resolverBaseEstructuralVentora({ tipologia: "pano_fijo", hojas: 1 })
    ).toBeNull();
    expect(
      resolverBaseEstructuralVentora({ tipologia: "proyectante", hojas: 1 })
    ).toBeNull();
    expect(
      resolverBaseEstructuralVentora({ tipologia: "puerta_abatible", hojas: 1 })
    ).toBeNull();
    expect(
      resolverBaseEstructuralVentora({ tipologia: "personalizada", hojas: 2 })
    ).toBeNull();
  });

  it("crea Corredera 2 hojas con 7 funciones y sin perfil físico asignado", () => {
    let nextId = 0;
    const recipe = crearBaseTipologicaVentora({
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      lineName: "Serie 32",
      createId: () => `id-${nextId++}`,
    });

    expect(fabricacionRecetaSchema.safeParse(recipe).success).toBe(true);
    expect(recipe.estado).toBe("ejemplo_no_validado");
    expect(recipe.perfiles.map((profile) => profile.funcion)).toEqual([
      "Riel superior",
      "Riel inferior",
      "Jamba",
      "Zócalo",
      "Cabezal",
      "Pierna",
      "Traslapo",
    ]);
    expect(recipe.perfiles.map((profile) => profile.reglaCantidad.cantidad)).toEqual([
      1, 1, 2, 2, 2, 2, 2,
    ]);
    expect(recipe.perfiles.every((profile) => profile.codigoPerfil === "")).toBe(true);
    expect(recipe.perfiles.every((profile) => profile.nombrePerfil === "")).toBe(true);
    expect(recipe.perfiles.every((profile) => profile.largoComercialMm === null)).toBe(
      true
    );
    expect(
      recipe.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)
    ).toBe(true);
    // Código y largo comercial ya no bloquean prueba/validación geométrica.
    expect(contarBloqueosCriticosReceta(recipe)).toBe(0);

    const summary = resumirBaseEstructural(recipe);
    expect(summary.title).toBe("Base Corredera · 2 hojas");
    expect(summary.countsLabel).toBe(
      "7 funciones · 1 vidrio · accesorios sugeridos"
    );
    expect(summary.countsLabel).not.toMatch(/perfil/i);
  });

  it("no permite crear tipologías pendientes como base lista", () => {
    expect(() =>
      crearBaseTipologicaVentora({
        tipologia: "abatible",
        hojas: 1,
        modulos: 1,
        lineName: "Serie X",
      })
    ).toThrow(/No hay una base preparada/);
  });
});
