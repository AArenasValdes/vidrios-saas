import type { SupabaseClient } from "@supabase/supabase-js";

import { createFabricationRecipesRepository } from "@/features/fabricacion/repositories/fabrication-recipes.repository";

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
});
