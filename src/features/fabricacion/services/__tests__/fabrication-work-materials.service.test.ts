import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
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
      colorHex: input.finish ?? "#ffffff",
      material: "PVC",
      catalogEspesor: input.thickness ?? "4 mm",
      catalogTerminacion: "Incoloro",
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

  it("resuelve el espesor desde metadatos estructurados y el acabado desde equivalencias configuradas", () => {
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
      thickness: "24 mm",
      paneReference: "V1 · Paño 1",
      measuresPending: false,
    });
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

    expect(materials.glassOrder[0].thickness).toBe("");
  });
});
