import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import { buildWorkMaterialsDocument } from "../fabrication-work-materials.service";

function item(input: {
  id: string;
  code: string;
  line?: string;
  glass: string;
  finish?: string;
  thickness?: string;
  glassTemplateId?: string;
  supplierProviderKey?: string;
  catalogTerminacion?: string;
  snapshot?: CotizacionWorkflowItem["fabricacionSnapshot"];
}) {
  return {
    id: input.id,
    codigo: input.code,
    tipo: "Ventana",
    lineaComercial: input.line ?? "Sliding 7400",
    vidrio: input.glass,
    nombre: "Ventana corredera",
    descripcion: "",
    ancho: 1200,
    alto: 1500,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.8,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 1,
    precioTotal: 1,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual" as const,
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: input.finish?.startsWith("#") ? input.finish : input.finish?.toLocaleLowerCase("es-CL") === "titanio" ? "#7d8791" : "#ffffff",
      material: "PVC",
      catalogEspesor: input.thickness ?? "4 mm",
      catalogTerminacion: input.catalogTerminacion ?? "Incoloro",
      supplierProviderKey: input.supplierProviderKey,
      vidrioLineTemplateId: input.glassTemplateId,
      fabricacionGlazing: input.glass,
    }),
    fabricacionSnapshot: input.snapshot ?? null,
  } as CotizacionWorkflowItem;
}

function summary(snapshot: FabricacionTrabajoSnapshot | null): FabricationQuoteSummary {
  return {
    items: [],
    compositionsPendingRecipe: [],
    totalItems: 2,
    totalProfilesMl: 5.6,
    totalGlassM2: 2.4,
    totalAccessoryUnits: 2,
    totalBars: snapshot?.totalBars ?? null,
    trabajoSnapshot: snapshot,
  };
}

function jobSnapshot(): FabricacionTrabajoSnapshot {
  const bar = (input: {
    presentationKey: string;
    materialKey: string;
    finish: string;
    length: number;
    code: string;
    lineId: number;
    itemCode: string;
  }) => ({
    materialKey: input.materialKey,
    presentationKey: input.presentationKey,
    codigoPerfil: input.code,
    nombrePerfil: "Riel de marco",
    acabadoKey: input.finish,
    lineaIds: [input.lineId],
    largoComercialMm: input.length,
    indice: 1,
    despunteInicialMm: 0,
    perdidaCorteMm: 3,
    usadoMm: 2803,
    sobranteMm: input.length - 2803,
    cortes: [{
      itemId: input.itemCode,
      codigoItem: input.itemCode,
      nombreItem: "Ventana",
      componenteId: "rail",
      codigoPerfil: input.code,
      funcion: "Riel marco",
      corte: null,
      largoMm: 2800,
    }],
  });
  return {
    schemaVersion: 1,
    tipo: "fabricacion_trabajo_snapshot",
    packing: "first_fit_decreasing_sugerido",
    capturedAt: "2026-10-04T12:00:00.000Z",
    itemCountWithPauta: 2,
    totalBars: 3,
    totalProfilesLinealMm: 8400,
    totalWasteMm: 5000,
    sourcePresentations: [
      { technicalInputKey: "r1", presentationKey: "p1", lineTemplateId: 1, catalogLineKey: null, finishKey: "#ffffff", commercialLengthMm: 5800 },
      { technicalInputKey: "r1", presentationKey: "p2", lineTemplateId: 1, catalogLineKey: null, finishKey: "#111111", commercialLengthMm: 5800 },
      { technicalInputKey: "r1", presentationKey: "p3", lineTemplateId: 2, catalogLineKey: null, finishKey: "#ffffff", commercialLengthMm: 6000 },
    ],
    bars: [
      bar({ presentationKey: "p1", materialKey: "r1", finish: "#ffffff", length: 5800, code: "61016", lineId: 1, itemCode: "V1" }),
      bar({ presentationKey: "p2", materialKey: "r1", finish: "#111111", length: 5800, code: "61016", lineId: 1, itemCode: "V2" }),
      bar({ presentationKey: "p3", materialKey: "r1", finish: "#ffffff", length: 6000, code: "61016", lineId: 2, itemCode: "V2" }),
    ],
  };
}

