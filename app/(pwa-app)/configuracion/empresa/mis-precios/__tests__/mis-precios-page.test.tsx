/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MisPreciosContent } from "../mis-precios-content";

const catalog = {
  providers: [{ providerKey: "supplier-a", providerName: "Proveedor A", revision: "2026-06", percentage: -10,
    presentations: [
      { presentationId: "rail-1", sku: "SUP-A-1", name: "Riel proveedor A", finish: "Blanco", purchaseUnit: "M", commercialLengthMm: 5800, referenceNetPrice: 10940, currency: "CLP", ownNetPrice: 9000, effective: { unitNetPrice: 9000, source: "organization_override" as const, currency: "CLP" } },
      { presentationId: "stop-1", sku: "SUP-A-2", name: "Tope proveedor A", finish: "Blanco", purchaseUnit: "PCS", commercialLengthMm: null, referenceNetPrice: 1076, currency: "CLP", ownNetPrice: null, effective: { unitNetPrice: 968.4, source: "provider_adjustment" as const, currency: "CLP" } },
      { presentationId: "pending-1", sku: "SUP-A-3", name: "Escuadra pendiente", finish: null, purchaseUnit: "PCS", commercialLengthMm: null, referenceNetPrice: null, currency: "CLP", ownNetPrice: null, effective: null },
    ] }],
};

const setup = (save = jest.fn(async () => true)) => {
  render(<MisPreciosContent catalog={catalog} error={null} busy={false} save={save} refresh={async () => undefined} />);
  return save;
};

it("muestra proveedores primero y busca por nombre o SKU", () => {
  setup();
  expect(screen.getByRole("heading", { name: "Proveedores" })).toBeInTheDocument();
  expect(screen.getByText("Junio 2026 · 3 productos")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Proveedor A/ }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar producto o SKU" }), { target: { value: "SUP-A-1" } });
  expect(screen.getByText("Riel proveedor A")).toBeInTheDocument();
  expect(screen.queryByText("Tope proveedor A")).not.toBeInTheDocument();
});

it("edita precio propio desde sheet y permite volver al precio del proveedor", async () => {
  const save = setup();
  fireEvent.click(screen.getByRole("button", { name: /Proveedor A/ }));
  fireEvent.click(screen.getByRole("button", { name: /Editar precio de Riel proveedor A/ }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("Referencia");
  expect(dialog).toHaveTextContent("Con ajuste");
  fireEvent.change(screen.getByRole("textbox", { name: "Mi precio neto" }), { target: { value: "8.500" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar precio" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ kind: "override", providerKey: "supplier-a", presentationId: "rail-1", netPrice: 8500, currency: "CLP" }));
  fireEvent.click(screen.getByRole("button", { name: /Editar precio de Riel proveedor A/, hidden: true }));
  fireEvent.click(screen.getByRole("button", { name: "Usar precio del proveedor" }));
  await waitFor(() => expect(save).toHaveBeenLastCalledWith({ kind: "clear_override", providerKey: "supplier-a", presentationId: "rail-1" }));
});

it("traduce descuento positivo de interfaz al porcentaje negativo existente", async () => {
  const save = setup();
  fireEvent.click(screen.getByRole("button", { name: /Proveedor A/ }));
  fireEvent.click(screen.getByRole("button", { name: /Ajuste del proveedor/ }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "Porcentaje" }), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar ajuste" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ kind: "adjustment", providerKey: "supplier-a", percentage: -12 }));
});

it("representa ausencia de precio como Pendiente, nunca como cero", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: /Proveedor A/ }));
  fireEvent.click(screen.getByRole("button", { name: /Editar precio de Escuadra pendiente/ }));
  expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
  expect(screen.queryByText("$0")).not.toBeInTheDocument();
});
