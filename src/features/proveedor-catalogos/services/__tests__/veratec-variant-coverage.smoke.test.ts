import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import { getRecipeAccessoriesFromItemSnapshot, buildPartialTechnicalCostSnapshot, type CatalogPresentationPrice } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import { LINE_BASE_VARIANT_CATALOG, getLineVariantSlots } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { VERATEC_FAMILIES_JUNIO_2026_IMPORT } from "@/features/proveedor-catalogos/fixtures/veratec-familias-junio-2026";
import { VERATEC_7400_JUNIO_2026_IMPORT } from "@/features/proveedor-catalogos/fixtures/veratec-7400-junio-2026";
import { VERATEC_BAHAR_5200_PRICE_LIST_IMPORT } from "@/features/proveedor-catalogos/fixtures/veratec-bahar-5200-price-list";
import { VERATEC_7400_4H_CATALOG_KEY } from "@/features/fabricacion/fixtures/veratec-preliminary-recipes";
import type { SupplierCatalogImport } from "@/features/proveedor-catalogos/schemas/catalogo-import.schema";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const supportedFamilyKeys = [
  "veratec:sliding-7400",
  "veratec:compact-sliding",
  "veratec:elegans-60",
  "veratec:bahar-5200",
] as const;

function toPriceRows(input: SupplierCatalogImport): CatalogPresentationPrice[] {
  const technicalByKey = new Map(input.technicalInputs.map((row) => [row.technicalKey, row]));
  return input.presentations.flatMap((presentation) => {
    const technical = technicalByKey.get(presentation.technicalKey);
    if (!technical) return [];
    return [{
      presentationId: presentation.sku,
      providerKey: input.supplierKey,
      familyKeys: technical.familyKeys,
      technicalCode: technical.sourceCode,
      recipeComponentCodes: technical.recipeComponentCodes,
      recipeAccessoryNames: technical.recipeAccessoryNames,
      technicalName: technical.name,
      supplierSku: presentation.sku,
      presentationDescription: presentation.description,
      finishCode: presentation.finishCode ?? "",
      finishName: presentation.finishName,
      finishResolution: presentation.finishResolution,
      purchaseUnit: presentation.purchaseUnit,
      commercialLengthMm: presentation.commercialLengthMm,
      netPrice: presentation.netPrice,
      priceBasis: input.priceListPriceBasis,
      currency: presentation.currency,
      priceListId: "fixture-veratec-families-2026-06",
      priceListRevision: input.priceListRevision,
    } satisfies CatalogPresentationPrice];
  });
}

const familyPrices = toPriceRows(VERATEC_FAMILIES_JUNIO_2026_IMPORT);
const standalone7400Prices = toPriceRows(VERATEC_7400_JUNIO_2026_IMPORT);
const baharPrices = toPriceRows(VERATEC_BAHAR_5200_PRICE_LIST_IMPORT);
const availablePrices = [...new Map(
  [...familyPrices, ...standalone7400Prices, ...baharPrices].map((entry) => [entry.supplierSku, entry])
).values()];

const slots = Object.keys(LINE_BASE_VARIANT_CATALOG)
  .filter((key) => key.startsWith("ventora:veratec-7400") || key.startsWith("ventora:veratec-compact-sliding") || key.startsWith("ventora:veratec-bahar-5200"))
  .flatMap((catalogLineKey) => getLineVariantSlots(catalogLineKey)
    .filter((slot) => slot.evidenceLevel === "documented" && slot.sourceType)
    .map((slot) => ({ catalogLineKey, slot })));

function getVariantTestDimensions(variantSlug: string): { width: number; height: number } {
  const foldingSamples: Record<string, { width: number; height: number }> = {
    bahar_5200_plegable_3_3_0: { width: 2600, height: 2015 },
    bahar_5200_plegable_4_3_1: { width: 2885, height: 2225 },
    bahar_5200_plegable_6_5_1: { width: 4955, height: 2210 },
    bahar_5200_plegable_7_4_3: { width: 5410, height: 2277 },
  };
  return foldingSamples[variantSlug] ?? { width: 1200, height: 1500 };
}

