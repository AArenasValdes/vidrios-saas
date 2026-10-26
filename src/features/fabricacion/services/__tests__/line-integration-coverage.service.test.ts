import {
  auditImportedCatalog, checkExactPurchase, checkImportedReference, evaluateLineIntegration, summarizeIntegration,
  type IntegrationInput, type PurchaseReference,
} from "../line-integration-coverage.service";

const baseReference: PurchaseReference = {
  technicalCode: "5001", familyKey: "universal:aluminio:l5000", finish: "Aluminio mate",
  presentationId: "ref-5001-6000", providerKey: "arquetipo", supplierSku: "30895001",
  commercialLengthMm: 6000, netPrice: 13477, currency: "CLP", source: "fixture QA Arquetipo (no base remota)",
};
const profile = {
  technicalCode: "5001", familyKey: "universal:aluminio:l5000", finish: "Aluminio mate",
  presentationId: "ref-5001-6000", providerKey: "arquetipo", supplierSku: "30895001", commercialLengthMm: 6000,
};
const fixture: IntegrationInput = {
  catalogKey: "qa:serie-5000", configurationId: "qa:corredera-2h", name: "Fixture sintético",
  catalogSource: "fixture QA", scope: "fixture", commercial: { declared: true, exactPair: true },
  sale: { configured: true, amount: 100000, source: "fixture QA" },
  purchase: { profile, references: [baseReference], source: "fixture QA" },
  recipe: { expectation: "calculable", exactVariant: true, contractPassed: true, evidence: "documented", source: "fixture QA" },
  glass: { coverage: "partial", complete: 1, pending: 1, source: "fixture QA" },
  snapshot: { saved: { b: 2, a: 1 }, reopened: { a: 1, b: 2 }, historicalBefore: { version: 1 }, historicalAfter: { version: 1 }, source: "fixture QA" },
  parity: { checked: true, matching: true, source: "fixture QA" },
};
const byLayer = (input: IntegrationInput, key: string) => evaluateLineIntegration(input).capas.find((v) => v.capa === key)!;

