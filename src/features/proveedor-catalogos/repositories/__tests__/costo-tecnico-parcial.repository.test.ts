/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { persistTechnicalCostSnapshot, readQuoteForTechnicalCost, readSupplierPresentationPrices, readWorkshopPresentationPrices } from "../costo-tecnico-parcial.repository";
import type { TechnicalCostSnapshot } from "../../services/costo-tecnico-parcial.service";

describe("persistTechnicalCostSnapshot", () => {
  it("reemplaza un costo solo por cotización y organización al actualizar precios", async () => {
    const snapshot: TechnicalCostSnapshot = {
      schemaVersion: 2,
      status: "complete",
      priceOrigin: "reference",
      calculatedAt: "2026-10-12T12:00:00.000Z",
      currency: "CLP",
      knownNetTotal: 12345,
      lines: [],
      missing: [],
      assumptions: [],
      sourcePautaCapturedAt: "2026-10-12T11:00:00.000Z",
    };
    const row = { snapshot, estado: "completo", calculado_en: snapshot.calculatedAt };
    const filters: Array<[string, unknown]> = [];
    const query = {} as Record<string, jest.Mock>;
    query.update = jest.fn(() => query);
    query.insert = jest.fn(() => query);
    query.eq = jest.fn((column: string, value: unknown) => { filters.push([column, value]); return query; });
    query.select = jest.fn(() => query);
    query.maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    query.single = jest.fn().mockResolvedValue({ data: row, error: null });
    const from = jest.fn(() => query);
    (createAdminClient as jest.Mock).mockReturnValue({ from });

    const result = await persistTechnicalCostSnapshot({
      quoteId: 1091,
      organizationId: 3,
      snapshot,
      refreshExisting: true,
    });

    expect(from).toHaveBeenCalledWith("cotizacion_costos_tecnicos");
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      estado: "completo",
      snapshot,
      calculado_en: snapshot.calculatedAt,
    }));
    expect(filters).toEqual(expect.arrayContaining([
      ["cotizacion_id", 1091],
      ["organization_id", 3],
    ]));
    expect(query.insert).not.toHaveBeenCalled();
    expect(result).toMatchObject({ snapshot, status: "complete" });
  });
});

describe("readQuoteForTechnicalCost", () => {
  it("recupera la cantidad comercial persistida del ítem junto con su snapshot", async () => {
    const selects: Array<{ table: string; columns: string }> = [];
    const rows = {
      cotizaciones: { id: 1170, organization_id: 12, numero: "COT-1170", creado_en: "2026-10-27T12:00:00Z", fabricacion_trabajo_snapshot: null },
      cotizacion_items: [{
        id: 801,
        codigo: "V1",
        nombre: "Ventana corredera 2H",
        descripcion: "2 paños monolíticos",
        vidrio: "Float 5 mm",
        observaciones: "",
        cantidad: 3,
        fabricacion_snapshot: { recipeStatus: "validated" },
        manual_glass_measurements: null,
      }],
    };
    const from = jest.fn((table: keyof typeof rows) => {
      const query = {
        select: jest.fn((columns: string) => { selects.push({ table, columns }); return query; }),
        eq: jest.fn(() => query),
        is: jest.fn(() => query),
        maybeSingle: jest.fn().mockResolvedValue({ data: rows[table], error: null }),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: rows[table], error: null }).then(resolve, reject),
      };
      return query;
    });
    (createAdminClient as jest.Mock).mockReturnValue({ from });

    const quote = await readQuoteForTechnicalCost({ quoteId: 1170, organizationId: 12 });

    expect(selects.find(({ table }) => table === "cotizacion_items")?.columns).toContain("cantidad");
    expect(quote?.items[0]).toMatchObject({ id: "801", quantity: 3, fabricacionSnapshot: rows.cotizacion_items[0].fabricacion_snapshot });
  });
});

