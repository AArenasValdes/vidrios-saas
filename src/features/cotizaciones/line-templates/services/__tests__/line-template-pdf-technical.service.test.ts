import {
  buildTechnicalLineNombre,
  extractTechnicalCatalogFromPages,
  inferTechnicalCategoria,
  isProfileCodeForLine,
  parseTechnicalLineIndexEntry,
  profilePrefixForLine,
  shouldPreferTechnicalPdfImport,
} from "../line-template-pdf-technical.service";
import { buildTechnicalLineTemplateImportPreview } from "../line-template-technical-import.service";
import type { PdfPageTextBundle } from "../line-template-pdf-text.service";

function arquetipoIndexTexts(): string[] {
  return [
    "Línea 15 - ventana corredera",
    "Línea 20 - ventana corredera",
    "Línea 25 - ventana corredera",
    "Línea 4000 - ventana corredera",
    "Línea 5000 - ventana corredera",
    "Línea 35 - puerta abatir y vaivén",
    "Línea 12 - shower door",
  ];
}

function arquetipoLine15Page(): PdfPageTextBundle {
  return {
    pageNumber: 6,
    texts: ["1501", "RIEL SUPERIOR", "1504", "CABEZAL", "Línea 15", "VENTANA CORREDERA"],
    items: [
      { text: "1501", x: 10, y: 100, width: 20 },
      { text: "RIEL SUPERIOR", x: 60, y: 100, width: 80 },
      { text: "1504", x: 10, y: 80, width: 20 },
      { text: "CABEZAL", x: 60, y: 80, width: 60 },
      { text: "Línea 15", x: 10, y: 40, width: 50 },
      { text: "VENTANA CORREDERA", x: 80, y: 40, width: 120 },
    ],
  };
}

describe("line-template-pdf-technical.service", () => {
  it("debe parsear entradas del indice de lineas", () => {
    const parsed = parseTechnicalLineIndexEntry("Línea 25 - ventana corredera");
    expect(parsed?.lineCode).toBe("25");
    expect(parsed?.nombre).toBe("Linea 25 - Ventana corredera");
    expect(parsed?.categoria).toBe("aluminio");
  });

  it("debe asociar prefijos de perfiles por linea", () => {
    expect(profilePrefixForLine("15")).toBe("15");
    expect(profilePrefixForLine("4000")).toBe("400");
    expect(isProfileCodeForLine("1501", "15")).toBe(true);
    expect(isProfileCodeForLine("4001", "4000")).toBe(true);
    expect(isProfileCodeForLine("2501", "15")).toBe(false);
  });

  it("debe inferir categoria shower", () => {
    expect(inferTechnicalCategoria("shower door")).toBe("shower");
  });

  it("debe extraer lineas y perfiles desde paginas tipo Arquetipo", () => {
    const pages: PdfPageTextBundle[] = [
      {
        pageNumber: 2,
        texts: arquetipoIndexTexts(),
        items: arquetipoIndexTexts().map((text, index) => ({
          text,
          x: 10,
          y: 200 - index * 10,
          width: 120,
        })),
      },
      arquetipoLine15Page(),
    ];

    const result = extractTechnicalCatalogFromPages(pages, { pageCount: 32 });
    const line15 = result.lines.find((line) => line.lineCode === "15");

    expect(result.templateId).toBe("generic_technical");
    expect(result.lines.length).toBeGreaterThanOrEqual(7);
    expect(line15?.profiles.some((profile) => profile.code === "1501")).toBe(true);
    expect(line15?.profiles.some((profile) => profile.label.includes("RIEL"))).toBe(true);
  });

  it("debe preferir modo tecnico cuando hay lineas pero no precios", () => {
    expect(
      shouldPreferTechnicalPdfImport({
        technicalLineCount: 8,
        priceRowCount: 0,
      })
    ).toBe(true);
    expect(
      shouldPreferTechnicalPdfImport({
        technicalLineCount: 1,
        priceRowCount: 20,
      })
    ).toBe(false);
  });

  it("debe construir preview tecnico sin exigir precio", () => {
    const preview = buildTechnicalLineTemplateImportPreview({
      lines: [
        {
          lineCode: "15",
          nombre: buildTechnicalLineNombre("15", "Ventana corredera"),
          descripcion: "Ventana corredera",
          tipoComponente: "Ventana corredera",
          categoria: "aluminio",
          profiles: [{ code: "1501", label: "RIEL SUPERIOR" }],
          pageNumbers: [6],
          vidrioResumen: null,
          anchoMarco: "70 mm",
        },
      ],
      existingTemplates: [],
      manufacturer: "Arquetipo",
      templateId: "arquetipo_aluminio",
      sourceFileName: "catalogo.pdf",
    });

    expect(preview[0]?.status).toBe("technical");
    expect(preview[0]?.payload?.precioM2Sugerido).toBe(0);
    expect(preview[0]?.payload?.catalogMetadata.needsCommercialPrice).toBe(true);
    expect(preview[0]?.payload?.catalogMetadata.technicalProfileCount).toBe(1);
  });
});
