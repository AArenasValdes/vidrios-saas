import * as XLSX from "xlsx";

import type { WorkMaterialsDocument } from "../fabrication-work-materials.service";
import type { FabricationWorkOrder } from "../fabrication-work-order.service";
import { buildWorkMaterialsWorkbook } from "../work-materials-excel-export.service";

const document: WorkMaterialsDocument = {
  profiles: [{
    key: "profile-1",
    code: "5001",
    description: "Riel superior",
    line: "Serie 5000",
    finish: "Aluminio mate",
    commercialLengthMm: 6000,
    bars: 1,
    itemCodes: ["V1", "V2"],
    price: {
      providerKey: "arquetipo",
      sku: "30895001", isWorkshopCode: false, sourceLabel: "Arquetipo", sourceKind: "reference",
      sourceRevision: "lista-actual", pricedAt: "2026-10-15T10:00:00.000Z", basis: "por tira",
      unitPrice: 13_477, subtotal: 13_477, currency: "CLP",
    },
  }],
  accessories: [{
    key: "accessory-1",
    code: null,
    description: "Carros o rodamientos",
    quantity: 4,
    unit: "unidad",
    line: "Serie 5000",
    finish: "Aluminio mate",
    itemCodes: ["V1", "V2"],
    price: {
      providerKey: "arquetipo",
      sku: "ACC-4", isWorkshopCode: false, sourceLabel: "Arquetipo", sourceKind: "reference",
      sourceRevision: "lista-actual", pricedAt: "2026-10-15T10:00:00.000Z", basis: "por unidad",
      unitPrice: 1_250, subtotal: 5_000, currency: "CLP",
    },
  }],
  glass: [{
    key: "glass-1",
    code: null,
    description: "Incoloro monolítico 5mm",
    thickness: "5 mm",
    finish: "Incoloro",
    composition: "Monolítico",
    line: "Serie 5000",
    totalM2: 1.4933,
    itemCodes: ["V1", "V2"],
  }],
  glassOrder: [{
    key: "pane-1",
    groupKey: "glass-1",
    groupLabel: "Incoloro monolítico 5mm",
    code: null,
    componentCode: "V1",
    componentName: "Ventana corredera",
    paneReference: "V1 · Paño 1",
    description: "Incoloro monolítico 5mm",
    thickness: "5 mm",
    finish: "Incoloro",
    composition: "Monolítico",
    widthMm: 611,
    heightMm: 1222,
    quantity: 2,
    areaEachM2: 0.7466,
    totalM2: 1.4933,
    measuresPending: false,
  }],
  hasJointCuttingPlan: true,
};

const metadata = {
  document,
  companyName: "Vidrios González",
  quoteCode: "COT-041026-002",
  work: "Trabajo de prueba",
  issueDate: "04-10-2026",
};

