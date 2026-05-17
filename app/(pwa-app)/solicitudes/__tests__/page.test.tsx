/** @jest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";

import SolicitudesPage from "../page";

const push = jest.fn();
const mockUseAuth = jest.fn();
const mockUseOrganizationProfile = jest.fn();
const mockUseSolicitudesContacto = jest.fn();
const mockCanAccessSolicitudes = jest.fn();

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

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/features/organization-profile/hooks/useOrganizationProfile", () => ({
  useOrganizationProfile: () => mockUseOrganizationProfile(),
}));

jest.mock("@/features/solicitudes/hooks/useSolicitudesContacto", () => ({
  useSolicitudesContacto: (...args: unknown[]) => mockUseSolicitudesContacto(...args),
}));

jest.mock("@/features/solicitudes/services/solicitudes-contacto-access", () => ({
  canAccessSolicitudes: (...args: unknown[]) => mockCanAccessSolicitudes(...args),
}));

jest.mock("@/features/cotizaciones/new-quote/solicitud-prefill", () => ({
  persistNuevaCotizacionSolicitudPrefill: jest.fn(),
}));

jest.mock("../_components/solicitud-card", () => ({
  SolicitudCard: () => <div data-testid="solicitud-card" />,
}));

describe("SolicitudesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      rol: "admin",
      user: { id: "user-1", email: "user@test.cl" },
    });
    mockUseOrganizationProfile.mockReturnValue({
      profile: {
        organizationId: "org-1",
        solicitudPublicaSlug: "empresa-demo",
        empresaNombre: "Vidrieria Demo",
      },
    });
    mockCanAccessSolicitudes.mockReturnValue(true);
  });

  it("no muestra el loader de pantalla completa en el cold boot", () => {
    mockUseSolicitudesContacto.mockReturnValue({
      solicitudes: [],
      isReady: false,
      isRefreshing: true,
      isLoadingMore: false,
      error: null,
      totalCount: 0,
      hasMore: false,
      summary: {
        total: 0,
        hoy: 0,
        counts: {
          nueva: 0,
          contactada: 0,
          cerrada: 0,
          descartada: 0,
        },
      },
      refreshSolicitudes: jest.fn(),
      loadMoreSolicitudes: jest.fn(),
      updateSolicitudEstado: jest.fn(),
    });

    render(<SolicitudesPage />);

    expect(screen.queryByText("Cargando solicitudes")).not.toBeInTheDocument();
    expect(screen.getByText("Solicitudes recibidas")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Buscar por nombre, contacto o trabajo")
    ).toBeInTheDocument();
  });
});
