/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CostoTecnicoParcialPanel } from "../costo-tecnico-parcial-panel";

describe("CostoTecnicoParcialPanel", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: jest.fn() });
  });
  afterEach(() => jest.restoreAllMocks());

  it("muestra costo, insumos valorizados y pendientes sin exponer evidencia o advertencias de auditoría", async () => {
    const payload = {
      enabled: true,
      canCalculate: false,
      snapshot: {
        schemaVersion: 1,
        status: "partial",
        calculatedAt: "2026-10-01T12:00:00.000Z",
        currency: "CLP",
        knownNetTotal: 194929,
        lines: [{
          technicalCode: "67401", technicalName: "Marco", supplierSku: "SKU-PRIVATE-001",
          finishCode: "W", finishName: "Blanco", commercialLengthMm: 5800, purchaseUnit: "barra",
          bars: 3, netPricePerPresentation: 60000, sourcePrice: 60000,
          priceBasis: "commercial_presentation", lineNet: 180000, currency: "CLP",
          priceListId: "list", priceListRevision: "rev-1", cuts: [],
        }],
        missing: [{ technicalCode: "R", description: "Tornillo", reason: "Sin presentación confirmada", quantity: 17, unit: "unidad" }],
        assumptions: ["CLP supuesto; validar con proveedor"], sourcePautaCapturedAt: "2026-10-01T11:00:00.000Z",
      },
    };
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    } as Response);

    render(<CostoTecnicoParcialPanel quoteId="qa-1" />);
    expect(await screen.findByText("Costo estimado de materiales")).toBeInTheDocument();
    expect(screen.getByText("$194.929")).toBeInTheDocument();
    expect(screen.getByText("1 insumos valorizados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver materiales" }));
    expect(screen.getByText("Tornillo")).toBeInTheDocument();
    expect(screen.getByText("17 unidad")).toBeInTheDocument();
    expect(screen.queryByText(/CLP supuesto|validar con proveedor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SKU-PRIVATE/)).not.toBeInTheDocument();

    expect(screen.getByText("Marco")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/5,8 m/)).toBeInTheDocument());
    expect(screen.getByText("$180.000")).toBeInTheDocument();
    expect(screen.queryByText(/SKU-PRIVATE/)).not.toBeInTheDocument();
  });

  it("muestra una presentación por unidad sin exigir largo lineal", async () => {
    const payload = {
      enabled: true,
      canCalculate: false,
      snapshot: {
        schemaVersion: 1,
        status: "partial",
        calculatedAt: "2026-10-01T12:00:00.000Z",
        currency: "CLP",
        knownNetTotal: 2152,
        lines: [{
          technicalCode: "Tope Corredera", supplierTechnicalCode: "61012VER000", technicalName: "Tope estanco Sliding 2 rieles",
          supplierSku: "61012VER000", finishCode: "000", finishName: "Blanco", commercialLengthMm: null, purchaseUnit: "PCS",
          bars: 0, quantity: 2, netPricePerPresentation: 1076, sourcePrice: 1076,
          priceBasis: "commercial_presentation", lineNet: 2152, currency: "CLP",
          priceListId: "list", priceListRevision: "2026-06", cuts: [],
        }],
        missing: [],
        assumptions: [],
        sourcePautaCapturedAt: "2026-10-01T11:00:00.000Z",
      },
    };
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => payload } as Response);

    render(<CostoTecnicoParcialPanel quoteId="qa-2" />);
    expect(await screen.findByText("Costo estimado de materiales")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver materiales" }));
    expect(screen.getByText("Blanco · 2 PCS")).toBeInTheDocument();
    expect(screen.getAllByText("$2.152")).toHaveLength(2);
  });

  it("presenta sin datos cuando ninguna presentación tiene precio, sin mostrar cero", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => ({
      enabled: true, canCalculate: false,
      snapshot: { schemaVersion: 2, status: "no_data", priceOrigin: "none", currency: null, knownNetTotal: null, lines: [], missing: [{ technicalCode: "7401", description: "Marco", reason: "Sin precio" }], assumptions: [], calculatedAt: "2026-10-02T12:00:00Z", sourcePautaCapturedAt: "2026-10-02T11:00:00Z" },
    }) } as Response);
    render(<CostoTecnicoParcialPanel quoteId="qa-3" />);
    expect(await screen.findByText("Sin monto calculable")).toBeInTheDocument();
    expect(screen.getByText("Sin precios · Sin datos")).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });
});
/** @jest-environment jsdom */

