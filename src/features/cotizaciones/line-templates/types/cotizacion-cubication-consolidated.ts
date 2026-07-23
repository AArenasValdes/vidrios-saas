/**
 * Pauta consolidada de una cotización (Fase 4).
 * Agrupa cortes por línea + código de perfil + función + medida.
 * Nunca mezcla códigos de perfil distintos en la misma fila.
 */

import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";

export type ConsolidatedCubicationRow = {
  key: string;
  lineTemplateId: string;
  lineName: string;
  profile: string;
  functionLabel: string;
  lengthMm: number;
  quantity: number;
  totalLinealMm: number;
  pieceCodes: string[];
  measureExplanation?: string | null;
};

export type ConsolidatedCubicationPauta = {
  rows: ConsolidatedCubicationRow[];
  totalProfilesLinealMm: number;
  totalGlassM2: number;
  itemCountWithPauta: number;
  totalBars: number;
  totalWasteMm: number;
  totalAccessories: number;
  /** Longitud comercial de barra más frecuente (referencia; no optimiza nesting). */
  dominantBarLengthMm: number | null;
  lineGroups: ConsolidatedCubicationLineGroup[];
  glassRows: ConsolidatedGlassRow[];
};

export type ConsolidatedGlassRow = {
  key: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  totalM2: number;
  pieceCodes: string[];
};

export type ConsolidatedCubicationLineGroup = {
  lineTemplateId: string;
  lineName: string;
  proveedor: string | null;
  rows: ConsolidatedCubicationRow[];
  totalLinealMm: number;
  bars: number;
  wasteMm: number;
  accessories: number;
  barLengthMm: number | null;
};

type SnapshotCarrier = {
  codigo: string;
  lineaComercial?: string | null;
  nombre?: string | null;
  snapshot: CotizacionItemCubicationSnapshot;
};

function accumulateFromSnapshot(
  carrier: SnapshotCarrier,
  rowMap: Map<string, ConsolidatedCubicationRow>,
  glassMap: Map<string, ConsolidatedGlassRow>,
  lineMeta: Map<
    string,
    {
      lineName: string;
      proveedor: string | null;
      bars: number;
      wasteMm: number;
      accessories: number;
      barLengthMm: number | null;
    }
  >,
  barLengthCounts: Map<number, number>,
  totals: {
    totalGlassM2: number;
    itemCountWithPauta: number;
    totalBars: number;
    totalWasteMm: number;
    totalAccessories: number;
  }
) {
  const { snapshot, codigo } = carrier;
  if (!snapshot || snapshot.cuts.length === 0) {
    return;
  }

  totals.itemCountWithPauta += 1;
  if (snapshot.glass) {
    totals.totalGlassM2 += snapshot.glass.totalM2;
    const glassKey = `${snapshot.glass.widthMm}x${snapshot.glass.heightMm}`;
    const existingGlass = glassMap.get(glassKey);
    if (existingGlass) {
      existingGlass.quantity += snapshot.glass.quantity;
      existingGlass.totalM2 += snapshot.glass.totalM2;
      if (!existingGlass.pieceCodes.includes(codigo)) {
        existingGlass.pieceCodes.push(codigo);
      }
    } else {
      glassMap.set(glassKey, {
        key: glassKey,
        widthMm: snapshot.glass.widthMm,
        heightMm: snapshot.glass.heightMm,
        quantity: snapshot.glass.quantity,
        totalM2: snapshot.glass.totalM2,
        pieceCodes: [codigo],
      });
    }
  }

  totals.totalBars += snapshot.bars.length;
  totals.totalWasteMm += snapshot.totalWasteMm || 0;
  totals.totalAccessories += snapshot.accessoryUnits || 0;

  const inferredBarLength =
    snapshot.bars[0] != null
      ? Math.round(snapshot.bars[0].usedMm + snapshot.bars[0].wasteMm)
      : null;
  if (inferredBarLength && inferredBarLength > 0) {
    barLengthCounts.set(
      inferredBarLength,
      (barLengthCounts.get(inferredBarLength) ?? 0) + 1
    );
  }

  const lineName =
    carrier.lineaComercial?.trim() ||
    carrier.nombre?.trim() ||
    codigo;
  const lineKey = snapshot.lineTemplateId || lineName;
  const existingLine = lineMeta.get(lineKey);
  if (existingLine) {
    existingLine.bars += snapshot.bars.length;
    existingLine.wasteMm += snapshot.totalWasteMm || 0;
    existingLine.accessories += snapshot.accessoryUnits || 0;
    if (!existingLine.barLengthMm && inferredBarLength) {
      existingLine.barLengthMm = inferredBarLength;
    }
  } else {
    lineMeta.set(lineKey, {
      lineName,
      proveedor: null,
      bars: snapshot.bars.length,
      wasteMm: snapshot.totalWasteMm || 0,
      accessories: snapshot.accessoryUnits || 0,
      barLengthMm: inferredBarLength,
    });
  }

  snapshot.cuts.forEach((cut) => {
    const profile = cut.label.trim() || "Perfil sin código";
    const functionLabel = cut.functionLabel.trim() || "Función";
    const lengthMm = Math.round(cut.lengthMm);
    const key = [
      snapshot.lineTemplateId,
      profile.toLowerCase(),
      functionLabel.toLowerCase(),
      String(lengthMm),
    ].join("|");
    const existing = rowMap.get(key);
    const quantity = Math.max(1, Math.round(cut.quantity));
    const totalLinealMm = lengthMm * quantity;

    if (existing) {
      existing.quantity += quantity;
      existing.totalLinealMm += totalLinealMm;
      if (!existing.pieceCodes.includes(codigo)) {
        existing.pieceCodes.push(codigo);
      }
      return;
    }

    rowMap.set(key, {
      key,
      lineTemplateId: snapshot.lineTemplateId,
      lineName,
      profile,
      functionLabel,
      lengthMm,
      quantity,
      totalLinealMm,
      pieceCodes: [codigo],
      measureExplanation: cut.measureExplanation ?? null,
    });
  });
}

