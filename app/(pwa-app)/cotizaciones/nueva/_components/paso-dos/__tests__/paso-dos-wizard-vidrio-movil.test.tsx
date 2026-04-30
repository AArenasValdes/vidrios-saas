/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { PasoDosWizardVidrioMovil } from "../paso-dos-wizard-vidrio-movil";

const baseProps = {
  currentGlass: "Incoloro monolitico 5mm",
  glassCatalogGroups: [
    {
      grupo: "Incoloro monolitico",
      options: ["Incoloro monolitico 5mm", "Incoloro monolitico 6mm"],
    },
    {
      grupo: "Templado",
      options: ["Templado 8mm", "Templado 10mm"],
    },
  ],
  isRecommendedGlass: (option: string) => option === "Incoloro monolitico 5mm",
  onSetVidSearch: jest.fn(),
  onVidrioChange: jest.fn(),
  recommendedReason: "Opciones frecuentes para partir rapido.",
  recommendedVidrios: ["Incoloro monolitico 5mm", "Templado 8mm"],
  searchResults: ["Templado 8mm"],
  vidSearch: "",
};

describe("PasoDosWizardVidrioMovil", () => {
  it("debe mostrar sugeridos y reparar texto visible", () => {
    render(<PasoDosWizardVidrioMovil {...baseProps} />);

    expect(screen.getByText("Cristal / Vidrio")).toBeInTheDocument();
    expect(screen.getByText("Incoloro monolítico 5mm")).toBeInTheDocument();
    expect(screen.getByText("Vidrio elegido: Incoloro monolítico 5mm")).toBeInTheDocument();
  });

  it("debe abrir modal y permitir elegir un vidrio del catalogo", () => {
    const onVidrioChange = jest.fn();

    render(
      <PasoDosWizardVidrioMovil
        {...baseProps}
        onVidrioChange={onVidrioChange}
      />
    );

    fireEvent.click(screen.getByText("Cambiar"));

    expect(screen.getByText("Catalogo de vidrios")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Templado 10mm"));

    expect(onVidrioChange).toHaveBeenCalledWith("Templado 10mm");
  });

  it("debe usar resultados de busqueda cuando hay texto activo", () => {
    const onVidrioChange = jest.fn();
    const onSetVidSearch = jest.fn();

    render(
      <PasoDosWizardVidrioMovil
        {...baseProps}
        onSetVidSearch={onSetVidSearch}
        onVidrioChange={onVidrioChange}
        vidSearch="temp"
      />
    );

    fireEvent.click(screen.getByText("Cambiar"));

    expect(screen.getByDisplayValue("temp")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Templado 8mm").at(-1)!);

    expect(onVidrioChange).toHaveBeenCalledWith("Templado 8mm");
    expect(onSetVidSearch).toHaveBeenCalledWith("");
  });
});
