/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import ClientesPage from "../page";

const mockUseClientes = jest.fn();
const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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

jest.mock("@/hooks/useClientes", () => ({
  useClientes: () => mockUseClientes(),
}));

describe("ClientesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("no muestra el loader de pantalla completa en el cold boot", () => {
    mockUseClientes.mockReturnValue({
      clientes: [],
      isReady: false,
      isSaving: false,
      deleteCliente: jest.fn(),
      loadClienteDetalleById: jest.fn(),
    });

    render(<ClientesPage />);

    expect(screen.queryByText("Cargando clientes")).not.toBeInTheDocument();
    expect(screen.getByText("Nuevo cliente")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar cliente")).toBeInTheDocument();
  });

  it("abre la ficha desde la fila y mantiene eliminar dentro del menu secundario", () => {
    mockUseClientes.mockReturnValue({
      clientes: [
        {
          id: "cliente-1",
          nombre: "Cristaleria Norte",
          referencia: "Proyecto local",
          telefono: "+56912345678",
          direccion: "La Serena",
          obras: 3,
          ultimaGestion: "18 jul 2026",
          estado: "activo",
        },
      ],
      isReady: true,
      isSaving: false,
      deleteCliente: jest.fn(),
      loadClienteDetalleById: jest.fn(),
    });

    render(<ClientesPage />);

    const row = screen.getByRole("row", {
      name: "Abrir ficha de Cristaleria Norte",
    });
    fireEvent.click(row);

    expect(push).toHaveBeenCalledWith("/clientes/cliente-1");

    fireEvent.click(within(row).getByLabelText("Mas acciones"));
    expect(
      within(row).getByRole("menuitem", { name: "Eliminar cliente" })
    ).toBeInTheDocument();
  });
});
