import {
  buildLineTemplateImportPreview,
  countImportPreviewSummary,
  extractSpreadsheetHeaders,
  LINE_TEMPLATE_IMPORT_FIELDS,
  listXlsxSheetNames,
  parseLineTemplateSpreadsheetUpload,
  suggestLineTemplateColumnMapping,
  type LineTemplateColumnMapping,
  type LineTemplateSpreadsheetRow,
} from "../line-template-import.service";
import * as XLSX from "xlsx";

describe("line-template-import.service", () => {
  it("debe parsear CSV con encabezados en espanol", () => {
    const rows = parseLineTemplateSpreadsheetUpload({
      fileName: "catalogo.csv",
      text: "nombre;precio venta;material\nSerie 25;150000;Aluminio\n",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].nombre).toBe("Serie 25");
    expect(rows[0]["precio venta"]).toBe("150000");
  });

  it("debe sugerir mapeo de columnas y marcar filas listas", () => {
    const rows: LineTemplateSpreadsheetRow[] = [
      {
        nombre: "Linea A",
        "precio venta": "120000",
        categoria: "vidrio",
        material: "Aluminio",
      },
    ];

    const headers = extractSpreadsheetHeaders(rows);
    const mapping = suggestLineTemplateColumnMapping(headers);
    const preview = buildLineTemplateImportPreview({
      rows,
      mapping,
      existingTemplates: [],
    });

    expect(mapping.nombre).toBe("nombre");
    expect(mapping.precioVenta).toBe("precio venta");
    expect(preview[0]?.status).toBe("ready");
    expect(preview[0]?.payload?.categoria).toBe("vidrio");
    expect(preview[0]?.payload?.material).toBe("Cristal");
    expect(preview[0]?.payload?.precioM2Sugerido).toBe(120000);
  });

  it("debe importar cristales con espesor y terminacion", () => {
    const rows = parseLineTemplateSpreadsheetUpload({
      fileName: "cristales.csv",
      text:
        "cristal;categoria;precio m2;minimo;redondeo;espesor;terminacion\n" +
        "Cristal templado 10 mm;cristal;85000;50000;1000;10 mm;Templado\n",
    });

    const mapping = suggestLineTemplateColumnMapping(extractSpreadsheetHeaders(rows));
    const preview = buildLineTemplateImportPreview({
      rows,
      mapping,
      existingTemplates: [],
    });

    expect(preview[0]?.status).toBe("ready");
    expect(preview[0]?.payload).toEqual(
      expect.objectContaining({
        nombre: "Cristal templado 10 mm",
        categoria: "vidrio",
        material: "Cristal",
        unidadCobro: "m2",
        precioM2Sugerido: 85000,
        minimoCobrable: 50000,
        redondeoPrecio: 1000,
        catalogMetadata: {
          espesor: "10 mm",
          terminacion: "Templado",
        },
      })
    );
  });

  it("debe detectar cruce de precio con linea tecnica existente", () => {
    const rows: LineTemplateSpreadsheetRow[] = [
      { nombre: "15", "precio venta": "145000", material: "Aluminio" },
    ];

    const mapping: LineTemplateColumnMapping = {
      nombre: "nombre",
      precioVenta: "precio venta",
      material: "material",
    };

    const preview = buildLineTemplateImportPreview({
      rows,
      mapping,
      existingTemplates: [
        {
          id: 7,
          organizationId: 1,
          nombre: "Linea 15 - Ventana corredera",
          categoria: "aluminio",
          unidadCobro: "m2",
          material: "Aluminio",
          vidrioPrincipalRecomendado: null,
          costoBase: 0,
          precioM2Sugerido: 0,
          minimoCobrable: 0,
          redondeoPrecio: 1000,
          mermaPct: 0,
          margenObjetivoPct: null,
          proveedor: "Arquetipo",
          vigenciaDesde: null,
          vigenciaHasta: null,
          catalogMetadata: {
            catalogSource: "pdf_technical",
            technicalLineCode: "15",
            needsCommercialPrice: true,
            technicalProfileCodes: "1501:RIEL",
          },
          isActive: true,
          sortOrder: 0,
          creadoEn: null,
          actualizadoEn: null,
          eliminadoEn: null,
        },
      ],
    });

    const summary = countImportPreviewSummary(preview);
    expect(preview[0]?.status).toBe("price_match");
    expect(preview[0]?.payload?.nombre).toBe("Linea 15 - Ventana corredera");
    expect(preview[0]?.payload?.precioM2Sugerido).toBe(145000);
    expect(preview[0]?.payload?.catalogMetadata.technicalLineCode).toBe("15");
    expect(preview[0]?.payload?.catalogMetadata.needsCommercialPrice).toBeUndefined();
    expect(summary.priceMatch).toBe(1);
  });

  it("debe detectar duplicados e invalidos en el preview", () => {
    const rows: LineTemplateSpreadsheetRow[] = [
      { nombre: "Existente", "precio venta": "100000" },
      { nombre: "", "precio venta": "0" },
    ];

    const mapping: LineTemplateColumnMapping = {
      nombre: "nombre",
      precioVenta: "precio venta",
    };

    const preview = buildLineTemplateImportPreview({
      rows,
      mapping,
      existingTemplates: [
        {
          id: 1,
          organizationId: 1,
          nombre: "Existente",
          categoria: "aluminio",
          unidadCobro: "m2",
          material: "Aluminio",
          vidrioPrincipalRecomendado: null,
          costoBase: 0,
          precioM2Sugerido: 100000,
          minimoCobrable: 0,
          redondeoPrecio: 1000,
          mermaPct: 0,
          margenObjetivoPct: null,
          proveedor: null,
          vigenciaDesde: null,
          vigenciaHasta: null,
          catalogMetadata: {},
          isActive: true,
          sortOrder: 0,
          creadoEn: null,
          actualizadoEn: null,
          eliminadoEn: null,
        },
      ],
    });

    const summary = countImportPreviewSummary(preview);
    expect(preview[0]?.status).toBe("duplicate");
    expect(preview[1]?.status).toBe("invalid");
    expect(summary.duplicate).toBe(1);
    expect(summary.invalid).toBe(1);
  });

  it("debe listar hojas de un workbook xlsx", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["nombre", "precio venta"],
      ["Linea X", "99000"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Catalogo");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    expect(listXlsxSheetNames(buffer)).toEqual(["Catalogo"]);
  });

  it("debe exponer campos importables documentados", () => {
    expect(LINE_TEMPLATE_IMPORT_FIELDS.some((field) => field.key === "nombre" && field.required)).toBe(
      true
    );
    expect(LINE_TEMPLATE_IMPORT_FIELDS.length).toBeGreaterThanOrEqual(10);
  });
});