describe("readSupplierPresentationPrices", () => {
  it.each([true, false])("conserva precios y familias con lectura acotada=%s sin releer familias", async (scoped) => {
    const familyKey = "universal:aluminio:l5000";
    const filters: Array<{ table: string; column: string; values: unknown[] }> = [];
    const rowsByTable: Record<string, unknown[]> = {
      catalogo_listas_precios: [{
        id: "list-alumco-2026",
        proveedor_key: "alumco",
        revision: "2026",
        publicado_en: "2026-06-01",
        vigente_desde: "2026-06-01",
        vigente_hasta: null,
        creado_en: "2026-06-01T00:00:00.000Z",
        moneda: "CLP",
        base_precio: "presentacion_comercial",
      }],
      catalogo_insumo_familias: [{ insumo_tecnico_id: "input-5001", family_key: familyKey }],
      catalogo_presentaciones_proveedor: [{
        id: "presentation-5001",
        proveedor_key: "alumco",
        sku_proveedor: "TI5001A",
        descripcion: "Marco · Titanio",
        modo_acabado: "especifico",
        acabado_codigo: "TI",
        acabado_nombre: "Titanio",
        unidad_compra: "TR",
        largo_comercial_mm: 6000,
        insumo_tecnico_id: "input-5001",
      }],
      catalogo_precios_presentacion: [{
        lista_precio_id: "list-alumco-2026",
        presentacion_id: "presentation-5001",
        precio_neto: 12345,
        moneda: "CLP",
      }],
      catalogo_insumos_tecnicos: [{
        id: "input-5001",
        codigo_fuente: "5001",
        nombre: "Marco",
        evidencia: {},
      }],
    };
    const from = jest.fn((table: string) => {
      const query = {
        select: jest.fn(() => query),
        eq: jest.fn(() => query),
        in: jest.fn((column: string, values: unknown[]) => {
          filters.push({ table, column, values });
          return query;
        }),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: rowsByTable[table] ?? [], error: null }).then(resolve, reject),
      };
      return query;
    });
    (createAdminClient as jest.Mock).mockReturnValue({ from });

    const prices = await readSupplierPresentationPrices(scoped ? { familyKeys: [familyKey] } : {});

    expect(prices).toEqual([expect.objectContaining({
      providerKey: "alumco",
      technicalCode: "5001",
      familyKeys: [familyKey],
      netPrice: 12345,
      commercialLengthMm: 6000,
    })]);
    expect(from.mock.calls.filter(([table]) => table === "catalogo_insumo_familias")).toHaveLength(1);
    expect(filters).toEqual(expect.arrayContaining([
      { table: "catalogo_precios_presentacion", column: "presentacion_id", values: ["presentation-5001"] },
    ]));
    if (scoped) {
      expect(filters).toEqual(expect.arrayContaining([
        { table: "catalogo_insumo_familias", column: "family_key", values: [familyKey] },
        { table: "catalogo_presentaciones_proveedor", column: "insumo_tecnico_id", values: ["input-5001"] },
      ]));
    }
  });

  it("conserva accesorios L25 en unidad UN/M/TUBO sin largo comercial ni recipeAccessoryNames cuando tienen código técnico o recipeComponentCodes", async () => {
    const familyKey = "universal:aluminio:l25";
    const rowsByTable: Record<string, unknown[]> = {
      catalogo_listas_precios: [{
        id: "list-arq-2026",
        proveedor_key: "arquetipo",
        revision: "2026-10",
        publicado_en: "2026-10-01",
        vigente_desde: "2026-10-01",
        vigente_hasta: null,
        creado_en: "2026-10-01T00:00:00.000Z",
        moneda: "CLP",
        base_precio: "presentacion_comercial",
      }],
      catalogo_insumo_familias: [{ insumo_tecnico_id: "input-guia-l25", family_key: familyKey }],
      catalogo_presentaciones_proveedor: [{
        id: "pres-guia-l25",
        proveedor_key: "arquetipo",
        sku_proveedor: "ARQ-GUIA-L25",
        descripcion: "Guía L25 inferior",
        modo_acabado: "independiente",
        acabado_codigo: null,
        acabado_nombre: null,
        unidad_compra: "UN",
        largo_comercial_mm: null,
        insumo_tecnico_id: "input-guia-l25",
      }],
      catalogo_precios_presentacion: [{
        lista_precio_id: "list-arq-2026",
        presentacion_id: "pres-guia-l25",
        precio_neto: 850,
        moneda: "CLP",
      }],
      catalogo_insumos_tecnicos: [{
        id: "input-guia-l25",
        codigo_fuente: "GUIA-L25-PROV",
        nombre: "Guía L25",
        evidencia: { recipeComponentCodes: ["GUIA-L25"] },
      }],
    };
    const from = jest.fn((table: string) => {
      const query = {
        select: jest.fn(() => query),
        eq: jest.fn(() => query),
        in: jest.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: rowsByTable[table] ?? [], error: null }).then(resolve, reject),
      };
      return query;
    });
    (createAdminClient as jest.Mock).mockReturnValue({ from });

    const prices = await readSupplierPresentationPrices({ familyKeys: [familyKey] });

    expect(prices).toEqual([
      expect.objectContaining({
        presentationId: "pres-guia-l25",
        technicalCode: "GUIA-L25-PROV",
        recipeComponentCodes: ["GUIA-L25"],
        purchaseUnit: "UN",
        commercialLengthMm: null,
        netPrice: 850,
      }),
    ]);
  });
});

describe("readWorkshopPresentationPrices", () => {
  it("conserva el nombre opcional declarado por el taller en la lectura de costos propios", async () => {
    const query = {} as Record<string, jest.Mock>;
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.is = jest.fn(() => query);
    query.order = jest.fn().mockResolvedValue({
      data: [{
        id: "own-5001", organization_id: 3, family_key: "universal:aluminio:l5000", configuration_key: null,
        codigo_tecnico: "5001", codigo_receta: null, nombre_perfil: "Riel superior", sku_taller: "TALLER-5001",
        descripcion: "Perfil 5001 · Aluminio Mate", modo_acabado: "especifico", acabado_nombre: "Aluminio Mate",
        unidad_compra: "UN", largo_comercial_mm: 6000, precio_neto: 15000, moneda: "CLP", proveedor_nombre: "Sodal",
        preferida: false, revision: 1, priceListId: "taller:3", priceListRevision: "taller-v1",
      }],
      error: null,
    });
    (createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => query) });

    const prices = await readWorkshopPresentationPrices(3);

    expect(query.eq).toHaveBeenCalledWith("organization_id", 3);
    expect(prices[0]).toMatchObject({
      technicalCode: "5001",
      providerKey: "taller:3",
      origin: "workshop",
      workshopSupplierName: "Sodal",
      purchaseUnit: "UN",
      commercialLengthMm: 6000,
      netPrice: 15000,
    });
  });
});
