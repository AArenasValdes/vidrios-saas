/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { QuoteSupplierDisclosure } from "../quote-supplier-disclosure";

describe("Costos y proveedores", () => {
  it("mantiene contraída la sección y permite elegir un proveedor", () => {
    const onChange = jest.fn();
    render(<QuoteSupplierDisclosure summary="Alumco"><label>Proveedor<select onChange={onChange} defaultValue="alumco"><option value="alumco">Alumco</option><option value="arquetipo">Arquetipo</option></select></label></QuoteSupplierDisclosure>);
    const details = screen.getByText("Costos y proveedores").closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(details?.querySelector("summary")).toHaveTextContent("Alumco");
    fireEvent.click(screen.getByText("Costos y proveedores"));
    fireEvent.change(screen.getByRole("combobox", { name: "Proveedor" }), { target: { value: "arquetipo" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("muestra la advertencia incluso con la sección contraída", () => {
    render(<QuoteSupplierDisclosure summary="Proveedor guardado" warning="Proveedor sin cobertura compatible. Revisa la selección."><span>Detalle</span></QuoteSupplierDisclosure>);
    const summary = screen.getByText("Costos y proveedores").closest("summary");
    expect(summary).toHaveTextContent("Proveedor sin cobertura compatible");
    expect(summary?.parentElement).not.toHaveAttribute("open");
  });
});
