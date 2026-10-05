import { NextResponse } from "next/server";

/** Solo fixture visual local. No consulta ni escribe datos de Supabase. */
export async function GET() {
  if (process.env.VENTORA_LOCAL_PRICE_PREVIEW !== "true") {
    return NextResponse.json({ error: "No disponible." }, { status: 404 });
  }
  const values = [
    ["67401VER000", "Marco corredera 2 hojas", 1, null, 5800, 31476],
    ["69014STL001", "Refuerzo marco corredera", 2, null, 5800, 29270],
    ["69069STL000", "Refuerzo hoja corredera grande", 2, null, 5800, 28352],
    ["67414VER000", "Hoja corredera grande Sliding", 2, null, 5800, 78066],
    ["67418VER000", "Traslapo corredera grande", 1, null, 5800, 12601],
    ["66306VER000", "Junquillo vidrio 4 mm", 2, null, 5800, 15164],
    ["61016VER001", "Riel Sliding", 1, null, 5800, 10940],
    ["61012VER000", "Tope Corredera", 0, 2, null, 2152],
  ] as const;
  const lines = values.map(([sku, technicalName, bars, quantity, commercialLengthMm, lineNet]) => ({
    technicalCode: sku,
    technicalName,
    supplierSku: sku,
    finishCode: "000",
    finishName: sku === "61016VER001" ? "Sin acabado específico" : "Blanco",
    purchaseUnit: quantity ? "PCS" : "M",
    commercialLengthMm,
    bars,
    quantity,
    lineNet,
    currency: "CLP",
    effectivePriceSource: "reference",
  }));
  const missing = [
    "Incoloro monolítico 4 mm", "Cremona Corredera E7.5 800mm", "Anti-falsa maniobra",
    "Burlete Traslapo Sliding74", "Calzo de 5mm para taqueado", "Cerradero Corrediza",
    "Goma Tope Corredera", "Kit T3 ACCES 68-77 L.100x8", "Manilla tirador placa",
    "Rueda simple 12/21 50 KG", "Cepillo / Felpa", "Sell Acrílico x 330 grs",
    "Tornillo fijación refuerzo",
  ].map((description) => ({ technicalCode: null, description, reason: "Pendiente" }));
  return NextResponse.json({
    enabled: true,
    canCalculate: false,
    canConfigure: true,
    snapshot: {
      schemaVersion: 2,
      status: "partial",
      priceOrigin: "reference",
      calculatedAt: "2026-10-02T12:00:00.000Z",
      currency: "CLP",
      knownNetTotal: 208021,
      lines,
      missing,
      assumptions: [],
      sourcePautaCapturedAt: "2026-10-02T12:00:00.000Z",
    },
  });
}
