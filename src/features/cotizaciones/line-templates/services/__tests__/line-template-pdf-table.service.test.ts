import {
  detectTableMatrixFromTextItems,
  groupPdfTextItemsIntoRows,
  matrixToSpreadsheetRows,
  splitRowIntoCells,
  type PdfTextItem,
} from "../line-template-pdf-table.service";
import {
  extractSpreadsheetHeaders,
  suggestLineTemplateColumnMapping,
} from "../line-template-import.service";
import {
  mergeSelectedPdfPageRows,
  resolveDefaultPdfPageSelection,
  type PdfCatalogPageExtraction,
} from "../line-template-pdf-import.service";

function item(text: string, x: number, y: number, width = 40): PdfTextItem {
  return { text, x, y, width };
}

describe("line-template-pdf-table.service", () => {
  it("debe agrupar texto PDF en filas y columnas", () => {
    const items: PdfTextItem[] = [
      item("Nombre", 10, 100),
      item("Precio venta", 120, 100),
      item("Serie 25", 10, 80),
      item("150000", 120, 80),
      item("Serie 30", 10, 60),
      item("180000", 120, 60),
    ];

    const rows = groupPdfTextItemsIntoRows(items);
    expect(rows).toHaveLength(3);
    expect(splitRowIntoCells(rows[0] ?? [])).toEqual(["Nombre", "Precio venta"]);
    expect(splitRowIntoCells(rows[1] ?? [])).toEqual(["Serie 25", "150000"]);
  });

  it("debe detectar encabezados y filas de precio con confianza media o alta", () => {
    const items: PdfTextItem[] = [
      item("Nombre", 10, 120),
      item("Precio venta", 130, 120),
      item("Material", 250, 120),
      item("Linea A", 10, 100),
      item("120000", 130, 100),
      item("Aluminio", 250, 100),
      item("Linea B", 10, 80),
      item("99000", 130, 80),
      item("PVC", 250, 80),
      item("Linea C", 10, 60),
      item("110000", 130, 60),
      item("Aluminio", 250, 60),
    ];

    const { matrix, headerRowIndex, confidence } = detectTableMatrixFromTextItems(items);
    const spreadsheetRows = matrixToSpreadsheetRows(matrix, headerRowIndex);

    expect(confidence).not.toBe("low");
    expect(spreadsheetRows.length).toBeGreaterThanOrEqual(3);
    expect(spreadsheetRows[0]?.nombre).toBe("Linea A");
    expect(spreadsheetRows[0]?.["precio venta"]).toBe("120000");

    const mapping = suggestLineTemplateColumnMapping(extractSpreadsheetHeaders(spreadsheetRows));
    expect(mapping.nombre).toBe("nombre");
    expect(mapping.precioVenta).toBe("precio venta");
  });

  it("debe ignorar filas vacias o que repiten encabezado", () => {
    const matrix = [
      ["Nombre", "Precio venta"],
      ["Nombre", "Precio venta"],
      ["", ""],
      ["Solo nombre", ""],
      ["Linea valida", "100000"],
    ];

    const rows = matrixToSpreadsheetRows(matrix, 0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.nombre).toBe("Linea valida");
  });
});

describe("line-template-pdf-import helpers", () => {
  it("debe seleccionar por defecto paginas con filas detectadas", () => {
    const pages: PdfCatalogPageExtraction[] = [
      {
        pageNumber: 1,
        rows: [],
        confidence: "low",
        textItemCount: 4,
        warnings: [],
      },
      {
        pageNumber: 2,
        rows: [{ nombre: "Linea 1", "precio venta": "1000" }],
        confidence: "medium",
        textItemCount: 20,
        warnings: [],
      },
    ];

    expect(resolveDefaultPdfPageSelection(pages)).toEqual([2]);
    expect(
      mergeSelectedPdfPageRows(pages, [2]).map((row) => row.nombre)
    ).toEqual(["Linea 1"]);
  });
});