function glassSnapshot(glassId: string, name: string, width: number, height: number, quantity: number) {
  return {
    schemaVersion: 1,
    tipo: "fabricacion_receta_snapshot",
    recipeId: "recipe",
    recipeDefinitionId: "recipe-def",
    recipeVersion: 1,
    recipeStatus: "validated",
    recipeScope: "ventora",
    lineTemplateId: 1,
    recipeIdentity: { recetaId: "recipe-def", codigo: "7400", nombre: "7400", tipologia: "corredera", hojas: 2, modulos: 2, herraje: null, variante: "estandar" },
    input: { anchoTotalMm: 1200, altoTotalMm: 1500, cantidad: 1, hojas: 2, modulos: 2, variante: "estandar" },
    selectedVariant: "estandar",
    result: {
      engineVersion: 1,
      recetaId: "recipe-def",
      recetaVersion: 1,
      estadoReceta: "validada",
      entradaNormalizada: null,
      perfiles: [],
      vidrios: [],
      accesorios: [{ accesorioId: "lock", codigo: "ACC-1", nombre: "Cierre central", cantidadUnidades: 1, trazabilidad: [] }],
      advertencias: [],
      totalLinealMm: 2800,
      totalVidrioM2: (width * height * quantity) / 1_000_000,
      calculable: true,
    },
    pauta: [],
    vidrios: [{ vidrioId: glassId, nombre: name, anchoMm: width, altoMm: height, cantidadPiezas: quantity, totalM2: (width * height * quantity) / 1_000_000, trazabilidad: [] }],
    advertencias: [],
    calculatedAt: "2026-10-04T12:00:00.000Z",
  } as CotizacionWorkflowItem["fabricacionSnapshot"];
}