describe("auditoría de integración por capas (datos exclusivamente sintéticos)", () => {
  it("detecta snapshot histórico sin metadatos de familia aunque existe una presentación/precio", () => {
    const actual = checkExactPurchase({ ...profile, familyKey: null }, [baseReference], "fixture histórico QA");
    expect(actual).toMatchObject({ estado: "pendiente", verificacion: "comprobada" });
    expect(actual.causa).toMatch(/snapshot incompleta/i);
    expect(checkExactPurchase(profile, [baseReference], "fixture QA").estado).toBe("aprobado");
  });
  it("no asocia referencia mediante código parecido, proveedor diferente, acabado ni largo distinto", () => {
    expect(checkExactPurchase({ ...profile, commercialLengthMm: 5800 }, [baseReference], "fixture").estado).toBe("pendiente");
    expect(checkExactPurchase({ ...profile, providerKey: "alumco" }, [baseReference], "fixture").estado).toBe("pendiente");
    expect(checkExactPurchase({ ...profile, technicalCode: "5001A" }, [baseReference], "fixture").estado).toBe("pendiente");
    expect(checkExactPurchase({ ...profile, finish: "Blanco" }, [baseReference], "fixture").estado).toBe("pendiente");
  });
  it("marca ambigüedad en vez de escoger la primera referencia", () => {
    expect(checkExactPurchase(profile, [baseReference, { ...baseReference, source: "otro import" }], "fixture").estado).toBe("ambiguo");
  });
  it("detecta códigos y nombres inconsistentes con su fuente importada", () => {
    expect(checkImportedReference({ code: "5001", name: "Riel superior", sourceCode: "5001", sourceName: "Riel superior", source: "fixture/origen.csv" }).estado).toBe("aprobado");
    expect(checkImportedReference({ code: "5001", name: "Riel inferior", sourceCode: "5001", sourceName: "Riel superior", source: "fixture/origen.csv" }).estado).toBe("fallido");
    expect(checkImportedReference({ code: "5002", name: "Riel superior", sourceCode: "5001", sourceName: "Riel superior", source: "fixture/origen.csv" }).estado).toBe("fallido");
  });
  it("distingue sin receta de una receta calculable que falla", () => {
    expect(byLayer({ ...fixture, recipe: { ...fixture.recipe, expectation: "commercial_only", exactVariant: false, contractPassed: null } }, "receta").estado).toBe("aprobado");
    expect(byLayer({ ...fixture, recipe: { ...fixture.recipe, expectation: "pending", exactVariant: false } }, "receta").estado).toBe("pendiente");
    expect(byLayer({ ...fixture, recipe: { ...fixture.recipe, contractPassed: false } }, "receta").estado).toBe("fallido");
    expect(byLayer({ ...fixture, recipe: { ...fixture.recipe, exactVariant: false } }, "receta").verificacion).toBe("no_comprobada");
    expect(byLayer({ ...fixture, recipe: { ...fixture.recipe, expectation: "validated", evidence: "documented" } }, "receta").estado).toBe("fallido");
  });
  it("mantiene referencias de vidrio pendientes aunque otra esté completa", () => {
    expect(byLayer(fixture, "vidrios")).toMatchObject({ estado: "pendiente", causa: expect.stringContaining("1 pendientes") });
    expect(byLayer({ ...fixture, glass: { ...fixture.glass!, coverage: "complete", pending: 0 } }, "vidrios").estado).toBe("aprobado");
  });
  it("rechaza recálculo histórico silencioso y diferencias de paridad", () => {
    expect(byLayer({ ...fixture, snapshot: { ...fixture.snapshot!, historicalAfter: { version: 2 } } }, "snapshot").estado).toBe("fallido");
    expect(byLayer({ ...fixture, parity: { checked: true, matching: false, source: "fixture" } }, "paridad_documentos").estado).toBe("fallido");
  });
  it("registra denominadores por capa, fuentes y verificaciones no comprobadas", () => {
    const emptyExternal = evaluateLineIntegration({ ...fixture, purchase: undefined, snapshot: undefined, glass: undefined, parity: undefined });
    const totals = summarizeIntegration([evaluateLineIntegration(fixture), emptyExternal]);
    expect(totals.configuraciones).toBe(2);
    expect(totals.porCapa.compra).toMatchObject({ total: 2, aprobado: 1, noComprobada: 1 });
    expect(emptyExternal.capas.every((c) => c.fuente.trim().length > 0)).toBe(true);
  });
});

// Compara una misma fuente inmutable con los EXPORTADORES REALES. No renderiza una UI de navegador.
// La validación de la pantalla y del PDF cliente permanece pendiente de smoke E2E.
import * as XLSX from "xlsx";
import { createWorkMaterialsPdf } from "../work-materials-pdf-export.service";
import { buildWorkMaterialsWorkbook } from "../work-materials-excel-export.service";
import { calculateProfileReferenceTotal, resolveProfileSupplierPrice } from "../work-materials-price-reference.service";
import type { WorkMaterialsDocument } from "../fabrication-work-materials.service";

