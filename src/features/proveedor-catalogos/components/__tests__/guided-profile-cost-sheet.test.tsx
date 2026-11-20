/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GuidedProfileCostSheet } from "../guided-profile-cost-sheet";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as jest.Mock;
});

const props = {
  lineTemplateId: 1, familyKey: "universal:aluminio:l5000", finishName: "Blanco", references: [
    { technicalCode: "5001", profileName: "Riel superior" },
    { technicalCode: "5002", profileName: "Riel inferior" },
  ], prices: [], providerKey: "arquetipo", canManagePrice: true, onPricesSaved: jest.fn(),
};

it("cancela precios editados sin guardarlos", () => {
  render(<GuidedProfileCostSheet {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar precios" }));
  fireEvent.change(screen.getByLabelText("Precio 5001"), { target: { value: "15000" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Editar precios" }));
  expect(screen.getByLabelText("Precio 5001")).toHaveValue("");
});

it("guarda dos precios propios sin cambiar proveedor de pieza", async () => {
  render(<GuidedProfileCostSheet {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar precios" }));
  for (const [code, price] of [["5001", "15.000,50"], ["5002", "16000"]]) {
    fireEvent.change(screen.getByLabelText(`Precio ${code}`), { target: { value: price } });
    fireEvent.click(screen.getByText(`Datos de tira ${code}`));
    fireEvent.change(screen.getByLabelText(`Largo ${code}`), { target: { value: "6000" } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Guardar precios" }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  const bodies = (global.fetch as jest.Mock).mock.calls.map((call) => JSON.parse(call[1].body));
  expect(bodies.map((body) => body.netPrice)).toEqual([15000.5, 16000]);
  expect(bodies.every((body) => body.finishName === "Blanco" && body.purchaseUnit === "TIRA")).toBe(true);
});

it("evita un CTA duplicado para aplicar Mis precios y deja visible la edición", () => {
  const ownPrice = {
    technicalCode: "5001", profileName: "Riel superior", providerKey: "taller:7", providerLabel: "Mis precios",
    presentationId: "own-5001", supplierSku: "", presentationDescription: "Riel superior · Blanco", purchaseUnit: "TIRA",
    commercialLengthMm: 6000, netPrice: 15000, currency: "CLP", priceSource: "workshop" as const,
    priceListRevision: "taller-v1", status: "priced" as const,
  };
  render(<GuidedProfileCostSheet {...props} prices={[ownPrice]} />);

  expect(screen.queryByRole("button", { name: "Usar Mis precios en esta pieza" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Editar precios" })).toBeInTheDocument();
});

it("resume fuente y costos propios en un bloque compacto", () => {
  render(<GuidedProfileCostSheet {...props} />);

  expect(screen.getByText("Fuente · Proveedor").parentElement).toHaveTextContent("Mis costos · 0/2 listos");
  expect(screen.getByRole("button", { name: "Editar precios" })).toBeInTheDocument();
});

it("identifica el origen mixto cuando conviven costos propios y proveedor", () => {
  const ownPrice = {
    technicalCode: "5001", profileName: "Riel superior", providerKey: "taller:7", providerLabel: "Mis precios",
    presentationId: "own-5001", supplierSku: "", presentationDescription: "Riel superior · Blanco", purchaseUnit: "TIRA",
    commercialLengthMm: 6000, netPrice: 15000, currency: "CLP", priceSource: "workshop" as const,
    priceListRevision: "taller-v1", status: "priced" as const,
  };
  render(<GuidedProfileCostSheet {...props} prices={[ownPrice]} allowMixedWorkshopCosts />);

  expect(screen.getByText("Fuente · Mixto").parentElement).toHaveTextContent("Mis costos · 1/2 listos");
});

it("aplica datos comunes a cinco importes sin copiar precios", async () => {
  const references = Array.from({ length: 5 }, (_, index) => ({ technicalCode: `P${index + 1}`, profileName: `Perfil ${index + 1}` }));
  render(<GuidedProfileCostSheet {...props} references={references} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar precios" }));
  fireEvent.change(screen.getByLabelText("Largo de tira (mm)"), { target: { value: "6000" } });
  fireEvent.change(screen.getByLabelText("Proveedor (opcional)"), { target: { value: "Proveedor local" } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar a pendientes" }));
  expect(screen.getByRole("status")).toHaveTextContent("Datos preparados para 5 perfiles");
  references.forEach((ref, index) => fireEvent.change(screen.getByLabelText(`Precio ${ref.technicalCode}`), { target: { value: String(10000 + index) } }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar precios" }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(5));
  const bodies = (global.fetch as jest.Mock).mock.calls.map((call) => JSON.parse(call[1].body));
  expect(bodies.map((body) => body.netPrice)).toEqual([10000, 10001, 10002, 10003, 10004]);
  expect(bodies.every((body) => body.commercialLengthMm === 6000 && body.supplierName === "Proveedor local")).toBe(true);
});

it("inicia varios guardados a la vez y conserva el error del perfil fallido", async () => {
  let resolveFirst!: (value: { ok: boolean; json: () => Promise<object> }) => void;
  global.fetch = jest.fn()
    .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "No se pudo guardar el perfil" }) }) as jest.Mock;
  render(<GuidedProfileCostSheet {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar precios" }));
  fireEvent.change(screen.getByLabelText("Largo de tira (mm)"), { target: { value: "6000" } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar a pendientes" }));
  fireEvent.change(screen.getByLabelText("Precio 5001"), { target: { value: "15000" } });
  fireEvent.change(screen.getByLabelText("Precio 5002"), { target: { value: "16000" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar precios" }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  resolveFirst({ ok: true, json: async () => ({}) });
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar el perfil"));
  expect(screen.getAllByText("1 guardado; revisa los errores.").length).toBeGreaterThan(0);
});

it("conserva un largo individual al aplicar datos comunes", () => {
  render(<GuidedProfileCostSheet {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar precios" }));
  expect(screen.getByRole("button", { name: "Pendientes (2)" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.change(screen.getByLabelText("Precio 5001"), { target: { value: "15000" } });
  fireEvent.click(screen.getByText("Datos de tira 5001"));
  fireEvent.change(screen.getByLabelText("Largo 5001"), { target: { value: "5800" } });
  fireEvent.change(screen.getByLabelText("Largo de tira (mm)"), { target: { value: "6000" } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar a pendientes" }));
  expect(screen.getByLabelText("Largo 5001")).toHaveValue("5800");
  expect(global.fetch).not.toHaveBeenCalled();
});
