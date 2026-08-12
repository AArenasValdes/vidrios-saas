import {
  BASES_TIPOLOGICAS_VENTORA,
  crearBaseTipologicaVentora,
  esBaseTipologicaEstructural,
  esBaseTipologicaValidada,
  resolverBaseEstructuralVentora,
  resumirBaseEstructural,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { fabricacionRecetaSchema } from "@/features/fabricacion/schemas/fabricacion-schemas";
import { contarBloqueosCriticosReceta } from "@/features/fabricacion/services/fabricacion-receta-editor.service";

describe("bases estructurales universales de Ventora", () => {
  it("solo Corredera está marcada como base validada; el resto es estructural", () => {
    expect(
      BASES_TIPOLOGICAS_VENTORA.filter((entry) => esBaseTipologicaValidada(entry)).map(
        (entry) => entry.tipologia
      )
    ).toEqual(["corredera"]);

    expect(
      BASES_TIPOLOGICAS_VENTORA.filter((entry) => esBaseTipologicaEstructural(entry)).map(
        (entry) => entry.tipologia
      )
    ).toEqual([
      "abatible",
      "proyectante",
      "pano_fijo",
      "puerta_abatible",
      "shower",
    ]);
  });

  it("resuelve bases estructurales para tipologías no corredera", () => {
    expect(
      resolverBaseEstructuralVentora({ tipologia: "corredera", hojas: 2 })?.id
    ).toBe("base-ventora-corredera");
    expect(
      resolverBaseEstructuralVentora({ tipologia: "abatible", hojas: 1 })?.id
    ).toBe("base-ventora-abatible");
    expect(
      resolverBaseEstructuralVentora({ tipologia: "pano_fijo", hojas: 1 })?.id
    ).toBe("base-ventora-fija");
    expect(
      resolverBaseEstructuralVentora({ tipologia: "proyectante", hojas: 1 })?.id
    ).toBe("base-ventora-proyectante");
    expect(
      resolverBaseEstructuralVentora({ tipologia: "puerta_abatible", hojas: 1 })
        ?.id
    ).toBe("base-ventora-puerta");
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
    expect(contarBloqueosCriticosReceta(recipe)).toBe(0);

    const summary = resumirBaseEstructural(recipe);
    expect(summary.title).toBe("Base Corredera · 2 hojas");
    expect(summary.countsLabel).toBe(
      "7 funciones · 1 vidrio · accesorios sugeridos"
    );
  });

  it("crea Abatible 1 hoja con estructura marco/hoja sin ajustes inventados", () => {
    let nextId = 0;
    const recipe = crearBaseTipologicaVentora({
      tipologia: "abatible",
      hojas: 1,
      modulos: 1,
      lineName: "Serie X",
      createId: () => `id-${nextId++}`,
    });

    expect(recipe.perfiles.length).toBe(6);
    expect(recipe.perfiles.map((profile) => profile.funcion)).toEqual([
      "Marco superior",
      "Marco inferior",
      "Marco lateral",
      "Hoja superior",
      "Hoja inferior",
      "Hoja lateral",
    ]);
    expect(recipe.vidrios).toHaveLength(1);
    expect(recipe.accesorios.length).toBeGreaterThan(0);
    expect(
      recipe.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)
    ).toBe(true);
    expect(recipe.notasValidacion?.[0]).toMatch(/Estructura preparada por Ventora/i);
    expect(
      recipe.accesorios.every((accessory) =>
        (accessory.datosPendientes ?? []).some((detail) => /cantidad/i.test(detail))
      )
    ).toBe(true);
  });

  it("crea Fijo con marco perimetral y vidrio único", () => {
    const recipe = crearBaseTipologicaVentora({
      tipologia: "pano_fijo",
      hojas: 1,
      modulos: 1,
      lineName: "Serie F",
    });

    expect(recipe.perfiles.map((profile) => profile.funcion)).toEqual([
      "Marco superior",
      "Marco inferior",
      "Marco lateral",
    ]);
    expect(recipe.vidrios[0]?.nombre).toBe("Vidrio fijo");
    expect(recipe.accesorios).toHaveLength(1);
  });
});
