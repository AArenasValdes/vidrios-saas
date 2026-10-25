/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  serializeCubicationSnapshot,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { createEmptyQuickCompositionAdjustment } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import { buildWorkMaterialsDocument, type WorkMaterialPrice, type WorkProfilePriceReferenceRow } from "@/features/fabricacion/services/fabrication-work-materials.service";
import { buildFabricationWorkOrder } from "@/features/fabricacion/services/fabrication-work-order.service";

jest.mock("../vidrios/glass-distribution-panel", () => ({
  GlassDistributionPanel: () => <section aria-label="Distribución de planchas" />,
}));

import { FabricacionResumenMovil } from "../fabricacion-resumen-movil";

function snapshot(
  overrides: Partial<CotizacionItemCubicationSnapshot> = {}
): CotizacionItemCubicationSnapshot {
  return {
    v: 1,
    source: "auto",
    lineTemplateId: "line-1",
    system: "corredera_2_hojas",
    status: "validada",
    widthMm: 1800,
    heightMm: 1500,
    quantity: 1,
    capturedAt: "2026-09-18T00:00:00.000Z",
    cuts: [
      {
        label: "2501",
        functionLabel: "Riel superior",
        profileCode: "2501",
        profileName: "Riel superior",
        quantity: 1,
        lengthMm: 1800,
        totalLinealMm: 1800,
      },
      {
        label: "2502",
        functionLabel: "Jamba",
        profileCode: "2502",
        profileName: "Jamba",
        quantity: 2,
        lengthMm: 1500,
        totalLinealMm: 3000,
      },
    ],
    bars: [
      {
        index: 1,
        usedMm: 1800,
        wasteMm: 4150,
        profileCode: "2501",
        profileName: "Riel superior",
        cuts: [
          {
            label: "2501",
            functionLabel: "Riel superior",
            profileCode: "2501",
            quantity: 1,
            lengthMm: 1800,
            totalLinealMm: 1800,
          },
        ],
      },
    ],
    totalUsedMm: 1800,
    totalWasteMm: 4150,
    wastePct: 70,
    totalProfilesLinealMm: 10710,
    glass: { widthMm: 1700, heightMm: 1400, quantity: 1, totalM2: 2.38 },
    accessoryUnits: 4,
    ...overrides,
  };
}

function workflowItem(
  id: string,
  codigo: string,
  nombre: string,
  linea: string,
  cubication: CotizacionItemCubicationSnapshot
): CotizacionWorkflowItem {
  return {
    id,
    codigo,
    tipo: "Ventana corredera",
    lineaComercial: linea,
    vidrio: "Incoloro 5mm",
    nombre,
    descripcion: "",
    ancho: cubication.widthMm,
    alto: cubication.heightMm,
    cantidad: cubication.quantity,
    unidad: "unidad",
    areaM2: cubication.glass?.totalM2 ?? 1.2,
    costoProveedorUnitario: 100000,
    costoProveedorTotal: 100000,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 100000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: `[m:Aluminio][cub:${serializeCubicationSnapshot(cubication)}]`,
  };
}

const items = [
  workflowItem("item-v1", "V1", "Ventana corredera", "L25", snapshot()),
  workflowItem(
    "item-v2",
    "V2",
    "Ventana corredera",
    "L25",
    snapshot({
      widthMm: 2222,
      heightMm: 1333,
      bars: [
        {
          index: 1,
          usedMm: 2222,
          wasteMm: 3728,
          profileCode: "2501",
          profileName: "Riel superior",
          cuts: [],
        },
        {
          index: 2,
          usedMm: 1333,
          wasteMm: 4617,
          profileCode: "2502",
          profileName: "Jamba",
          cuts: [],
        },
      ],
    })
  ),
];

