import type { SupabaseClient } from "@supabase/supabase-js";
import { crearRecetaDesdeArquetipoEstructural } from "../fixtures/arquetipos-estructurales-lineas";
import { crearRecetaPlantillaVentoraProyectante } from "../fixtures/plantillas-ventora-proyectante";
import { repararBorradoresProyectantes } from "../repositories/reparar-borrador-proyectante.repository";

const row = {
  id: "recipe-1", line_template_id: 42, line_name: "Serie 42", status: "draft", version: 1,
  source_type: "manual", source_reference: "ventora-arquetipo:corredera_2h", updated_at: "2026-09-01T00:00:00Z",
  definition: crearRecetaDesdeArquetipoEstructural({ archetypeId: "corredera_2h", lineName: "Serie 42" }),
};

function mockClient(responses: Array<{ data?: unknown; error?: unknown }>) {
  const queries: Array<{ table: string; calls: unknown[][] }> = [];
  const from = jest.fn((table: string) => {
    const query = { table, calls: [] as unknown[][] };
    queries.push(query);
    const response = Promise.resolve(responses[queries.length - 1]);
    const builder: Record<string, unknown> = { then: response.then.bind(response) };
    for (const method of ["select", "eq", "is", "in", "not", "limit", "update"]) {
      builder[method] = (...args: unknown[]) => { query.calls.push([method, ...args]); return builder; };
    }
    return builder;
  });
  return { client: { from } as unknown as SupabaseClient, queries };
}

function responses(tests: unknown[] = [], updated: unknown[] = [{ id: row.id }]) {
  return [{ data: [{ id: 42, catalog_key: "ventora:l42" }] }, { data: [row] }, { data: tests }, { data: updated }];
}

describe("reparación persistida por taller", () => {
  it("actualiza el mismo borrador y protege organización, estado y edición concurrente", async () => {
    const { client, queries } = mockClient(responses());
    expect(await repararBorradoresProyectantes(client, 8)).toBe(1);
    expect(queries).toHaveLength(4);
    for (const query of queries) expect(query.calls).toContainEqual(["eq", "organization_id", 8]);
    expect(queries[1].calls).toEqual(expect.arrayContaining([
      ["eq", "scope", "organization"], ["eq", "status", "draft"], ["eq", "version", 1],
      ["is", "validated_at", null], ["is", "parent_recipe_id", null], ["is", "eliminado_en", null],
    ]));
    expect(queries[2].calls).toContainEqual(["eq", "recipe_id", row.id]);
    expect(queries[3].calls).toEqual(expect.arrayContaining([
      ["eq", "id", row.id], ["eq", "line_template_id", 42], ["eq", "updated_at", row.updated_at],
      ["eq", "definition", JSON.stringify(row.definition)], ["eq", "status", "draft"],
      ["update", expect.objectContaining({ typology: "proyectante", leaves_count: 1,
        source_reference: "ventora-serie-42:normal:catalogo-2026-09-13-v2",
        definition: expect.objectContaining({ identidad: expect.objectContaining({ tipologia: "proyectante" }) }) })],
    ]));
  });

  it("persiste la receta normal de L32 con referencia v2 y sin perfiles opcionales", async () => {
    const old = crearRecetaPlantillaVentoraProyectante("L32", { lineName: "Serie 32" });
    const oldDefinition = {
      ...old,
      perfiles: [
        old.perfiles[0],
        old.perfiles[2],
        old.perfiles[4],
        { ...old.perfiles[3], codigoPerfil: "3204" },
        { ...old.perfiles[5], codigoPerfil: "3205" },
      ],
    };
    const row32 = {
      ...row,
      line_name: "Serie 32",
      source_reference: "ventora-proyectante:catalogo-2026-09-13",
      definition: oldDefinition,
    };
    const { client, queries } = mockClient([
      { data: [{ id: 42, catalog_key: "ventora:l32" }] },
      { data: [row32] },
      { data: [] },
      { data: [{ id: row32.id }] },
    ]);

    expect(await repararBorradoresProyectantes(client, 8)).toBe(1);
    expect(queries[3].calls).toEqual(expect.arrayContaining([
      ["eq", "organization_id", 8],
      ["update", expect.objectContaining({
        source_reference: "ventora-serie-32:normal:catalogo-2026-09-13-v2",
        typology: "proyectante",
        leaves_count: 1,
        variant: "normal",
        definition: expect.objectContaining({
          perfiles: expect.arrayContaining([
            expect.objectContaining({ codigoPerfil: "3201" }),
            expect.objectContaining({ codigoPerfil: "3202" }),
            expect.objectContaining({ codigoPerfil: "3208" }),
          ]),
        }),
      })],
    ]));
  });

  it("no reemplaza un borrador con pruebas, aunque estén archivadas", async () => {
    const { client, queries } = mockClient(responses([{ id: "test-1" }]));
    expect(await repararBorradoresProyectantes(client, 8)).toBe(0);
    expect(queries).toHaveLength(3);
    expect(queries[2].calls).not.toContainEqual(["is", "eliminado_en", null]);
  });

  it("no informa reparación cuando otro editor modificó la fila", async () => {
    const { client } = mockClient(responses([], []));
    expect(await repararBorradoresProyectantes(client, 8)).toBe(0);
  });

  it("no consulta recetas si no hay líneas canónicas", async () => {
    const { client, queries } = mockClient([{ data: [] }]);
    expect(await repararBorradoresProyectantes(client, 8)).toBe(0);
    expect(queries).toHaveLength(1);
  });

  it("propaga un fallo de guardado para no abrir silenciosamente el editor antiguo", async () => {
    const error = new Error("No se pudo guardar");
    const { client } = mockClient([...responses().slice(0, 3), { error }]);
    await expect(repararBorradoresProyectantes(client, 8)).rejects.toThrow(error);
  });
});
