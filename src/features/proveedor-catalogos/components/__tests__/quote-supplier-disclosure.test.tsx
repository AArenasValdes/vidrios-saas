/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { QuoteSupplierDisclosure } from "../quote-supplier-disclosure";

describe("Costos y proveedores", () => {
  it("muestra el proveedor y permite cambiarlo al abrir", () => {
    const onChange = jest.fn();
    render(<QuoteSupplierDisclosure summary="Alumco"><label>Proveedor<select onChange={onChange} defaultValue="alumco"><option value="alumco">Alumco</option><option value="arquetipo">Arquetipo</option></select></label></QuoteSupplierDisclosure>);
    const section = screen.getByLabelText("Costos y proveedores");
    expect(section).toHaveTextContent("Alumco");
    expect(section).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Costos y proveedores"));
    fireEvent.change(screen.getByRole("combobox", { name: "Proveedor" }), { target: { value: "arquetipo" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("muestra la advertencia incluso con la sección contraída", () => {
    render(<QuoteSupplierDisclosure summary="Proveedor guardado" warning="Proveedor sin cobertura compatible. Revisa la selección."><span>Detalle</span></QuoteSupplierDisclosure>);
    const section = screen.getByLabelText("Costos y proveedores");
    expect(section).toHaveTextContent("Proveedor sin cobertura compatible");
  });

  it("mantiene el selector contraído inicialmente", () => {
    render(<QuoteSupplierDisclosure summary="Alumco"><select aria-label="Proveedor de compra"><option>Alumco</option></select></QuoteSupplierDisclosure>);
    const section = screen.getByLabelText("Costos y proveedores");
    expect(section.querySelector("select")).toBeInTheDocument();
    expect(section).not.toHaveAttribute("open");
  });
});
