/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MisPreciosContent } from "../mis-precios-content";

const catalog = {
  providers: [{ providerKey: "supplier-a", providerName: "Proveedor A", revision: "2026-06", percentage: -10,
    presentations: [
      { presentationId: "rail-1", familyKeys: ["universal:aluminio:l20"], technicalCodes: ["2001", "SUP-A-1"], sku: "SUP-A-1", name: "Riel proveedor A", finish: "Blanco", purchaseUnit: "M", commercialLengthMm: 5800, referenceNetPrice: 10940, currency: "CLP", ownNetPrice: 9000, effective: { unitNetPrice: 9000, source: "organization_override" as const, currency: "CLP" } },
      { presentationId: "stop-1", sku: "SUP-A-2", name: "Tope proveedor A", finish: "Blanco", purchaseUnit: "PCS", commercialLengthMm: null, referenceNetPrice: 1076, currency: "CLP", ownNetPrice: null, effective: { unitNetPrice: 968.4, source: "provider_adjustment" as const, currency: "CLP" } },
      { presentationId: "pending-1", sku: "SUP-A-3", name: "Escuadra pendiente", finish: null, purchaseUnit: "PCS", commercialLengthMm: null, referenceNetPrice: null, currency: "CLP", ownNetPrice: null, effective: null },
      { presentationId: "pending-technical-code", familyKeys: ["universal:aluminio:l20"], technicalCodes: ["2003"], sku: "2003", supplierSku: null, name: "Jamba abierta", finish: "LEGNO", purchaseUnit: "TIRA", commercialLengthMm: 6000, referenceNetPrice: null, currency: "CLP", ownNetPrice: null, effective: null },
    ] }],
};

const setup = (save = jest.fn(async () => true)) => {
  render(<MisPreciosContent catalog={catalog} error={null} busy={false} save={save} refresh={async () => undefined} />);
  return save;
};

it("muestra proveedores primero y busca por nombre o código", () => {
  setup();
  expect(screen.getByRole("heading", { name: "Proveedores" })).toBeInTheDocument();
  expect(screen.getByText("Junio 2026 · 4 productos")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Proveedor A/ }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar perfil o código" }), { target: { value: "2001" } });
  expect(screen.getByText("Riel proveedor A")).toBeInTheDocument();
  expect(screen.queryByText("Tope proveedor A")).not.toBeInTheDocument();
});

it("muestra Alumco activa en Ventora y conserva la fecha impresa de la cotización fuente", () => {
  render(<MisPreciosContent catalog={{ providers: [{
    providerKey: "alumco",
    providerName: "Alumco",
    revision: "notas-000000984-000000986-2026-10-14",
    priceListStatus: "active_by_ventora_policy",
    publishedOn: "2026-10-14",
    sourceQuotationValidUntil: "2026-10-21",
    percentage: 0,
    presentations: [],
  }] }} error={null} busy={false} save={jest.fn(async () => true)} refresh={async () => undefined} />);
  expect(screen.getByText(/Lista activa en Ventora/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Alumco/ }));
  expect(screen.getByText(/La fecha 2026-10-21 corresponde a la vigencia impresa de la cotización fuente/)).toBeInTheDocument();
});

it("muestra el logo Kompen al abrir el catálogo Thermowin", () => {
  const { container } = render(<MisPreciosContent catalog={{ providers: [{
    providerKey: "thermowin-kompen",
    providerName: "Thermowin Kompen",
    revision: "2026",
    percentage: 0,
    presentations: [{ presentationId: "kom-701", familyKeys: ["thermowin:kom-700"], technicalCodes: ["KOM 701"], sku: "701-3154", name: "Marco fijo Euro 701", finish: "Nogal", purchaseUnit: "TR", commercialLengthMm: 6000, referenceNetPrice: 31421, currency: "CLP", ownNetPrice: null, effective: { unitNetPrice: 31421, source: "reference", currency: "CLP" } }],
  }] }} error={null} busy={false} save={jest.fn(async () => true)} refresh={async () => undefined} />);

  fireEvent.click(screen.getByRole("button", { name: /Thermowin Kompen/ }));
  expect(container.querySelector('img[src="/Icon-Empresas/kompen.png"]')).toBeInTheDocument();
  expect(screen.getByText("2026 · 1 producto")).toBeInTheDocument();
});

