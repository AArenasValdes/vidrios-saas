import type { WorkMaterialsDocument } from "../fabrication-work-materials.service";
import { createWorkMaterialsPdf } from "../work-materials-pdf-export.service";
import { calculateProfileReferenceTotal } from "../work-materials-price-reference.service";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
      { key: "glass", code: null, description: "Incoloro monolítico 5mm", thickness: "5 mm", finish: "Incoloro", composition: "", line: "Serie 5000", totalM2: 1.4933, itemCodes: ["V1"] },
    ],
    glassOrder: [],
    hasJointCuttingPlan: true,
  };
}

async function compactVentoraLogoDataUrl() {
  const logoSvg = readFileSync(path.join(process.cwd(), "public", "brand", "ventora-logo-compact-on-light.svg"), "utf8");
  const logoSizedSvg = logoSvg.replace(/<svg\b([^>]*)>/, (_tag, attributes: string) => {
    const withoutDimensions = attributes.replace(/\swidth="[^"]*"/, "").replace(/\sheight="[^"]*"/, "");
    return `<svg${withoutDimensions} width="1000" height="212">`;
  });
  const logo = await sharp(Buffer.from(logoSizedSvg)).png().toBuffer();
  return `data:image/png;base64,${logo.toString("base64")}`;
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

function pdfExampleDirectory() {
  return process.env.VENTORA_PDF_OUTPUT_DIR || path.join(process.cwd(), "tmp", "pdfs");
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
    expect(output).toContain("1 tira");
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

  it("incluye precio y base sin exponer la revisión interna del snapshot", () => {
    const document = sampleDocument();
    document.profiles[0]!.price = {
      sku: "QA-ORG3-7401-BLANCO-6000-20261005",
      isWorkshopCode: true,
      sourceLabel: "Precio propio del taller",
      sourceRevision: "taller-v2",
      pricedAt: "2026-10-05T10:01:00.000Z",
      basis: "por tira",
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
    expect(output).toContain("por tira");
    expect(output).toContain("Precio propio del taller");
    expect(output).not.toContain("taller-v2");
    expect(output).toContain("Costo valorizado parcial: $60.000");
    expect(output).toContain("13 pendientes de precio");
  });

  it("identifica como Arquetipo la fuente de sus precios referenciales", () => {
    const document = sampleDocument();
    document.profiles[0]!.price = {
      sku: "30895001", providerKey: "arquetipo", isWorkshopCode: false,
      sourceLabel: "Arquetipo", sourceKind: "reference", sourceRevision: "lista-2026",
      pricedAt: "2026-10-15T10:00:00.000Z", basis: "por tira", unitPrice: 13_477,
      subtotal: 13_477, currency: "CLP",
    };
    const output = extractPdfText(createWorkMaterialsPdf(document, {
      companyName: "Taller", quoteCode: "COT-ARQ", workName: "Ventanas", issueDate: "17 oct 2026",
    }));

    expect(output).toContain("Arquetipo");
    expect(output).not.toContain("Precio referencial");
  });

  it("muestra color, proveedor y total referencial calculado desde unitario por tiras", async () => {
    const document = sampleDocument();
    const supplierPrices = [
      ["5001", "30895001", 13_477],
      ["5002", "30895002", 12_230],
      ["5003", "30895003", 14_256],
      ["5004", "30895004", 13_399],
      ["5005", "30895005", 15_970],
      ["5006", "30895006", 14_412],
      ["5007", "30895007", 13_477],
    ] as const;
    document.profiles.forEach((profile) => { profile.familyKey = "universal:aluminio:l5000"; });
    document.profilePriceReferencesStatus = "loaded";
    document.profilePriceReferences = supplierPrices.map(([technicalCode, supplierSku, netPrice]) => ({
      key: `V1:${technicalCode}:arquetipo:p-${technicalCode}`, itemCode: "V1", line: "Serie 5000", lineNames: ["Serie 5000"],
      familyKey: "universal:aluminio:l5000", finish: "Aluminio mate", technicalCode,
      profileName: document.profiles.find((profile) => profile.code === technicalCode)!.description,
      providerKey: "arquetipo", providerLabel: "Arquetipo · junio 2026", presentationId: `p-${technicalCode}`, supplierSku,
      presentationDescription: "Tira 6 m", purchaseUnit: "tira", commercialLengthMm: 6000, netPrice,
      currency: "CLP", priceSource: "reference" as const, status: "priced" as const,
    }));
    const metadata = {
      companyName: "Ejemplo QA", quoteCode: "COT-QA-REFERENCIAS", workName: "Muestra de referencias de compra", issueDate: "Muestra QA",
    };
    const pdf = createWorkMaterialsPdf(document, metadata, await compactVentoraLogoDataUrl());
    const output = extractPdfText(pdf);

    expect(pdf.getNumberOfPages()).toBe(1);
    expect(compactPdfText(output)).toContain("$13.477portira");
    expect(compactPdfText(output)).toContain("$12.230portira");
    expect(compactPdfText(output)).toContain("$14.256portira");
    expect(compactPdfText(output)).toContain("$13.399portira");
    expect(compactPdfText(output)).toContain("$15.970portira");
    expect(compactPdfText(output)).toContain("$14.412portira");
    expect(output).toContain("Color aluminio");
    expect(output).toContain("Proveedor");
    expect(output).toContain("Arquetipo · junio 2026");
    expect(output).toContain("Total referencial");
    expect(output).toContain("$97.221");
    expect(output).toContain("precio unitario y la cantidad de compra de la pauta");
    expect(output).toContain("Cobertura: 7 de 7 perfiles");
    expect(output).not.toContain("$13.477\nestimado");
    if (process.env.VENTORA_PDF_EXAMPLE === "1") {
      const outputPath = path.join(pdfExampleDirectory(), "qa-lista-materiales-referencias.pdf");
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("conserva el proveedor cuando el precio referencial ya viene ligado al perfil", async () => {
    const document = sampleDocument();
    document.profiles[0]!.price = {
      sku: "30895001", providerKey: "arquetipo", isWorkshopCode: false, sourceKind: "reference",
      sourceLabel: "Arquetipo · junio 2026", sourceRevision: "lista-2026-06", pricedAt: null,
      basis: "por tira", unitPrice: 13_477, subtotal: 13_477, currency: "CLP",
    };
    const output = extractPdfText(createWorkMaterialsPdf(document, {
      companyName: "Ejemplo QA", quoteCode: "COT-QA-PROVEEDOR", workName: "Proveedor explícito", issueDate: "Muestra QA",
    }));

    expect(output).toContain("Color aluminio");
    expect(output).toContain("Proveedor");
    expect(output).toContain("Arquetipo · junio 2026");
    expect(output).toContain("$13.477");
    expect(output).toContain("Total referencial");
    expect(output).toContain("Cobertura: 1 de 7 perfiles");
  });

  it("mantiene líneas, colores y totales separados por proveedor, y no aplica precios al vidrio", () => {
    const document = sampleDocument();
    document.profiles = document.profiles.slice(0, 2).map((profile, index) => ({
      ...profile,
      key: `QA-L25-${index + 1}`,
      code: `QA-L25-${index + 1}`,
      description: index === 0 ? "Perfil de prueba 1" : "Perfil de prueba 2",
      familyKey: "universal:aluminio:l25",
      line: "L25",
      finish: "Titanio",
      configuredFinish: "Titanio",
      bars: index === 0 ? 2 : 1,
    }));
    const referenceFor = (profileIndex: number, providerKey: string, providerLabel: string, netPrice: number) => {
      const profile = document.profiles[profileIndex]!;
      return {
        key: `V1:${profile.code}:${providerKey}:presentation-${profileIndex}`,
        itemCode: "V1", line: "L25", lineNames: ["L25"], familyKey: "universal:aluminio:l25",
        finish: "Titanio", technicalCode: profile.code, profileName: profile.description,
        providerKey, providerLabel, presentationId: `presentation-${profileIndex}`, supplierSku: `${providerKey}-${profile.code}`,
        presentationDescription: "Tira 6 m", purchaseUnit: "tira", commercialLengthMm: 6000, netPrice,
        currency: "CLP", priceSource: "reference" as const, status: "priced" as const,
      };
    };
    document.profilePriceReferences = [
      referenceFor(0, "alumco", "Alumco · julio 2026", 20_000),
      referenceFor(1, "arquetipo", "Arquetipo · junio 2026", 30_000),
    ];
    document.profilePriceReferencesStatus = "loaded";
    const output = extractPdfText(createWorkMaterialsPdf(document, {
      companyName: "Ejemplo QA", quoteCode: "COT-QA-MULTIPROVEEDOR", workName: "L25 titanio", issueDate: "Muestra QA",
    }));

    expect(output).toContain("L25");
    expect(output).toContain("Titanio");
    expect(output).toContain("Alumco · julio 2026");
    expect(output).toContain("Arquetipo · junio 2026");
    expect(output).toContain("Total referencial · Alumco · julio 2026 · CLP: $40.000");
    expect(output).toContain("Total referencial · Arquetipo · junio 2026 · CLP: $30.000");
    expect(output).not.toContain("Total referencial · $70.000");
    expect(output).toContain("Incoloro monolítico 5mm");
    expect(output).toContain("Espesor técnico");
  });

  it("calcula el total por metro con el largo comercial de la pauta", () => {
    expect(calculateProfileReferenceTotal(
      { bars: 2, commercialLengthMm: 5800 },
      { unitPrice: 2_200, basis: "por metro" }
    )).toBe(25_520);
  });

  it("no muestra precio si las referencias coinciden con más de una presentación", () => {
    const document = sampleDocument();
    document.profiles[0]!.familyKey = "universal:aluminio:l5000";
    const base = {
      key: "V1:5001:arquetipo:p-5001", itemCode: "V1", line: "Serie 5000", lineNames: ["Serie 5000"],
      familyKey: "universal:aluminio:l5000", finish: "Aluminio mate", technicalCode: "5001", profileName: "Riel superior",
      providerKey: "arquetipo", providerLabel: "Arquetipo", supplierSku: "30895001", presentationDescription: "Tira 6 m",
      purchaseUnit: "tira", commercialLengthMm: 6000, netPrice: 13_477, currency: "CLP", priceSource: "reference" as const, status: "priced" as const,
    };
    document.profilePriceReferences = [
      { ...base, presentationId: "p-5001" },
      { ...base, key: "V1:5001:arquetipo:p-5001-duplicate", presentationId: "p-5001-duplicate", netPrice: 14_000 },
    ];
    document.profilePriceReferencesStatus = "loaded";
    const output = extractPdfText(createWorkMaterialsPdf(document, {
      companyName: "Taller", quoteCode: "COT-ARQ", workName: "Ventanas", issueDate: "17 oct 2026",
    }));

    expect(output).toContain("Sin referencia exacta");
    expect(output).not.toContain("$13.477");
  });

  it("no infiere el espesor técnico desde el nombre comercial", () => {
    const document = sampleDocument();
    document.glass[0]!.thickness = "";
    const output = extractPdfText(createWorkMaterialsPdf(document, {
      companyName: "Ejemplo QA",
      quoteCode: "COT-QA-ESPESOR",
      workName: "Validación de dato técnico",
      issueDate: "Muestra QA",
    }));

    expect(output).toContain("Espesor técnico");
    expect(output).toContain("Sin dato técnico");
    expect(output).toContain("Incoloro monolítico 5mm");
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
    document.accessories[0]!.price = {
      sku: "QA-ACCESORIO-001",
      isWorkshopCode: false,
      sourceLabel: "Precio de ejemplo QA",
      sourceRevision: "fixture-qa",
      pricedAt: "2026-10-05T10:01:00.000Z",
      basis: "por unidad",
      unitPrice: 26_545,
      subtotal: 26_545,
      currency: "CLP",
    };
    document.pricing = {
      status: "partial",
      knownNetTotal: 236545,
      currency: "CLP",
      pricedMaterialCount: 8,
      pendingMaterialCount: 12,
      calculatedAt: "2026-10-05T10:01:00.000Z",
    };
    document.profiles.forEach((profile, index) => {
      profile.price = {
        sku: `QA-PERFIL-${index + 1}`,
        isWorkshopCode: false,
        sourceLabel: "Precio de ejemplo QA",
        sourceRevision: "fixture-qa",
        pricedAt: "2026-10-05T10:01:00.000Z",
        basis: "por tira",
        unitPrice: 30_000,
        subtotal: 30_000,
        currency: "CLP",
      };
    });
    const logoSvg = readFileSync(path.join(process.cwd(), "public", "brand", "ventora-logo-compact-on-light.svg"), "utf8");
    const logoSizedSvg = logoSvg.replace(/<svg\b([^>]*)>/, (_tag, attributes: string) => {
      const withoutDimensions = attributes.replace(/\swidth="[^"]*"/, "").replace(/\sheight="[^"]*"/, "");
      return `<svg${withoutDimensions} width="1000" height="212">`;
    });
    const logo = await sharp(Buffer.from(logoSizedSvg)).png().toBuffer();
    const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;
    const pdf = createWorkMaterialsPdf(document, {
      companyName: "Empresa de prueba",
      quoteCode: "COT-QA-MATERIALES-001",
      workName: "Fixture de paginación y precios",
      issueDate: "Muestra QA",
    }, logoDataUrl);
    const raw = Buffer.from(pdf.output("arraybuffer")).toString("latin1");
    const text = extractPdfText(pdf);

    expect(raw).toContain("/Subtype /Image");
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("Do"))).toBe(true);
    expect(text).toContain("VENTORA · FABRICACIÓN · COT-QA-MATERIALES-001");
    expect(pdf.getNumberOfPages()).toBeLessThanOrEqual(2);
    expect(text).toContain("Costo valorizado parcial: $236.545");
    expect(text).toContain("8 insumos con precio");
    expect(text).toContain("12 pendientes de precio");
    expect(text).toContain("$30.000");
    expect(text).toContain("$26.545");
    expect(compactPdfText(text)).toContain("SA01005");
    expect(text).toContain("Vidrios");
    if (process.env.VENTORA_PDF_EXAMPLE === "1") {
      const output = path.join(pdfExampleDirectory(), "qa-lista-materiales.pdf");
      mkdirSync(path.dirname(output), { recursive: true });
      writeFileSync(output, Buffer.from(pdf.output("arraybuffer")));
    }
  });
});
