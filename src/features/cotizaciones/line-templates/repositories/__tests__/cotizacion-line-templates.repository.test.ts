import { createCotizacionLineTemplatesRepository } from "../cotizacion-line-templates.repository";
import { getLineTemplateGlassMetadata, mergeLineTemplateGlassMetadata } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

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

describe("glass catalog metadata persistence", () => {
  it("guarda y vuelve a leer corte manual y espesor en la fila del tenant", async () => {
    let row: Record<string, unknown> = {
      id: 43,
      organization_id: 7,
      catalog_key: null,
      nombre: "Laminado de prueba",
      categoria: "vidrio",
      unidad_cobro: "m2",
      material: "Cristal",
      vidrio_principal_recomendado: null,
      costo_base: 0,
      precio_m2_sugerido: 100000,
      minimo_cobrable: 0,
      redondeo_precio: 0,
      merma_pct: 0,
      margen_objetivo_pct: null,
      proveedor: null,
      vigencia_desde: null,
      vigencia_hasta: null,
      catalog_metadata: { isWorkshopOwned: true, glassCuttingWorkshopProfile: { version: 1, productId: "43", tableWidthMm: 3200 } },
      is_active: true,
      sort_order: 0,
      creado_en: null,
      actualizado_en: null,
      eliminado_en: null,
    };
    const query = {
      update: jest.fn((payload: Record<string, unknown>) => { row = { ...row, ...payload }; return query; }),
      eq: jest.fn(),
      is: jest.fn(),
      select: jest.fn(),
      single: jest.fn(async () => ({ data: row, error: null })),
      maybeSingle: jest.fn(async () => ({ data: row, error: null })),
    };
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.select.mockReturnValue(query);
    const repository = createCotizacionLineTemplatesRepository({
      clientFactory: { from: jest.fn().mockReturnValue(query) } as never,
    });
    const catalogMetadata = mergeLineTemplateGlassMetadata(row.catalog_metadata as never, {
      espesor: "6,38",
      espesorMm: 6.38,
      categoriaTecnica: "laminado",
      revisionTecnicaExplicita: true,
      corteManualEstado: "confirmed",
    });

    const saved = await repository.update(43, 7, { catalogMetadata });
    const reopened = await repository.getById(43, 7);

    expect(query.eq).toHaveBeenCalledWith("organization_id", 7);
    expect(saved.catalogMetadata).toMatchObject({ espesorMm: 6.38, corteManualEstado: "confirmed" });
    expect(reopened && getLineTemplateGlassMetadata(reopened.catalogMetadata)).toMatchObject({
      espesorMm: 6.38,
      categoriaTecnica: "laminado",
      revisionTecnicaExplicita: true,
      corteManualEstado: "confirmed",
    });
    expect(reopened?.catalogMetadata.isWorkshopOwned).toBe(true);
    expect(reopened?.catalogMetadata.glassCuttingWorkshopProfile).toEqual({ version: 1, productId: "43", tableWidthMm: 3200 });
  });
});
