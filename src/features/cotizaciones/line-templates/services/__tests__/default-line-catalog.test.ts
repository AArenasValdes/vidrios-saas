import {
  getMissingVentoraCatalogKeys,
  seedDefaultLineCatalog,
  VENTORA_DEFAULT_LINE_CATALOG,
  type SeedLineTemplateDeps,
} from "../default-line-catalog";
import { getVentoraProfileReferencesForCatalogKey } from "../../fixtures/ventora-profile-references";
import { evaluateLineCompatibility, getCatalogProductConfigurations } from "../line-template-compatibility.service";
import { resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";

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

  it("incluye las líneas nuevas del catálogo chileno", () => {
    const keys = VENTORA_DEFAULT_LINE_CATALOG.map((line) => line.catalogKey);
    expect(keys).toContain("ventora:l35");
    expect(keys).not.toContain("ventora:l20-fijos");
    expect(keys).toContain("ventora:winhouse-andes-monorriel");
    expect(keys).toContain("ventora:veratec-7400-corredera");
    expect(keys).toContain("ventora:veratec-elegans-60-ventana-hoja-exterior");
    expect(keys).toContain("ventora:veratec-compact-sliding-4h");
    expect(keys).toContain("ventora:veratec-7400-corredera-3h");
    expect(keys).toContain("ventora:veratec-7400-corredera-4h-chica");
    expect(keys).toEqual(expect.arrayContaining([
      "ventora:veratec-bahar-5200-fijo",
      "ventora:veratec-bahar-5200-ventana-interior",
      "ventora:veratec-bahar-5200-ventana-exterior",
      "ventora:veratec-bahar-5200-plegable-3-3-0",
      "ventora:veratec-bahar-5200-plegable-4-3-1",
      "ventora:veratec-bahar-5200-plegable-6-5-1",
      "ventora:veratec-bahar-5200-plegable-7-4-3",
    ]));
    expect(keys).toContain("ventora:veratec-elevadora-4h-4moviles");
    expect(keys).toContain("ventora:veratec-eko-130");
    expect(keys).toContain("ventora:veratec-eko-82");
    expect(keys).toEqual(expect.arrayContaining([
      "ventora:veratec-inova-76-junta-central",
      "ventora:veratec-inova-76",
      "ventora:veratec-inova-nueva-generacion",
      "ventora:veratec-maxi-royal-70",
      "ventora:veratec-elegans-70",
      "ventora:veratec-maxi-riviera",
      "ventora:veratec-maxi-majestic",
      "ventora:veratec-maxi-empire",
      "ventora:veratec-diamond-60",
      "ventora:veratec-lineal-sliding-74",
      "ventora:veratec-lineal-sliding-70",
      "ventora:veratec-compact-lineal-sliding-60",
    ]));
    expect(keys).toEqual(expect.arrayContaining([
      "ventora:kompen-prime-line-700",
      "ventora:kompen-form-line-800",
      "ventora:kompen-star-line-500",
      "ventora:thermowin-americana-s70",
    ]));
    expect(catalogSize).toBe(102);
  });

  it("expone cada configuración VEKA como una línea cotizable independiente y mantiene sus fórmulas pendientes", () => {
    const pd10 = VENTORA_DEFAULT_LINE_CATALOG.filter((line) => line.catalogKey.startsWith("ventora:veka-pd10"));
    const softline = VENTORA_DEFAULT_LINE_CATALOG.filter((line) => line.catalogKey.startsWith("ventora:veka-softline-39dj"));

    expect(pd10).toHaveLength(6);
    expect(softline).toHaveLength(8);
    expect(pd10[0]).toMatchObject({
      nombre: expect.stringContaining("VEKA PD10 · 1H+1F ESPEJO · 18–20 mm"),
      proveedor: "VEKA",
      material: "PVC",
      precioM2Sugerido: 0,
      catalogMetadata: {
        familyKey: "veka:pd10",
        configurationKey: "veka-pd10-1h-1f-18-20",
        cuttingGuideSource: expect.stringContaining("927fda38-d3b4-4440-a2f3-09c253847f02"),
        compatibility: { configurations: [expect.objectContaining({ id: "veka-pd10-1h-1f-18-20", openingType: "Corredera", compositionPending: true })] },
      },
    });
    expect(pd10.every((line) => line.catalogMetadata?.compatibility?.configurations?.length === 1)).toBe(true);
    expect(softline.every((line) => line.catalogMetadata?.compatibility?.configurations?.length === 1)).toBe(true);
    expect(softline.map((line) => line.catalogMetadata?.compatibility?.configurations?.[0])).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "veka-softline-abatible-derecha-mono-tp", openingType: "Abatible", typology: "abatible", compositionPending: true }),
      expect.objectContaining({ id: "veka-softline-abatible-izquierda-mono-tp", openingType: "Abatible", typology: "abatible", compositionPending: true }),
      expect.objectContaining({ id: "veka-softline-fijo-mono-tp", openingType: "Fijo", typology: "pano_fijo", compositionPending: true }),
      expect.objectContaining({ id: "veka-softline-proyectante-mono-tp", openingType: "Proyectante", typology: "proyectante", compositionPending: true }),
    ]));
    expect(softline.map((line) => line.catalogMetadata?.compatibility?.configurations?.[0]?.typology)).toEqual([
      "abatible", "abatible", "abatible", "abatible", "pano_fijo", "pano_fijo", "proyectante", "proyectante",
    ]);

    for (const line of [...pd10, ...softline]) {
      expect(line?.catalogMetadata).not.toHaveProperty("fabricationRecipe");
      expect(line?.catalogMetadata?.cubicationStatus).toBe("pending");
      expect(line.precioM2Sugerido).toBe(0);
    }
  });

  it("adjunta referencias de perfiles VEKA con barras y procedencia, sin promoverlas a receta", () => {
    const pd10 = getVentoraProfileReferencesForCatalogKey("ventora:veka-pd10:configuration:veka-pd10-1f-1h-1f-24-25")?.profiles ?? [];
    const softline = getVentoraProfileReferencesForCatalogKey("ventora:veka-softline-39dj:configuration:veka-softline-proyectante-mono-4-5")?.profiles ?? [];

    expect(pd10).toHaveLength(21);
    expect(pd10.find((profile) => profile.code === "PD1011")).toMatchObject({
      provider: "VEKA",
      description: expect.stringContaining("6500 mm"),
      codeStatus: "catalog_reference",
      source: expect.stringContaining("927fda38-d3b4-4440-a2f3-09c253847f02"),
    });
    expect(softline).toHaveLength(5);
    expect(softline.find((profile) => profile.code === "113.105")).toMatchObject({
      provider: "VEKA",
      description: expect.stringContaining("5800 mm"),
      codeStatus: "catalog_reference",
      source: expect.stringContaining("3526af13-cafb-48fa-a767-1167d7ac7db7"),
    });
  });

  it("conserva una configuración de origen pendiente por línea mobile y devuelve sin_receta", () => {
    const lines = VENTORA_DEFAULT_LINE_CATALOG.filter((line) =>
      line.catalogKey.startsWith("ventora:veka-pd10") || line.catalogKey.startsWith("ventora:veka-softline-39dj")
    );

    for (const line of lines) {
      const catalogKey = line.catalogKey;
      const configurations = getCatalogProductConfigurations(catalogKey);
      expect(configurations).toHaveLength(1);
      expect(configurations.every((configuration) => configuration.compositionPending)).toBe(true);
      expect(configurations.every((configuration) => !/Alumétrica|etiqueta Fijo|origen etiqueta/i.test(configuration.label))).toBe(true);

      const recipe = resolveFabricationRecipe([], {
        organizationId: "org-veka-contract",
        lineTemplateId: `template-${catalogKey}`,
        catalogKey,
        tipologia: "pano_fijo",
        hojas: 2,
        variante: configurations[0]?.variant,
      });
      expect(recipe.estado).toBe("sin_receta");
    }
  });

  it("resuelve cada compatibilidad comercial VEKA sin cruzar aperturas entre configuraciones", () => {
    const softlines = VENTORA_DEFAULT_LINE_CATALOG.filter((line) => line.catalogKey.startsWith("ventora:veka-softline-39dj"));
    const pd10s = VENTORA_DEFAULT_LINE_CATALOG.filter((line) => line.catalogKey.startsWith("ventora:veka-pd10"));

    for (const line of softlines) {
      const openingType = line.catalogMetadata?.compatibility?.configurations?.[0]?.openingType;
      expect(evaluateLineCompatibility({
        line,
        context: { componentType: "Ventana", openingType, leavesCount: 2, material: "PVC" },
      }).commercial).toBe("compatible");
    }
    expect(evaluateLineCompatibility({
      line: softlines[0]!,
      context: { componentType: "Ventana", openingType: "Corredera", leavesCount: 2, material: "PVC" },
    }).commercial).toBe("incompatible");

    for (const line of pd10s) {
      const openingType = line.catalogMetadata?.compatibility?.configurations?.[0]?.openingType;
      expect(evaluateLineCompatibility({
        line,
        context: { componentType: "Ventana", openingType, leavesCount: 2, material: "PVC" },
      }).commercial).toBe("compatible");
    }
  });

  it("reconoce sistemas del catálogo VERATEC sin asignarles precio ni receta inventada", () => {
    const line = VENTORA_DEFAULT_LINE_CATALOG.find(
      (candidate) => candidate.catalogKey === "ventora:veratec-maxi-riviera"
    );

    expect(line).toMatchObject({
      material: "PVC",
      proveedor: "VERATEC",
      precioM2Sugerido: 0,
      catalogMetadata: {
        cubicationStatus: "pending",
        productCatalogEvidence: {
          document: "VERATEC_Catálogo_de_productos-236.pdf",
          printedPages: "20–21",
          profileWidthMm: "70, 105, 125, 145 o 165",
        },
      },
    });
    expect(line?.catalogMetadata).not.toHaveProperty("workshopProfiles");
    expect(line?.catalogMetadata).not.toHaveProperty("fabricationRecipe");
  });

  it("mantiene una sola línea comercial exterior compatible con abatible y proyectante", () => {
    const line = VENTORA_DEFAULT_LINE_CATALOG.find(
      (candidate) => candidate.catalogKey === "ventora:veratec-bahar-5200-ventana-exterior"
    );

    expect(line?.catalogMetadata).toMatchObject({
      compatibility: {
        componentTypes: ["Ventana"],
        openingTypes: ["Abatible", "Proyectante"],
        leavesCounts: [1],
      },
    });
    expect(VENTORA_DEFAULT_LINE_CATALOG.some(
      (candidate) => candidate.catalogKey === "ventora:veratec-bahar-5200-ventana-proyectante"
    )).toBe(false);
  });

  it("registra Veratec como PVC del proveedor VERATEC con sus 15 referencias Alumétrica", () => {
    const line = VENTORA_DEFAULT_LINE_CATALOG.find(
      (candidate) => candidate.catalogKey === "ventora:veratec-7400-corredera"
    );
    const profiles = line?.catalogMetadata?.workshopProfiles as
      | { profiles?: Array<{ code?: string | null; provider?: string | null; source?: string | null }> }
      | undefined;

    expect(line).toMatchObject({
      nombre: "Veratec 7400 — Corredera 2 hojas",
      material: "PVC",
      proveedor: "VERATEC",
      precioM2Sugerido: 0,
    });
    expect(profiles?.profiles).toHaveLength(15);
    expect(profiles?.profiles?.every((profile) => profile.provider === "VERATEC")).toBe(true);
    expect(profiles?.profiles?.every((profile) => profile.source?.includes("3b5e6093-5b49-4640-b9e5-5db111dc4ffb"))).toBe(true);
  });

  it("trata Sliding 7400 como familia y limita la receta 2H a su clave heredada", () => {
    const variants = VENTORA_DEFAULT_LINE_CATALOG.filter((line) => line.catalogMetadata?.familyKey === "veratec:sliding-7400");
    expect(variants.map((line) => line.catalogKey)).toEqual([
      "ventora:veratec-7400-corredera",
      "ventora:veratec-7400-corredera-3h",
      "ventora:veratec-7400-corredera-4h-chica",
      "ventora:veratec-7400-monorriel",
    ]);
    expect(variants.map((line) => line.catalogMetadata?.configurationKey)).toEqual([
      "sliding-7400:corredera-2h",
      "sliding-7400:corredera-3h",
      "sliding-7400:corredera-4h-chica",
      "sliding-7400:monorriel",
    ]);
    expect(variants.every((line) => line.catalogMetadata?.familyLabel === "Sliding 7400")).toBe(true);
    expect(variants[0].vidrioPrincipalRecomendado).toBe("Incoloro monolítico 4mm");
  });

  it("incluye las configuraciones de Elevadora sin inventar perfiles ni recetas", () => {
    const elevator = VENTORA_DEFAULT_LINE_CATALOG.filter((line) => line.catalogMetadata?.familyKey === "veratec:elevadora");
    expect(elevator).toHaveLength(6);
    expect(elevator.every((line) => line.catalogMetadata?.workshopProfiles === undefined)).toBe(true);
    expect(elevator.every((line) => line.catalogMetadata?.structuralArchetypeId === null)).toBe(true);
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
