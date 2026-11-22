import {
  crearRecetaVeratecElegansBatiente,
  crearRecetaVeratecElegansFijo,
} from "@/features/fabricacion/fixtures/veratec-workbook-recipes";
import { crearRecetaVeratecBahar5200 } from "@/features/fabricacion/fixtures/veratec-bahar-5200-recipes";
import {
  filterRecipesForCatalogResolution,
  isObsoleteElegans60DocumentaryRecipe,
  resolveFabricationRecipe,
  resolverRecetaFabricacionCompatible,
} from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { FABRICACION_RECIPE_SCHEMA_VERSION } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function buildElegans60LegitimatePrivateRecipe(
  overrides: Partial<FabricationRecipeRecord> = {},
): FabricationRecipeRecord {
  return {
    id: overrides.id ?? "taller-elegans-60-legitima",
    organizationId: overrides.organizationId ?? 3,
    lineTemplateId: overrides.lineTemplateId ?? 9008,
    scope: overrides.scope ?? "organization",
    providerName: overrides.providerName ?? "VERATEC",
    lineName: overrides.lineName ?? "Elegans 60 · Ventana hoja exterior",
    typology: overrides.typology ?? "abatible",
    leavesCount: overrides.leavesCount ?? 1,
    variant: overrides.variant ?? "estandar",
    version: overrides.version ?? 1,
    status: overrides.status ?? "validated",
    sourceType: overrides.sourceType ?? "manual",
    sourceReference: overrides.sourceReference ?? "taller:personalizada:elegans-60",
    sourceName: overrides.sourceName ?? null,
    sourceRevision: overrides.sourceRevision ?? null,
    parentRecipeId: overrides.parentRecipeId ?? null,
    validatedAt: overrides.validatedAt ?? "2026-10-15T00:00:00.000Z",
    validatedBy: overrides.validatedBy ?? null,
    createdAt: overrides.createdAt ?? "2026-10-15T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-10-15T00:00:00.000Z",
    eliminadoEn: overrides.eliminadoEn ?? null,
    definition: overrides.definition ?? {
      schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
      version: 1,
      estado: "validada",
      identidad: {
        recetaId: "taller-elegans-60-legitima-def",
        codigo: "TALLER-ELEGANS-60-EXT",
        nombre: "Elegans 60 · Ventana exterior taller",
        tipologia: "abatible",
        hojas: 1,
        modulos: 1,
        apertura: "abatible",
        herraje: null,
        variante: "estandar",
      },
      perfiles: [
        {
          id: "elegans-marco-66311",
          codigoPerfil: "66311VER",
          nombrePerfil: "Marco Elegans 60",
          funcion: "Marco horizontal",
          largoComercialMm: 5800,
          reglaMedida: { base: "ancho_total", ajusteMm: 6 },
          reglaCantidad: { tipo: "fija", cantidad: 2 },
          requerido: true,
          corte: "45°/45°",
        },
        {
          id: "elegans-hoja-66312",
          codigoPerfil: "66312VER",
          nombrePerfil: "Hoja ventana exterior Elegans 60",
          funcion: "Hoja horizontal",
          largoComercialMm: 5800,
          reglaMedida: { base: "ancho_total", ajusteMm: -58 },
          reglaCantidad: { tipo: "fija", cantidad: 2 },
          requerido: true,
          corte: "45°/45°",
        },
      ],
      vidrios: [],
      accesorios: [],
      configuracionCorte: {
        perdidaCorteMm: null,
        despunteInicialMm: null,
        sobranteMinimoAprovechableMm: null,
        largoComercialDefaultMm: 5800,
      },
      notasValidacion: ["Receta privada legítima Elegans 60."],
    },
  };
}

