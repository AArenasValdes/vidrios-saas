/** @jest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";

import type { SolicitudContacto } from "@/features/solicitudes/types/solicitud-contacto";

import { SolicitudCard } from "../solicitud-card";

const STATE_OPTIONS = ["nueva", "contactada", "cerrada", "descartada"] as const;
const FILTER_LABELS = {
  nueva: "Nueva",
  contactada: "Seguimiento",
  cerrada: "Cotizada",
  descartada: "Descartada",
};
const STATE_BADGE_CLASSES = {
  nueva: "statusBlue",
  contactada: "statusGreen",
  cerrada: "statusGold",
  descartada: "statusGray",
};

function buildSolicitud(
  overrides: Partial<SolicitudContacto> = {}
): SolicitudContacto {
  return {
    id: "sol-1",
    organizationId: "org-1",
    nombre: "Constructora Alpina",
    empresa: "Constructora Alpina",
    correo: null,
    telefono: "+56911112222",
    contacto: "+56911112222",
    tipoTrabajo: "Terraza",
    mensaje: "Medidas aprox. 2800 × 3000 · Santiago",
    ayuda: "cotizacion",
    contexto: "empresa-publica",
    estado: "nueva",
    origen: "solicitud-publica",
    ip: null,
    userAgent: null,
    creadoEn: "2026-05-23T14:00:00.000Z",
    actualizadoEn: "2026-05-23T14:00:00.000Z",
    contactadaAt: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    sourceUrl: null,
    ...overrides,
  };
}

function renderCard(
  overrides: {
    estado?: SolicitudContacto["estado"];
    hasQuote?: boolean;
    whatsappUrl?: string | null;
  } = {}
) {
  const solicitud = buildSolicitud({
    estado: overrides.estado ?? "nueva",
  });
  const onCreateQuote = jest.fn();
  const onViewQuote = jest.fn();

  render(
    <SolicitudCard
      item={{
        solicitud,
        initials: "CA",
        displayType: "Terraza",
        statusLabel: FILTER_LABELS[solicitud.estado],
        statusClassName: STATE_BADGE_CLASSES[solicitud.estado],
        relativeLabel: "hace 4 meses",
        calendarLabel: "23 may",
        contactLabel: "+56 9 1111 2222",
        contactHref: "tel:+56911112222",
        contactIcon: "phone",
        originLabel: "Página pública",
        message: "Medidas aprox. 2800 × 3000 · Santiago",
        whatsappUrl:
          overrides.whatsappUrl === undefined
            ? "https://wa.me/56911112222"
            : overrides.whatsappUrl,
        hasQuote: overrides.hasQuote ?? solicitud.estado === "cerrada",
      }}
      isUpdating={false}
      menuOpen={false}
      stateOptions={[...STATE_OPTIONS]}
      filterLabels={FILTER_LABELS}
      stateBadgeClasses={STATE_BADGE_CLASSES}
      onCreateQuote={onCreateQuote}
      onViewQuote={onViewQuote}
      onToggleMenu={jest.fn()}
      onUpdateStatus={jest.fn()}
      onCopyContact={jest.fn()}
      onCopyMessage={jest.fn()}
    />
  );

  return { onCreateQuote, onViewQuote };
}

describe("SolicitudCard", () => {
  it("muestra Crear cotización cuando la consulta aún no tiene cotización", () => {
    const { onCreateQuote, onViewQuote } = renderCard({
      estado: "nueva",
      hasQuote: false,
    });

    screen.getByRole("button", { name: "Crear cotización" }).click();
    expect(onCreateQuote).toHaveBeenCalledTimes(1);
    expect(onViewQuote).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "WhatsApp a Constructora Alpina" })).toBeInTheDocument();
  });

  it("muestra Ver cotización cuando la consulta ya está cotizada", () => {
    const { onCreateQuote, onViewQuote } = renderCard({
      estado: "cerrada",
      hasQuote: true,
    });

    expect(screen.getByText("Cotizada")).toBeInTheDocument();
    screen.getByRole("button", { name: "Ver cotización" }).click();
    expect(onViewQuote).toHaveBeenCalledTimes(1);
    expect(onCreateQuote).not.toHaveBeenCalled();
  });
});
