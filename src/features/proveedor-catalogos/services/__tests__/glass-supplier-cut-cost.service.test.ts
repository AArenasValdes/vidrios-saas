import { resolveGlassSupplierCutCost, type GlassSupplierCutPresentation } from "../glass-supplier-cut-cost.service";
import type { FabricacionVidrioResultado } from "@/features/fabricacion/types/fabricacion-domain";
import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";

function makePresentation(
  overrides: Partial<GlassSupplierCutPresentation> = {}
): GlassSupplierCutPresentation {
  return {
    presentationId: "glass-pres-1",
    providerKey: "vidrieriacentral",
    organizationId: 99,
    glassProductId: "glass-mono-5mm",
    category: "monolitico",
    thicknessMm: 5,
    glassDescription: "Incoloro monolítico 5mm",
    purchaseMode: "supplier_cut",
    purchaseUnit: "M2",
    netPricePerM2: 14000,
    minBillableM2PerPane: null,
    currency: "CLP",
    priceReferenceStatus: "within_stated_validity",
    validFrom: "2026-01-01",
    validUntil: "2026-12-31",
    origin: "supplier",
    ...overrides,
  };
}

const sampleSpec: GlassTechnicalSpec = {
  version: 1,
  productId: "glass-mono-5mm",
  thicknessMm: 5,
  category: "monolitico",
  manualCutStatus: "confirmed",
  technicalReviewConfirmed: true,
  sheetWidthMm: null,
  sheetHeightMm: null,
  purchaseMode: "supplier_cut",
  provenance: "catalog",
  sourceProductId: "glass-mono-5mm",
  sourceValues: null,
  hasConflict: false,
};

