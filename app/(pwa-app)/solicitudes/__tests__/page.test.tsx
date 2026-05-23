/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import SolicitudesPage from "../page";

const push = jest.fn();
const mockUseAuth = jest.fn();
const mockUseOrganizationProfile = jest.fn();
const mockUseSolicitudesContacto = jest.fn();
const mockCanAccessSolicitudes = jest.fn();
const mockUseOnboardingChecklist = jest.fn();

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
  }) {
    void _prefetch;
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
  useSearchParams: () => ({
    get: () => null,
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

jest.mock("@/features/onboarding/hooks/useOnboardingChecklist", () => ({
  useOnboardingChecklist: () => mockUseOnboardingChecklist(),
}));

jest.mock("@/features/onboarding/components/onboarding-guide", () => ({
  OnboardingGuide: () => null,
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
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: "(max-width: 900px)",
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    mockUseAuth.mockReturnValue({
      rol: "admin",
      user: { id: "user-1", email: "user@test.cl" },
      organizacionId: "org-1",
    });
    mockUseOrganizationProfile.mockReturnValue({
      profile: {
        organizationId: "org-1",
        solicitudPublicaSlug: "empresa-demo",
        empresaNombre: "Vidrieria Demo",
      },
    });
    mockCanAccessSolicitudes.mockReturnValue(true);
    mockUseOnboardingChecklist.mockReturnValue({
      checklist: null,
      organizationId: "org-1",
      isLoading: false,
      isVisible: false,
      isPreviewMode: false,
      error: null,
      isDismissed: false,
      hasCompletedFirstQuote: true,
      refreshChecklist: jest.fn(),
      dismissChecklist: jest.fn(),
      markChannelReady: jest.fn(),
      markFirstShare: jest.fn(),
      shouldHighlightStep: jest.fn(() => false),
    });
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

  it("persiste las solicitudes nuevas como vistas al abrir la bandeja", async () => {
    mockUseSolicitudesContacto.mockReturnValue({
      solicitudes: [
        {
          id: "sol-1",
          organizationId: "org-1",
          nombre: "Martin Pizarro",
          empresa: "Cliente Demo",
          correo: null,
          telefono: "+56911112222",
          contacto: "+56911112222",
          tipoTrabajo: "Shower door",
          mensaje: "Necesito una cotizacion",
          ayuda: "cotizacion",
          contexto: "landing",
          estado: "nueva",
          origen: "landing",
          ip: null,
          userAgent: null,
          creadoEn: "2026-05-23T14:00:00.000Z",
          actualizadoEn: "2026-05-23T14:00:00.000Z",
          contactadaAt: null,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          sourceUrl: null,
        },
      ],
      isReady: true,
      isRefreshing: false,
      isLoadingMore: false,
      error: null,
      totalCount: 1,
      hasMore: false,
      summary: {
        total: 1,
        hoy: 1,
        counts: {
          nueva: 1,
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

    await waitFor(() => {
      expect(
        window.localStorage.getItem(
          "vidrios-saas:solicitudes-seen:org-1:user@test.cl"
        )
      ).toBe(String(new Date("2026-05-23T14:00:00.000Z").getTime()));
    });
  });
});
