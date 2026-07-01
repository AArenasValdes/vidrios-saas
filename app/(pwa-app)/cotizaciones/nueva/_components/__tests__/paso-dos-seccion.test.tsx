/** @jest-environment jsdom */

import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { PasoDosSeccion } from "../paso-dos-seccion";

jest.mock("../paso-dos-formulario-componente", () => ({
  PasoDosFormularioComponente: () => (
    <div data-testid="technical-form">Formulario tecnico</div>
  ),
}));

jest.mock("../paso-dos/paso-dos-item-libre-form", () => ({
  PasoDosItemLibreForm: () => <div data-testid="free-item-form">Item libre</div>,
}));

jest.mock("../paso-dos-panel-componentes", () => ({
  PasoDosPanelComponentes: ({
    items,
    activeDraftCard,
  }: {
    items: unknown[];
    activeDraftCard?: { code: string; title: string } | null;
  }) => (
    <aside data-testid="components-panel">
      Panel {items.length}
      {activeDraftCard ? (
        <span data-testid="active-draft-card">
          {activeDraftCard.code} · {activeDraftCard.title}
        </span>
      ) : null}
    </aside>
  ),
}));

jest.mock("../paso-dos/paso-dos-agregar-grupo-sheet", () => {
  const actual = jest.requireActual("../paso-dos/paso-dos-agregar-grupo-sheet");

  return {
    ...actual,
    PasoDosAgregarGrupoSheet: ({
      isOpen,
      onClose,
      variant,
      pieceCode,
    }: {
      isOpen: boolean;
      onClose: () => void;
      variant?: string;
      pieceCode?: string;
    }) =>
      isOpen ? (
        <section data-testid="group-wizard" data-variant={variant} data-piece-code={pieceCode}>
          <button type="button" onClick={onClose}>
            Cerrar flujo de grupo
          </button>
        </section>
      ) : null,
  };
});

type PasoDosSeccionProps = ComponentProps<typeof PasoDosSeccion>;

function buildProps(
  overrides: Partial<PasoDosSeccionProps> = {}
): PasoDosSeccionProps {
  return {
    formulario: {
      editingItemId: null,
    } as PasoDosSeccionProps["formulario"],
    panel: {
      items: [],
      onDuplicateItem: jest.fn(),
    } as unknown as PasoDosSeccionProps["panel"],
    itemLibreForm: {
      isOpen: false,
    } as unknown as PasoDosSeccionProps["itemLibreForm"],
    quoteModeChosen: true,
    quotePricingMode: "por_item",
    isMobileViewport: false,
    hasComponentDraftInProgress: false,
    addGroupSheetProps: {
      isOpen: false,
      paso: 1,
      onClose: jest.fn(),
    } as unknown as PasoDosSeccionProps["addGroupSheetProps"],
    onOpenCreator: jest.fn(),
    onOpenFreeTotalNotebook: jest.fn(),
    onSelectMode: jest.fn(),
    onReturnToModeSelector: jest.fn(),
    ...overrides,
  };
}

