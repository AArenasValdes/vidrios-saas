import * as XLSX from "xlsx";

import type { WorkMaterialsDocument } from "../fabrication-work-materials.service";
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
    expect(profiles.F8.v).toBe(1);
    expect(profiles.G8.v).toBe("V1, V2");
    expect(profiles["!autofilter"]?.ref).toBe("A7:G8");
    expect(profiles["!cols"]?.[4]?.wch).toBe(20);
    expect(workbook.Props?.Subject).toBe("Cotización COT-041026-002");

    const exported = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const reopened = XLSX.read(exported, { type: "buffer" });
    expect(reopened.Sheets.Perfiles["!autofilter"]?.ref).toBe("A7:G8");
    expect(reopened.Sheets.Perfiles["!merges"]).toHaveLength(3);
    expect(reopened.Sheets.Perfiles.F8.v).toBe(1);
  });

  it("exporta orden de vidrios con medidas y cantidad trazables", () => {
    const workbook = buildWorkMaterialsWorkbook(XLSX, { ...metadata, kind: "glass-order" });
    const sheet = workbook.Sheets["Orden de vidrios"];

    expect(workbook.SheetNames).toEqual(["Orden de vidrios"]);
    expect(sheet.B8.v).toBe("V1 · Paño 1 · Ventana corredera");
    expect(sheet.E8.v).toBe(611);
    expect(sheet.F8.v).toBe(1222);
    expect(sheet.G8.v).toBe(2);
    expect(sheet.H8.z).toContain("m²");
  });
});
