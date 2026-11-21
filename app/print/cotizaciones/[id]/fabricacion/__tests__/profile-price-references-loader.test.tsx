/** @jest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";

const mockUseParams = jest.fn();
const mockGetById = jest.fn();
const mockLoadById = jest.fn();
const mockResolveSupplierPresentationsForQuote = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

jest.mock("@/features/cotizaciones/hooks/useCotizacionesStore", () => ({
  useCotizacionesStore: () => ({
    isReady: true,
    isSaving: false,
    getCotizacionById: mockGetById,
    loadCotizacionById: mockLoadById,
    saveWorkflow: jest.fn(),
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { organizationId: 3 }, organizacionId: 3 }),
}));

jest.mock("@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates", () => ({
  useCotizacionLineTemplates: () => ({
    templates: [
      {
        id: 5000,
        nombre: "Serie 5000",
        catalogKey: "ventora:l5000",
      },
    ],
  }),
}));

jest.mock("@/features/organization-profile/hooks/useOrganizationProfile", () => ({
  useOrganizationProfile: () => ({ profile: { empresaNombre: "QA Org" } }),
}));

jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: () => ({ recipes: [] }),
}));

jest.mock("@/features/proveedor-catalogos/services/supplier-presentations.client", () => ({
  resolveSupplierPresentationsForQuote: (...args: unknown[]) =>
    mockResolveSupplierPresentationsForQuote(...args),
}));

jest.mock("../fabricacion-resumen-movil", () => ({
  FabricacionResumenMovil: () => <div data-testid="movil-view" />,
}));

jest.mock("../fabricacion-resumen-view", () => ({
  FabricacionResumenView: ({
    materialsDocument,
  }: {
    materialsDocument: {
      profilePriceReferencesStatus?: string;
      profilePriceReferences?: Array<{ technicalCode: string }>;
    };
  }) => (
    <div
      data-testid="desktop-view"
      data-ref-status={materialsDocument.profilePriceReferencesStatus}
      data-ref-count={String(materialsDocument.profilePriceReferences?.length ?? 0)}
    />
  ),
}));

jest.mock("../costo-tecnico-parcial-panel", () => ({
  CostoTecnicoParcialPanel: () => <div data-testid="cost-panel" />,
}));

jest.mock("../parametros-corte-panel", () => ({
  ParametrosCortePanel: () => <div data-testid="cut-params-panel" />,
}));

import FabricacionPrintPage from "../page";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function makeQuote(id: string) {
  return {
    id,
    codigo: `COT-${id}`,
    obra: "Obra QA",
    estado: "creada",
    createdAt: "2026-11-21T00:00:00.000Z",
    clientId: 1,
    projectId: 1,
    items: [
      {
        id: `item-${id}`,
        tipoItem: "componente",
        codigo: "V1",
        tipo: "Ventana",
        lineaComercial: "Serie 5000",
        vidrio: "Incoloro 5mm",
        nombre: "Ventana",
        descripcion: "",
        ancho: 1200,
        alto: 1500,
        cantidad: 1,
        unidad: "unidad",
        areaM2: 1.8,
        costoProveedorUnitario: 0,
        costoProveedorTotal: 0,
        margenPct: 0,
        precioUnitario: 100000,
        precioTotal: 100000,
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId: "5000",
          catalogLineKey: "ventora:l5000",
          colorHex: "#a8a8a8",
        }),
        fabricacionSnapshot: null,
      },
    ],
  };
}

describe("FabricacionPrintPage — carga de referencias de precios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  it("resuelve a loaded con respuesta exitosa", async () => {
    mockUseParams.mockReturnValue({ id: "1448" });
    mockGetById.mockReturnValue(makeQuote("1448"));
    mockResolveSupplierPresentationsForQuote.mockResolvedValue({
      enabled: true,
      selections: {},
      profilePrices: {
        "item-1448": [
          {
            technicalCode: "5001",
            profileName: "Riel superior",
            providerKey: "arquetipo",
            providerLabel: "Arquetipo",
            presentationId: "p1",
            supplierSku: "ARQ-5001",
            presentationDescription: "Tira 6000 mm",
            purchaseUnit: "TIRA",
            commercialLengthMm: 6000,
            netPrice: 12000,
            currency: "CLP",
            priceSource: "reference",
            status: "priced",
          },
        ],
      },
    });

    render(<FabricacionPrintPage />);

    await waitFor(() => {
      expect(screen.getByTestId("desktop-view")).toHaveAttribute("data-ref-status", "loaded");
    });
    expect(screen.getByTestId("desktop-view")).toHaveAttribute("data-ref-count", "1");
  });

  it("pasa a unavailable ante fallo de red o rechazo sin quedar en loading infinito", async () => {
    mockUseParams.mockReturnValue({ id: "1448" });
    mockGetById.mockReturnValue(makeQuote("1448"));
    mockResolveSupplierPresentationsForQuote.mockRejectedValue(new Error("Network error"));

    render(<FabricacionPrintPage />);

    await waitFor(() => {
      expect(screen.getByTestId("desktop-view")).toHaveAttribute("data-ref-status", "unavailable");
    });
  });

  it("cancela respuesta obsoleta al cambiar de cotización durante la consulta", async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;

    mockResolveSupplierPresentationsForQuote
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    mockUseParams.mockReturnValue({ id: "1448" });
    mockGetById.mockImplementation((id: string) => makeQuote(id));

    const { rerender } = render(<FabricacionPrintPage />);
    expect(screen.getByTestId("desktop-view")).toHaveAttribute("data-ref-status", "loading");

    mockUseParams.mockReturnValue({ id: "1438" });
    rerender(<FabricacionPrintPage />);

    resolveSecond({
      enabled: true,
      selections: {},
      profilePrices: {
        "item-1438": [
          {
            technicalCode: "5002",
            profileName: "Riel inferior",
            providerKey: "arquetipo",
            providerLabel: "Arquetipo",
            presentationId: "p2",
            supplierSku: "ARQ-5002",
            presentationDescription: "Tira 6000 mm",
            purchaseUnit: "TIRA",
            commercialLengthMm: 6000,
            netPrice: 13000,
            currency: "CLP",
            priceSource: "reference",
            status: "priced",
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("desktop-view")).toHaveAttribute("data-ref-status", "loaded");
    });

    // Late resolution of first quote must NOT overwrite second quote
    resolveFirst({
      enabled: true,
      selections: {},
      profilePrices: {},
    });

    await waitFor(() => {
      expect(screen.getByTestId("desktop-view")).toHaveAttribute("data-ref-count", "1");
    });
  });
});
