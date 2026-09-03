import {
  getMissingVentoraCatalogKeys,
  seedDefaultLineCatalog,
  VENTORA_DEFAULT_LINE_CATALOG,
  type SeedLineTemplateDeps,
} from "../default-line-catalog";

function makeMockDeps(
  existing: Array<{ catalog_key?: string | null }> = []
): SeedLineTemplateDeps & { inserted: Record<string, unknown>[] } {
  const inserted: Record<string, unknown>[] = [];
  return {
    inserted,
    async listAllTemplates() {
      return existing;
    },
    async insertTemplate(payload) {
      inserted.push(payload);
    },
  };
}

describe("seedDefaultLineCatalog", () => {
  const catalogSize = VENTORA_DEFAULT_LINE_CATALOG.length;

  it("siembra el catálogo completo en una org chilena vacía", async () => {
    const deps = makeMockDeps();
    const result = await seedDefaultLineCatalog("org-1", deps, {
      countryCode: "CL",
    });

    expect(result.seeded).toBe(catalogSize);
    expect(result.skipped).toBe(0);
    expect(result.status).toBe("completed");
    expect(deps.inserted).toHaveLength(catalogSize);
    expect(deps.inserted[0]).toMatchObject({
      organization_id: "org-1",
      nombre: "Serie 5000",
      catalog_key: "ventora:l5000",
      redondeo_precio: 1000,
      catalog_metadata: expect.objectContaining({ needsCommercialPrice: true }),
    });
  });

  it("no siembra para organizaciones fuera de Chile", async () => {
    const deps = makeMockDeps();
    const result = await seedDefaultLineCatalog("org-ar", deps, {
      countryCode: "AR",
    });

    expect(result).toEqual({
      seeded: 0,
      skipped: 0,
      status: "blocked_non_chile",
    });
    expect(deps.inserted).toHaveLength(0);
  });

  it("no siembra silenciosamente si falta país", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const deps = makeMockDeps();
    const result = await seedDefaultLineCatalog("org-empty", deps, {
      countryCode: null,
    });

    expect(result).toEqual({
      seeded: 0,
      skipped: 0,
      status: "blocked_missing_country",
    });
    expect(deps.inserted).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("inserta líneas canónicas faltantes aunque existan líneas privadas", async () => {
    const deps = makeMockDeps([{ catalog_key: null }]);
    const result = await seedDefaultLineCatalog("org-2", deps, {
      countryCode: "CL",
    });

    expect(result.seeded).toBe(catalogSize);
    expect(result.skipped).toBe(0);
    expect(deps.inserted).toHaveLength(catalogSize);
  });

  it("omite catalog_keys que ya existen", async () => {
    const deps = makeMockDeps([
      { catalog_key: "ventora:l5000" },
      { catalog_key: "ventora:l20" },
    ]);
    const result = await seedDefaultLineCatalog("org-3", deps, {
      countryCode: "CL",
    });

    expect(result.seeded).toBe(catalogSize - 2);
    expect(result.skipped).toBe(2);
  });

  it("incluye las dos líneas nuevas del catálogo chileno", () => {
    const keys = VENTORA_DEFAULT_LINE_CATALOG.map((line) => line.catalogKey);
    expect(keys).toContain("ventora:l35");
    expect(keys).toContain("ventora:winhouse-andes-monorriel");
    expect(catalogSize).toBe(25);
  });

  it("maneja unique violation (23505) sin romper", async () => {
    const deps = makeMockDeps();
    let callCount = 0;
    deps.insertTemplate = async (payload) => {
      callCount++;
      if (callCount === 1) {
        const err = new Error("duplicate key") as Error & { code: string };
        err.code = "23505";
        throw err;
      }
      deps.inserted.push(payload);
    };

    const result = await seedDefaultLineCatalog("org-4", deps, {
      countryCode: "CL",
    });
    expect(result.seeded).toBe(catalogSize - 1);
    expect(result.skipped).toBe(1);
  });

  it("maneja errores desconocidos sin romper", async () => {
    const deps = makeMockDeps();
    let callCount = 0;
    deps.insertTemplate = async () => {
      callCount++;
      if (callCount === 2) {
        throw new Error("network error");
      }
    };

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = await seedDefaultLineCatalog("org-5", deps, {
      countryCode: "CL",
    });
    expect(result.seeded).toBe(catalogSize - 1);
    expect(result.skipped).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("getMissingVentoraCatalogKeys", () => {
  it("devuelve solo keys ausentes", () => {
    const missing = getMissingVentoraCatalogKeys(["ventora:l5000", null, ""]);
    expect(missing).not.toContain("ventora:l5000");
    expect(missing).toContain("ventora:l20");
    expect(missing).toHaveLength(VENTORA_DEFAULT_LINE_CATALOG.length - 1);
  });
});
