/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuoteProfileCosts } from "../quote-profile-costs";

const basePrice = {
  technicalCode: "2503",
  profileName: "Jamba abierta",
  providerKey: "arquetipo",
  providerLabel: "Arquetipo",
  presentationId: "f14599eb-5ec8-480d-a919-779329ab8590",
  supplierSku: "2503",
  presentationDescription: "Jamba abierta · Blanco · tira",
  purchaseUnit: "TR",
  commercialLengthMm: 6000,
  netPrice: null,
  currency: "CLP",
  priceSource: null,
  status: "missing_price" as const,
};

const shared = {
  lineTemplateId: 75,
  familyKey: "universal:aluminio:l25",
  providerKey: "arquetipo",
  references: [{ technicalCode: "2503", profileName: "Jamba abierta" }],
  finishName: "Blanco",
  canManagePrice: true,
  onPricesSaved: jest.fn().mockResolvedValue(undefined),
  onUseWorkshopCost: jest.fn(),
};

describe("QuoteProfileCosts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ row: {} }) }) as jest.Mock;
  });

  it("guarda el precio propio sobre la presentación confirmada existente", async () => {
    render(<QuoteProfileCosts {...shared} prices={[basePrice]} />);
    expect(screen.getByText("0 de 1 perfiles con costo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Costo neto por tira 2503 (CLP)" }), { target: { value: "31900" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar costo 2503" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proveedor-catalogos/mis-precios", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining('"kind":"quote_override"'),
    })));
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      providerKey: "arquetipo", presentationId: basePrice.presentationId,
      familyKey: "universal:aluminio:l25", technicalCode: "2503", finishName: "Blanco",
      netPrice: 31900, currency: "CLP",
    }));
  });

  it("crea una referencia privada exacta para 2511R sin inventar ni exponer un SKU", async () => {
    render(<QuoteProfileCosts {...shared} references={[{ technicalCode: "2511R", profileName: "Refuerzo pierna abierta" }]} prices={[{
      ...basePrice, technicalCode: "2511R", profileName: "Refuerzo pierna abierta",
      providerKey: "", providerLabel: "Sin presentación", presentationId: "", supplierSku: "",
      commercialLengthMm: null,
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Costo neto por tira 2511R (CLP)" }), { target: { value: "45000" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: /Largo de la tira 2511R \(mm\)/ }), { target: { value: "6000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar costo 2511R" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proveedor-catalogos/taller-presentaciones", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"technicalCode":"2511R"'),
    })));
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      lineTemplateId: 75, technicalCode: "2511R", profileName: "Refuerzo pierna abierta",
      finishName: "Blanco", purchaseUnit: "UN", commercialLengthMm: 6000,
      netPrice: 45000, currency: "CLP", preferred: false, workshopSku: null,
    }));
    expect(screen.queryByText(/ventora-internal:/i)).not.toBeInTheDocument();
  });

  it("sugiere 6000 mm para una referencia L25 nueva sin largo confirmado", async () => {
    render(<QuoteProfileCosts {...shared} references={[{ technicalCode: "2511R", profileName: "Refuerzo pierna abierta" }]} prices={[{
      ...basePrice, technicalCode: "2511R", profileName: "Refuerzo pierna abierta",
      providerKey: "", providerLabel: "Sin presentación", presentationId: "", supplierSku: "",
      commercialLengthMm: null,
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));

    const length = screen.getByRole("spinbutton", { name: /Largo de la tira 2511R \(mm\)/ });
    expect(length).toHaveValue(6000);
    expect(screen.getByText("Sugerido para Línea 25. Puedes cambiarlo.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Costo neto por tira 2511R (CLP)" }), { target: { value: "45000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar costo 2511R" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proveedor-catalogos/taller-presentaciones", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"commercialLengthMm":6000'),
    })));
  });

  it("no sugiere el largo Ventora L25 a otras familias", () => {
    render(<QuoteProfileCosts {...shared} familyKey="universal:aluminio:l20" references={[{ technicalCode: "2001", profileName: "Perfil L20" }]} prices={[{
      ...basePrice, technicalCode: "2001", profileName: "Perfil L20",
      providerKey: "", providerLabel: "Sin presentación", presentationId: "", supplierSku: "",
      commercialLengthMm: null,
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));

    expect(screen.getByRole("spinbutton", { name: "Largo de la tira 2001 (mm)" })).toHaveValue(null);
    expect(screen.queryByText("Sugerido para Línea 25. Puedes cambiarlo.")).not.toBeInTheDocument();
  });

  it("edita una presentación privada propia con su revisión, sin pasar su clave interna a la UI", async () => {
    render(<QuoteProfileCosts {...shared} prices={[{
      ...basePrice, providerKey: "taller:941", providerLabel: "Precio propio del taller",
      presentationId: "cf9bb8d0-b8d1-45d7-b9d5-2069c82c42c0", supplierSku: "",
      purchaseUnit: "UN", commercialLengthMm: 6000, netPrice: 27500, currency: "CLP",
      priceSource: "workshop", priceListRevision: "taller-v3", status: "priced",
    }]} />);
    expect(screen.getByText("0 de 1 perfiles con costo")).toBeInTheDocument();
    expect(screen.getByText(/Costo privado guardado:.*No está aplicado; proveedor seleccionado: arquetipo/i)).toBeInTheDocument();
    expect(screen.queryByText(/ventora-internal/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usar costo propio en esta pieza" }));
    expect(shared.onUseWorkshopCost).toHaveBeenCalledWith("taller:941");
    fireEvent.click(screen.getByRole("button", { name: "Editar costo" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Costo neto por tira 2503 (CLP)" }), { target: { value: "28000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar costo 2503" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proveedor-catalogos/taller-presentaciones", expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"expectedRevision":3'),
    })));
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(request.body)).not.toHaveProperty("preferred");
  });

  it("distingue el costo privado guardado del precio Arquetipo que sigue aplicado", () => {
    render(<QuoteProfileCosts {...shared} prices={[
      { ...basePrice, technicalCode: "2511R", profileName: "Refuerzo pierna abierta", status: "priced", netPrice: 18000, priceSource: "reference" },
      {
        ...basePrice, providerKey: "taller:941", providerLabel: "Precio propio del taller",
        presentationId: "private-2511r", supplierSku: "", technicalCode: "2511R",
        profileName: "Refuerzo pierna abierta", purchaseUnit: "UN", netPrice: 45000,
        commercialLengthMm: 6000, priceSource: "workshop", priceListRevision: "taller-v2",
        status: "priced",
      },
    ]} references={[{ technicalCode: "2511R", profileName: "Refuerzo pierna abierta" }]} />);

    expect(screen.getByText("1 de 1 perfiles con costo")).toBeInTheDocument();
    expect(screen.getByText("$18.000")).toBeInTheDocument();
    expect(screen.getByText(/Costo privado guardado:.*\$45\.000.*No está aplicado; proveedor seleccionado: arquetipo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usar costo propio en esta pieza" })).toBeInTheDocument();
  });

  it("no reutiliza una referencia de Titanio como costo físico para Blanco", () => {
    render(<QuoteProfileCosts {...shared} prices={[{
      ...basePrice, providerKey: "alumco", providerLabel: "Alumco", presentationId: "",
      supplierSku: "", status: "priced", netPrice: 30000, priceSource: "reference",
      finishPriceBasis: "base_reference_other_finish", priceSourceFinishName: "Titanio",
      priceSourceSupplierSku: "TI2503",
    }]} />);
    expect(screen.getByText(/Acabado cotizado: Blanco/)).toBeInTheDocument();
    expect(screen.queryByText("TI2503")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));
    expect(screen.getByLabelText("Acabado del perfil")).toHaveValue("Blanco");
  });

  it("cambia de proveedor con las vistas ya cargadas sin perder el precio seguro del acabado", () => {
    const prices = [
      {
        ...basePrice,
        status: "priced" as const,
        netPrice: 22000,
        priceSource: "reference" as const,
      },
      {
        ...basePrice,
        providerKey: "alumco",
        providerLabel: "Alumco · 2026",
        presentationId: "alumco-2503",
        status: "priced" as const,
        netPrice: 31000,
        priceSource: "reference" as const,
        finishPriceBasis: "base_reference_other_finish" as const,
        priceSourceFinishName: "Titanio",
        priceSourceSupplierSku: "TI2503",
      },
    ];
    const { rerender } = render(<QuoteProfileCosts {...shared} prices={prices} />);

    expect(screen.getByText("$22.000")).toBeInTheDocument();
    rerender(<QuoteProfileCosts {...shared} providerKey="alumco" prices={prices} />);

    expect(screen.getByText("$31.000")).toBeInTheDocument();
    expect(screen.getByText(/Referencia Titanio; no confirma costo físico para Blanco/)).toBeInTheDocument();
    expect(screen.queryByText("TI2503")).not.toBeInTheDocument();
  });
});
