import * as XLSX from "xlsx";

import {
  mapSpreadsheetRowsToProspects,
  parseCsvTextToRows,
  parseSpreadsheetUpload,
  parseXlsxBufferToRows,
} from "@/features/growth/services/growth-import-spreadsheet.service";

describe("growth-import-spreadsheet.service", () => {
  it("parsea CSV con encabezados conocidos", () => {
    const rows = parseCsvTextToRows(
      "Empresa,Contacto,WhatsApp,Origen\nVidrios Norte,Juan,+56912345678,Instagram"
    );

    expect(rows).toHaveLength(1);
    const prospects = mapSpreadsheetRowsToProspects(rows);
    expect(prospects[0]?.empresa).toBe("Vidrios Norte");
    expect(prospects[0]?.origen).toBe("Instagram");
  });

  it("parsea XLSX con la primera hoja", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Empresa", "Contacto", "WhatsApp", "Origen"],
      ["Alumglass", "Ana", "+56987654321", "WhatsApp"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Prospectos");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const rows = parseXlsxBufferToRows(buffer);
    expect(rows).toHaveLength(1);

    const prospects = mapSpreadsheetRowsToProspects(rows);
    expect(prospects[0]?.empresa).toBe("Alumglass");
    expect(prospects[0]?.nombre).toBe("Ana");
    expect(prospects[0]?.origen).toBe("WhatsApp");
  });

  it("enruta por extensión en parseSpreadsheetUpload", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Empresa", "Contacto"],
      ["TermoHome", "Luis"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Hoja1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const rows = parseSpreadsheetUpload({
      fileName: "prospectos.xlsx",
      buffer,
    });

    expect(rows).toHaveLength(1);
    expect(mapSpreadsheetRowsToProspects(rows)[0]?.empresa).toBe("TermoHome");
  });
});
