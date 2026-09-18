/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";

import {
  serializeCubicationSnapshot,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

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

function ViewHarness() {
  const summary = buildFabricationQuoteSummary(items);
  return (
    <FabricacionResumenMovil
      backHref="/cotizaciones/q1"
      pdfHref="/print/cotizaciones/q1"
      codigo="COT-190826-003"
      clienteNombre="Alessandro"
      obra="Obra norte"
      summary={summary}
      items={items}
      isExporting={false}
      exportError={null}
      onDownload={jest.fn()}
      onPrint={jest.fn()}
    />
  );
}

describe("FabricacionResumenMovil", () => {
  it("muestra resumen compacto con segmented y cards no expandibles", () => {
    render(<ViewHarness />);

    expect(screen.getByRole("heading", { name: "Resumen de fabricación" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Componentes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Consolidado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalle de V1 · Ventana corredera" })).toBeInTheDocument();
    expect(screen.getAllByText("Pauta lista")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Mostrar detalle/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PDF cliente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar resumen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Imprimir/i })).toBeInTheDocument();
  });

  it("abre el detalle del componente con Resumen, Cortes y Despiece", () => {
    render(<ViewHarness />);

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

  it("muestra el consolidado agrupado por línea sin acordeón", () => {
    render(<ViewHarness />);

    fireEvent.click(screen.getByRole("tab", { name: "Consolidado" }));

    const consolidado = screen.getByLabelText("Qué fabricar");
    expect(within(consolidado).getByText("Perfiles")).toBeInTheDocument();
    expect(screen.getByLabelText("L25")).toBeInTheDocument();
    expect(screen.getByLabelText("Vidrio consolidado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ocultar detalle/i })).not.toBeInTheDocument();
  });
});
