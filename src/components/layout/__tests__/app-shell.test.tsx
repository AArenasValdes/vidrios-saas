/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AppShell from "../app-shell";
import type { CotizacionAlert } from "@/features/cotizaciones/services/cotizacion-alerts.service";

type MockAuthState = {
  user: {
    email: string;
  } | null;
  rol: string | null;
  organizacionId: number | null;
  cargando: boolean;
};

const mockRouterReplace = jest.fn();
const mockRouterPrefetch = jest.fn();
const mockRefreshAlerts = jest.fn();
const authListeners = new Set<() => void>();
const mockWindowLocationReplace = jest.fn();
let currentAlerts: CotizacionAlert[] = [];

let authSnapshot: MockAuthState = {
  user: {
    email: "dueno@vidrios.cl",
  },
  rol: "admin",
  organizacionId: 17,
  cargando: false,
};

let resolveSignOut: (() => void) | null = null;

const mockSignOut = jest.fn(() => {
  authSnapshot = {
    user: null,
    rol: null,
    organizacionId: null,
    cargando: false,
  };

  authListeners.forEach((listener) => listener());

  return new Promise<void>((resolve) => {
    resolveSignOut = resolve;
  });
});

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
  usePathname: () => "/dashboard",
  useRouter: () => ({
    replace: mockRouterReplace,
    prefetch: mockRouterPrefetch,
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");

  return {
    useAuth: () => {
      const state = ReactModule.useSyncExternalStore(
        (listener: () => void) => {
          authListeners.add(listener);
          return () => authListeners.delete(listener);
        },
        () => authSnapshot,
        () => authSnapshot
      );

      return {
        ...state,
        signOut: mockSignOut,
      };
    },
  };
});

jest.mock("@/features/auth/services/logout-navigation.service", () => ({
  navigateToLogoutRoute: () => mockWindowLocationReplace("/auth/logout"),
}));

jest.mock("@/features/organization-profile/hooks/useOrganizationProfile", () => ({
  useOrganizationProfile: () => ({
    profile: {
      empresaNombre: "Ventora Test",
    },
  }),
}));

jest.mock("@/features/cotizaciones/hooks/useCotizacionAlerts", () => ({
  useCotizacionAlerts: () => ({
    alerts: currentAlerts,
    isLoading: false,
    error: null,
    refresh: mockRefreshAlerts,
  }),
}));

jest.mock("@/features/solicitudes/hooks/useSolicitudesContacto", () => ({
  useSolicitudesContacto: () => ({
    solicitudes: [],
  }),
}));

jest.mock("@/features/solicitudes/services/solicitudes-contacto-access", () => ({
  canAccessSolicitudes: () => true,
}));

describe("AppShell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authListeners.clear();
    resolveSignOut = null;
    currentAlerts = [];
    window.localStorage.clear();
    authSnapshot = {
      user: {
        email: "dueno@vidrios.cl",
      },
      rol: "admin",
      organizacionId: 17,
      cargando: false,
    };
  });

  it("sale por la ruta server-side de logout aunque el cierre real siga pendiente", async () => {
    render(
      <AppShell>
        <div>contenido</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole("button", { name: /dueno@vidrios\.cl/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesion" }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockWindowLocationReplace).toHaveBeenCalledWith("/auth/logout");
    });

    expect(screen.getByText("Saliendo del panel")).toBeInTheDocument();
    expect(resolveSignOut).not.toBeNull();
  });

  it("marca como vistas las alertas que llegan despues de abrir el panel", async () => {
    const { rerender } = render(
      <AppShell>
        <div>contenido</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole("button", { name: /alertas/i }));
    expect(mockRefreshAlerts).toHaveBeenCalledTimes(1);

    currentAlerts = [
      {
        id: "aprobada-cot-1",
        cotizacionId: "cot-1",
        codigo: "COT-1",
        href: "/cotizaciones/cot-1",
        kind: "aprobada",
        title: "Cotizacion aprobada",
        message: "Cliente acepto la cotizacion.",
        occurredAt: "2026-05-23T12:00:00.000Z",
      },
    ];

    rerender(
      <AppShell>
        <div>contenido</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(
        window.localStorage.getItem(
          "vidrios-saas:alerts-seen:17:dueno@vidrios.cl"
        )
      ).toBe(String(new Date("2026-05-23T12:00:00.000Z").getTime()));
    });
  });
});
