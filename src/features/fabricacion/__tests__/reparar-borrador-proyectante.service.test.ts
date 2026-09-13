import { crearRecetaDesdeArquetipoEstructural, crearRecetaEstructuralParaLineaComercial, resolveArquetipoEstructuralId } from "../fixtures/arquetipos-estructurales-lineas";
import { crearRecetaPlantillaVentoraProyectante } from "../fixtures/plantillas-ventora-proyectante";
import { prepararReparacionBorradorProyectante, type BorradorProyectanteRow } from "../services/reparar-borrador-proyectante.service";
import { fabricacionRecetaSchema } from "../schemas/fabricacion-schemas";

function seed(archetypeId: "corredera_2h" | "proyectante" = "corredera_2h"): BorradorProyectanteRow {
  let id = 0;
  return {
    id: "recipe-1", line_template_id: 42, line_name: "Serie 42", status: "draft", version: 1,
    source_type: "manual", source_reference: `ventora-arquetipo:${archetypeId}`, updated_at: "2026-09-01T00:00:00Z",
    definition: crearRecetaDesdeArquetipoEstructural({ archetypeId, lineName: "Serie 42", createId: () => `original-${id++}` }),
  };
}

describe("reparación conservadora de borradores AL-32/AL-42", () => {
  it.each(["ventora:l32", "ventora:l42"])("%s ignora metadata antigua y prepara proyectante con códigos", (catalogKey) => {
    const input = { catalogKey, structuralArchetypeId: "corredera_2h", lineName: "Serie" };
    expect(resolveArquetipoEstructuralId(input)).toBe("proyectante");
    const recipe = crearRecetaEstructuralParaLineaComercial(input)!;
    expect(recipe.identidad).toMatchObject({ tipologia: "proyectante", hojas: 1 });
    expect(recipe.perfiles).toHaveLength(catalogKey === "ventora:l32" ? 5 : 6);
    expect(recipe.perfiles.every((profile) => profile.codigoPerfil)).toBe(true);
    if (catalogKey === "ventora:l42") {
      expect(recipe.perfiles.some((profile) => profile.reglaMedida.ajusteMm === -18)).toBe(true);
      expect(recipe.perfiles.some((profile) => profile.reglaMedida.ajusteMm === -90)).toBe(true);
      expect(recipe.perfiles.every((profile) => !["4209", "4204", "4206"].includes(profile.codigoPerfil))).toBe(true);
    } else {
      expect(recipe.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)).toBe(true);
    }
    expect(fabricacionRecetaSchema.safeParse(recipe).success).toBe(true);
  });

  it.each(["corredera_2h", "proyectante"] as const)("repara el seed genérico %s conservando identidad", (archetypeId) => {
    const row = seed(archetypeId);
    const recipe = prepararReparacionBorradorProyectante("ventora:l42", row)!;
    expect(recipe).not.toBeNull();
    expect(recipe.identidad).toMatchObject({ recetaId: "original-0", tipologia: "proyectante", hojas: 1 });
    expect(recipe.estado).toBe("borrador");
    expect(recipe.perfiles.map((p) => p.codigoPerfil)).toEqual([
      "4201", "4201", "4202", "4202", "4229", "4229",
    ]);
    expect(prepararReparacionBorradorProyectante("ventora:l42", { ...row, definition: recipe })).toBeNull();
  });

  it("repara la precarga AL-42 de cinco piezas creada por la versión anterior", () => {
    const row = {
      ...seed("proyectante"),
      source_reference: "ventora-proyectante:catalogo-2026-09-13",
      definition: crearRecetaPlantillaVentoraProyectante("L42", {
        lineName: "Serie 42",
        createId: (() => {
          let id = 0;
          return () => `old-l42-${++id}`;
        })(),
      }),
    };

    const recipe = prepararReparacionBorradorProyectante("ventora:l42", row);

    expect(recipe?.identidad.variante).toBe("normal");
    expect(recipe?.perfiles).toHaveLength(6);
    expect(recipe?.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      "4201", "4201", "4202", "4202", "4229", "4229",
    ]);
    expect(recipe?.perfiles.every((profile) => profile.reglaCantidad.cantidad === 2)).toBe(true);
  });

  it("repara la precarga genérica vieja de Serie 3200 con la base L/ST/TP", () => {
    const row = {
      ...seed("proyectante"),
      line_name: "Serie 3200",
      source_reference: "ventora-arquetipo:puerta_abatible",
      definition: crearRecetaDesdeArquetipoEstructural({
        archetypeId: "puerta_abatible",
        lineName: "Serie 3200",
        createId: (() => {
          let id = 0;
          return () => `old-3200-${++id}`;
        })(),
      }),
    };

    const recipe = prepararReparacionBorradorProyectante(
      "ventora:serie-3200-puerta-abatible-1h",
      row
    );

    expect(recipe?.identidad).toMatchObject({
      tipologia: "puerta_abatible",
      variante: "3200 ST",
    });
    expect(recipe?.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      "3222",
      "3222",
      "3221",
      "3221",
      "3225",
      "3225",
      "3227",
      "3227",
    ]);
  });

  it("repara la precarga genérica vieja de S-33 con la pauta actual", () => {
    const row = {
      ...seed("corredera_2h"),
      line_name: "S-33",
      definition: crearRecetaDesdeArquetipoEstructural({
        archetypeId: "corredera_2h",
        lineName: "S-33",
        createId: (() => {
          let id = 0;
          return () => `old-s33-${++id}`;
        })(),
      }),
    };

    const recipe = prepararReparacionBorradorProyectante(
      "ventora:s33-corredera-2h",
      row
    );

    expect(recipe?.identidad).toMatchObject({
      tipologia: "corredera",
      hojas: 2,
      variante: "S-33 Normal",
    });
    expect(recipe?.perfiles).toHaveLength(11);
    expect(recipe?.perfiles.map((profile) => profile.codigoPerfil)).toContain("3308");
    expect(recipe?.perfiles.map((profile) => profile.codigoPerfil)).toContain("3303");
  });

  it.each(["codigo", "medida", "tira", "notas"])("conserva el ajuste del taller: %s", (change) => {
    const row = seed();
    const definition = fabricacionRecetaSchema.parse(row.definition);
    if (change === "codigo") definition.perfiles[0].codigoPerfil = "PROPIO";
    if (change === "medida") definition.perfiles[0].reglaMedida.ajusteMm = -5;
    if (change === "tira") definition.perfiles[0].largoComercialMm = 5950;
    if (change === "notas") definition.notasValidacion.push("Revisado por el taller");
    expect(prepararReparacionBorradorProyectante("ventora:l42", { ...row, definition })).toBeNull();
  });

  it("conserva otras líneas, fuentes, estados, versiones y datos inválidos", () => {
    expect(prepararReparacionBorradorProyectante("ventora:l35", seed())).toBeNull();
    expect(prepararReparacionBorradorProyectante(null, seed())).toBeNull();
    for (const patch of [{ status: "validated" }, { status: "testing" }, { version: 2 }, { source_type: "copied" }, { source_reference: "propia" }, { definition: null }]) {
      expect(prepararReparacionBorradorProyectante("ventora:l42", { ...seed(), ...patch })).toBeNull();
    }
  });
});