function finalizePauta(
  rowMap: Map<string, ConsolidatedCubicationRow>,
  glassMap: Map<string, ConsolidatedGlassRow>,
  lineMeta: Map<
    string,
    {
      lineName: string;
      proveedor: string | null;
      bars: number;
      wasteMm: number;
      accessories: number;
      barLengthMm: number | null;
    }
  >,
  barLengthCounts: Map<number, number>,
  totals: {
    totalGlassM2: number;
    itemCountWithPauta: number;
    totalBars: number;
    totalWasteMm: number;
    totalAccessories: number;
  }
): ConsolidatedCubicationPauta {
  const rows = Array.from(rowMap.values()).sort((left, right) => {
    const byLine = left.lineName.localeCompare(right.lineName, "es");
    if (byLine !== 0) return byLine;
    const byProfile = left.profile.localeCompare(right.profile, "es");
    if (byProfile !== 0) return byProfile;
    const byFunction = left.functionLabel.localeCompare(right.functionLabel, "es");
    if (byFunction !== 0) return byFunction;
    return right.lengthMm - left.lengthMm;
  });

  const lineGroups: ConsolidatedCubicationLineGroup[] = Array.from(lineMeta.entries())
    .map(([lineTemplateId, meta]) => {
      const groupRows = rows.filter(
        (row) =>
          row.lineTemplateId === lineTemplateId ||
          (!row.lineTemplateId && row.lineName === meta.lineName)
      );
      return {
        lineTemplateId,
        lineName: meta.lineName,
        proveedor: meta.proveedor,
        rows: groupRows,
        totalLinealMm: groupRows.reduce((sum, row) => sum + row.totalLinealMm, 0),
        bars: meta.bars,
        wasteMm: meta.wasteMm,
        accessories: meta.accessories,
        barLengthMm: meta.barLengthMm,
      };
    })
    .sort((left, right) => left.lineName.localeCompare(right.lineName, "es"));

  let dominantBarLengthMm: number | null = null;
  let dominantCount = 0;
  barLengthCounts.forEach((count, lengthMm) => {
    if (count > dominantCount) {
      dominantCount = count;
      dominantBarLengthMm = lengthMm;
    }
  });

  return {
    rows,
    totalProfilesLinealMm: rows.reduce((sum, row) => sum + row.totalLinealMm, 0),
    totalGlassM2: totals.totalGlassM2,
    itemCountWithPauta: totals.itemCountWithPauta,
    totalBars: totals.totalBars,
    totalWasteMm: totals.totalWasteMm,
    totalAccessories: totals.totalAccessories,
    dominantBarLengthMm,
    lineGroups,
    glassRows: Array.from(glassMap.values()).sort(
      (a, b) => b.totalM2 - a.totalM2 || b.quantity - a.quantity
    ),
  };
}

