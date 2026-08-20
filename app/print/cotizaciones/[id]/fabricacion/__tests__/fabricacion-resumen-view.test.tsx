/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";

import {
  serializeCubicationSnapshot,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { CotizacionLineTemplateCuttingBar } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

import {
  FabricacionResumenView,
  formatBarCutsLabel,
  groupBarsByProfile,
  isUnassignedProfileLabel,
} from "../fabricacion-resumen-view";

function snapshot(
  overrides: Partial<CotizacionItemCubicationSnapshot> = {}
): CotizacionItemCubicationSnapshot {
  return {
    v: 1,
    source: "auto",
    lineTemplateId: "line-1",
    system: "corredera_2_hojas",
    status: "validada",
    widthMm: 1200,
    heightMm: 1000,
    quantity: 1,
    capturedAt: "2026-08-19T00:00:00.000Z",
    cuts: [
      {
        label: "Por asignar",
        functionLabel: "Riel superior",
        quantity: 1,
        lengthMm: 1200,
        totalLinealMm: 1200,
      },
    ],
    bars: [{ index: 1, usedMm: 1200, wasteMm: 4750, cuts: [] }],
    totalUsedMm: 1200,
    totalWasteMm: 4750,
    wastePct: 80,
    totalProfilesLinealMm: 10710,
    glass: { widthMm: 1100, heightMm: 900, quantity: 1, totalM2: 1.2 },
    accessoryUnits: 4,
    ...overrides,
  };
}

function workflowItem(
  id: string,
  codigo: string,
  nombre: string,
  linea: string,
  material: string,
  cubication: CotizacionItemCubicationSnapshot
): CotizacionWorkflowItem {
  return {
    id,
    codigo,
    tipo: "Ventana",
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
    observaciones: `[m:${material}][cub:${serializeCubicationSnapshot(cubication)}]`,
  };
}

const sourceItems = [
  workflowItem("item-v1", "V1", "Ventana corredera", "L5000", "Aluminio", snapshot()),
  workflowItem(
    "item-v2",
    "V2",
    "Ventana corredera",
    "Serie 20",
    "PVC",
    snapshot({
      lineTemplateId: "serie-20",
      totalProfilesLinealMm: 9000,
      accessoryUnits: 2,
      bars: [
        { index: 1, usedMm: 1200, wasteMm: 4750, cuts: [] },
        { index: 2, usedMm: 1994, wasteMm: 3956, cuts: [] },
      ],
    })
  ),
  workflowItem(
    "item-v3",
    "V3",
    "Ventana abatible",
    "L25",
    "Aluminio",
    snapshot({
      lineTemplateId: "l25",
      totalProfilesLinealMm: 12000,
    })
  ),
];

function ViewHarness(props: {
  expandedItemId?: string | null;
  onOpenDespiece?: (itemId: string) => void;
  extraItems?: CotizacionWorkflowItem[];
}) {
  const documentRef = useRef<HTMLElement | null>(null);
  const items = props.extraItems ?? sourceItems;
  const viewSummary = buildFabricationQuoteSummary(items);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    props.expandedItemId === undefined ? viewSummary.items[0]?.itemId ?? null : props.expandedItemId
  );

  return (
    <FabricacionResumenView
      backHref="/cotizaciones/q1"
      pdfHref="/print/cotizaciones/q1"
      codigo="COT-190826-003"
      clienteNombre="Alessandro"
      obra="Trabajo de Alessandro"
      summary={viewSummary}
      items={items}
      expandedItemId={expandedItemId}
      onToggleItem={(itemId) => setExpandedItemId((current) => (current === itemId ? null : itemId))}
      onOpenDespiece={props.onOpenDespiece ?? jest.fn()}
      isExporting={false}
      exportError={null}
      documentRef={documentRef}
      onDownload={jest.fn()}
      onPrint={jest.fn()}
    />
  );
}