const sharedWorkSnapshot = {
  schemaVersion: 1,
  tipo: "fabricacion_trabajo_snapshot",
  packing: "first_fit_decreasing_sugerido",
  capturedAt: "2026-10-02T00:00:00.000Z",
  itemCountWithPauta: 2,
  totalBars: 1,
  totalProfilesLinealMm: 5600,
  totalWasteMm: 200,
  sourcePresentations: [],
  bars: [{
    materialKey: "perfil:riel-01", presentationKey: "perfil:riel-01|#ffffff|5800",
    codigoPerfil: "R-01", nombrePerfil: "Riel", acabadoKey: "#ffffff", lineaIds: [7],
    largoComercialMm: 5800, indice: 1, despunteInicialMm: 0, perdidaCorteMm: 0,
    usadoMm: 5600, sobranteMm: 200,
    cortes: [
      { itemId: "item-v1", codigoItem: "V1", nombreItem: "Ventana corredera", componenteId: "riel", codigoPerfil: "R-01", funcion: "Riel superior", corte: null, largoMm: 2800 },
      { itemId: "item-v2", codigoItem: "V2", nombreItem: "Ventana corredera", componenteId: "riel", codigoPerfil: "R-01", funcion: "Riel superior", corte: null, largoMm: 2800 },
    ],
  }],
} as FabricacionTrabajoSnapshot;

function ViewHarness({ extraItems = items, trabajoSnapshot, technicalCostPanel, profilePriceReferences = [], profilePriceReferencesStatus = "not_applicable", profileReferencePrice }: { extraItems?: CotizacionWorkflowItem[]; trabajoSnapshot?: FabricacionTrabajoSnapshot | null; technicalCostPanel?: ReactNode; profilePriceReferences?: WorkProfilePriceReferenceRow[]; profilePriceReferencesStatus?: "loading" | "loaded" | "unavailable" | "not_applicable"; profileReferencePrice?: WorkMaterialPrice } = {}) {
  const summary = buildFabricationQuoteSummary(extraItems, { trabajoSnapshot });
  const materialsDocument = buildWorkMaterialsDocument({ summary, items: extraItems, profilePriceReferences, profilePriceReferencesStatus });
  if (profileReferencePrice && materialsDocument.profiles[0]) materialsDocument.profiles[0].price = profileReferencePrice;
  if (profilePriceReferences.length > 0) {
    materialsDocument.profiles.forEach((profile) => {
      profile.familyKey = profilePriceReferences[0]!.familyKey;
      profile.finish = "Aluminio mate";
      profile.configuredFinish = "Aluminio mate";
    });
  }
  return (
    <FabricacionResumenMovil
      backHref="/cotizaciones/q1"
      pdfHref="/print/cotizaciones/q1"
      quoteId="q1"
      codigo="COT-190826-003"
      clienteNombre="Alessandro"
      obra="Obra norte"
      summary={summary}
      items={extraItems}
      materialsDocument={materialsDocument}
      workOrder={buildFabricationWorkOrder({ summary, materials: materialsDocument, quoteItems: extraItems })}
      companyName="Ventora QA"
      issueDate="4 oct 2026"
      technicalCostPanel={technicalCostPanel}
      isExporting={false}
      exportError={null}
      onDownload={jest.fn()}
      onPrint={jest.fn()}
      onOpenDespiece={jest.fn()}
    />
  );
}

