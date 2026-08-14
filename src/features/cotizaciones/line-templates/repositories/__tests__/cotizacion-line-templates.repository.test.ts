import { createCotizacionLineTemplatesRepository } from "../cotizacion-line-templates.repository";

function buildSoftDeleteClient(result: {
  data: { id: number } | null;
  error: Error | null;
}) {
  const query = {
    update: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    select: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };

  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.select.mockReturnValue(query);

  return {
    client: {
      from: jest.fn().mockReturnValue(query),
    },
    query,
  };
}

describe("cotizacionLineTemplatesRepository.softDelete", () => {
  it("verifica que Supabase haya actualizado la línea del tenant", async () => {
    const { client, query } = buildSoftDeleteClient({ data: { id: 43 }, error: null });
    const repository = createCotizacionLineTemplatesRepository({
      clientFactory: client as never,
    });

    await expect(repository.softDelete(43, 7)).resolves.toBeUndefined();

    expect(client.from).toHaveBeenCalledWith("cotizacion_line_templates");
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", 43);
    expect(query.eq).toHaveBeenNthCalledWith(2, "organization_id", 7);
    expect(query.is).toHaveBeenCalledWith("eliminado_en", null);
    expect(query.select).toHaveBeenCalledWith("id");
    expect(query.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("no informa éxito cuando RLS o el tenant dejan la actualización en cero filas", async () => {
    const { client } = buildSoftDeleteClient({ data: null, error: null });
    const repository = createCotizacionLineTemplatesRepository({
      clientFactory: client as never,
    });

    await expect(repository.softDelete(43, 7)).rejects.toThrow(
      "No pudimos eliminar la línea. Recarga la página e inténtalo nuevamente."
    );
  });
});
