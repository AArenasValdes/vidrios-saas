import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import {
  buildConsolidatedGlassSheetOptimizations,
  buildVidrioDespieceForQuoteItem,
  calculateGlassSheetOptimization,
  consolidateVidrioDespiecePiezas,
  formatBillableSheetFraction,
  resolveGlassLineTemplateById,
  resolveGlassLineTemplateForQuoteItem,
} from "@/features/fabricacion/services/vidrio-plancha-optimizacion.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";

function glassTemplate(overrides: Partial<CotizacionLineTemplate> = {}): CotizacionLineTemplate {
  return {
    id: 501,
    organizationId: 1,
    catalogKey: null,
    nombre: "Monolítico incoloro 4 mm",
    categoria: "vidrio",
    unidadCobro: "m2",
    material: "Cristal",
    vidrioPrincipalRecomendado: null,
    costoBase: 85000,
    precioM2Sugerido: 120000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 10,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {
      espesor: "4 mm",
      terminacion: "incoloro",
      planchaAnchoMm: 3210,
      planchaAltoMm: 2250,
    },
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
    ...overrides,
  };
}

function snapshotWithGlass(
  vidrios: FabricacionCotizacionSnapshot["vidrios"]
): FabricacionCotizacionSnapshot {
  return {
    schemaVersion: 1,
    tipo: "fabricacion_receta_snapshot",
    recipeId: "recipe-1",
    recipeDefinitionId: "def-1",
    recipeVersion: 1,
    recipeStatus: "validated",
    recipeScope: "organization",
    lineTemplateId: 135,
    recipeIdentity: {
      recetaId: "def-1",
      codigo: "L5000",
      nombre: "L5000",
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      herraje: null,
      variante: "estandar",
    },
    input: {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
      variante: "estandar",
    },
    selectedVariant: "estandar",
    result: {
      engineVersion: 1,
      recetaId: "def-1",
      recetaVersion: 1,
      estadoReceta: "validada",
      entradaNormalizada: null,
      perfiles: [],
      vidrios,
      accesorios: [],
      advertencias: [],
      totalLinealMm: 0,
      totalVidrioM2: vidrios.reduce((sum, row) => sum + row.totalM2, 0),
      calculable: true,
    },
    pauta: [],
    vidrios,
    advertencias: [],
    calculatedAt: "2026-09-19T00:00:00.000Z",
  };
}

function windowItemWithGlassMeta(
  overrides: Partial<CotizacionWorkflowItem> = {}
): CotizacionWorkflowItem {
  return {
    id: "item-1",
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "L5000",
    vidrio: "Monolítico incoloro 4 mm",
    nombre: "Ventana corredera",
    descripcion: "",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 100000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      vidrioLineTemplateId: "501",
    }),
    fabricacionSnapshot: snapshotWithGlass([
      {
        vidrioId: "g1",
        nombre: "Vidrio hoja",
        anchoMm: 930,
        altoMm: 1370,
        cantidadPiezas: 2,
        totalM2: 2.5482,
        trazabilidad: [],
      },
    ]),
    ...overrides,
  };
}

describe("vidrio-plancha-optimizacion.service", () => {
  it("resuelve la línea de catálogo de vidrio por ID", () => {
    const resolved = resolveGlassLineTemplateById("501", [glassTemplate()]);
    expect(resolved?.id).toBe(501);
  });

  it("en ventanas no infiere catálogo cristal solo por nombre coincidente", () => {
    const item = windowItemWithGlassMeta({
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#a8a8a8",
        material: "Aluminio",
      }),
    });

    expect(resolveGlassLineTemplateForQuoteItem(item, [glassTemplate()])).toBeNull();
  });

  it("en ventanas usa vidrioLineTemplateId persistido", () => {
    const item = windowItemWithGlassMeta();
    expect(resolveGlassLineTemplateForQuoteItem(item, [])).toBeNull();
    expect(resolveGlassLineTemplateForQuoteItem(item, [glassTemplate()])?.id).toBe(501);
  });

  it("consolida piezas iguales antes de calcular plancha", () => {
    const rows = consolidateVidrioDespiecePiezas([
      {
        vidrioLabel: "4 mm",
        codigo: "V1",
        pieces: [{ widthMm: 930, heightMm: 1370, quantity: 2, totalM2: 2.5482 }],
      },
      {
        vidrioLabel: "4 mm",
        codigo: "V2",
        pieces: [{ widthMm: 930, heightMm: 1370, quantity: 2, totalM2: 2.5482 }],
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.quantity).toBe(4);
    expect(rows[0]?.pieceCodes).toEqual(["V1", "V2"]);
  });

  it("calcula fracción comercial cobrable por superficie", () => {
    const optimization = calculateGlassSheetOptimization({
      vidrioLabel: "Monolítico incoloro 4 mm",
      entries: [
        {
          codigo: "V1",
          pieces: [{ widthMm: 930, heightMm: 1370, quantity: 2, totalM2: 2.5482 }],
        },
      ],
      glassLineTemplate: glassTemplate(),
    });

    expect(optimization).not.toBeNull();
    expect(optimization?.requiredM2).toBeCloseTo(2.5482, 4);
    expect(optimization?.requiredWithMermaM2).toBeCloseTo(2.803, 3);
    expect(optimization?.billableFractionLabel).toMatch(/plancha/);
    expect(optimization?.estimatedSheetCost).toBeGreaterThan(0);
  });

  it("usa vidrioLineTemplateId en ventanas para estimación de plancha", () => {
    const result = buildVidrioDespieceForQuoteItem({
      item: windowItemWithGlassMeta(),
      lineTemplates: [glassTemplate()],
    });

    expect(result?.pieces).toHaveLength(1);
    expect(result?.optimization?.glassLineTemplateId).toBe("501");
  });

  it("consolida el mismo vidrio entre varias piezas de la cotización", () => {
    const template = glassTemplate();
    const formal = snapshotWithGlass([
      {
        vidrioId: "g1",
        nombre: "Vidrio hoja",
        anchoMm: 930,
        altoMm: 1370,
        cantidadPiezas: 2,
        totalM2: 2.5482,
        trazabilidad: [],
      },
    ]);

    const makeItem = (id: string, codigo: string): CotizacionWorkflowItem =>
      windowItemWithGlassMeta({
        id,
        codigo,
        fabricacionSnapshot: formal,
      });

    const items = [makeItem("i1", "V1"), makeItem("i2", "V2")];
    const resolutions = new Map(
      items.map((item) => [
        item.id,
        {
          estado: "calculado" as const,
          formal,
          cubication: null,
          recipe: null,
          barsAvailable: false,
          preliminary: false,
          message: null,
        },
      ])
    );

    const consolidated = buildConsolidatedGlassSheetOptimizations({
      items,
      resolutions,
      lineTemplates: [template],
    });

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0]?.requiredM2).toBeCloseTo(5.0964, 3);
    expect(consolidated[0]?.pieces[0]?.quantity).toBe(4);
  });

  it("formatea fracciones comerciales de plancha", () => {
    expect(formatBillableSheetFraction(0.25)).toBe("¼ plancha");
    expect(formatBillableSheetFraction(0.5)).toBe("½ plancha");
    expect(formatBillableSheetFraction(1)).toBe("1 plancha");
    expect(formatBillableSheetFraction(1.75)).toBe("1 ¾ plancha");
  });
});
