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
    expect(await screen.findByText("$194.929")).toBeInTheDocument();
    expect(screen.getByText("1 insumos valorizados")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Ver materiales" }));
    expect(screen.getByText("Tornillo")).toBeInTheDocument();
    expect(screen.getByText("Código técnico: R")).toBeInTheDocument();
    expect(screen.getByText("Sin presentación confirmada")).toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: "Ver materiales" }));
    expect(screen.getByText("Blanco · 2 PCS")).toBeInTheDocument();
    expect(screen.getAllByText("$2.152")).toHaveLength(2);
  });

  it("calcula automáticamente una vez el costo cuando hay pauta guardada y no existe snapshot", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ enabled: true, canCalculate: true, snapshot: null }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        snapshot: {
          schemaVersion: 2,
          status: "complete",
          priceOrigin: "reference",
          calculatedAt: "2026-10-06T12:00:00.000Z",
          currency: "CLP",
          knownNetTotal: 13477,
          lines: [],
          missing: [],
          assumptions: [],
          sourcePautaCapturedAt: "2026-10-06T11:00:00.000Z",
        },
      }) } as Response);

    render(<CostoTecnicoParcialPanel quoteId="qa-4" />);
    await waitFor(() => expect(screen.getByText("$13.477")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/cotizaciones/qa-4/costo-tecnico-parcial", { method: "POST" });
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

  it("identifica el monto guardado como desactualizado y explica cómo revisarlo", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => ({
      enabled: true, canRefresh: true, snapshotIsStale: true,
      snapshot: { schemaVersion: 2, status: "partial", priceOrigin: "reference", currency: "CLP", knownNetTotal: 90000, lines: [], missing: [], assumptions: [], calculatedAt: "2026-10-12T12:00:00Z", sourcePautaCapturedAt: "2026-10-02T11:00:00Z" },
    }) } as Response);
    render(<CostoTecnicoParcialPanel quoteId="qa-stale" />);
    expect(await screen.findByText("Costo guardado (desactualizado)")).toBeInTheDocument();
    expect(screen.getByText(/Cambió la pauta o el proveedor desde este cálculo/)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Actualizar costos" })).toBeInTheDocument();
  });

  it("guarda un precio propio y actualiza el costo congelado de esta cotización", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        enabled: true, canConfigure: true, canCalculate: false,
        canRefresh: true,
        snapshot: { schemaVersion: 2, status: "partial", priceOrigin: "reference", currency: "CLP", knownNetTotal: 90000, lines: [], missing: [{ technicalCode: "67401VER", description: "Marco corredera", reason: "Sin precio" }], assumptions: [], calculatedAt: "2026-10-02T12:00:00Z", sourcePautaCapturedAt: "2026-10-02T11:00:00Z" },
      }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ providers: [{
        providerKey: "veratec", providerName: "Veratec", revision: "2026-06", percentage: 0,
        presentations: [{ presentationId: "f14599eb-5ec8-480d-a919-779329ab8590", technicalCodes: [], sku: "67401VER000", name: "Marco corredera 2 hojas", finish: "Blanco", purchaseUnit: "M", commercialLengthMm: 5800, referenceNetPrice: null, currency: "CLP", ownNetPrice: null, effective: null }],
      }] }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) } as Response);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
      snapshot: { schemaVersion: 2, status: "partial", priceOrigin: "own", currency: "CLP", knownNetTotal: 121500, lines: [], missing: [], assumptions: [], calculatedAt: "2026-10-12T12:00:00Z", sourcePautaCapturedAt: "2026-10-02T11:00:00Z" },
    }) } as Response);

    render(<CostoTecnicoParcialPanel quoteId="qa-price" />);
    fireEvent.click(await screen.findByRole("button", { name: "Ver materiales" }));
    fireEvent.click(await screen.findByRole("button", { name: "Agregar mi precio" }));
    const priceInput = await screen.findByLabelText("Precio neto por presentación (CLP)");
    fireEvent.change(priceInput, { target: { value: "31500" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y actualizar esta cotización" }));

    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(3,
      "/api/proveedor-catalogos/mis-precios",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ kind: "override", providerKey: "veratec", presentationId: "f14599eb-5ec8-480d-a919-779329ab8590", netPrice: 31500, currency: "CLP" }) }),
    ));
    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(4,
      "/api/cotizaciones/qa-price/costo-tecnico-parcial",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ refresh: true }) }),
    ));
    expect(await screen.findByText("Precio guardado y costo actualizado para esta cotización. El precio de venta no cambia.")).toBeInTheDocument();
    expect(screen.getByText("$121.500")).toBeInTheDocument();
  });

  it("permite refrescar explícitamente costos guardados con el precio vigente", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        enabled: true, canCalculate: false, canRefresh: true,
        snapshot: { schemaVersion: 2, status: "partial", priceOrigin: "reference", currency: "CLP", knownNetTotal: 90000, lines: [], missing: [], assumptions: [], calculatedAt: "2026-10-02T12:00:00Z", sourcePautaCapturedAt: "2026-10-02T11:00:00Z" },
      }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        snapshot: { schemaVersion: 2, status: "complete", priceOrigin: "reference", currency: "CLP", knownNetTotal: 105000, lines: [], missing: [], assumptions: [], calculatedAt: "2026-10-12T12:00:00Z", sourcePautaCapturedAt: "2026-10-02T11:00:00Z" },
      }) } as Response);
    render(<CostoTecnicoParcialPanel quoteId="qa-refresh" />);
    fireEvent.click(await screen.findByRole("button", { name: "Actualizar costos" }));
    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(2,
      "/api/cotizaciones/qa-refresh/costo-tecnico-parcial",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ refresh: true }) }),
    ));
    expect(await screen.findByText("$105.000")).toBeInTheDocument();
  });
});
/** @jest-environment jsdom */

