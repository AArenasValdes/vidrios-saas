/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  LineTemplateCardActions,
  LineTemplateDeleteDialog,
} from "../line-template-card-actions";

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

describe("LineTemplateCardActions", () => {
  it("expone las tres acciones y ejecuta duplicar y solicitar eliminación", () => {
    const onDuplicate = jest.fn();
    const onRequestDelete = jest.fn();

    render(
      <LineTemplateCardActions
        templateId={43}
        templateName="Serie 5000"
        isOpen
        isBusy={false}
        pendingAction={null}
        onToggle={jest.fn()}
        onClose={jest.fn()}
        onDuplicate={onDuplicate}
        onRequestDelete={onRequestDelete}
      />
    );

    expect(screen.getByRole("menu", { name: "Acciones de Serie 5000" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Administrar fabricación" })).toHaveAttribute(
      "href",
      "/configuracion/empresa/lineas-precios/43/fabricacion"
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicar línea" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar línea" }));

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onRequestDelete).toHaveBeenCalledTimes(1);
  });

  it("bloquea dobles acciones mientras hay una operación pendiente", () => {
    render(
      <LineTemplateCardActions
        templateId={43}
        templateName="Serie 5000"
        isOpen
        isBusy
        pendingAction="duplicate"
        onToggle={jest.fn()}
        onClose={jest.fn()}
        onDuplicate={jest.fn()}
        onRequestDelete={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Acciones para Serie 5000" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Duplicando..." })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Eliminar línea" })).toBeDisabled();
  });
});

describe("LineTemplateDeleteDialog", () => {
  it("pide confirmación dentro de la app y conserva las cotizaciones históricas", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <LineTemplateDeleteDialog
        templateName="Serie 5000"
        isDeleting={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole("dialog", { name: "Eliminar “Serie 5000”" })).toBeVisible();
    expect(screen.getByText(/Las cotizaciones guardadas no se modificarán/i)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar línea" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("muestra el progreso y evita repetir la eliminación", () => {
    render(
      <LineTemplateDeleteDialog
        templateName="Serie 5000"
        isDeleting
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Eliminando..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });
});
