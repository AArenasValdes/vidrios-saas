/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TallerPresentaciones } from "../taller-presentaciones";

const payload = {
  familyKey: "universal:aluminio:l5000",
  officialInputs: [],
  catalogProfiles: [],
  ownPresentations: [{
    id: "6e4b9d14-df7c-4f73-9d4a-a6d2c3a58250", revision: 1, codigo_tecnico: "5001",
    nombre_perfil: "Riel superior", sku_taller: null, acabado_nombre: "Blanco",
    largo_comercial_mm: 6000, precio_neto: 15000, moneda: "CLP", unidad_compra: "TIRA",
    preferida: false, proveedor_nombre: "Sodal",
  }],
};

it("permite editar en Mis precios una tira creada desde la cotización", async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => payload })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ row: {} }) })
    .mockResolvedValueOnce({ ok: true, json: async () => payload }) as jest.Mock;

  render(<TallerPresentaciones lineTemplateId={205} familyKey="universal:aluminio:l5000" />);
  await screen.findByText("5001 · Riel superior");
  fireEvent.click(screen.getByRole("button", { name: "Editar costo" }));
  const unit = screen.getByRole("combobox", { name: "Unidad de compra" });
  expect(unit).toHaveValue("TIRA");
  expect(screen.getByRole("option", { name: "Tira comercial" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Guardar nueva revisión" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
  const [, request] = (global.fetch as jest.Mock).mock.calls[1]!;
  expect(JSON.parse(request.body)).toMatchObject({
    lineTemplateId: 205,
    presentationId: payload.ownPresentations[0]!.id,
    purchaseUnit: "TIRA",
    commercialLengthMm: 6000,
    netPrice: 15000,
  });
});

it("permite guardar una referencia de catálogo sin inventar SKU de proveedor", async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ...payload, ownPresentations: [], catalogProfiles: [{ code: "5001", name: "Riel superior", role: "Marco" }] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ row: {} }) })
    .mockResolvedValueOnce({ ok: true, json: async () => payload }) as jest.Mock;

  render(<TallerPresentaciones lineTemplateId={205} familyKey="universal:aluminio:l5000" />);
  fireEvent.click(await screen.findByRole("button", { name: "Agregar perfil" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Referencia del catálogo" }), { target: { value: "0" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Descripción de compra" }), { target: { value: "Perfil de mi taller" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Largo comercial (mm)" }), { target: { value: "6000" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Costo neto de compra CLP" }), { target: { value: "18000" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar dato privado" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
  const [, request] = (global.fetch as jest.Mock).mock.calls[1]!;
  expect(JSON.parse(request.body)).toMatchObject({
    technicalCode: "5001", profileName: "Riel superior", workshopSku: null,
    purchaseUnit: "M", commercialLengthMm: 6000, netPrice: 18000,
  });
});