describe("FabricacionResumenMovil", () => {
  it("muestra documentos, componentes e indicadores en ese orden", () => {
    render(<ViewHarness technicalCostPanel={<section data-testid="cost-panel">Costo estimado de materiales</section>} />);

    expect(screen.getByRole("heading", { name: "Resumen de fabricación" })).toBeInTheDocument();
    expect(screen.getByLabelText("Indicadores del trabajo")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Indicadores del trabajo")).getByText("Perfiles")).toBeInTheDocument();
    expect(screen.getByText("Con pauta")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Optimizar vidrios" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Documentos de fabricación" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Descargar PDF preliminar de distribución de planchas" })).toBeInTheDocument();
    const surface = screen.getByLabelText("Resumen y documentos").firstElementChild;
    expect(surface?.children[0]).toHaveTextContent("Documentos de fabricación");
    expect(surface?.children[1]).toHaveTextContent("Componentes con pauta");
    expect(surface?.children[2]).toHaveTextContent("Con pauta");
    expect(screen.queryByTestId("cost-panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("mantiene separadas la orden y la distribución de planchas", () => {
    render(<ViewHarness />);

    fireEvent.click(screen.getByRole("tab", { name: "Vidrios" }));

    expect(screen.getByRole("heading", { name: "Orden de vidrios" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Distribución de planchas" })).toBeInTheDocument();
  });

  it("muestra los costos solo en su pestaña", () => {
    render(<ViewHarness technicalCostPanel={<section data-testid="cost-panel">Costo estimado de materiales</section>} />);
    expect(screen.queryByTestId("cost-panel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Costos" }));
    expect(screen.getByTestId("cost-panel")).toBeVisible();
  });

  it("separa materiales, vidrios, cortes y costos en sus secciones", () => {
    render(<ViewHarness technicalCostPanel={<section data-testid="cost-panel">Costo estimado de materiales</section>} />);

    fireEvent.click(screen.getByRole("tab", { name: "Materiales" }));
    expect(screen.getByRole("heading", { name: "Lista de materiales del trabajo" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Vidrios" }));
    expect(screen.getByRole("heading", { name: "Orden de vidrios" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Cortes" }));
    expect(screen.getByRole("heading", { name: "Pauta de cortes de perfiles" })).toBeInTheDocument();
    expect(screen.getByText("Ver pauta, cortes y sobrantes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Costos" }));
    expect(screen.getByTestId("cost-panel")).toBeVisible();
  });

  it("muestra en móvil los componentes cuya pauta quedó pendiente por estructura", () => {
    const item = workflowItem("adjusted", "V9", "Ventana ajustada", "L25", snapshot());
    const adjustment = {
      ...createEmptyQuickCompositionAdjustment(),
      paneTypes: { "leaf-1": "fixed" as const },
    };
    item.observaciones += `[qca:${encodeURIComponent(JSON.stringify(adjustment))}]`;

    render(<ViewHarness extraItems={[item]} />);

    expect(screen.getByText("Composición por revisar")).toBeInTheDocument();
    expect(screen.getByText("La pauta queda pendiente hasta tener una receta compatible.")).toBeInTheDocument();
    expect(screen.getByText("Con pauta")).toBeInTheDocument();
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("abre el detalle del componente con Resumen, Cortes y Despiece", () => {
    render(<ViewHarness />);

    fireEvent.click(screen.getByText("V1").closest("summary")!);
    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalle" })[0]);

    expect(screen.getByRole("heading", { name: "V1 · Ventana corredera" })).toBeInTheDocument();
    expect(within(screen.getByRole("tablist", { name: "Detalle del componente" })).getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Perfiles")).toBeInTheDocument();
    expect(screen.getByLabelText("Vidrio")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Tiras").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Accesorios")).toBeInTheDocument();
    expect(screen.getByLabelText("Configuración técnica")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Cortes" }));
    expect(screen.getByText(/Tira 1/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Despiece" }));
    expect(screen.getByText("2501")).toBeInTheDocument();
    expect(screen.getByText("Riel superior")).toBeInTheDocument();
    expect(screen.getByText("2 × 1.500 mm")).toBeInTheDocument();
  });

  it("muestra la vista compacta operativa en Materiales con perfiles, accesorios y descargas", () => {
    render(<ViewHarness trabajoSnapshot={sharedWorkSnapshot} />);
    fireEvent.click(screen.getByRole("tab", { name: "Materiales" }));

    expect(screen.getByRole("heading", { name: "Lista de materiales del trabajo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Perfiles y cantidades para comprar")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Descargar listado de materiales" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Descargar listado de materiales" })).getByRole("button", { name: "PDF" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Descargar listado de materiales" })).getByRole("button", { name: "Excel" })).toBeInTheDocument();
    expect(screen.getByText("Perfiles a comprar")).toBeInTheDocument();
    expect(screen.getByText("R-01")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("muestra color, proveedor y total referencial calculado desde la pauta", () => {
    const profilePriceReferences = ["V1", "V2"].map((itemCode) => ({
      key: `${itemCode}:R-01:arquetipo:p-r01`, itemCode, line: "L25", lineNames: ["L25"],
      familyKey: "universal:aluminio:l25", finish: "Aluminio mate", technicalCode: "R-01", profileName: "Riel",
      providerKey: "arquetipo", providerLabel: "Arquetipo", presentationId: "p-r01", supplierSku: "QA-R01",
      presentationDescription: "Tira 5.800 mm", purchaseUnit: "tira", commercialLengthMm: 5800, netPrice: 13_477,
      currency: "CLP", priceSource: "reference" as const, status: "priced" as const,
    }));
    render(<ViewHarness trabajoSnapshot={sharedWorkSnapshot} profilePriceReferences={profilePriceReferences} />);
    fireEvent.click(screen.getByRole("tab", { name: "Materiales" }));

    expect(screen.getByText("Proveedor · Arquetipo")).toBeInTheDocument();
    const profiles = screen.getByLabelText("Perfiles y cantidades para comprar");
    expect(within(profiles).getByText("Unitario · $13.477 / tira")).toBeInTheDocument();
    expect(within(profiles).getByText("Total referencial · $13.477")).toBeInTheDocument();
    expect(within(profiles).getByText("Color aluminio: Aluminio mate")).toBeInTheDocument();
    expect(screen.getByText("Total referencial de perfiles")).toBeInTheDocument();
    expect(screen.getByText("Arquetipo · $13.477")).toBeInTheDocument();
    expect(within(profiles).queryByText("Precio pendiente")).not.toBeInTheDocument();
  });

  it("mantiene visible el proveedor cuando el precio referencial llega con el material", () => {
    render(<ViewHarness trabajoSnapshot={sharedWorkSnapshot} profileReferencePrice={{
      sku: "QA-R01", providerKey: "arquetipo", isWorkshopCode: false, sourceKind: "reference",
      sourceLabel: "Arquetipo · junio 2026", sourceRevision: "lista-2026-06", pricedAt: null,
      basis: "por tira", unitPrice: 13_477, subtotal: 13_477, currency: "CLP",
    }} />);
    fireEvent.click(screen.getByRole("tab", { name: "Materiales" }));

    const profiles = screen.getByLabelText("Perfiles y cantidades para comprar");
    expect(within(profiles).getByText("Proveedor · Arquetipo · junio 2026")).toBeInTheDocument();
    expect(within(profiles).getByText("Total referencial · $13.477")).toBeInTheDocument();
  });

  it("espera la consulta de precios antes de habilitar el PDF de materiales", () => {
    render(<ViewHarness trabajoSnapshot={sharedWorkSnapshot} profilePriceReferencesStatus="loading" />);
    fireEvent.click(screen.getByRole("tab", { name: "Materiales" }));

    expect(screen.getByRole("button", { name: "Consultando…" })).toBeDisabled();
    expect(screen.getByText("Consultando precio de referencia…")).toBeInTheDocument();
  });

  it("muestra la vista compacta operativa en Cortes por barra/perfil sin duplicar tablas", () => {
    render(<ViewHarness trabajoSnapshot={sharedWorkSnapshot} />);
    fireEvent.click(screen.getByRole("tab", { name: "Cortes" }));

    expect(screen.getByRole("heading", { name: "Pauta de cortes de perfiles" })).toBeInTheDocument();
    expect(screen.getByLabelText("Totales de cortes")).toBeInTheDocument();
    expect(screen.getByLabelText("Cortes agrupados por perfil")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Descargar pauta de cortes de perfiles" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Descargar pauta de cortes de perfiles" })).getByRole("button", { name: "PDF" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Descargar pauta de cortes de perfiles" })).getByRole("button", { name: "Excel" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("muestra la vista compacta operativa en Vidrios sin duplicación de la orden imprimible", () => {
    render(<ViewHarness />);
    fireEvent.click(screen.getByRole("tab", { name: "Vidrios" }));

    expect(screen.getByRole("region", { name: "Distribución de planchas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Orden de vidrios" })).toBeInTheDocument();
    expect(screen.getByLabelText("Orden de corte de vidrios")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Descargar orden de vidrios" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("muestra primero las tiras compartidas con cortes y sobrante, después el resumen agrupado", () => {
    render(<ViewHarness trabajoSnapshot={sharedWorkSnapshot} />);

    fireEvent.click(screen.getByRole("tab", { name: "Cortes" }));
    fireEvent.click(screen.getByText("Ver pauta, cortes y sobrantes"));
    const consolidado = screen.getByLabelText("Qué fabricar");
    expect(within(consolidado).getByText("Largo usado en cortes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pauta conjunta · trabajo completo" })).toBeInTheDocument();
    expect(screen.getByText("Largo usado en cortes 5.600 mm · Largo disponible según pauta 200 mm")).toBeInTheDocument();
    expect(screen.getByText("V1 · Riel superior · 2.800 mm")).toBeInTheDocument();
    expect(screen.getByText("V2 · Riel superior · 2.800 mm")).toBeInTheDocument();
    expect(screen.getByLabelText("L25")).toBeInTheDocument();
    expect(screen.getByLabelText("Vidrio consolidado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ocultar detalle/i })).not.toBeInTheDocument();
  });
});