describe("resolveGlassSupplierCutCost", () => {
  it("calcula vidrio supplier_cut usando únicamente los paños físicos del despiece y escala con cantidad > 1", () => {
    // 2 hojas por ventana: 580 x 1430 mm -> 0.8294 m2/paño; 2 paños = 1.6588 m2
    const oneUnitPanes: FabricacionVidrioResultado[] = [
      {
        vidrioId: "v1",
        nombre: "Vidrio principal",
        anchoMm: 580,
        altoMm: 1430,
        cantidadPiezas: 2,
        totalM2: 1.6588,
        trazabilidad: [],
      },
    ];

    const single = resolveGlassSupplierCutCost({
      panes: oneUnitPanes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ netPricePerM2: 10000 })],
      asOfDate: "2026-11-21",
    });

    expect(single.status).toBe("priced");
    if (single.status !== "priced") throw new Error("expected priced");
    // Exact physical pane m2 (1.6588 m2), NOT exterior window area (1.2 x 1.5 = 1.8 m2)
    expect(single.totalRawM2).toBe(1.6588);
    expect(single.totalBillableM2).toBe(1.6588);
    expect(single.totalNetCost).toBe(16588);

    // Qty 2 commercial units -> 4 physical panes (3.3176 m2)
    const twoUnits = resolveGlassSupplierCutCost({
      panes: [{ ...oneUnitPanes[0]!, cantidadPiezas: 4, totalM2: 3.3176 }],
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ netPricePerM2: 10000 })],
      asOfDate: "2026-11-21",
    });

    expect(twoUnits.status).toBe("priced");
    if (twoUnits.status !== "priced") throw new Error("expected priced");
    expect(twoUnits.totalNetCost).toBe(33176);
  });

  it("aplica mínimo cobrable por paño únicamente cuando está documentado en la presentación", () => {
    // 500 x 600 mm = 0.30 m2/paño; con mínimo documentado 0.50 m2/paño -> cobra 0.50 x 2 = 1.00 m2
    const smallPanes: FabricacionVidrioResultado[] = [
      {
        vidrioId: "v1",
        nombre: "Vidrio chico",
        anchoMm: 500,
        altoMm: 600,
        cantidadPiezas: 2,
        totalM2: 0.6,
        trazabilidad: [],
      },
    ];

    const withMinimum = resolveGlassSupplierCutCost({
      panes: smallPanes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ netPricePerM2: 12000, minBillableM2PerPane: 0.5 })],
      asOfDate: "2026-11-21",
    });

    expect(withMinimum.status).toBe("priced");
    if (withMinimum.status !== "priced") throw new Error("expected priced");
    expect(withMinimum.totalRawM2).toBe(0.6);
    expect(withMinimum.totalBillableM2).toBe(1);
    expect(withMinimum.totalNetCost).toBe(12000);
    expect(withMinimum.panes[0]?.minApplied).toBe(true);
  });

  it("rechaza vigencia expirada, referencias históricas, organizaciones distintas y ambigüedad", () => {
    const panes: FabricacionVidrioResultado[] = [
      {
        vidrioId: "v1",
        nombre: "Vidrio principal",
        anchoMm: 800,
        altoMm: 1000,
        cantidadPiezas: 2,
        totalM2: 1.6,
        trazabilidad: [],
      },
    ];

    const expired = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ validUntil: "2026-10-31" })],
      asOfDate: "2026-11-21",
    });
    expect(expired.status).toBe("incompatible");

    const historical = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ priceReferenceStatus: "historical_reference" })],
      asOfDate: "2026-11-21",
    });
    expect(historical.status).toBe("incompatible");

    const wrongOrg = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ organizationId: 100 })],
      asOfDate: "2026-11-21",
    });
    expect(wrongOrg.status).toBe("missing");

    const ambiguous = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [
        makePresentation({ presentationId: "g1" }),
        makePresentation({ presentationId: "g2", providerKey: "otro-vidriero" }),
      ],
      asOfDate: "2026-11-21",
    });
    expect(ambiguous.status).toBe("ambiguous");

    // Presentación privada de una organización NUNCA aplica si falta organizationId del llamador
    const missingCallerOrg = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: null,
      presentations: [makePresentation({ organizationId: 99 })],
      asOfDate: "2026-11-21",
    });
    expect(missingCallerOrg.status).toBe("missing");

    // Vigencia con timestamp ISO el mismo día (2026-11-21T00:00:00Z vs 2026-11-21) sí es válida
    const sameDayValidFrom = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ validFrom: "2026-11-21T00:00:00Z", netPricePerM2: 10000 })],
      asOfDate: "2026-11-21",
    });
    expect(sameDayValidFrom.status).toBe("priced");

    // Vigencia futura (not_yet_valid o validFrom > asOfDate), modo full_sheet o categoría pendiente se rechazan
    const futureValidFrom = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ validFrom: "2026-12-01" })],
      asOfDate: "2026-11-21",
    });
    expect(futureValidFrom.status).toBe("incompatible");

    const fullSheetRejected = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [
        {
          ...makePresentation(),
          purchaseMode: "full_sheet" as unknown as "supplier_cut",
        },
      ],
      asOfDate: "2026-11-21",
    });
    expect(fullSheetRejected.status).toBe("missing");

    // 1. Con productId explícito, NO admite presentación sin glassProductId (aunque coincidan categoría y espesor)
    const missingProductIdOnPresentation = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ glassProductId: null })],
      asOfDate: "2026-11-21",
    });
    expect(missingProductIdOnPresentation.status).toBe("missing");

    // 2. historical_reference con origin: "workshop" sin reconfirmación explícita NO habilita priced
    const unconfirmedWorkshopHistorical = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [
        makePresentation({
          origin: "workshop",
          priceReferenceStatus: "historical_reference",
        }),
      ],
      asOfDate: "2026-11-21",
    });
    expect(unconfirmedWorkshopHistorical.status).toBe("incompatible");

    const confirmedWorkshopHistorical = resolveGlassSupplierCutCost({
      panes,
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [
        makePresentation({
          origin: "workshop",
          priceReferenceStatus: "historical_reference",
          workshopPriceConfirmed: true,
          netPricePerM2: 10000,
        }),
      ],
      asOfDate: "2026-11-21",
    });
    expect(confirmedWorkshopHistorical.status).toBe("priced");

    // 3. La suma de lineNet por paño siempre coincide exactamente con totalNetCost tras redondeo
    const multiPaneRounding = resolveGlassSupplierCutCost({
      panes: [
        {
          vidrioId: "p1",
          nombre: "Paño 1",
          anchoMm: 600,
          altoMm: 554,
          cantidadPiezas: 1,
          totalM2: 0.3324,
          trazabilidad: [],
        },
        {
          vidrioId: "p2",
          nombre: "Paño 2",
          anchoMm: 600,
          altoMm: 554,
          cantidadPiezas: 1,
          totalM2: 0.3324,
          trazabilidad: [],
        },
      ],
      glassDescription: "Incoloro monolítico 5mm",
      glassTechnicalSpec: sampleSpec,
      organizationId: 99,
      presentations: [makePresentation({ netPricePerM2: 1000 })],
      asOfDate: "2026-11-21",
    });
    expect(multiPaneRounding.status).toBe("priced");
    if (multiPaneRounding.status !== "priced") throw new Error("expected priced");
    const sumPaneNet = multiPaneRounding.panes.reduce((sum, pane) => sum + pane.lineNet, 0);
    expect(sumPaneNet).toBe(664);
    expect(multiPaneRounding.totalNetCost).toBe(sumPaneNet);
  });
});
