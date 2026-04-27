/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import CotizacionesPage from "../page";

const push = jest.fn();
const mockUseCotizacionesStore = jest.fn();

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

jest.mock("framer-motion", () => {
  const createMotionComponent = (tag: string) => {
    const Component = React.forwardRef(
      (
        rawProps: Record<string, unknown>,
        ref: React.ForwardedRef<HTMLElement>
      ) => {
        const props = { ...rawProps };
        const children = props.children as React.ReactNode;

        delete props.children;
        delete props.whileHover;
        delete props.whileTap;
        delete props.initial;
        delete props.animate;
        delete props.exit;
        delete props.transition;
        delete props.layout;

        return React.createElement(tag, { ...props, ref }, children);
      }
    );

    Component.displayName = `MockMotion(${tag})`;

    return Component;
  };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      article: createMotionComponent("article"),
      button: createMotionComponent("button"),
      div: createMotionComponent("div"),
    },
    useReducedMotion: () => true,
  };
});

jest.mock("@/hooks/useCotizacionesStore", () => ({
  useCotizacionesStore: () => mockUseCotizacionesStore(),
}));

jest.mock("@/services/cotizaciones-workflow.service", () => ({
  formatCotizacionDate: (value: string) => {
    const date = new Date(value);
    return `${String(date.getDate()).padStart(2, "0")} abr`;
  },
}));

function createCotizacion(
  overrides: Partial<{
    id: string;
    codigo: string;
    clienteNombre: string;
    clienteTelefono: string | null;
    obra: string;
    updatedAt: string;
    total: number;
    estado: string;
  }> = {}
) {
  return {
    id: overrides.id ?? "cot-1",
    codigo: overrides.codigo ?? "COT-250426-001",
    clienteNombre: overrides.clienteNombre ?? "Alejandro Flores",
    clienteTelefono: overrides.clienteTelefono ?? "+56911111111",
    obra: overrides.obra ?? "Ventana corredera",
    updatedAt: overrides.updatedAt ?? "2026-04-26T10:00:00.000Z",
    total: overrides.total ?? 1000000,
    estado: overrides.estado ?? "enviada",
  };
}

function renderPage() {
  mockUseCotizacionesStore.mockReturnValue({
    cotizaciones: [
      createCotizacion(),
      createCotizacion({
        id: "cot-2",
        codigo: "COT-250426-002",
        clienteNombre: "Jose Fuentes",
        obra: "Mampara baño",
        total: 702500,
        estado: "aprobada",
      }),
      createCotizacion({
        id: "cot-3",
        codigo: "COT-250426-003",
        clienteNombre: "Socrates Vidrios",
        obra: "Vitrina comercial",
        total: 856800,
        estado: "rechazada",
      }),
    ],
    isReady: true,
    isRefreshing: false,
    isSaving: false,
    deleteWorkflow: jest.fn(),
    updateManualResponseStatus: jest.fn(),
    loadCotizacionById: jest.fn(),
  });

  return render(<CotizacionesPage />);
}

describe("CotizacionesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("debe marcar el atajo activo y filtrar tarjetas moviles", () => {
    renderPage();

    expect(screen.getAllByTestId("cotizacion-mobile-card")).toHaveLength(3);

    const botonAprobadas = screen.getByRole("button", { name: /aprob\./i });
    fireEvent.click(botonAprobadas);

    expect(botonAprobadas).toHaveAttribute("aria-pressed", "true");
    const cards = screen.getAllByTestId("cotizacion-mobile-card");
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText("Jose Fuentes")).toBeInTheDocument();
  });

  it("debe abrir el panel movil de filtros", () => {
    renderPage();

    const botonFiltros = screen.getByRole("button", { name: /mostrar filtros/i });
    expect(screen.queryByTestId("cotizaciones-mobile-filter-panel")).not.toBeInTheDocument();

    fireEvent.click(botonFiltros);

    expect(botonFiltros).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("cotizaciones-mobile-filter-panel")).toBeInTheDocument();
  });

  it("debe buscar y luego limpiar filtros para restaurar la lista", () => {
    renderPage();

    const buscador = screen.getByPlaceholderText("Buscar cliente o codigo");
    fireEvent.change(buscador, { target: { value: "Jose" } });

    const filteredCards = screen.getAllByTestId("cotizacion-mobile-card");
    expect(filteredCards).toHaveLength(1);
    expect(within(filteredCards[0]).getByText("Jose Fuentes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mostrar filtros/i }));
    const panel = screen.getByTestId("cotizaciones-mobile-filter-panel");
    fireEvent.click(within(panel).getByRole("button", { name: /limpiar/i }));

    expect(screen.getAllByTestId("cotizacion-mobile-card")).toHaveLength(3);
  });
});