describe("buildWorkMaterialsWorkbook", () => {
  it("separa la lista de materiales en hojas claras y conserva barras conjuntas", () => {
    const workbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "materials" });

    expect(workbook.SheetNames).toEqual(["Perfiles", "Accesorios", "Vidrios"]);
    const profiles = workbook.Sheets.Perfiles;
    expect(profiles.A1.v).toBe("VENTORA · Perfiles totales");
    expect(profiles.E8.v).toBe("Aluminio mate");
    expect(profiles.F8.v).toBe("Arquetipo");
    expect(profiles.H8.v).toBe(1);
    expect(profiles.I8.v).toBe("V1, V2");
    expect(profiles.J8.v).toBe(13_477);
    expect(profiles.K8.v).toBe(13_477);
    expect(profiles.L8.v).toBe("Total referencial");
    expect(profiles["!autofilter"]?.ref).toBe("A7:L8");
    expect(profiles["!cols"]?.[4]?.wch).toBe(22);
    expect(workbook.Props?.Subject).toBe("Cotización COT-041026-002");

    const exported = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const reopened = XLSX.read(exported, { type: "buffer" });
    expect(reopened.Sheets.Perfiles["!autofilter"]?.ref).toBe("A7:L8");
    expect(reopened.Sheets.Perfiles["!merges"]).toHaveLength(3);
    expect(reopened.Sheets.Perfiles.H8.v).toBe(1);
    expect(reopened.Sheets.Perfiles.J8.v).toBe(13_477);
    expect(reopened.Sheets.Accesorios.H8.v).toBe(1_250);
    expect(reopened.Sheets.Accesorios.I8.v).toBe(5_000);
  });

  it("exporta referencias enlazadas al perfil y a sus cantidades de pauta", () => {
    const withReferences: WorkMaterialsDocument = {
      ...document,
      profilePriceReferences: [{
        key: "V1:5001:arquetipo:p-5001", itemCode: "V1", line: "Serie 5000", finish: "Aluminio mate",
        technicalCode: "5001", profileName: "Riel superior", providerKey: "arquetipo", providerLabel: "Arquetipo",
        presentationId: "p-5001", supplierSku: "30895001", presentationDescription: "Tira 6 m",
        purchaseUnit: "tira", commercialLengthMm: 6000, netPrice: 13_477, currency: "CLP",
        priceSource: "reference", status: "priced",
      }],
      profilePriceReferencesCheckedAt: "2026-10-17T10:00:00.000Z",
    };
    const workbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, document: withReferences, kind: "materials" });
    const sheet = workbook.Sheets["Precios perfiles"];

    expect(workbook.SheetNames).toContain("Precios perfiles");
    expect(sheet.A8.v).toBe("V1, V2");
    expect(sheet.C8.v).toBe("5001");
    expect(sheet.F8.v).toBe("Arquetipo");
    expect(sheet.G8.v).toBe("30895001");
    expect(sheet.H8.v).toBe("por tira");
    expect(sheet.J8.v).toBe(1);
    expect(sheet.K8.v).toBe(13_477);
    expect(sheet.L8.v).toBe(13_477);
    expect(sheet.M8.v).toBe("Disponible · asociado a pauta");
    expect(sheet.A9).toBeUndefined();
    expect(sheet.L8.v).not.toBe(13_477 * 2);
  });

  it("enlaza una línea y color distintos por identidad exacta, sin cruzar otra familia", () => {
    const profile = {
      ...document.profiles[0]!, key: "QA-L25-01", code: "QA-L25-01", description: "Perfil de prueba QA",
      familyKey: "universal:aluminio:l25", line: "L25", finish: "Titanio", configuredFinish: "Titanio",
      bars: 2, itemCodes: ["V1", "V2"], price: null,
    };
    const makeReference = (itemCode: string, familyKey: string, providerKey: string, providerLabel: string, supplierSku: string, netPrice: number) => ({
      key: `${itemCode}:${providerKey}:${supplierSku}`, itemCode, line: "L25", lineNames: ["L25"], familyKey,
      finish: "Titanio", technicalCode: profile.code, profileName: profile.description,
      providerKey, providerLabel, presentationId: "alumco-presentation", supplierSku,
      presentationDescription: "Tira 6 m", purchaseUnit: "tira", commercialLengthMm: 6000, netPrice,
      currency: "CLP", priceSource: "reference" as const, status: "priced" as const,
    });
    const withReferences: WorkMaterialsDocument = {
      ...document,
      profiles: [profile],
      profilePriceReferencesStatus: "loaded",
      profilePriceReferences: [
        makeReference("V1", "universal:aluminio:l25", "alumco", "Alumco · QA", "QA-L25-SKU", 20_000),
        makeReference("V2", "universal:aluminio:l25", "alumco", "Alumco · QA", "QA-L25-SKU", 20_000),
        makeReference("V1", "universal:aluminio:l5000", "arquetipo", "Arquetipo · QA", "WRONG-FAMILY", 99_999),
      ],
    };
    const workbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, document: withReferences, kind: "materials" });

    expect(workbook.Sheets.Perfiles.E8.v).toBe("Titanio");
    expect(workbook.Sheets.Perfiles.F8.v).toBe("Alumco · QA");
    expect(workbook.Sheets.Perfiles.J8.v).toBe(20_000);
    expect(workbook.Sheets.Perfiles.K8.v).toBe(40_000);
    expect(workbook.Sheets["Precios perfiles"].G8.v).toBe("QA-L25-SKU");
    expect(workbook.Sheets["Precios perfiles"].L8.v).toBe(40_000);
    expect(workbook.Sheets["Precios perfiles"].F8.v).toBe("Alumco · QA");
    expect(workbook.Sheets.Vidrios.D8.v).toBe("5 mm");
    expect(workbook.Sheets.Perfiles.K8.v).not.toBe(99_999);
  });

  it("exporta orden de vidrios con medidas y cantidad trazables", () => {
    const workbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "glass-order" });
    const sheet = workbook.Sheets["Orden de vidrios"];

    expect(workbook.SheetNames).toEqual(["Orden de vidrios"]);
    expect(sheet.B8.v).toBe("V1 · Paño 1 · Ventana corredera");
    expect(sheet.D8.v).toBe("5 mm");
    expect(sheet.F8.v).toBe(611);
    expect(sheet.G8.v).toBe(1222);
    expect(sheet.H8.v).toBe(2);
    expect(sheet.I8.z).toContain("m²");
    expect(sheet.A2.v).toContain("Referencias de paños para revisión");
    expect(sheet.A10.v).toContain("no confirman dimensiones finales ni cobertura operativa");
  });

  it("exporta cortes agrupados desde la pauta guardada, sin mezclar materiales ni precios alternativos", () => {
    const workOrder = {
      cutGroups: [{
        key: "bar-1", technicalCode: "5001", profileName: "Riel superior", finish: "Aluminio mate",
        line: "Serie 5000", supplierLabel: "Arquetipo", supplierSku: "30895001",
        barIndex: 1, commercialLengthMm: 6000, usedMm: 2609, theoreticalRemnantMm: 3391,
        trimMm: 0, kerfMm: 0,
        cuts: [{ itemCode: "V1", component: "Ventana", functionName: "Riel superior", quantity: 2, lengthMm: 1000 }],
      }],
    } as FabricationWorkOrder;
    const workbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "profile-cuts", workOrder });
    const sheet = workbook.Sheets["Cortes perfiles"];

    expect(workbook.SheetNames).toEqual(["Cortes perfiles"]);
    expect(sheet.A8.v).toBe("5001");
    expect(sheet.C8.v).toBe("Serie 5000");
    expect(sheet.D8.v).toBe("Aluminio mate");
    expect(sheet.E8.v).toBe("Arquetipo");
    expect(sheet.F8.v).toBe("30895001");
    expect(sheet.H8.v).toBe("V1");
    expect(sheet.J8.v).toBe("Riel superior");
    expect(sheet.K8.v).toBe(2);
    expect(sheet.L8.v).toBe(1000);
    expect(sheet.M8.v).toBe(3391);

    const materialWorkbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "materials", includeSupplierPriceReferences: false });
    expect(materialWorkbook.SheetNames).toEqual(["Perfiles", "Accesorios", "Vidrios"]);
  });

  it("exporta geometría preliminar en una hoja separada y con advertencia de no fabricación", () => {
    const workOrder = {
      cutGroups: [],
      preliminaryCutGroups: [{
        key: "preliminary-3201", technicalCode: "3201", profileName: "Marco Serie 32",
        barIndex: null, commercialLengthMm: null, usedMm: null, theoreticalRemnantMm: null,
        trimMm: null, kerfMm: null,
        cuts: [{ itemCode: "L32-1", component: "Proyectante", functionName: "Marco", quantity: 2, lengthMm: 1200 }],
      }],
    } as FabricationWorkOrder;
    const workbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "profile-cuts", workOrder });
    const operational = workbook.Sheets["Cortes perfiles"];
    const preliminary = workbook.Sheets["Despiece preliminar"];

    expect(workbook.SheetNames).toEqual(["Cortes perfiles", "Despiece preliminar"]);
    expect(operational.A8.v).toBe("Sin datos registrados");
    expect(JSON.stringify(operational)).not.toContain("3201");
    expect(preliminary.A1.v).toContain("Despiece estructural preliminar");
    expect(preliminary.A2.v).toContain("DOCUMENTO PARCIAL · NO APTO PARA FABRICACIÓN");
    expect(preliminary.A8.v).toBe("3201");
    expect(preliminary.G8.v).toBe(1200);
    expect(preliminary.A10.v).toContain("No representa cantidades de compra");
  });
});