describe("smoke local de variantes Veratec con despiece y precio", () => {
  it("traslada el precio de cada presentación Veratec con tarifa y recupera UUID antiguos por SKU", () => {
    const pricedPresentations = [...familyPrices, ...standalone7400Prices, ...baharPrices].filter((entry) =>
      entry.netPrice != null && entry.netPrice > 0 && entry.commercialLengthMm != null && entry.currency === "CLP"
    );
    expect(pricedPresentations.length).toBeGreaterThan(0);

    const failures: string[] = [];
    for (const [index, entry] of pricedPresentations.entries()) {
      const itemCode = `PRICE-${index}`;
      const recipeCode = entry.recipeComponentCodes?.[0] ?? entry.technicalCode;
      const familyKey = entry.familyKeys?.[0];
      const workSnapshot = {
        schemaVersion: 1 as const,
        tipo: "fabricacion_trabajo_snapshot" as const,
        packing: "first_fit_decreasing_sugerido" as const,
        capturedAt: "2026-10-12T12:00:00.000Z",
        itemCountWithPauta: 1,
        totalBars: 1,
        totalProfilesLinealMm: 1000,
        totalWasteMm: 0,
        sourcePresentations: [],
        bars: [{
          materialKey: `${entry.providerKey}:${recipeCode}`,
          presentationKey: `old-presentation:${entry.supplierSku}`,
          codigoPerfil: recipeCode,
          nombrePerfil: entry.technicalName,
          acabadoKey: entry.finishName ?? "independent",
          lineaIds: [],
          largoComercialMm: entry.commercialLengthMm!,
          supplierPresentationId: `old-uuid-${index}`,
          supplierProviderKey: entry.providerKey ?? null,
          supplierSku: entry.supplierSku,
          supplierFinishCode: entry.finishCode,
          supplierFinishName: entry.finishName,
          indice: 1,
          despunteInicialMm: 0,
          perdidaCorteMm: 0,
          usadoMm: 1000,
          sobranteMm: entry.commercialLengthMm! - 1000,
          cortes: [{
            itemId: itemCode,
            codigoItem: itemCode,
            nombreItem: "Perfil de prueba",
            componenteId: recipeCode,
            codigoPerfil: recipeCode,
            funcion: entry.technicalName,
            corte: "90° / 90°",
            largoMm: 1000,
          }],
        }],
      };
      const result = buildPartialTechnicalCostSnapshot({
        workSnapshot,
        quoteItems: [{
          code: itemCode,
          color: entry.finishName ?? "Blanco",
          finishName: entry.finishName,
          catalogLineKey: familyKey,
          supplierFamilyKey: familyKey,
        }],
        availablePrices: [entry],
        calculatedAt: "2026-10-12T12:00:00.000Z",
      });
      const valued = result?.lines.find((line) => line.supplierSku === entry.supplierSku);
      if (!valued || valued.lineNet !== entry.netPrice || valued.currency !== "CLP") failures.push(entry.supplierSku);
    }
    expect(failures).toEqual([]);
  });

  it("reporta cobertura de cálculo y costo para cada variante documental", () => {
    expect(slots).toHaveLength(19);
    const report: Array<{ catalogLineKey: string; variant: string; cuts: number; bars: number; status: string; knownNet: number | null; missingCount: number; unpricedProfileCodes: string[] }> = [];

    for (const { catalogLineKey, slot } of slots) {
      const dimensions = getVariantTestDimensions(slot.variantSlug);
      const recipeDefinition = slot.buildDefinition({ lineName: catalogLineKey });
      const familyKey = catalogLineKey.includes("7400")
        ? supportedFamilyKeys[0]
        : catalogLineKey.includes("compact")
          ? supportedFamilyKeys[1]
          : catalogLineKey.includes("bahar")
            ? supportedFamilyKeys[3]
            : supportedFamilyKeys[2];
      const record: FabricationRecipeRecord = {
        id: `qa-${catalogLineKey}-${slot.variantSlug}`,
        organizationId: 1,
        lineTemplateId: 1,
        scope: "organization",
        providerName: "VERATEC",
        lineName: catalogLineKey,
        typology: slot.typology,
        leavesCount: slot.leavesCount,
        variant: slot.variantSlug,
        version: 1,
        status: "draft",
        definition: recipeDefinition,
        sourceType: slot.sourceType,
        sourceReference: slot.sourceReference,
        sourceName: slot.sourceName ?? "Veratec · base documental local",
        sourceRevision: slot.sourceRevision ?? "local-fixture",
        parentRecipeId: null,
        validatedAt: null,
        validatedBy: null,
        createdAt: "2026-10-11T12:00:00.000Z",
        updatedAt: "2026-10-11T12:00:00.000Z",
        eliminadoEn: null,
      };
      const snapshot = construirSnapshotFabricacionCotizacion({
        recipe: record,
        supplierFamilyKey: familyKey,
        calculatedAt: "2026-10-11T12:00:00.000Z",
        entrada: {
          anchoTotalMm: dimensions.width,
          altoTotalMm: dimensions.height,
          cantidad: 1,
          hojas: slot.leavesCount,
          modulos: slot.modulesCount,
          variante: slot.variantSlug,
        },
      });

      expect(snapshot.result.perfiles.length).toBeGreaterThan(0);
      expect(snapshot.result.perfiles.every((profile) => Number.isFinite(profile.medidaMm) && profile.medidaMm > 0)).toBe(true);
      if (!snapshot.result.calculable || !snapshot.pautaBarras?.calculable) {
        expect(snapshot.result.advertencias.some((warning) => warning.codigo === "RECETA_DATOS_PENDIENTES")).toBe(true);
        report.push({
          catalogLineKey,
          variant: slot.variantLabel,
          cuts: snapshot.result.perfiles.reduce((total, profile) => total + Number(profile.cantidad ?? 0), 0),
          bars: 0,
          status: `bloqueada: ${snapshot.result.advertencias.map((warning) => warning.codigo).join(",")}`,
          knownNet: null,
          missingCount: snapshot.result.advertencias.length,
          unpricedProfileCodes: [],
        });
        continue;
      }

      const qaSnapshot = {
        ...snapshot,
        qaPreliminary: {
          mode: "supplier_catalog_v1_qa_preliminary" as const,
          readiness: "lista_para_validar" as const,
          provenance: { sourceType: record.sourceType, sourceReference: record.sourceReference },
        },
      };
      const itemId = `${catalogLineKey}-${slot.variantSlug}`;
      const workSnapshot = construirFabricacionTrabajoSnapshot({
        capturedAt: "2026-10-11T12:00:00.000Z",
        items: [{
          id: itemId,
          codigo: itemId,
          nombre: slot.variantLabel,
          lineaComercial: catalogLineKey,
          colorHex: "#ffffff",
          catalogLineKey,
          supplierFamilyKey: familyKey,
          snapshot: qaSnapshot,
        }],
      });
      expect(workSnapshot).not.toBeNull();
      expect(workSnapshot?.totalBars).toBeGreaterThan(0);
      const cost = buildPartialTechnicalCostSnapshot({
        workSnapshot,
        quoteItems: [{
          code: itemId,
          color: "Blanco",
          catalogLineKey,
          supplierFamilyKey: familyKey,
          recipeAccessories: getRecipeAccessoriesFromItemSnapshot(snapshot, itemId),
        }],
        availablePrices,
        calculatedAt: "2026-10-11T12:00:00.000Z",
      });
      expect(cost).not.toBeNull();
      expect(cost?.status).toMatch(/partial|complete|no_data/);
      expect(cost?.knownNetTotal == null || Number.isFinite(cost.knownNetTotal)).toBe(true);
      expect(cost?.status).toMatch(/partial|complete/);
      expect(cost?.knownNetTotal).toBeGreaterThan(0);
      expect(cost?.currency).toBe("CLP");
      expect(cost?.lines.every((line) => line.supplierSku.length > 0 && Number.isFinite(line.lineNet))).toBe(true);

      report.push({
        catalogLineKey,
        variant: slot.variantLabel,
          cuts: workSnapshot?.bars.reduce((total, bar) => total + bar.cortes.length, 0) ?? 0,
        bars: workSnapshot?.totalBars ?? 0,
        status: cost?.status ?? "sin_datos",
        knownNet: cost?.knownNetTotal ?? null,
          missingCount: cost?.missing.length ?? 0,
          unpricedProfileCodes: cost?.missing.flatMap((entry) => entry.technicalCode ? [entry.technicalCode] : []) ?? [],
      });
    }

    expect(slots).toHaveLength(19);
    console.info("VERATEC_VARIANT_COST_SMOKE", JSON.stringify(report));
  });

  it("lleva cada variante documental al despiece del flujo de cotización", () => {
    for (const [index, { catalogLineKey, slot }] of slots.entries()) {
      const dimensions = getVariantTestDimensions(slot.variantSlug);
      const lineTemplateId = String(20_000 + index);
      const itemId = `veratec-quote-${slot.variantSlug}`;
      const glass = slot.variantSlug.includes("termopanel_20mm")
        ? "Termopanel 20 mm"
        : slot.variantSlug.includes("termopanel_24mm")
          ? "Termopanel 24 mm"
          : "Incoloro monolítico 4 mm";
      const isDoor = slot.typology === "puerta_abatible";
      const isFoldingDoor = isDoor && slot.variantSlug.includes("plegable");
      const isFixed = slot.typology === "pano_fijo";
      const is7400FourMobile = catalogLineKey === VERATEC_7400_4H_CATALOG_KEY;
      const quoteSystem = slot.typology === "corredera"
        ? "Corredera"
        : isFoldingDoor
          ? "Plegable"
        : slot.typology === "proyectante"
          ? "Proyectante"
        : isFixed
          ? "Paño fijo"
          : "Abatible";
      const item: CotizacionWorkflowItem = {
        id: itemId,
        codigo: `V${index + 1}`,
        tipo: isDoor ? "Puerta" : isFixed ? "Paño fijo" : "Ventana",
        lineaComercial: slot.variantLabel,
        vidrio: glass,
        nombre: slot.variantLabel,
        descripcion: `${slot.leavesCount} hojas`,
        ancho: dimensions.width,
        alto: dimensions.height,
        cantidad: 1,
        unidad: "unidad",
        areaM2: 1.8,
        costoProveedorUnitario: 0,
        costoProveedorTotal: 0,
        margenPct: 0,
        precioUnitario: 100_000,
        precioTotal: 100_000,
        precioPorM2: null,
        minimoCobrable: null,
        redondeoPrecio: null,
        precioPlantillaSugerido: null,
        precioAjustadoManual: false,
        origenPrecio: "manual",
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId,
          catalogLineKey,
          sistema: quoteSystem,
          fabricacionTipologia: slot.typology,
          fabricacionApertura: isFixed ? "fijo" : quoteSystem,
          fabricacionHojas: slot.leavesCount,
          fabricacionModulos: slot.modulesCount,
          fabricacionVariante: slot.variantSlug,
          ...(is7400FourMobile ? { sheetScheme: "4 hojas", sheetVariant: "4 móviles" } : {}),
        }),
      };

      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [],
        organizationId: 1,
      });
      expect(resolved.estado).toBe("calculado");
      expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
      expect(resolved.formal?.pautaBarras?.calculable).toBe(true);
      expect(resolved.formal?.pautaBarras?.barras.length).toBeGreaterThan(0);
      expect(resolved.preliminary).toBe(true);
    }
  });
});
