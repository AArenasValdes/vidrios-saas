/** @jest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";

import { useCotizacionLineTemplates } from "../useCotizacionLineTemplates";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

const mockGetTemplates = jest.fn();
const mockEnsureDefault = jest.fn();
const mockEnsureStructural = jest.fn();
const mockEnsureProfiles = jest.fn();
let mockOrganizationId = 901;

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ organizacionId: mockOrganizationId }),
}));

jest.mock(
  "@/features/cotizaciones/line-templates/services/cotizacion-line-templates.service",
  () => ({
    cotizacionLineTemplatesService: {
      getTemplatesByOrganizationId: (...args: unknown[]) => mockGetTemplates(...args),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      duplicateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      importTemplates: jest.fn(),
    },
  })
);

jest.mock(
  "@/features/cotizaciones/line-templates/services/seed-line-catalog-client",
  () => ({
    ensureDefaultLineCatalogClient: (...args: unknown[]) => mockEnsureDefault(...args),
  })
);

jest.mock(
  "@/features/cotizaciones/line-templates/services/seed-structural-draft-client",
  () => ({
    ensureStructuralDraftsClient: (...args: unknown[]) => mockEnsureStructural(...args),
  })
);

jest.mock(
  "@/features/cotizaciones/line-templates/services/seed-profile-references-client",
  () => ({
    ensureProfileReferencesClient: (...args: unknown[]) => mockEnsureProfiles(...args),
  })
);

function buildTemplate(id: number): CotizacionLineTemplate {
  return {
    id,
    organizationId: mockOrganizationId,
    catalogKey: `test:${id}`,
    nombre: `Línea ${id}`,
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 10000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {},
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
  };
}

describe("carga optimizada del catálogo de líneas", () => {
  beforeEach(() => {
    mockOrganizationId += 1;
    mockGetTemplates.mockReset();
    mockEnsureDefault.mockReset().mockResolvedValue(false);
    mockEnsureStructural.mockReset().mockResolvedValue(false);
    mockEnsureProfiles.mockReset().mockResolvedValue(false);
  });

  it("muestra las líneas antes de que termine la sincronización técnica", async () => {
    let finishStructural!: (changed: boolean) => void;
    mockGetTemplates.mockResolvedValue([buildTemplate(1)]);
    mockEnsureStructural.mockReturnValue(
      new Promise<boolean>((resolve) => {
        finishStructural = resolve;
      })
    );

    const { result } = renderHook(() => useCotizacionLineTemplates());

    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.isLoading).toBe(false);
    expect(mockEnsureDefault).toHaveBeenCalledWith(mockOrganizationId);
    expect(mockEnsureStructural).toHaveBeenCalledWith(mockOrganizationId);
    expect(mockEnsureProfiles).toHaveBeenCalledWith(mockOrganizationId);

    await act(async () => finishStructural(false));
    expect(mockGetTemplates).toHaveBeenCalledTimes(1);
  });

  it("deduplica la carga de una organización mientras el caché está vigente", async () => {
    mockGetTemplates.mockResolvedValue([buildTemplate(2)]);

    const first = renderHook(() => useCotizacionLineTemplates());
    await waitFor(() => expect(first.result.current.templates).toHaveLength(1));

    const second = renderHook(() => useCotizacionLineTemplates());
    await waitFor(() => expect(second.result.current.templates).toHaveLength(1));

    expect(mockGetTemplates).toHaveBeenCalledTimes(1);
  });
});
