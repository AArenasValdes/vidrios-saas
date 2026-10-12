/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockLoadCotizacionById = jest.fn();
const mockStoreState = { isReady: false };

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "1096" }),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/features/cotizaciones/hooks/useCotizacionesStore", () => ({
  useCotizacionesStore: () => ({
    getCotizacionById: () => null,
    loadCotizacionById: mockLoadCotizacionById,
    markQuoteAsSent: jest.fn(),
    updateManualResponseStatus: jest.fn(),
    isReady: mockStoreState.isReady,
    isSaving: false,
    deleteWorkflow: jest.fn(),
  }),
}));

jest.mock("@/features/onboarding/hooks/useOnboardingChecklist", () => ({
  useOnboardingChecklist: () => ({ markFirstShare: jest.fn() }),
}));

jest.mock("@/features/organization-profile/hooks/use-organization-measure-unit", () => ({
  useOrganizationMeasureUnit: () => "mm",
}));

jest.mock("../_components/cotizacion-detalle-desktop-view", () => ({
  CotizacionDetalleDesktopView: () => null,
}));

jest.mock("../_components/cotizacion-detalle-mobile-view", () => ({
  CotizacionDetalleMobileView: () => null,
}));

jest.mock("../_components/cotizacion-detalle-mobile-view-model", () => ({
  buildCotizacionDetalleMobileViewModel: () => ({}),
}));

import CotizacionDetallePage from "../page";

describe("CotizacionDetallePage", () => {
  beforeEach(() => {
    mockStoreState.isReady = false;
    mockLoadCotizacionById.mockReset().mockResolvedValue(null);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
  });

  it("espera que la organización esté lista y ofrece reintentar si el detalle no carga", async () => {
    const view = render(<CotizacionDetallePage />);

    expect(screen.getByText("Cargando cotizacion")).toBeInTheDocument();
    expect(mockLoadCotizacionById).not.toHaveBeenCalled();

    mockStoreState.isReady = true;
    view.rerender(<CotizacionDetallePage />);

    expect(await screen.findByRole("heading", { name: "No pudimos abrir la cotización" })).toBeInTheDocument();
    expect(screen.getByText(/no exista o que la carga haya tardado demasiado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar carga" }));
    await waitFor(() => expect(mockLoadCotizacionById).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "Reintentar carga" })).toBeInTheDocument();
  });
});