describe("fabrication-work-materials.service", () => {
  it("no asigna al proveedor elegido el precio del proveedor guardado en un snapshot anterior", () => {
    const snapshot = jobSnapshot();
    snapshot.bars = [{ ...snapshot.bars[0]!, supplierProviderKey: "arquetipo", supplierSku: "ARQ-5001" }];
    const cost = {
      schemaVersion: 2,
      status: "partial",
      calculatedAt: "2026-10-19T10:00:00.000Z",
      currency: "CLP",
      knownNetTotal: 13_477,
      sourcePautaCapturedAt: null,
      assumptions: [],
      missing: [],
      lines: [{
        familyKey: "universal:aluminio:l5000", providerKey: "arquetipo", technicalCode: "5001",
        technicalName: "Riel superior", supplierSku: "ARQ-5001", finishName: "Sin acabado específico",
        commercialLengthMm: 6000, purchaseUnit: "TIRA", bars: 1, netPricePerPresentation: 13_477,
        sourcePrice: 13_477, effectivePriceSource: "reference", priceBasis: "commercial_presentation",
        lineNet: 13_477, currency: "CLP", priceListId: "arquetipo", priceListRevision: "2026", cuts: [],
      }],
    } as TechnicalCostSnapshot;
    const materials = buildWorkMaterialsDocument({
      summary: summary(snapshot),
      items: [item({ id: "V1", code: "V1", glass: "Monolítico", finish: "#7d8791", supplierProviderKey: "alumco", catalogTerminacion: "Titanio" })],
      technicalCostSnapshot: cost,
    });

    expect(materials.profiles).toHaveLength(1);
    expect(materials.profiles[0]).toMatchObject({ supplierProviderKey: "alumco", finish: "Titanio", supplierSku: null, price: null });
  });

  it("no muestra un sufijo BLANCO cuando la cotización conserva Titanio", () => {
    const snapshot = jobSnapshot();
    snapshot.bars = [{ ...snapshot.bars[0]!, nombrePerfil: "RIEL SUPERIOR BLANCO", acabadoKey: "Titanio" }];
    const materials = buildWorkMaterialsDocument({
      summary: summary(snapshot),
      items: [item({ id: "1", code: "V1", line: "Serie 25", glass: "Monolítico", finish: "Titanio" })],
    });

    expect(materials.profiles[0]).toMatchObject({ description: "RIEL SUPERIOR", finish: "Titanio" });
  });

  it("vincula el precio guardado de un accesorio por cantidad de unidades", () => {
    const accessory = item({ id: "1", code: "V1", glass: "Monolítico", snapshot: glassSnapshot("p1", "Paño", 900, 1400, 1) });
    const cost = {
      schemaVersion: 2, status: "complete", calculatedAt: "2026-10-06T10:00:00.000Z", currency: "CLP",
      knownNetTotal: 750, sourcePautaCapturedAt: null, assumptions: [], missing: [],
      lines: [{
        technicalCode: "ACC-1", technicalName: "Cierre central", supplierSku: "SKU-ACC-1", finishCode: "blanco", finishName: "Blanco",
        commercialLengthMm: null, purchaseUnit: "unidad", bars: 0, quantity: 1,
        netPricePerPresentation: 750, sourcePrice: 750, effectivePriceSource: "reference", priceBasis: "commercial_presentation",
        lineNet: 750, currency: "CLP", priceListId: "lista", priceListRevision: "revision", cuts: [],
      }],
    } as TechnicalCostSnapshot;
    const materials = buildWorkMaterialsDocument({ summary: summary(null), items: [accessory], technicalCostSnapshot: cost });
    expect(materials.accessories[0]?.price).toMatchObject({ sku: "SKU-ACC-1", unitPrice: 750, subtotal: 750 });
  });

  it("usa barras de la pauta conjunta y separa acabado, largo y línea", () => {
    const materials = buildWorkMaterialsDocument({
      summary: summary(jobSnapshot()),
      items: [
        item({ id: "1", code: "V1", glass: "Monolítico", snapshot: glassSnapshot("paño-a", "Hoja móvil", 900, 1400, 2) }),
        item({ id: "2", code: "V2", glass: "DVH 4+12+4", finish: "#111111", snapshot: glassSnapshot("paño-b", "Hoja móvil", 880, 1380, 2) }),
      ],
    });

    expect(materials.profiles).toHaveLength(3);
    expect(materials.profiles.map((row) => row.bars)).toEqual([1, 1, 1]);
    expect(materials.profiles.map((row) => row.commercialLengthMm)).toEqual([5800, 5800, 6000]);
    expect(materials.profiles.map((row) => row.finish)).toEqual(["Acabado sin definir", "Blanco", "Blanco"]);
    expect(materials.accessories).toHaveLength(2);
    expect(materials.accessories.map((row) => row.quantity)).toEqual([1, 1]);
    expect(materials.accessories.map((row) => [row.finish, row.itemCodes]).sort()).toEqual([
      ["Acabado sin definir", ["V2"]],
      ["Blanco", ["V1"]],
    ]);
    expect(materials.glass).toHaveLength(2);
    expect(materials.glassOrder).toHaveLength(2);
    expect(materials.glassOrder.map((row) => row.componentCode).sort()).toEqual(["V1", "V2"]);
    expect(materials.glassOrder.map((row) => row.paneReference).sort()).toEqual(["V1 · Paño 1", "V2 · Paño 1"]);
    expect(materials.glassOrder.some((row) => row.paneReference.includes("paño-a") || row.paneReference.includes("paño-b"))).toBe(false);
    expect(materials.glassOrder.map((row) => row.totalM2).sort((a, b) => a - b)).toEqual([2.4288, 2.52]);
  });

  it("prioriza el código técnico exacto cuando el nombre del perfil se repite entre líneas", () => {
    const snapshot = jobSnapshot();
    const sourceBar = snapshot.bars[0]!;
    snapshot.sourcePresentations[0]!.catalogLineKey = "ventora:l5000";
    snapshot.bars = [{
      ...sourceBar,
      codigoPerfil: "5001",
      nombrePerfil: "Riel superior",
      largoComercialMm: 6000,
      cortes: sourceBar.cortes.map((cut) => ({ ...cut, codigoPerfil: "5001", funcion: "Riel superior" })),
    }];
    const cost = {
      schemaVersion: 2,
      status: "partial",
      calculatedAt: "2026-10-15T10:00:00.000Z",
      currency: "CLP",
      knownNetTotal: 13_477,
      sourcePautaCapturedAt: "2026-10-15T09:00:00.000Z",
      assumptions: [],
      missing: [],
      lines: [
        {
          familyKey: "universal:aluminio:l5000", technicalCode: "5001", technicalName: "Riel superior", supplierSku: "30895001", finishCode: "",
          finishName: "Sin acabado específico", commercialLengthMm: 6000, purchaseUnit: "TIRA", bars: 1,
          netPricePerPresentation: 13_477, sourcePrice: 13_477, effectivePriceSource: "reference",
          priceBasis: "commercial_presentation", lineNet: 13_477, currency: "CLP", priceListId: "arquetipo",
          priceListRevision: "cot-27811-2026-10-01-legno", cuts: [],
        },
        {
          familyKey: "universal:aluminio:l20", technicalCode: "5001", technicalName: "Riel superior", supplierSku: "30892001", finishCode: "",
          finishName: "Sin acabado específico", commercialLengthMm: 6000, purchaseUnit: "TIRA", bars: 1,
          netPricePerPresentation: 21_189, sourcePrice: 21_189, effectivePriceSource: "reference",
          priceBasis: "commercial_presentation", lineNet: 21_189, currency: "CLP", priceListId: "arquetipo",
          priceListRevision: "cot-27811-2026-10-01-legno", cuts: [],
        },
      ],
    } as TechnicalCostSnapshot;

    const materials = buildWorkMaterialsDocument({
      summary: summary(snapshot),
      items: [item({ id: "1", code: "V1", line: "Serie 5000", glass: "Monolítico" })],
      technicalCostSnapshot: cost,
    });

    expect(materials.profiles).toHaveLength(1);
    expect(materials.profiles[0]?.price).toMatchObject({
      sku: "30895001",
      unitPrice: 13_477,
      subtotal: 13_477,
    });
  });

  it("no asigna precio por nombre cuando el código técnico del perfil no coincide", () => {
    const snapshot = jobSnapshot();
    snapshot.sourcePresentations[0]!.catalogLineKey = "ventora:l5000";
    snapshot.bars = [{
      ...snapshot.bars[0]!,
      codigoPerfil: "QA-OTRO-CODIGO",
      nombrePerfil: "Riel de marco",
      cortes: snapshot.bars[0]!.cortes.map((cut) => ({ ...cut, codigoPerfil: "QA-OTRO-CODIGO" })),
    }];
    const cost = {
      schemaVersion: 2,
      status: "partial",
      calculatedAt: "2026-10-15T10:00:00.000Z",
      currency: "CLP",
      knownNetTotal: 13_477,
      sourcePautaCapturedAt: "2026-10-15T09:00:00.000Z",
      assumptions: [],
      missing: [],
      lines: [{
        familyKey: "universal:aluminio:l5000", technicalCode: "61016", technicalName: "Riel de marco",
        supplierSku: "SKU-61016", finishCode: "", finishName: "Sin acabado específico",
        commercialLengthMm: 5800, purchaseUnit: "TIRA", bars: 1, netPricePerPresentation: 13_477,
        sourcePrice: 13_477, effectivePriceSource: "reference", priceBasis: "commercial_presentation",
        lineNet: 13_477, currency: "CLP", priceListId: "arquetipo", priceListRevision: "qa", cuts: [],
      }],
    } as TechnicalCostSnapshot;

    const materials = buildWorkMaterialsDocument({
      summary: summary(snapshot),
      items: [item({ id: "1", code: "V1", line: "Serie 5000", glass: "Monolítico" })],
      technicalCostSnapshot: cost,
    });

    expect(materials.profiles).toHaveLength(1);
    expect(materials.profiles[0]?.price).toBeNull();
  });

  it("distribuye el costo de una línea L32 agregada entre perfiles horizontales y verticales", () => {
    const snapshot = jobSnapshot();
    snapshot.sourcePresentations = [{
      technicalInputKey: "l32-3201",
      presentationKey: "p-l32",
      lineTemplateId: 32,
      catalogLineKey: "ventora:l32",
      finishKey: "Negro",
      commercialLengthMm: 6000,
    }];
    const sourceBar = snapshot.bars[0]!;
    snapshot.bars = [
      { ...sourceBar, presentationKey: "p-l32", materialKey: "l32-3201", codigoPerfil: "3201", nombrePerfil: "Marco horizontal", acabadoKey: "Negro", largoComercialMm: 6000 },
      { ...sourceBar, presentationKey: "p-l32", materialKey: "l32-3201", codigoPerfil: "3201", nombrePerfil: "Marco vertical", acabadoKey: "Negro", largoComercialMm: 6000 },
    ];
    snapshot.totalBars = 2;
    const cost = {
      schemaVersion: 2,
      status: "partial",
      calculatedAt: "2026-10-16T10:00:00.000Z",
      currency: "CLP",
      knownNetTotal: 23_316,
      sourcePautaCapturedAt: "2026-10-16T09:00:00.000Z",
      assumptions: [],
      missing: [],
      lines: [{
        familyKey: "universal:aluminio:l32",
        providerKey: "arquetipo",
        technicalCode: "3201",
        technicalName: "Marco",
        supplierSku: "30893201",
        finishCode: "negro",
        finishName: "Negro",
        commercialLengthMm: 6000,
        purchaseUnit: "TIRA",
        bars: 2,
        netPricePerPresentation: 11_658,
        sourcePrice: 11_658,
        effectivePriceSource: "reference",
        priceBasis: "commercial_presentation",
        lineNet: 23_316,
        currency: "CLP",
        priceListId: "thermowin",
        priceListRevision: "2026-10",
        cuts: [],
      }],
    } as TechnicalCostSnapshot;

    const materials = buildWorkMaterialsDocument({
      summary: summary(snapshot),
      items: [item({ id: "1", code: "V1", line: "Serie 32", glass: "Monolítico", finish: "#111111" })],
      technicalCostSnapshot: cost,
    });

    expect(materials.profiles.map((row) => row.description).sort()).toEqual(["Marco horizontal", "Marco vertical"]);
    expect(materials.profiles.every((row) => row.price?.sourceLabel === "Arquetipo · junio 2026")).toBe(true);
    expect(materials.profiles.map((row) => row.price?.subtotal)).toEqual([11_658, 11_658]);
    expect(materials.profiles.reduce((total, row) => total + (row.price?.subtotal ?? 0), 0)).toBe(23_316);
  });

  it("deja pendiente el costo agregado si hay más de una referencia candidata", () => {
    const snapshot = jobSnapshot();
    snapshot.sourcePresentations = [{
      technicalInputKey: "l32-3201",
      presentationKey: "p-l32",
      lineTemplateId: 32,
      catalogLineKey: "ventora:l32",
      finishKey: "#111111",
      commercialLengthMm: 6000,
    }];
    const sourceBar = snapshot.bars[0]!;
    snapshot.bars = [
      { ...sourceBar, presentationKey: "p-l32", materialKey: "l32-3201", codigoPerfil: "3201", nombrePerfil: "Marco horizontal", acabadoKey: "Negro", largoComercialMm: 6000 },
      { ...sourceBar, presentationKey: "p-l32", materialKey: "l32-3201", codigoPerfil: "3201", nombrePerfil: "Marco vertical", acabadoKey: "Negro", largoComercialMm: 6000 },
    ];
    snapshot.totalBars = 2;
    const line = {
      familyKey: "universal:aluminio:l32",
      technicalCode: "3201",
      technicalName: "Marco",
      supplierSku: "SKU",
      finishCode: "negro",
      finishName: "Negro",
      commercialLengthMm: 6000,
      purchaseUnit: "TIRA",
      bars: 2,
      netPricePerPresentation: 11_658,
      sourcePrice: 11_658,
      effectivePriceSource: "reference",
      priceBasis: "commercial_presentation",
      lineNet: 23_316,
      currency: "CLP",
      priceListId: "lista",
      priceListRevision: "2026-10",
      cuts: [],
    };
    const cost = { schemaVersion: 2, status: "partial", calculatedAt: "2026-10-16T10:00:00.000Z", currency: "CLP", knownNetTotal: 46_632, sourcePautaCapturedAt: null, assumptions: [], missing: [], lines: [line, { ...line, supplierSku: "OTRO-SKU", lineNet: 23_316 }] } as TechnicalCostSnapshot;

    const materials = buildWorkMaterialsDocument({
      summary: summary(snapshot),
      items: [item({ id: "1", code: "V1", line: "Serie 32", glass: "Monolítico", finish: "#111111" })],
      technicalCostSnapshot: cost,
    });

    expect(materials.profiles.every((row) => row.price == null)).toBe(true);
  });

  it("no deduce medidas de ventanas ni barras si faltan snapshots conjuntos", () => {
    const materials = buildWorkMaterialsDocument({
      summary: summary(null),
      items: [item({ id: "1", code: "V1", glass: "Templado 8 mm" })],
    });

    expect(materials.profiles).toEqual([]);
    expect(materials.hasJointCuttingPlan).toBe(false);
    expect(materials.glassOrder[0]).toMatchObject({
      widthMm: null,
      heightMm: null,
      quantity: null,
      totalM2: null,
      measuresPending: true,
    });
  });

  it("consolida superficie repetida y mantiene la trazabilidad de cada componente", () => {
    const paneA = glassSnapshot("paño-identico", "Hoja móvil", 900, 1400, 1);
    const paneB = glassSnapshot("paño-identico", "Hoja móvil", 900, 1400, 1);
    const first = item({ id: "1", code: "V1", glass: "Monolítico 4 mm", snapshot: paneA });
    const second = item({ id: "2", code: "V2", glass: "Monolítico 4 mm", snapshot: paneB });
    const materials = buildWorkMaterialsDocument({ summary: summary(null), items: [first, second] });

    expect(materials.glass).toHaveLength(1);
    expect(materials.glass[0]).toMatchObject({ totalM2: 2.52, itemCodes: ["V1", "V2"] });
    expect(materials.glassOrder).toHaveLength(2);
    expect(materials.glassOrder.map((row) => row.componentCode)).toEqual(["V1", "V2"]);
    expect(materials.glassOrder.map((row) => row.paneReference)).toEqual(["V1 · Paño 1", "V2 · Paño 1"]);
    expect(new Set(materials.glassOrder.map((row) => row.key)).size).toBe(2);
  });

  it("no completa el espesor histórico desde el catálogo editable y conserva equivalencias de acabado", () => {
    const withUnknownFinish = item({
      id: "1", code: "V1", glass: "DVH sin espesor estructurado", finish: "#a8a8a8", glassTemplateId: "22",
      thickness: "", snapshot: glassSnapshot("internal-pane-uuid", "Paño principal", 600, 900, 1),
    });
    const material = buildWorkMaterialsDocument({
      summary: summary(null),
      items: [withUnknownFinish],
      lineTemplates: [{
        id: 22, organizationId: 3, catalogKey: null, nombre: "DVH de prueba", categoria: "vidrio",
        unidadCobro: "m2", material: "Cristal", vidrioPrincipalRecomendado: null, costoBase: 0,
        precioM2Sugerido: 0, minimoCobrable: 0, redondeoPrecio: 0, mermaPct: 0,
        margenObjetivoPct: null, proveedor: null, vigenciaDesde: null, vigenciaHasta: null,
        catalogMetadata: { espesor: "24 mm" }, isActive: true, sortOrder: 1,
        creadoEn: null, actualizadoEn: null, eliminadoEn: null,
      }],
    });

    expect(material.glassOrder[0]).toMatchObject({
      thickness: "Pendiente",
      snapshotThickness: null,
      paneReference: "V1 · Paño 1",
      measuresPending: false,
    });
    expect(material.glassOrder[0]?.thicknessWarning).toBeNull();
    expect(material.profiles).toEqual([]);

    const profileSummary = summary(jobSnapshot());
    profileSummary.trabajoSnapshot!.bars = [
      { ...profileSummary.trabajoSnapshot!.bars[0]!, acabadoKey: "#a8a8a8" },
    ];
    const profile = buildWorkMaterialsDocument({ summary: profileSummary, items: [withUnknownFinish] });
    expect(profile.profiles[0]?.finish).toBe("Aluminio mate");
    expect(profile.profiles[0]?.configuredFinish).toBeNull();
  });

  it("no infiere espesor desde el nombre libre del vidrio", () => {
    const noThickness = item({
      id: "1", code: "V1", glass: "Incoloro monolítico 5mm", thickness: "",
      snapshot: glassSnapshot("internal-uuid", "Paño", 500, 800, 1),
    });
    const materials = buildWorkMaterialsDocument({ summary: summary(null), items: [noThickness] });

    expect(materials.glassOrder[0].thickness).toBe("Pendiente");
  });

  it("usa el espesor técnico congelado del snapshot en materiales y orden de vidrios", () => {
    const frozen = glassSnapshot("glass-4", "Hoja móvil", 600, 900, 1)!;
    frozen.glassSelection = {
      productId: "glass-4",
      displayName: "Vidrio de catálogo",
      technicalSpec: {
        version: 1,
        productId: "glass-4",
        thicknessMm: 6.38,
        category: "laminado",
        manualCutStatus: "pending_validation",
        technicalReviewConfirmed: false,
        sheetWidthMm: null,
        sheetHeightMm: null,
        provenance: "catalog",
        sourceProductId: "glass-4",
        sourceValues: null,
        hasConflict: false,
      },
    };
    const selected = item({
      id: "1", code: "V1", glass: "Vidrio de catálogo", thickness: "4 mm",
      glassTemplateId: "glass-4", snapshot: frozen,
    });
    const materials = buildWorkMaterialsDocument({ summary: summary(null), items: [selected] });

    expect(materials.glass[0]).toMatchObject({ thickness: "6,38 mm", thicknessWarning: expect.stringContaining("contradictorios") });
    expect(materials.glassOrder[0]).toMatchObject({
      thickness: "6,38 mm",
      snapshotThickness: "6,38 mm",
      thicknessWarning: expect.stringContaining("contradictorios"),
    });
  });
});
