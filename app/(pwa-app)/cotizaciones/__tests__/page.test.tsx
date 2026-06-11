/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import CotizacionesPage from "../page";

const push = jest.fn();
const mockUseCotizacionesStore = jest.fn();
const mockUseCotizacionesResumenPage = jest.fn();
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

jest.mock("@/features/cotizaciones/hooks/useCotizacionesResumenPage", () => ({
  useCotizacionesResumenPage: (options: unknown) => mockUseCotizacionesResumenPage(options),
}));

jest.mock("@/features/onboarding/hooks/useOnboardingChecklist", () => ({
  useOnboardingChecklist: () => mockUseOnboardingChecklist(),
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
    pdfDescargadoEn: string | null;
  }> = {}
) {
  return {
    id: overrides.id ?? "cot-1",
    codigo: overrides.codigo ?? "COT-250426-001",
    clientId: "cli-1",
    projectId: "pro-1",
    clienteNombre: overrides.clienteNombre ?? "Alejandro Flores",
    clienteTelefono: overrides.clienteTelefono ?? "+56911111111",
    direccion: "La Serena",
    obra: overrides.obra ?? "Ventana corredera",
    validez: "15 dias",
    descuentoPct: 0,
    observaciones: "",
    estado: overrides.estado ?? "enviada",
    approvalToken: null,
    approvalTokenExpiresAt: null,
    clienteVioEn: null,
    clienteRespondioEn: null,
    clienteRespuestaCanal: null,
    pdfDescargadoEn: overrides.pdfDescargadoEn ?? null,
    createdAt: overrides.updatedAt ?? "2026-04-26T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-26T10:00:00.000Z",
    items: [],
    subtotal: overrides.total ?? 1000000,
    descuentoValor: 0,
    neto: overrides.total ?? 1000000,
    iva: 0,
    flete: 0,
    total: overrides.total ?? 1000000,
  };
}

const baseCotizaciones = [
  createCotizacion({
    id: "cot-1",
    codigo: "COT-250426-001",
    clienteNombre: "Alejandro Flores",
    obra: "Ventana corredera",
    total: 1000000,
    estado: "enviada",
    pdfDescargadoEn: "2026-04-26T11:00:00.000Z",
  }),
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
];

function buildSummary() {
  return {
    totalCount: 86,
    totalAmount: 14_000_000,
    approvedAmount: 8_000_000,
    pdfGeneratedCount: 12,
    counts: {
      borrador: 2,
      creada: 1,
      enviada: 5,
      aprobada: 8,
      rechazada: 4,
      terminada: 8,
    },
  };
}

function setupHookMock() {
  mockUseCotizacionesResumenPage.mockImplementation(
    (options?: { estado?: string; search?: string | null; page?: number; pageSize?: number }) => {
      const estado = options?.estado ?? "Todos";
      const search = options?.search?.trim().toLowerCase() ?? "";
      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? 8;

      let filtered =
        estado === "Aprobada"
          ? baseCotizaciones.filter((item) => item.estado === "aprobada")
          : estado === "Rechazada"
            ? baseCotizaciones.filter((item) => item.estado === "rechazada")
            : estado === "Pdf_generado"
              ? baseCotizaciones.filter((item) => Boolean(item.pdfDescargadoEn))
              : baseCotizaciones;

      if (search) {
        filtered = filtered.filter(
          (item) =>
            item.clienteNombre.toLowerCase().includes(search) ||
            item.codigo.toLowerCase().includes(search) ||
            item.obra.toLowerCase().includes(search)
        );
      }

      const start = (page - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      return {
        cotizaciones: pageItems,
        totalCount: filtered.length,
        hasMore: start + pageItems.length < filtered.length,
        summary: buildSummary(),
        isReady: true,
        isRefreshing: false,
        refreshCotizacionesResumen: jest.fn(),
      };
    }
  );
}

function renderPage() {
  mockUseCotizacionesStore.mockReturnValue({
    clientes: [
      { id: "cli-1", nombre: "Alejandro Flores" },
      { id: "cli-2", nombre: "Jose Fuentes" },
    ],
    isReady: true,
    isRefreshing: false,
    isSaving: false,
    deleteWorkflow: jest.fn(),
    markQuoteAsSent: jest.fn(),
    prefetchCotizacionById: jest.fn(),
    updateManualResponseStatus: jest.fn(),
    loadCotizacionById: jest.fn(),
    ensureClientesLoaded: jest.fn().mockResolvedValue(undefined),
  });
  setupHookMock();

  return render(<CotizacionesPage />);
}

describe("CotizacionesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
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

  it("usa el resumen global para los chips y KPIs, no la pagina visible", () => {
    renderPage();

    expect(screen.getByText("$14M")).toBeInTheDocument();
    expect(screen.getByText("$14.000.000")).toBeInTheDocument();
    expect(screen.getAllByText("12").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("8").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("86")).toBeInTheDocument();
  });

  it("debe marcar el atajo activo y pedir PDF generados al hook", () => {
    renderPage();

    const botonPdf = screen.getByRole("button", { name: /12 PDF/i });
    fireEvent.click(botonPdf);

    expect(botonPdf).toHaveAttribute("aria-pressed", "true");
    const lastCall =
      mockUseCotizacionesResumenPage.mock.calls[
        mockUseCotizacionesResumenPage.mock.calls.length - 1
      ]?.[0];
    expect(lastCall).toMatchObject({ estado: "Pdf_generado" });
    expect(screen.getAllByTestId("cotizacion-mobile-card")).toHaveLength(1);
  });

  it("debe abrir el panel movil de filtros", () => {
    renderPage();

    const botonFiltros = screen.getByRole("button", { name: /mostrar filtros/i });
    expect(screen.queryByTestId("cotizaciones-mobile-filter-panel")).not.toBeInTheDocument();

    fireEvent.click(botonFiltros);

    expect(botonFiltros).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("cotizaciones-mobile-filter-panel")).toBeInTheDocument();
  });

  it("no debe mostrar una pantalla completa de cargando durante el primer bootstrap", () => {
    mockUseCotizacionesStore.mockReturnValue({
      clientes: [],
      isSaving: false,
      deleteWorkflow: jest.fn(),
      markQuoteAsSent: jest.fn(),
      prefetchCotizacionById: jest.fn(),
      updateManualResponseStatus: jest.fn(),
      loadCotizacionById: jest.fn(),
      ensureClientesLoaded: jest.fn().mockResolvedValue(undefined),
    });
    mockUseCotizacionesResumenPage.mockReturnValue({
      cotizaciones: [],
      totalCount: 0,
      hasMore: false,
      summary: {
        totalCount: 0,
        totalAmount: 0,
        approvedAmount: 0,
        pdfGeneratedCount: 0,
        counts: {
          borrador: 0,
          creada: 0,
          enviada: 0,
          aprobada: 0,
          rechazada: 0,
          terminada: 0,
        },
      },
      isReady: false,
      isRefreshing: true,
      refreshCotizacionesResumen: jest.fn(),
    });

    render(<CotizacionesPage />);

    expect(screen.queryByText("Cargando cotizaciones")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cotizaciones" })).toBeInTheDocument();
    expect(screen.getByText("Resultados")).toBeInTheDocument();
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