export function buildConsolidatedCubicationPauta(
  items: readonly CotizacionWorkflowItem[]
): ConsolidatedCubicationPauta {
  const rowMap = new Map<string, ConsolidatedCubicationRow>();
  const glassMap = new Map<string, ConsolidatedGlassRow>();
  const lineMeta = new Map<
    string,
    {
      lineName: string;
      proveedor: string | null;
      bars: number;
      wasteMm: number;
      accessories: number;
      barLengthMm: number | null;
    }
  >();
  const barLengthCounts = new Map<number, number>();
  const totals = {
    totalGlassM2: 0,
    itemCountWithPauta: 0,
    totalBars: 0,
    totalWasteMm: 0,
    totalAccessories: 0,
  };

  items.forEach((item) => {
    if (item.tipoItem === "item_libre_con_valor") {
      return;
    }

    const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
    const snapshot = presentation.cubicationSnapshot;
    if (!snapshot || snapshot.cuts.length === 0) {
      return;
    }

    accumulateFromSnapshot(
      {
        codigo: item.codigo,
        lineaComercial: item.lineaComercial,
        nombre: item.nombre,
        snapshot,
      },
      rowMap,
      glassMap,
      lineMeta,
      barLengthCounts,
      totals
    );
  });

  return finalizePauta(rowMap, glassMap, lineMeta, barLengthCounts, totals);
}

/** Consolida snapshots ya resueltos (p. ej. receta viva en Revisión de despiece). */
export function buildConsolidatedCubicationPautaFromSnapshots(
  carriers: readonly SnapshotCarrier[]
): ConsolidatedCubicationPauta {
  const rowMap = new Map<string, ConsolidatedCubicationRow>();
  const glassMap = new Map<string, ConsolidatedGlassRow>();
  const lineMeta = new Map<
    string,
    {
      lineName: string;
      proveedor: string | null;
      bars: number;
      wasteMm: number;
      accessories: number;
      barLengthMm: number | null;
    }
  >();
  const barLengthCounts = new Map<number, number>();
  const totals = {
    totalGlassM2: 0,
    itemCountWithPauta: 0,
    totalBars: 0,
    totalWasteMm: 0,
    totalAccessories: 0,
  };

  carriers.forEach((carrier) => {
    accumulateFromSnapshot(
      carrier,
      rowMap,
      glassMap,
      lineMeta,
      barLengthCounts,
      totals
    );
  });

  return finalizePauta(rowMap, glassMap, lineMeta, barLengthCounts, totals);
}

export function formatConsolidatedPautaPlainText(pauta: ConsolidatedCubicationPauta) {
  if (pauta.rows.length === 0) {
    return "Sin pauta consolidada.";
  }

  const lines = [
    "Pauta consolidada",
    `Piezas con pauta: ${pauta.itemCountWithPauta}`,
    `Vidrio estimado: ${pauta.totalGlassM2.toLocaleString("es-CL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} m²`,
    `Perfiles: ${(pauta.totalProfilesLinealMm / 1000).toFixed(2)} ml`,
    "",
    "Perfil | Función | Medida mm | Cantidad | Total lineal | Línea | Piezas",
  ];

  pauta.rows.forEach((row) => {
    lines.push(
      [
        row.profile,
        row.functionLabel,
        String(row.lengthMm),
        String(row.quantity),
        `${row.totalLinealMm} mm`,
        row.lineName,
        row.pieceCodes.join(", "),
      ].join(" | ")
    );
  });

  return lines.join("\n");
}
