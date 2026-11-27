/** @jest-environment jsdom */

import { render, screen, within } from "@testing-library/react";

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ organizacionId: "10", userId: "user-1", user: null, session: null, isLoading: false }),
}));

jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: () => ({
    organizationId: 10,
    recipes: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock("@/features/organization-profile/hooks/use-organization-measure-unit", () => ({
  useOrganizationMeasureUnit: () => "mm",
}));

jest.mock("@/features/proveedor-catalogos/hooks/use-supplier-presentation-resolution", () => ({
  useSupplierPresentationResolution: () => ({ isResolving: false, result: null }),
}));

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  buildItemFromForm,
  createEmptyComponentForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { DespieceReviewSurface } from "../despiece-review-surface";

function makeCatalogLine(input: {
  id: number;
  nombre: string;
  catalogKey: string;
}): CotizacionLineTemplate {
  return {
    id: input.id,
    organizationId: "10",
    nombre: input.nombre,
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: "Incoloro monolítico 5mm",
    costoBase: 0,
    precioM2Sugerido: 60000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogKey: input.catalogKey,
    catalogMetadata: {},
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
  };
}

const L20_TEMPLATE = makeCatalogLine({
  id: 20,
  nombre: "Serie 20 — Corredera 2 hojas",
  catalogKey: "ventora:l20",
});

const L5000_TEMPLATE = makeCatalogLine({
  id: 50,
  nombre: "Línea 5000 — Corredera 2 hojas",
  catalogKey: "ventora:l5000",
});

function buildCorrederaItem(
  code: string,
  template: CotizacionLineTemplate,
  vidrio: string
) {
  const form = {
    ...createEmptyComponentForm([], "", "precio_directo"),
    codigo: code,
    tipo: "Ventana",
    nombre: "Ventana corredera 2 hojas",
    sistema: "Corredera",
    sheetScheme: "2 hojas",
    sheetVariant: "2 móviles",
    ancho: "1400",
    alto: "1200",
    cantidad: "1",
    lineTemplateId: String(template.id),
    catalogLineKey: template.catalogKey ?? "",
    referencia: template.nombre,
    vidrio,
    fabricacionTipologia: "corredera",
    fabricacionHojas: 2,
    fabricacionModulos: 2,
    fabricacionVariante: "estandar",
    precioPorM2: "60000",
    redondeoPrecio: "1000",
  };
  return buildItemFromForm(form, [], code, {
    lineTemplates: [template],
    fabricationRecipes: [],
    organizationId: 10,
    quotePricingMode: "por_item",
  });
}

describe("DespieceReviewSurface indicadores de vidrio no acreditados", () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  it.each([
    ["L20", L20_TEMPLATE, "Incoloro monolítico 4mm"],
    ["L20", L20_TEMPLATE, "Incoloro monolítico 5mm"],
    ["L20", L20_TEMPLATE, "Incoloro monolítico 6mm"],
    ["L20", L20_TEMPLATE, "DVH 4+12+4"],
    ["Serie 5000", L5000_TEMPLATE, "Incoloro monolítico 4mm"],
    ["Serie 5000", L5000_TEMPLATE, "Incoloro monolítico 5mm"],
    ["Serie 5000", L5000_TEMPLATE, "Incoloro monolítico 6mm"],
    ["Serie 5000", L5000_TEMPLATE, "DVH 4+12+4"],
  ])(
    "%s con %s y vidrios pendientes no muestra 100% ni etiqueta el vano como vidrio calculado",
    (_familyLabel, template, vidrio) => {
      const item = buildCorrederaItem("V1", template, vidrio);
      render(
        <DespieceReviewSurface
          open
          items={[item]}
          lineTemplates={[template]}
          quotePricingMode="por_item"
          activeItemId={item.id}
          onActiveItemChange={jest.fn()}
          onUpdateItem={jest.fn()}
          onClose={jest.fn()}
          recipes={[]}
          organizationId={10}
        />
      );

      const summaryAside = screen.getByRole("complementary", {
        name: "Resumen de resultados",
      });

      expect(within(summaryAside).getByText("Área de vidrio calculada")).toBeInTheDocument();
      expect(within(summaryAside).getByText("Pendiente")).toBeInTheDocument();
      expect(within(summaryAside).getByText("Área comercial (vano)")).toBeInTheDocument();
      expect(within(summaryAside).getByText("1,68 m²")).toBeInTheDocument();
      expect(within(summaryAside).getByText("Aprovechamiento de vidrio")).toBeInTheDocument();
      expect(within(summaryAside).getAllByText("No calculable").length).toBeGreaterThanOrEqual(1);
      expect(within(summaryAside).queryByText("100%")).not.toBeInTheDocument();
    }
  );

  it("mantiene el área calculada y el aprovechamiento reales cuando el snapshot histórico acredita vidrios", () => {
    const historicalSnapshot: FabricacionCotizacionSnapshot = {
      version: 1,
      recipeId: "hist-l42-4mm",
      recipeVersion: 1,
      recipeStatus: "validated",
      lineTemplateId: 42,
      lineName: "Serie 42",
      providerName: "Proveedor",
      supplierFamilyKey: null,
      recipeIdentity: {
        tipologia: "proyectante",
        hojas: 1,
        modulos: 1,
        variante: "normal",
        apertura: "Normal",
        herraje: null,
      },
      selectedVariant: "normal",
      input: {
        anchoTotalMm: 1200,
        altoTotalMm: 1500,
        cantidad: 1,
        hojas: 1,
        modulos: 1,
        variante: "normal",
      },
      pauta: [
        {
          codigoPerfil: "4201",
          nombrePerfil: "Marco",
          tipo: "marco",
          funcion: "Marco",
          medidaMm: 1200,
          cantidadPiezas: 2,
          totalLinealMm: 2400,
          corte: "45°",
          trazabilidad: [],
        },
      ],
      vidrios: [
        {
          vidrioId: "v-1",
          nombre: "Vidrio principal",
          espesorMm: 4,
          anchoMm: 1125,
          altoMm: 1280,
          cantidadPiezas: 1,
          totalM2: 1.44,
          formulaAncho: "X - 75",
          formulaAlto: "Y - 220",
        },
      ],
      result: {
        perfiles: [
          {
            componenteId: "p-1",
            codigoPerfil: "4201",
            nombrePerfil: "Marco",
            funcion: "Marco",
            medidaMm: 1200,
            cantidadPiezas: 2,
            totalLinealMm: 2400,
            corte: "45°",
            trazabilidad: [],
          },
        ],
        vidrios: [
          {
            vidrioId: "v-1",
            nombre: "Vidrio principal",
            espesorMm: 4,
            anchoMm: 1125,
            altoMm: 1280,
            cantidadPiezas: 1,
            totalM2: 1.44,
            trazabilidad: [],
          },
        ],
        accesorios: [],
        advertencias: [],
        totalLinealMm: 2400,
        totalVidrioM2: 1.44,
        calculable: true,
      },
      calculatedAt: "2026-09-01T10:00:00.000Z",
    };

    const historicalItem = {
      ...buildCorrederaItem("V1", L20_TEMPLATE, "Incoloro monolítico 4mm"),
      lineTemplateId: undefined,
      ancho: 1200,
      alto: 1500,
      areaM2: 1.8,
      fabricacionSnapshot: historicalSnapshot,
    };

    render(
      <DespieceReviewSurface
        open
        items={[historicalItem]}
        lineTemplates={[]}
        quotePricingMode="por_item"
        activeItemId={historicalItem.id}
        onActiveItemChange={jest.fn()}
        onUpdateItem={jest.fn()}
        onClose={jest.fn()}
        recipes={[]}
        organizationId={10}
      />
    );

    const summaryAside = screen.getByRole("complementary", {
      name: "Resumen de resultados",
    });
    expect(within(summaryAside).getByText("1,44 m²")).toBeInTheDocument();
    expect(within(summaryAside).getByText("1,80 m²")).toBeInTheDocument();
    expect(within(summaryAside).getByText("80%")).toBeInTheDocument();
  });
});
