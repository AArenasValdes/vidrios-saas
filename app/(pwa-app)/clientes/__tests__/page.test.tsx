/** @jest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";

import ClientesPage from "../page";

const mockUseClientes = jest.fn();

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
});