describe("FabricacionResumenView", () => {
  it("mantiene línea y cubicación propias por pieza", () => {
    render(<ViewHarness />);

    expect(screen.getByRole("button", { name: "V1 · Ventana corredera" })).toBeInTheDocument();
    expect(screen.getByText("L5000 · Aluminio")).toBeInTheDocument();
    expect(screen.getByText("Serie 20 · PVC")).toBeInTheDocument();
    expect(screen.getByText("L25 · Aluminio")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /Cubicación/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: /Despiece/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: /Pauta de corte/i }).length).toBeGreaterThan(0);
  });

  it("abre el despiece existente con el id persistente de V2", () => {
    const onOpenDespiece = jest.fn();
    render(<ViewHarness onOpenDespiece={onOpenDespiece} />);

    fireEvent.click(screen.getByRole("button", { name: "V2 · Ventana corredera" }));
    expect(onOpenDespiece).toHaveBeenCalledWith("item-v2");

    fireEvent.click(screen.getByRole("button", { name: "Mostrar detalle de V2" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver despiece completo de V2" }));
    expect(onOpenDespiece).toHaveBeenLastCalledWith("item-v2");
  });

  it("colapsa las demás piezas al abrir una, incluso con 10 componentes", () => {
    const extraItems = Array.from({ length: 10 }, (_, index) =>
      workflowItem(
        `item-${index + 1}`,
        `V${index + 1}`,
        "Ventana corredera",
        index % 2 === 0 ? "L5000" : "Serie 20",
        index % 2 === 0 ? "Aluminio" : "PVC",
        snapshot({ totalProfilesLinealMm: 8000 + index * 100 })
      )
    );
    render(<ViewHarness extraItems={extraItems} />);

    expect(screen.getByRole("button", { name: "Ocultar detalle de V1" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: "Mostrar detalle de V10" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );

    fireEvent.click(screen.getByRole("button", { name: "Mostrar detalle de V10" }));
    expect(screen.getByRole("button", { name: "Ocultar detalle de V10" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: "Mostrar detalle de V1" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("permite cerrar el primer componente sin reabrirlo", () => {
    render(<ViewHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Ocultar detalle de V1" }));

    expect(screen.getByRole("button", { name: "Mostrar detalle de V1" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.queryByRole("button", { name: "Ocultar detalle de V2" })).not.toBeInTheDocument();
  });

  it("muestra en la vista las cantidades reales por perfil", () => {
    const item = workflowItem(
      "item-real-bars",
      "V1",
      "Ventana corredera",
      "L5000",
      "Aluminio",
      snapshot({
        bars: [
          {
            index: 1,
            profileCode: "5001",
            profileName: "Riel superior",
            barLengthMm: 6000,
            usedMm: 5982,
            wasteMm: 18,
            cuts: [],
          },
          {
            index: 2,
            profileCode: "5001",
            profileName: "Riel superior",
            barLengthMm: 6000,
            usedMm: 3994,
            wasteMm: 2006,
            cuts: [],
          },
          {
            index: 3,
            profileCode: "5002",
            profileName: "Riel inferior",
            barLengthMm: 6000,
            usedMm: 5982,
            wasteMm: 18,
            cuts: [],
          },
        ],
      })
    );

    render(<ViewHarness extraItems={[item]} />);

    expect(screen.getByText("5001 · Tira 1")).toBeInTheDocument();
    expect(screen.getByText("5001 · Tira 2")).toBeInTheDocument();
    expect(screen.getByText("5002 · Tira 3")).toBeInTheDocument();
  });

  it("muestra código y nombre propios del snapshot, o Por asignar si no existe código", () => {
    const item = workflowItem(
      "item-profile-code",
      "V1",
      "Ventana corredera",
      "Otra línea",
      "Aluminio",
      snapshot({
        cuts: [
          {
            label: "RS01",
            profileCode: "RS01",
            profileName: "Riel superior propio",
            functionLabel: "Riel superior",
            quantity: 1,
            lengthMm: 1200,
            totalLinealMm: 1200,
          },
          {
            label: "Por asignar",
            functionLabel: "Riel inferior",
            quantity: 1,
            lengthMm: 1200,
            totalLinealMm: 1200,
          },
        ],
      })
    );

    render(<ViewHarness extraItems={[item]} />);

    expect(screen.getByRole("columnheader", { name: "Código" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Función" })).toBeInTheDocument();
    expect(screen.getByText("RS01")).toBeInTheDocument();
    expect(screen.getByText("Riel superior propio")).toBeInTheDocument();
    expect(screen.getAllByText("Por asignar").length).toBeGreaterThan(0);
  });
});

describe("helpers de fabricación", () => {
  it("deja Por asignar con baja jerarquía y formatea cortes", () => {
    expect(isUnassignedProfileLabel("Por asignar")).toBe(true);
    expect(isUnassignedProfileLabel("Perfil sin código")).toBe(true);
    expect(isUnassignedProfileLabel("Riel superior")).toBe(false);
    expect(formatBarCutsLabel(1)).toBe("1 corte");
    expect(formatBarCutsLabel(2)).toBe("2 cortes");
  });

  it("agrupa las barras reales por código y largo sin convertirlas en una tira universal", () => {
    const bars: CotizacionLineTemplateCuttingBar[] = [
      {
        index: 1,
        profileCode: "5001",
        profileName: "Riel superior",
        barLengthMm: 6000,
        usedMm: 5982,
        wasteMm: 18,
        cuts: [],
      },
      {
        index: 2,
        profileCode: "5001",
        profileName: "Riel superior",
        barLengthMm: 6000,
        usedMm: 3994,
        wasteMm: 2006,
        cuts: [],
      },
      {
        index: 3,
        profileCode: "5002",
        profileName: "Riel inferior",
        barLengthMm: 6000,
        usedMm: 5982,
        wasteMm: 18,
        cuts: [],
      },
    ];

    const groups = groupBarsByProfile(bars);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      label: "Riel superior",
      code: "5001",
      barLengthMm: 6000,
    });
    expect(groups[0]?.bars).toHaveLength(2);
    expect(groups[1]).toMatchObject({ label: "Riel inferior", code: "5002" });
    expect(groups[1]?.bars).toHaveLength(1);
    expect(groups.reduce((sum, group) => sum + group.bars.length, 0)).toBe(3);
  });

  it("usa la identidad de los cortes en snapshots legacy y marca barras mixtas", () => {
    const bars: CotizacionLineTemplateCuttingBar[] = [
      {
        index: 1,
        usedMm: 1200,
        wasteMm: 4800,
        cuts: [
          {
            label: "5001",
            functionLabel: "Riel superior",
            quantity: 1,
            lengthMm: 1200,
            totalLinealMm: 1200,
          },
        ],
      },
      {
        index: 2,
        usedMm: 1200,
        wasteMm: 4800,
        cuts: [
          {
            label: "5001",
            functionLabel: "Riel superior",
            quantity: 1,
            lengthMm: 1200,
            totalLinealMm: 1200,
          },
        ],
      },
      {
        index: 3,
        usedMm: 2400,
        wasteMm: 3600,
        cuts: [
          {
            label: "5001",
            functionLabel: "Riel superior",
            quantity: 1,
            lengthMm: 1200,
            totalLinealMm: 1200,
          },
          {
            label: "5002",
            functionLabel: "Riel inferior",
            quantity: 1,
            lengthMm: 1200,
            totalLinealMm: 1200,
          },
        ],
      },
    ];

    const groups = groupBarsByProfile(bars);

    expect(groups.find((group) => group.code === "5001")?.bars).toHaveLength(2);
    expect(groups.find((group) => group.label === "Varios perfiles")?.bars).toHaveLength(1);
  });
});
