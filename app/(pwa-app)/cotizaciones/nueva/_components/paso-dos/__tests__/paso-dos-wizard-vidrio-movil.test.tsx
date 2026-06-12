/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";

import { PasoDosWizardVidrioMovil } from "../paso-dos-wizard-vidrio-movil";

const baseProps = {
  canCreateCustomGlass: false,
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
  onCreateCustomGlass: jest.fn(),
  onVidrioChange: jest.fn(),
  recommendedReason: "Opciones frecuentes para partir rapido.",
  recommendedVidrios: ["Incoloro monolitico 5mm", "Templado 8mm"],
  searchResults: ["Templado 8mm"],
  subtipo: "Ventana",
  vidSearch: "",
};

describe("PasoDosWizardVidrioMovil", () => {
  it("debe mostrar seccion de espejos recomendados para componente Espejo", () => {
    render(
      <PasoDosWizardVidrioMovil
        {...baseProps}
        currentGlass="Espejo 4mm"
        recommendedReason="Espesores habituales para espejos a medida."
        recommendedVidrios={["Espejo 3mm", "Espejo 4mm", "Espejo 5mm", "Espejo 6mm"]}
        subtipo="Espejo"
      />
    );

    expect(screen.getByText("Espejos")).toBeInTheDocument();
    expect(screen.getByText("Recomendado para espejos a medida.")).toBeInTheDocument();
    expect(screen.getByText("Espejo 4mm")).toBeInTheDocument();
    expect(screen.queryByText("Cristal / Vidrio")).not.toBeInTheDocument();
  });

  it("debe mostrar sugeridos y reparar texto visible", () => {
    render(<PasoDosWizardVidrioMovil {...baseProps} />);

    expect(screen.getByText("Cristal / Vidrio")).toBeInTheDocument();
    expect(screen.getByText("Incoloro monolítico 5mm")).toBeInTheDocument();
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent(
      "Incoloro monolítico 5mm"
    );
  });

  it("debe mostrar chip seleccionado cuando el vidrio no esta en sugeridos", () => {
    render(
      <PasoDosWizardVidrioMovil
        {...baseProps}
        currentGlass="Incoloro monolitico 8mm"
      />
    );

    expect(screen.getByText("Seleccionado")).toBeInTheDocument();
    expect(screen.getByText("Incoloro monolítico 8mm")).toBeInTheDocument();
    expect(
      screen.queryByText("Vidrio elegido: Incoloro monolítico 8mm")
    ).not.toBeInTheDocument();
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

  it("debe permitir guardar un vidrio escrito cuando no esta en la lista", () => {
    const onCreateCustomGlass = jest.fn();
    const onSetVidSearch = jest.fn();

    render(
      <PasoDosWizardVidrioMovil
        {...baseProps}
        canCreateCustomGlass
        onCreateCustomGlass={onCreateCustomGlass}
        onSetVidSearch={onSetVidSearch}
        searchResults={[]}
        vidSearch="Laminado extra claro 10mm"
      />
    );

    fireEvent.click(screen.getByText("Cambiar"));
    fireEvent.click(screen.getByRole("button", { name: /Guardar/i }));

    expect(onCreateCustomGlass).toHaveBeenCalledWith("Laminado extra claro 10mm");
    expect(onSetVidSearch).toHaveBeenCalledWith("");
  });
});