describe("PasoDosSeccion desktop", () => {
  it("oculta el formulario tecnico cuando el wizard embebido esta abierto", () => {
    render(
      <PasoDosSeccion
        {...buildProps({
          addGroupSheetProps: {
            isOpen: true,
            paso: 1,
            onClose: jest.fn(),
          } as unknown as PasoDosSeccionProps["addGroupSheetProps"],
        })}
      />
    );

    expect(screen.getByTestId("group-wizard")).toHaveAttribute(
      "data-variant",
      "embedded"
    );
    expect(screen.queryByTestId("technical-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("components-panel")).toBeInTheDocument();
  });

  it("marca el borrador como temporal y no le asigna codigo definitivo", () => {
    render(
      <PasoDosSeccion
        {...buildProps({
          panel: {
            items: [
              { id: "v1", codigo: "V1" },
              { id: "v2", codigo: "V2" },
              { id: "b1", codigo: "B1" },
              { id: "v3", codigo: "V3" },
            ],
            onDuplicateItem: jest.fn(),
          } as unknown as PasoDosSeccionProps["panel"],
          addGroupSheetProps: {
            isOpen: true,
            paso: 1,
            entryMode: "component",
            draft: {
              subtipo: "Ventana",
            },
            onClose: jest.fn(),
          } as unknown as PasoDosSeccionProps["addGroupSheetProps"],
        })}
      />
    );

    expect(screen.getByTestId("group-wizard")).toHaveAttribute("data-piece-code", "Borrador");
    expect(screen.getByTestId("active-draft-card")).toHaveTextContent(/Borrador/);
  });

  it("muestra la superficie comercial cuando el wizard esta cerrado", () => {
    render(<PasoDosSeccion {...buildProps()} />);

    expect(screen.getByText("Crea la primera pieza")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Por componentes · Cambiar/i })).toBeInTheDocument();
    expect(screen.queryByTestId("technical-form")).not.toBeInTheDocument();
  });

  it("vuelve al formulario tecnico al editar un componente", () => {
    render(
      <PasoDosSeccion
        {...buildProps({
          formulario: {
            editingItemId: "item-1",
          } as unknown as PasoDosSeccionProps["formulario"],
        })}
      />
    );

    expect(screen.getByTestId("technical-form")).toBeInTheDocument();
    expect(screen.queryByText("Crea la primera pieza")).not.toBeInTheDocument();
  });

  it("vuelve directo al selector al presionar Cambiar sin datos ni borradores", () => {
    const onReturnToModeSelector = jest.fn();

    render(
      <PasoDosSeccion
        {...buildProps({
          onReturnToModeSelector,
        })}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Por componentes · Cambiar/i })
    );

    expect(onReturnToModeSelector).toHaveBeenCalledTimes(1);
  });

  it("abre el dialogo de confirmacion al presionar Cambiar con piezas cargadas", () => {
    const onReturnToModeSelector = jest.fn();

    render(
      <PasoDosSeccion
        {...buildProps({
          onReturnToModeSelector,
          panel: {
            items: [{ id: "v1", codigo: "V1" }],
            onDuplicateItem: jest.fn(),
          } as unknown as PasoDosSeccionProps["panel"],
        })}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Por componentes · Cambiar/i })
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Cambiar modalidad" })
    );

    expect(onReturnToModeSelector).toHaveBeenCalledTimes(1);
  });

  it("no abre el wizard automaticamente al elegir por items en desktop", () => {
    const onOpenCreator = jest.fn();
    const onSelectMode = jest.fn();

    render(
      <PasoDosSeccion
        {...buildProps({
          quoteModeChosen: false,
          onOpenCreator,
          onSelectMode,
        })}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cotizar por ítems/i }));

    expect(onSelectMode).toHaveBeenCalledWith("por_item");
    expect(onOpenCreator).not.toHaveBeenCalled();
  });

  it("oculta el panel de componentes mientras no se elige modalidad", () => {
    render(
      <PasoDosSeccion
        {...buildProps({
          quoteModeChosen: false,
          budgetContext: {
            clienteNombre: "Alexis Collao",
            obra: "Shower principal",
          },
        })}
      />
    );

    expect(
      screen.getByRole("heading", { name: /quieres preparar el presupuesto/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Cliente: Alexis Collao · Trabajo: Shower principal/)).toBeInTheDocument();
    expect(screen.queryByTestId("components-panel")).not.toBeInTheDocument();
  });

  it("abre el cuaderno por total al elegir modalidad total", () => {
    const onOpenFreeTotalNotebook = jest.fn();
    const onSelectMode = jest.fn();

    render(
      <PasoDosSeccion
        {...buildProps({
          quoteModeChosen: false,
          onOpenFreeTotalNotebook,
          onSelectMode,
        })}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cotizar por total/i }));

    expect(onSelectMode).toHaveBeenCalledWith("total_global");
    expect(onOpenFreeTotalNotebook).toHaveBeenCalledTimes(1);
  });
});