it("muestra el logo Alumco y solo el año 2026 en su lista", () => {
  const { container } = render(<MisPreciosContent catalog={{ providers: [{
    providerKey: "alumco",
    providerName: "Alumco",
    revision: "notas-000000984-000000986-2026-10-14",
    percentage: 0,
    presentations: [{ presentationId: "alumco-5001", familyKeys: ["universal:aluminio:l5000"], technicalCodes: ["5001"], sku: "TI5001A", name: "Riel superior", finish: "Titanio", purchaseUnit: "TR", commercialLengthMm: 6000, referenceNetPrice: 13351, currency: "CLP", ownNetPrice: null, effective: { unitNetPrice: 13351, source: "reference", currency: "CLP" } }],
  }] }} error={null} busy={false} save={jest.fn(async () => true)} refresh={async () => undefined} />);

  expect(container.querySelector('img[src="/Icon-Empresas/alumco.jpeg"]')).toBeInTheDocument();
  expect(screen.getByText("2026 · 1 producto")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Alumco/ }));
  expect(screen.getAllByText("2026").length).toBeGreaterThan(0);
  expect(screen.queryByText("Lista de referencia")).not.toBeInTheDocument();
  expect(screen.queryByText(/notas-000000984/)).not.toBeInTheDocument();
});

it("muestra el código técnico y oculta los identificadores internos del proveedor", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: /Proveedor A/ }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar perfil o código" }), { target: { value: "2001" } });
  expect(screen.getByText(/Código 2001 · Blanco · 5,8 m/)).toBeInTheDocument();
  expect(screen.queryByText(/SUP-A-1/)).not.toBeInTheDocument();
});

it("muestra el código técnico del perfil aunque su precio esté pendiente", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: /Proveedor A/ }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar perfil o código" }), { target: { value: "2003" } });
  expect(screen.getByText(/Código 2003 · LEGNO · 6 m/)).toBeInTheDocument();
});

it("no repite el código técnico y mantiene las dos columnas de precio legibles", () => {
  const sameCodeCatalog = {
    providers: [{
      ...catalog.providers[0]!,
      presentations: [...catalog.providers[0]!.presentations, {
        presentationId: "duplicate-code",
        familyKeys: ["universal:aluminio:l20"],
        technicalCodes: ["2016"],
        sku: "2016",
        supplierSku: "2016",
        name: "Traspaso termopanel",
        finish: null,
        purchaseUnit: "TIRA",
        commercialLengthMm: 6000,
        referenceNetPrice: null,
        currency: "CLP",
        ownNetPrice: null,
        effective: null,
      }],
    }],
  };
  render(<MisPreciosContent catalog={sameCodeCatalog} error={null} busy={false} save={jest.fn(async () => true)} refresh={async () => undefined} />);
  fireEvent.click(screen.getByRole("button", { name: /Proveedor A/ }));
  const row = screen.getByRole("button", { name: /Editar precio de Traspaso termopanel/ });
  expect(row).toHaveTextContent("Código 2016 · 6 m");
  expect(row).not.toHaveTextContent("SKU 2016");
  expect(within(row).getByText("Referencia")).toBeInTheDocument();
  expect(within(row).getByText("Efectivo")).toBeInTheDocument();
  expect(within(row).getAllByText("Pendiente")).toHaveLength(2);
});

it("ordena todas las líneas numéricamente y cada línea por su código técnico", () => {
  const source = catalog.providers[0]!.presentations[0]!;
  const makeProfile = (line: number, code: number) => ({
    ...source,
    presentationId: `L${line}-${code}`,
    familyKeys: [`universal:aluminio:l${line}`],
    technicalCodes: [String(code)],
    sku: `supplier-${code}`,
    name: `L${line} perfil ${code}`,
  });
  const orderedCatalog = {
    providers: [{
      ...catalog.providers[0]!,
      presentations: [makeProfile(4000, 4002), makeProfile(25, 2502), makeProfile(20, 2009), makeProfile(25, 2501), makeProfile(20, 2001)],
    }],
  };
  render(<MisPreciosContent catalog={orderedCatalog} error={null} busy={false} save={jest.fn(async () => true)} refresh={async () => undefined} />);
  fireEvent.click(screen.getByRole("button", { name: /Proveedor A/ }));

  const listedCodes = () => screen.getAllByRole("button")
    .map((button) => button.getAttribute("aria-label") ?? "")
    .filter((label) => label.startsWith("Editar precio de L"))
    .map((label) => /Código (\d+)/.exec(label)?.[1]);
  expect(listedCodes()).toEqual(["2001", "2009", "2501", "2502", "4002"]);

  fireEvent.change(screen.getByLabelText("Sistema"), { target: { value: "universal:aluminio:l25" } });
  expect(listedCodes()).toEqual(["2501", "2502"]);
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
