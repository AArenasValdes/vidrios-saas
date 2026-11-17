/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { QuoteSupplierDisclosure } from "../quote-supplier-disclosure";

describe("Costos y proveedores", () => {
  it("mantiene visible el proveedor aplicado y permite elegir otro directamente", () => {
    const onChange = jest.fn();
    render(<QuoteSupplierDisclosure summary="Alumco"><label>Proveedor<select onChange={onChange} defaultValue="alumco"><option value="alumco">Alumco</option><option value="arquetipo">Arquetipo</option></select></label></QuoteSupplierDisclosure>);
    const section = screen.getByRole("region", { name: "Costos y proveedores" });
    expect(section).toHaveTextContent("Alumco");
    fireEvent.change(screen.getByRole("combobox", { name: "Proveedor" }), { target: { value: "arquetipo" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("muestra la advertencia incluso con la sección contraída", () => {
    render(<QuoteSupplierDisclosure summary="Proveedor guardado" warning="Proveedor sin cobertura compatible. Revisa la selección."><span>Detalle</span></QuoteSupplierDisclosure>);
    const section = screen.getByRole("region", { name: "Costos y proveedores" });
    expect(section).toHaveTextContent("Proveedor sin cobertura compatible");
  });

  it("mantiene el selector a la vista y deja el detalle de costos cerrado", () => {
    render(<QuoteSupplierDisclosure summary="Alumco"><select aria-label="Proveedor de compra"><option>Alumco</option></select></QuoteSupplierDisclosure>);
    const section = screen.getByRole("region", { name: "Costos y proveedores" });
    expect(section.querySelector("select")).toBeInTheDocument();
    expect(section.querySelector("details")).toBeNull();
  });
});
