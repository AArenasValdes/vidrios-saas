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

  it("con Mis precios no muestra valores de proveedores para perfiles sin costo propio", () => {
    render(<QuoteProfileCosts {...shared} providerKey="taller:7" allowMixedWorkshopCosts prices={[{
      ...basePrice, status: "priced", netPrice: 24375, priceSource: "reference",
    }]} />);
    expect(screen.getByText("0 de 1 perfiles listos")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.queryByText(/24[.\s]375/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar costo" })).toBeInTheDocument();
  });

  it("guarda acabado independiente solo cuando el maestro elige todos los acabados", async () => {
    render(<QuoteProfileCosts {...shared} prices={[basePrice]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));
    fireEvent.click(screen.getByRole("radio", { name: "Todos los acabados" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Costo neto por tira 2503 (CLP)" }), { target: { value: "31900" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar costo 2503" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proveedor-catalogos/taller-presentaciones", expect.objectContaining({ method: "POST" })));
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual(expect.objectContaining({ finishName: null }));
  });

  it("guarda el costo propio sin atribuirlo a la presentación del proveedor", async () => {
    render(<QuoteProfileCosts {...shared} prices={[basePrice]} />);
    expect(screen.getByText("0 de 1 perfiles listos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Largo de la tira 2503 (mm)" }), { target: { value: "6000" } });
    fireEvent.change(screen.getAllByRole("textbox", { name: "Proveedor (opcional)" })[1], { target: { value: "Aluminera local" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Costo neto por tira 2503 (CLP)" }), { target: { value: "31900" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar costo 2503" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proveedor-catalogos/taller-presentaciones", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"technicalCode":"2503"'),
    })));
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      lineTemplateId: 75, technicalCode: "2503", finishName: "Blanco",
      commercialLengthMm: 6000, netPrice: 31900, currency: "CLP", supplierName: "Aluminera local",
    }));
  });

  it("crea una referencia privada exacta para 2511R sin inventar ni exponer un SKU", async () => {
    render(<QuoteProfileCosts {...shared} references={[{ technicalCode: "2511R", profileName: "Refuerzo pierna abierta" }]} prices={[{
      ...basePrice, technicalCode: "2511R", profileName: "Refuerzo pierna abierta",
      providerKey: "", providerLabel: "Sin presentación", presentationId: "", supplierSku: "",
      commercialLengthMm: null,
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Costo neto por tira 2511R (CLP)" }), { target: { value: "45000" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Largo de la tira 2511R \(mm\)/ }), { target: { value: "6000" } });
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

    const length = screen.getByRole("textbox", { name: /Largo de la tira 2511R \(mm\)/ });
    expect(length).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Usar 6.000 mm sugeridos para L25" }));
    expect(length).toHaveValue("6000");
    fireEvent.change(screen.getByRole("textbox", { name: "Costo neto por tira 2511R (CLP)" }), { target: { value: "45000" } });
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

    expect(screen.getByRole("textbox", { name: "Largo de la tira 2001 (mm)" })).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Usar 6.000 mm sugeridos para L25" })).not.toBeInTheDocument();
  });

  it("edita una presentación privada propia con su revisión, sin pasar su clave interna a la UI", async () => {
    render(<QuoteProfileCosts {...shared} prices={[{
      ...basePrice, providerKey: "taller:941", providerLabel: "Precio propio del taller",
      presentationId: "cf9bb8d0-b8d1-45d7-b9d5-2069c82c42c0", supplierSku: "",
      purchaseUnit: "UN", commercialLengthMm: 6000, netPrice: 27500, currency: "CLP",
      priceSource: "workshop", priceListRevision: "taller-v3", status: "priced",
      workshopSupplierName: "Aluminera local",
    }]} />);
    expect(screen.getByText("1 de 1 perfiles listos")).toBeInTheDocument();
    expect(screen.getByText("Costo propio guardado, todavía no aplicado a esta pieza.")).toBeInTheDocument();
    expect(screen.queryByText(/ventora-internal/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usar costo propio en esta pieza" }));
    expect(shared.onUseWorkshopCost).toHaveBeenCalledWith("taller:941");
    fireEvent.click(screen.getByRole("button", { name: "Editar costo" }));
    expect(screen.getAllByRole("textbox", { name: "Proveedor (opcional)" })[1]).toHaveValue("Aluminera local");
    fireEvent.change(screen.getByRole("textbox", { name: "Costo neto por tira 2503 (CLP)" }), { target: { value: "28000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar costo 2503" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proveedor-catalogos/taller-presentaciones", expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"expectedRevision":3'),
    })));
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(request.body)).toHaveProperty("supplierName", "Aluminera local");
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

    expect(screen.getByText("1 de 1 perfiles listos")).toBeInTheDocument();
    expect(screen.getByText(/Referencia seleccionada: Arquetipo · \$18\.000/)).toBeInTheDocument();
    expect(screen.getByText("$45.000")).toBeInTheDocument();
    expect(screen.getByText("Costo propio guardado, todavía no aplicado a esta pieza.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usar costo propio en esta pieza" })).toBeInTheDocument();
  });

  it("muestra cobertura mixta L42 sin atribuir los demás perfiles al taller", () => {
    const valid = { ...basePrice, status: "priced" as const, netPrice: 24375, priceSource: "reference" as const };
    render(<QuoteProfileCosts {...shared} familyKey="universal:aluminio:l42" allowMixedWorkshopCosts
      references={[{ technicalCode: "4201", profileName: "Marco" }, { technicalCode: "4202", profileName: "Hoja" }]}
      prices={[{ ...valid, technicalCode: "4201", presentationId: "own-1", providerKey: "taller:941", priceSource: "workshop", netPrice: 18000 }, { ...valid, technicalCode: "4202" }]} />);
    expect(screen.getByText("1 de 2 perfiles listos")).toBeInTheDocument();
    expect(screen.getByText(/Costo propio aplicado a este perfil/)).toBeInTheDocument();
    expect(screen.getByText(/Referencia seleccionada: Arquetipo/)).toBeInTheDocument();
  });

  it("no reutiliza una referencia de Titanio como costo físico para Blanco", () => {
    render(<QuoteProfileCosts {...shared} prices={[{
      ...basePrice, providerKey: "alumco", providerLabel: "Alumco", presentationId: "",
      supplierSku: "", status: "priced", netPrice: 30000, priceSource: "reference",
      finishPriceBasis: "base_reference_other_finish", priceSourceFinishName: "Titanio",
      priceSourceSupplierSku: "TI2503",
    }]} />);
    expect(screen.getByText(/Blanco/)).toBeInTheDocument();
    expect(screen.queryByText("TI2503")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));
    expect(screen.getByRole("radio", { name: "Solo Blanco" })).toBeChecked();
  });

  it("reutiliza largo y proveedor solo tras pulsar aplicar, sin copiar precios ni guardar", () => {
    render(<QuoteProfileCosts {...shared}
      providerKey="taller:7" allowMixedWorkshopCosts
      references={[
        { technicalCode: "2503", profileName: "Jamba abierta" },
        { technicalCode: "2504", profileName: "Riel inferior" },
      ]}
      prices={[basePrice, { ...basePrice, technicalCode: "2504", profileName: "Riel inferior" }]} />);

    fireEvent.click(screen.getByText(/Reutilizar largo y proveedor/));
    fireEvent.change(screen.getByRole("textbox", { name: "Largo común de tira (mm)" }), {
      target: { value: "6000" },
    });
    fireEvent.change(screen.getAllByRole("textbox", { name: "Proveedor (opcional)" })[1], {
      target: { value: "Aluminera local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar a 2 perfiles pendientes" }));
    expect(screen.getByText(/Datos preparados para 2 perfiles/)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Agregar costo" })[1]);
    expect(screen.getByRole("textbox", { name: "Largo de la tira 2504 (mm)" })).toHaveValue("6000");
    expect(screen.getAllByRole("textbox", { name: "Proveedor (opcional)" }).at(-1)).toHaveValue("Aluminera local");
    expect(screen.getByRole("textbox", { name: "Costo neto por tira 2504 (CLP)" })).toHaveValue("");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("admite costos decimales con coma y conserva el acabado específico", async () => {
    render(<QuoteProfileCosts {...shared} prices={[basePrice]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar costo" }));
    expect(screen.getByRole("radio", { name: "Solo Blanco" })).toBeChecked();
    fireEvent.change(screen.getByRole("textbox", { name: "Costo neto por tira 2503 (CLP)" }), {
      target: { value: "15.000,50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar costo 2503" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.netPrice).toBe(15000.5);
    expect(body.finishName).toBe("Blanco");
    await waitFor(() => expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Costo guardado"));
  });

  it("muestra un estado vacío sin fabricar identidades técnicas", () => {
    render(<QuoteProfileCosts {...shared} references={[]} prices={[]} />);
    expect(screen.getByText(/Perfiles pendientes de configurar/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Agregar costo/ })).not.toBeInTheDocument();
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

    expect(screen.getByText(/Referencia seleccionada: Arquetipo · \$22\.000/)).toBeInTheDocument();
    rerender(<QuoteProfileCosts {...shared} providerKey="alumco" prices={prices} />);

    expect(screen.getByText(/Referencia seleccionada: Alumco.*\$31\.000/)).toBeInTheDocument();
    expect(screen.getByText(/otro acabado: no confirma costo físico/)).toBeInTheDocument();
    expect(screen.queryByText("TI2503")).not.toBeInTheDocument();
  });
});
