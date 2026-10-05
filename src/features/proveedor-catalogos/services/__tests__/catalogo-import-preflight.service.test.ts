import { classifyImportRow, hasSkuInDifferentTechnicalRevision } from "../catalogo-import-preflight.service";

describe("preflight de importación de proveedor", () => {
  it("distingue INSERT, EXISTENTE y CONFLICTO sin sobrescribir una revisión", () => {
    const row = { proveedor_key: "xelena", revision: "2026-06", moneda: "CLP", precio_neto: 10940 };
    expect(classifyImportRow("lista", "2026-06", null, row)).toMatchObject({ action: "INSERT" });
    expect(classifyImportRow("lista", "2026-06", { ...row, id: "local" }, row)).toMatchObject({ action: "EXISTENTE" });
    expect(classifyImportRow("lista", "2026-06", { ...row, precio_neto: 11000 }, row)).toMatchObject({ action: "CONFLICTO", fields: ["precio_neto"] });
  });

  it("compara evidencia por contenido, sin depender del orden de claves", () => {
    const expected = { evidencia: { sourceReference: "pendon", page: 1 } };
    expect(classifyImportRow("presentacion", "sku", { evidencia: { page: 1, sourceReference: "pendon" } }, expected).action).toBe("EXISTENTE");
  });

  it("impide duplicar una presentación bajo otra revisión técnica", () => {
    const existing = [{ sku_proveedor: "67401VER000", fuente_tecnica_id: "source-old" }];
    expect(hasSkuInDifferentTechnicalRevision({ sku: "67401VER000", sourceId: "source-new", existing })).toBe(true);
    expect(hasSkuInDifferentTechnicalRevision({ sku: "67401VER000", sourceId: "source-old", existing })).toBe(false);
    expect(hasSkuInDifferentTechnicalRevision({ sku: "66307VER000", sourceId: "source-new", existing })).toBe(false);
  });
});
