import type { WorkMaterialsDocument } from "../fabrication-work-materials.service";
import { createWorkMaterialsPdf } from "../work-materials-pdf-export.service";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

function sampleDocument(): WorkMaterialsDocument {
  const profiles = [
    ["5001", "Riel superior"],
    ["5002", "Riel inferior"],
    ["5003", "Jamba"],
    ["5004", "Cabezal"],
    ["5005", "Zócalo"],
    ["5006", "Pierna"],
    ["5007", "Traslapo"],
  ].map(([code, description]) => ({
    key: code!, code: code!, description: description!, line: "Serie 5000", finish: "Aluminio mate",
    configuredFinish: "Aluminio mate", commercialLengthMm: 6000, bars: 1, itemCodes: ["V1"],
  }));
  return {
    profiles,
    accessories: [
      { key: "acc", code: null, description: "Carros o rodamientos", quantity: 2, unit: "unidad", line: "Serie 5000", finish: "Aluminio mate", configuredFinish: "Aluminio mate", itemCodes: ["V1"] },
    ],
    glass: [
      { key: "glass", code: null, description: "Incoloro monolítico 5mm", thickness: "", finish: "Incoloro", composition: "", line: "Serie 5000", totalM2: 1.4933, itemCodes: ["V1"] },
    ],
    glassOrder: [],
    hasJointCuttingPlan: true,
  };
}

function extractPdfText(pdf: ReturnType<typeof createWorkMaterialsPdf>) {
  const source = Buffer.from(pdf.output("arraybuffer")).toString("latin1");
  return [...source.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)]
    .map((match) => match[1]!.replace(/\\([\\()])/g, "$1"))
    .join(" ");
}

function compactPdfText(value: string) {
  return value.replace(/\s+/g, "");
}

describe("work-materials-pdf-export.service", () => {
  it("genera una lista A4 vectorial, legible y con accesorios incompletos identificados", () => {
    const pdf = createWorkMaterialsPdf(sampleDocument(), {
      companyName: "Vidrios Gonzalez",
      quoteCode: "COT-041026-002",
      workName: "Trabajo de Alejandro Flores",
      issueDate: "4 oct 2026",
    });
    const output = extractPdfText(pdf);

    expect(pdf.getNumberOfPages()).toBe(1);
    expect(output).toContain("Lista de materiales");
    expect(output).toContain("COT-041026-002");
    expect(output).toContain("Por especificar:");
    expect(output).toContain("1,49 m²");
    expect(output).toContain("1 barra");
    expect(output).toContain("6.000 mm");
    for (const code of ["5001", "5002", "5003", "5004", "5005", "5006", "5007"]) {
      expect(output).toContain(code);
    }
    expect(output).not.toContain("Descargar");
    expect(output).not.toContain("Imprimir");
  });

  it("muestra acabado sin definir si el export recibe un color, sin inferir su nombre", () => {
    const document = sampleDocument();
    document.profiles[0]!.configuredFinish = null;
    const output = extractPdfText(createWorkMaterialsPdf(document, {
      companyName: "Empresa",
      quoteCode: "COT-1",
      workName: "Trabajo",
      issueDate: "4 oct 2026",
    }));

    expect(output).toContain("Acabado sin definir");
    expect(output).not.toContain("#a8a8a8");
  });

  it("incluye precio, base, revisión y fecha del snapshot técnico sin recargar el catálogo", () => {
    const document = sampleDocument();
    document.profiles[0]!.price = {
      sku: "QA-ORG3-7401-BLANCO-6000-20261005",
      isWorkshopCode: true,
      sourceLabel: "Precio propio del taller",
      sourceRevision: "taller-v2",
      pricedAt: "2026-10-05T10:01:00.000Z",
      basis: "por barra",
      unitPrice: 60000,
      subtotal: 60000,
      currency: "CLP",
    };
    document.pricing = {
      status: "partial",
      knownNetTotal: 60000,
      currency: "CLP",
      pricedMaterialCount: 1,
      pendingMaterialCount: 13,
      calculatedAt: "2026-10-05T10:01:00.000Z",
    };
    const output = extractPdfText(createWorkMaterialsPdf(document, {
      companyName: "Taller QA",
      quoteCode: "COT-QA-1",
      workName: "Ventana 7400",
      issueDate: "5 oct 2026",
    }));

    expect(compactPdfText(output)).toContain("QA-ORG3-7401-BLANCO-6000-20261005");
    expect(output).toContain("Código del taller");
    expect(output).toContain("por barra");
    expect(output).toContain("taller-v2");
    expect(output).toContain("Precio propio del taller");
    expect(output).toContain("Costo valorizado parcial: $60.000");
    expect(output).toContain("13 pendientes de precio");
  });

  it("mantiene legibles los códigos, el logo oficial y las tablas completas en una paginación compacta", async () => {
    const document = sampleDocument();
    document.accessories = Array.from({ length: 13 }, (_, index) => ({
      key: `acc-${index + 1}`,
      code: index === 0 ? "SA01005" : null,
      description: index === 0 ? "Cepillo / Felpa" : `Por especificar · Accesorio de corredera ${index + 1}`,
      quantity: index + 1,
      unit: "unidad",
      line: "Veratec 7400",
      finish: "Acabado sin definir",
      configuredFinish: null,
      itemCodes: ["V1"],
    }));
    document.pricing = {
      status: "partial",
      knownNetTotal: 236545,
      currency: "CLP",
      pricedMaterialCount: 8,
      pendingMaterialCount: 13,
      calculatedAt: "2026-10-05T10:01:00.000Z",
    };
    const logoSvg = readFileSync(path.join(process.cwd(), "public", "brand", "ventora-logo-boot.svg"), "utf8");
    const logoSizedSvg = logoSvg.replace(/<svg\b([^>]*)>/, (_tag, attributes: string) => {
      const withoutDimensions = attributes.replace(/\swidth="[^"]*"/, "").replace(/\sheight="[^"]*"/, "");
      return `<svg${withoutDimensions} width="1000" height="212">`;
    });
    const logo = await sharp(Buffer.from(logoSizedSvg)).png().toBuffer();
    const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;
    const pdf = createWorkMaterialsPdf(document, {
      companyName: "Vidrios Gonzalez",
      quoteCode: "COT-051026-002",
      workName: "Cotización",
      issueDate: "5 oct 2026",
    }, logoDataUrl);
    const raw = Buffer.from(pdf.output("arraybuffer")).toString("latin1");
    const text = extractPdfText(pdf);

    expect(raw).toContain("/Subtype /Image");
    expect(text).not.toContain("VENTORA");
    expect(pdf.getNumberOfPages()).toBeLessThanOrEqual(2);
    expect(text).toContain("Costo valorizado parcial: $236.545");
    expect(text).toContain("8 insumos con precio");
    expect(text).toContain("13 pendientes de precio");
    expect(compactPdfText(text)).toContain("SA01005");
    expect(text).toContain("Vidrios");
  });
});
