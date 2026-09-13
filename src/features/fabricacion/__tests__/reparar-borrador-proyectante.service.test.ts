import { crearRecetaDesdeArquetipoEstructural, crearRecetaEstructuralParaLineaComercial, resolveArquetipoEstructuralId } from "../fixtures/arquetipos-estructurales-lineas";
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
    expect(recipe.perfiles).toHaveLength(5);
    expect(recipe.perfiles.every((profile) => profile.codigoPerfil)).toBe(true);
    expect(recipe.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)).toBe(true);
    expect(fabricacionRecetaSchema.safeParse(recipe).success).toBe(true);
  });

  it.each(["corredera_2h", "proyectante"] as const)("repara el seed genérico %s conservando identidad", (archetypeId) => {
    const row = seed(archetypeId);
    const recipe = prepararReparacionBorradorProyectante("ventora:l42", row)!;
    expect(recipe).not.toBeNull();
    expect(recipe.identidad).toMatchObject({ recetaId: "original-0", tipologia: "proyectante", hojas: 1 });
    expect(recipe.estado).toBe("borrador");
    expect(recipe.perfiles.map((p) => p.codigoPerfil)).toEqual(["4209", "4202", "4229", "4206", "4204"]);
    expect(prepararReparacionBorradorProyectante("ventora:l42", { ...row, definition: recipe })).toBeNull();
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
