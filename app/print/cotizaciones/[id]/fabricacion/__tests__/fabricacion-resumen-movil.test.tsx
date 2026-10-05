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
import { buildWorkMaterialsDocument } from "@/features/fabricacion/services/fabrication-work-materials.service";

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

function ViewHarness({ extraItems = items, trabajoSnapshot, technicalCostPanel }: { extraItems?: CotizacionWorkflowItem[]; trabajoSnapshot?: FabricacionTrabajoSnapshot | null; technicalCostPanel?: ReactNode } = {}) {
  const summary = buildFabricationQuoteSummary(extraItems, { trabajoSnapshot });
  return (
    <FabricacionResumenMovil
      backHref="/cotizaciones/q1"
      pdfHref="/print/cotizaciones/q1"
      codigo="COT-190826-003"
      clienteNombre="Alessandro"
      obra="Obra norte"
      summary={summary}
      items={extraItems}
      materialsDocument={buildWorkMaterialsDocument({ summary, items: extraItems })}
      companyName="Ventora QA"
      issueDate="4 oct 2026"
      technicalCostPanel={technicalCostPanel}
      onDownloadDocumentPdf={jest.fn()}
      isExporting={false}
      exportError={null}
      onDownload={jest.fn()}
      onPrint={jest.fn()}
    />
  );
}

describe("FabricacionResumenMovil", () => {
  it("ubica el costo técnico antes de materiales y pauta, sin crear una sección al final", () => {
    render(<ViewHarness technicalCostPanel={<section data-testid="cost-panel">Costo estimado de materiales</section>} />);

    const costPanel = screen.getByTestId("cost-panel");
    const materialsHeading = screen.getByRole("heading", { name: "Lista de materiales del trabajo" });
    const pautaSummary = screen.getByText("Ver pauta, cortes y sobrantes");
    expect(costPanel.compareDocumentPosition(materialsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(costPanel.compareDocumentPosition(pautaSummary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("prioriza la pauta conjunta guardada y permite abrir los componentes por separado", () => {
    render(<ViewHarness />);

    expect(screen.getByRole("heading", { name: "Resumen de fabricación" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pauta conjunta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Pauta conjunta no disponible" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Por componente" }));
    expect(screen.getByRole("button", { name: "Ver detalle de V1 · Ventana corredera" })).toBeInTheDocument();
    expect(screen.getAllByText("Pauta lista")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Mostrar detalle/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PDF cliente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar lista de materiales/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Imprimir/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Pauta conjunta" }));
    expect(screen.getAllByAltText("Ventora")).toHaveLength(2);
    for (const logo of screen.getAllByAltText("Ventora")) {
      expect(logo).toHaveAttribute("src", "/brand/ventora-logo-boot.svg");
    }
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
    expect(screen.getByText("La pauta automática queda pendiente hasta tener una receta compatible.")).toBeInTheDocument();
    expect(screen.getByText("Con pauta")).toBeInTheDocument();
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("abre el detalle del componente con Resumen, Cortes y Despiece", () => {
    render(<ViewHarness />);

    fireEvent.click(screen.getByRole("tab", { name: "Por componente" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de V1 · Ventana corredera" }));

    expect(screen.getByRole("heading", { name: "V1 · Ventana corredera" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Perfiles")).toBeInTheDocument();
    expect(screen.getByLabelText("Vidrio")).toBeInTheDocument();
    expect(screen.getByLabelText("Tiras")).toBeInTheDocument();
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

  it("muestra primero las barras compartidas con cortes y sobrante, después el resumen agrupado", () => {
    render(<ViewHarness trabajoSnapshot={sharedWorkSnapshot} />);

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