it("compara identidad, barras y subtotal de materiales entre modelo compartido, PDF y Excel", () => {
  const document: WorkMaterialsDocument = {
    profiles: [{
      key: "p-5001", code: "5001", familyKey: "universal:aluminio:l5000",
      supplierPresentationId: "ref-5001-6000", supplierProviderKey: "arquetipo", supplierSku: "30895001",
      description: "Riel superior", line: "Serie 5000", finish: "Aluminio mate", configuredFinish: "Aluminio mate",
      commercialLengthMm: 6000, bars: 1, itemCodes: ["V1"], price: null,
    }],
    accessories: [], glass: [], glassOrder: [], hasJointCuttingPlan: true,
    profilePriceReferencesStatus: "loaded",
    profilePriceReferences: [{
      key: "V1:5001:arquetipo:ref-5001-6000", itemCode: "V1", line: "Serie 5000", lineNames: ["Serie 5000"],
      familyKey: "universal:aluminio:l5000", finish: "Aluminio mate", technicalCode: "5001", profileName: "Riel superior",
      providerKey: "arquetipo", providerLabel: "Arquetipo", presentationId: "ref-5001-6000", supplierSku: "30895001",
      presentationDescription: "Tira 6 m", purchaseUnit: "tira", commercialLengthMm: 6000,
      netPrice: 13477, currency: "CLP", priceSource: "reference", status: "priced",
    }],
  };
  const price = resolveProfileSupplierPrice(document.profiles[0]!, document.profilePriceReferences);
  expect(price?.unitPrice).toBe(13477);
  const total = calculateProfileReferenceTotal(document.profiles[0]!, { unitPrice: price!.unitPrice, basis: price!.basis });
  expect(total).toBe(13477);
  const metadata = { companyName: "Taller QA", quoteCode: "QA-5000", work: "Trabajo QA", issueDate: "26-10-2026" };
  const workbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "materials", document });
  expect(workbook.Sheets.Perfiles.A8.v).toBe(document.profiles[0]!.code);
  expect(workbook.Sheets.Perfiles.G8.v).toBe(document.profiles[0]!.commercialLengthMm);
  expect(workbook.Sheets.Perfiles.H8.v).toBe(document.profiles[0]!.bars);
  expect(workbook.Sheets.Perfiles.K8.v).toBe(total);
  const pdf = createWorkMaterialsPdf(document, { companyName: metadata.companyName, quoteCode: metadata.quoteCode, workName: metadata.work, issueDate: metadata.issueDate });
  const text = Buffer.from(pdf.output("arraybuffer")).toString("latin1");
  expect(text).toContain("5001");
  expect(text).toContain("30895001");
  expect(text).toContain("13.477");
  expect(text).toContain("Arquetipo");
});

it("audita importaciones sin completar discrepancias documentadas ni asignar precios ausentes", () => {
  const audit = auditImportedCatalog({
    source: "fixture importado QA", technicalInputs: [{ technicalKey: "k1", sourceCode: "5001", name: "Riel superior" }],
    presentations: [
      { technicalKey: "k1", sku: "sku-1", description: "Riel superior", netPrice: 100 },
      { technicalKey: "k1", sku: "sku-2", description: "Riel auxiliar", netPrice: 110,
        associationEvidence: { sourceReference: "documento", confidence: "medium", note: "descripciones distintas" } },
      { technicalKey: "k1", sku: "sku-3", description: "Riel superior", netPrice: null },
      { technicalKey: "missing", sku: "sku-4", description: "Riel superior", netPrice: 100 },
    ],
  });
  expect(audit.conteos).toEqual({ aprobado: 1, pendiente: 1, ambiguo: 1, fallido: 1 });
  expect(audit.totalPresentaciones).toBe(4);
  expect(audit.rows.find((r) => r.sku === "sku-2")?.estado).toBe("ambiguo");
    const documentedLabelDifference = auditImportedCatalog({
      source: "fixture importado QA",
      technicalInputs: [{ technicalKey: "k2", sourceCode: "2509", name: "Jamba cerrada" }],
      presentations: [{
        technicalKey: "k2", sku: "sku-2509", description: "Jamba", netPrice: 100,
        associationEvidence: {
          sourceReference: "proveedor:cotizacion:pag-2", page: 2, confidence: "high",
          note: "Asociación explícita por código 2509; la cotización abrevia el nombre.",
        },
      }],
    });
    expect(documentedLabelDifference.conteos).toMatchObject({ ambiguo: 1, fallido: 0 });
    expect(documentedLabelDifference.rows[0]?.causa).toContain("discrepancia documentada");
});
