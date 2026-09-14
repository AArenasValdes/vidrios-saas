/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { buildTechnicalCardStatus } from "../../services/catalogo-fabricacion-card-status";
import type { CotizacionLineTemplate } from "../../types/cotizacion-line-template";
import { LineTemplateCatalogCard } from "../line-template-catalog-card";

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

function makeTemplate(overrides: Partial<CotizacionLineTemplate> = {}): CotizacionLineTemplate {
  return {
    id: 312,
    organizationId: 39,
    catalogKey: "ventora:l32",
    nombre: "AL-32",
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 18000,
    minimoCobrable: 1,
    redondeoPrecio: 100,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: "Ventora",
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {},
    isActive: true,
    sortOrder: 1,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
    ...overrides,
  };
}

function renderCard(
  template: CotizacionLineTemplate,
  handlers: {
    onEdit?: jest.Mock;
    onEditPrice?: jest.Mock;
    onToggleActive?: jest.Mock;
  } = {}
) {
  const onEdit = handlers.onEdit ?? jest.fn();
  const onEditPrice = handlers.onEditPrice ?? jest.fn();
  const onToggleActive = handlers.onToggleActive ?? jest.fn();

  render(
    <LineTemplateCatalogCard
      template={template}
      technicalStatus={buildTechnicalCardStatus(template)}
      formatMoney={(value) => `$${value.toLocaleString("es-CL")}`}
      isMenuOpen={false}
      isSaving={false}
      pendingAction={null}
      onToggleMenu={jest.fn()}
      onCloseMenu={jest.fn()}
      onDuplicate={jest.fn()}
      onRequestDelete={jest.fn()}
      onEdit={onEdit}
      onEditPrice={onEditPrice}
      onToggleActive={onToggleActive}
    />
  );

  return { onEdit, onEditPrice, onToggleActive };
}

describe("LineTemplateCatalogCard", () => {
  it("mantiene precio, fabricación, referencias y un único CTA estable", () => {
    const handlers = renderCard(makeTemplate());

    expect(screen.getByText(/\$18\.000/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Editar precio" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Fabricación: Configuración técnica pendiente" })
    ).toHaveAttribute(
      "href",
      "/configuracion/empresa/lineas-precios/312/fabricacion"
    );
    expect(screen.getByRole("button", { name: "Configurar línea" })).toBeVisible();
    expect(screen.queryByText("Completar fabricación")).toBeNull();
    expect(screen.queryByText("Nueva cotización")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Editar precio" }));
    fireEvent.click(screen.getByRole("button", { name: "Configurar línea" }));
    fireEvent.click(screen.getByRole("button", { name: "Desactivar AL-32" }));

    expect(handlers.onEditPrice).toHaveBeenCalledTimes(1);
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleActive).toHaveBeenCalledTimes(1);
  });

  it("lleva una línea sin precio al editor de precio y no a fabricación", () => {
    const { onEditPrice } = renderCard(
      makeTemplate({ precioM2Sugerido: 0, catalogMetadata: { needsCommercialPrice: true } })
    );

    expect(screen.getByText("Sin precio")).toBeVisible();
    expect(screen.getByRole("button", { name: "Agregar precio" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Editar precio" })).toBeNull();
    expect(screen.getByRole("button", { name: "Configurar línea" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Agregar precio" }));
    expect(onEditPrice).toHaveBeenCalledTimes(1);
  });

  it("expone el toggle con estado accesible junto a Configurar línea", () => {
    renderCard(makeTemplate());

    const toggle = screen.getByRole("button", { name: "Desactivar AL-32" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Configurar línea" })).toBeVisible();
  });
});
