/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SupplierFamilyPreferenceControl } from "../supplier-family-preference-control";

const props = {
  familyKey: "universal:aluminio:l5000",
  selectedProviderKey: "taller:7",
  selectedProviderLabel: "Mis precios",
  preferenceProviderKey: "arquetipo",
  preferenceLabel: "Arquetipo · junio 2026",
  canManage: true,
  onSaved: jest.fn(),
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as jest.Mock;
  props.onSaved.mockClear();
});

it("guarda Mis precios como proveedor habitual sin confundirlo con la selección de una pieza", async () => {
  render(<SupplierFamilyPreferenceControl {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Dejar Mis precios como habitual" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proveedor-catalogos/preferencias-familia", expect.objectContaining({
    method: "PUT",
    body: JSON.stringify({ familyKey: props.familyKey, providerKey: "taller:7" }),
  })));
  expect(props.onSaved).toHaveBeenCalledWith("taller:7");
});

it("permite quitar el proveedor habitual y volver a la resolución existente", async () => {
  render(<SupplierFamilyPreferenceControl {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Quitar preferencia" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proveedor-catalogos/preferencias-familia", expect.objectContaining({
    method: "DELETE",
    body: JSON.stringify({ familyKey: props.familyKey }),
  })));
  expect(props.onSaved).toHaveBeenCalledWith(null);
});

it("mantiene la preferencia visible y muestra el error si el servidor rechaza el cambio", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ error: "No hay presentaciones compatibles." }) }) as jest.Mock;
  render(<SupplierFamilyPreferenceControl {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Dejar Mis precios como habitual" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("No hay presentaciones compatibles.");
  expect(props.onSaved).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Quitar preferencia" })).toBeInTheDocument();
});

it("explica por qué no se puede cambiar el habitual en una sesión sin permiso", () => {
  render(<SupplierFamilyPreferenceControl {...props} canManage={false} preferenceProviderKey={null} preferenceLabel={null} />);

  expect(screen.getByRole("note")).toHaveTextContent("Solo un administrador o maestro puede cambiar el proveedor habitual.");
  expect(screen.queryByRole("button", { name: /Dejar .* como habitual/ })).not.toBeInTheDocument();
});