function buildLegacyPersistedElegansRecipe(input: {
  id: string;
  lineTemplateId: number;
  variant:
    | "elegans_fijo_marco_normal"
    | "elegans_ventana_hoja_interior"
    | "elegans_ventana_hoja_exterior"
    | "elegans_puerta_hoja_interior"
    | "elegans_puerta_hoja_exterior";
  scope?: FabricationRecipeRecord["scope"];
  status?: FabricationRecipeRecord["status"];
  sourceType?: FabricationRecipeRecord["sourceType"];
  sourceReference?: string | null;
}): FabricationRecipeRecord {
  const definition =
    input.variant === "elegans_fijo_marco_normal"
      ? crearRecetaVeratecElegansFijo({
          lineName: "Elegans 60 · Paño fijo",
          variant: "elegans_fijo_marco_normal",
        })
      : crearRecetaVeratecElegansBatiente({
          lineName: "Elegans 60",
          variant: input.variant,
        });

  return {
    id: input.id,
    organizationId: input.scope === "ventora" ? null : 3,
    lineTemplateId: input.lineTemplateId,
    scope: input.scope ?? "organization",
    providerName: "VERATEC",
    lineName: "Elegans 60",
    typology: definition.identidad.tipologia,
    leavesCount: definition.identidad.hojas,
    variant: definition.identidad.variante,
    version: 1,
    status: input.status ?? "validated",
    definition,
    sourceType: input.sourceType ?? "supplier",
    sourceReference:
      input.sourceReference !== undefined
        ? input.sourceReference
        : "pauta-de-corte-veratec.xlsx#ABATIR-EXT-Y-PROY",
    sourceName: "Veratec · pauta de corte facilitada",
    sourceRevision: "legacy",
    parentRecipeId: null,
    validatedAt: "2026-10-08T00:00:00.000Z",
    validatedBy: null,
    createdAt: "2026-10-08T00:00:00.000Z",
    updatedAt: "2026-10-08T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("fabricacion-receta-resolver: bloqueo de Elegans 60 obsoleta con códigos Bahar 652xx", () => {
  it.each([
    {
      catalogKey: "ventora:veratec-elegans-60-fijo",
      variant: "elegans_fijo_marco_normal" as const,
      tipologia: "pano_fijo",
      apertura: "fijo",
    },
    {
      catalogKey: "ventora:veratec-elegans-60-ventana-hoja-interior",
      variant: "elegans_ventana_hoja_interior" as const,
      tipologia: "abatible",
      apertura: "abatible",
    },
    {
      catalogKey: "ventora:veratec-elegans-60-ventana-hoja-exterior",
      variant: "elegans_ventana_hoja_exterior" as const,
      tipologia: "abatible",
      apertura: "abatible",
    },
    {
      catalogKey: "ventora:veratec-elegans-60-puerta-hoja-interior",
      variant: "elegans_puerta_hoja_interior" as const,
      tipologia: "puerta_abatible",
      apertura: "abatible",
    },
    {
      catalogKey: "ventora:veratec-elegans-60-puerta-hoja-exterior",
      variant: "elegans_puerta_hoja_exterior" as const,
      tipologia: "puerta_abatible",
      apertura: "abatible",
    },
  ])("excluye receta legacy persistida con perfiles 652xx para $catalogKey", (sample) => {
    const legacyGlobal = buildLegacyPersistedElegansRecipe({
      id: `veratec:workbook:${sample.variant}`,
      lineTemplateId: 9008,
      variant: sample.variant,
      scope: "ventora",
      status: "testing",
      sourceReference: `veratec:workbook:${sample.variant}`,
    });
    const legacyOrgMigrationCopy = buildLegacyPersistedElegansRecipe({
      id: `org-copy-${sample.variant}`,
      lineTemplateId: 9008,
      variant: sample.variant,
      scope: "organization",
      status: "validated",
      sourceType: "copied",
      sourceReference: "taller:migrada-desde-excel",
    });

    expect(
      filterRecipesForCatalogResolution(
        [legacyGlobal, legacyOrgMigrationCopy],
        sample.catalogKey,
      ),
    ).toEqual([]);

    const resolvedWithCatalog = resolveFabricationRecipe(
      [legacyGlobal, legacyOrgMigrationCopy],
      {
        organizationId: 3,
        lineTemplateId: 9008,
        catalogKey: sample.catalogKey,
        tipologia: sample.tipologia,
        hojas: 1,
        modulos: 1,
        apertura: sample.apertura,
        previewListaParaProbar: true,
      },
    );
    expect(resolvedWithCatalog.estado).toBe("sin_receta");
    expect(resolvedWithCatalog.receta).toBeNull();

    const resolvedWithoutCatalog = resolverRecetaFabricacionCompatible(
      [legacyOrgMigrationCopy],
      {
        organizationId: 3,
        lineTemplateId: 9008,
        tipologia: sample.tipologia,
        hojas: 1,
        modulos: 1,
        apertura: sample.apertura,
      },
    );
    expect(resolvedWithoutCatalog.estado).toBe("sin_receta");
    expect(resolvedWithoutCatalog.receta).toBeNull();
    expect(resolvedWithoutCatalog.descartadas[0]?.motivo).toContain("652xx");
  });

  it("mantiene seleccionable la receta privada legítima de la organización incluso si coexiste con la obsoleta", () => {
    const obsoletePersisted = buildLegacyPersistedElegansRecipe({
      id: "legacy-elegans-65209",
      lineTemplateId: 9008,
      variant: "elegans_ventana_hoja_exterior",
      scope: "organization",
      status: "validated",
      sourceType: "manual",
      sourceReference: "taller:copia-legacy",
    });
    const legitimatePrivate = buildElegans60LegitimatePrivateRecipe({
      id: "taller-elegans-60-oficial",
      lineTemplateId: 9008,
    });

    const filtered = filterRecipesForCatalogResolution(
      [obsoletePersisted, legitimatePrivate],
      "ventora:veratec-elegans-60-ventana-hoja-exterior",
    );
    expect(filtered.map((recipe) => recipe.id)).toEqual(["taller-elegans-60-oficial"]);

    const resolved = resolveFabricationRecipe([obsoletePersisted, legitimatePrivate], {
      organizationId: 3,
      lineTemplateId: 9008,
      catalogKey: "ventora:veratec-elegans-60-ventana-hoja-exterior",
      tipologia: "abatible",
      hojas: 1,
      modulos: 1,
      apertura: "abatible",
    });
    expect(resolved.estado).toBe("receta_unica");
    expect(resolved.receta?.id).toBe("taller-elegans-60-oficial");
    expect(resolved.receta?.definition.perfiles.map((p) => p.codigoPerfil)).toEqual([
      "66311VER",
      "66312VER",
    ]);
  });

  it("no bloquea Bahar 5200 donde los códigos 652xx sí son legítimos", () => {
    const baharDef = crearRecetaVeratecBahar5200({
      lineName: "Bahar 5200 · Ventana hoja interior",
      variant: "bahar_5200_ventana_interior",
    });
    const baharRecipe: FabricationRecipeRecord = {
      id: "bahar-5200-org-1",
      organizationId: 3,
      lineTemplateId: 9521,
      scope: "organization",
      providerName: "VERATEC",
      lineName: "Bahar 5200 · Ventana hoja interior",
      typology: "abatible",
      leavesCount: 1,
      variant: "bahar_5200_ventana_interior",
      version: 1,
      status: "validated",
      definition: baharDef,
      sourceType: "supplier",
      sourceReference: "pauta-de-corte-veratec.xlsx#ABATIR-INT-Y-OB; MATERIALES PRECIO VERATEC.xlsx#BAHAR",
      sourceName: "Veratec · Bahar 52 mm",
      sourceRevision: "legacy",
      parentRecipeId: null,
      validatedAt: "2026-10-11T00:00:00.000Z",
      validatedBy: null,
      createdAt: "2026-10-11T00:00:00.000Z",
      updatedAt: "2026-10-11T00:00:00.000Z",
      eliminadoEn: null,
    };

    expect(
      isObsoleteElegans60DocumentaryRecipe(
        baharRecipe,
        "ventora:veratec-bahar-5200-ventana-interior",
      ),
    ).toBe(false);
    expect(isObsoleteElegans60DocumentaryRecipe(baharRecipe)).toBe(false);

    const resolved = resolveFabricationRecipe([baharRecipe], {
      organizationId: 3,
      lineTemplateId: 9521,
      catalogKey: "ventora:veratec-bahar-5200-ventana-interior",
      tipologia: "abatible",
      hojas: 1,
      modulos: 1,
      apertura: "abatible",
    });
    expect(resolved.estado).toBe("receta_unica");
    expect(resolved.receta?.id).toBe("bahar-5200-org-1");
  });
});
