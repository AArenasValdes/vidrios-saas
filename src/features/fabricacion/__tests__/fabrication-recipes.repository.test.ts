import type { SupabaseClient } from "@supabase/supabase-js";

import { crearRecetaReferenciaL5000Corredera2H } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  createFabricationRecipesRepository,
  formatFabricationRecipesLoadError,
} from "@/features/fabricacion/repositories/fabrication-recipes.repository";

describe("fabrication recipes repository", () => {
  it("archiva sin intentar seleccionar la fila que RLS acaba de ocultar", async () => {
    const response = Promise.resolve({ error: null });
    const query = {
      update: jest.fn(),
      eq: jest.fn(),
      is: jest.fn(),
      select: jest.fn(() => {
        throw new Error("No debe seleccionar una receta archivada");
      }),
      then: response.then.bind(response),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);

    const supabase = {
      from: jest.fn(() => query),
    } as unknown as SupabaseClient;

    const repository = createFabricationRecipesRepository(supabase);

    await expect(repository.softDelete("recipe-1")).resolves.toBeUndefined();
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "archived", eliminado_en: expect.any(String) })
    );
    expect(query.is).toHaveBeenCalledWith("eliminado_en", null);
    expect(query.select).not.toHaveBeenCalled();
  });

  it("omite recetas inválidas y conserva las válidas en list()", async () => {
    const validDefinition = crearRecetaReferenciaL5000Corredera2H();
    const rows = [
      {
        id: "valid-recipe",
        organization_id: 1,
        line_template_id: 135,
        scope: "organization",
        provider_name: "Ventora",
        line_name: "L5000",
        typology: "corredera",
        leaves_count: 2,
        variant: "estandar",
        version: 1,
        status: "validated",
        definition: validDefinition,
        source_type: "manual",
        source_reference: null,
        source_name: null,
        source_revision: null,
        parent_recipe_id: null,
        validated_at: null,
        validated_by: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        eliminado_en: null,
      },
      {
        id: "invalid-recipe",
        organization_id: 1,
        line_template_id: 999,
        scope: "organization",
        provider_name: "Ventora",
        line_name: "Receta rota",
        typology: "corredera",
        leaves_count: 2,
        variant: "estandar",
        version: 1,
        status: "validated",
        definition: { invalid: true },
        source_type: "manual",
        source_reference: null,
        source_name: null,
        source_revision: null,
        parent_recipe_id: null,
        validated_at: null,
        validated_by: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        eliminado_en: null,
      },
    ];

    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      is: jest.fn(),
      or: jest.fn(),
      order: jest.fn(),
      then: (resolve: (value: { data: typeof rows; error: null }) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.order.mockReturnValue(query);

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const supabase = {
      from: jest.fn(() => query),
    } as unknown as SupabaseClient;

    const repository = createFabricationRecipesRepository(supabase);
    const records = await repository.list({ organizationId: 1 });

    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe("valid-recipe");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Se omitieron 1 receta(s)"),
      expect.any(String)
    );

    warnSpy.mockRestore();
  });

  it("formatea errores Zod legibles para la UI", () => {
    const message = formatFabricationRecipesLoadError(
      new Error(
        JSON.stringify([
          {
            expected: "int",
            code: "invalid_type",
            path: ["perfiles", 3, "reglaMedida", "ajusteMm"],
            message: "Invalid input: expected int, received number",
          },
        ])
      )
    );

    expect(message).toContain("perfiles.3.reglaMedida.ajusteMm");
    expect(message).not.toMatch(/^\[/);
  });
});
