/**
 * Pauta consolidada de una cotización (Fase 4).
 * Agrupa cortes persistidos por línea + perfil + medida.
 */

import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

export type ConsolidatedCubicationRow = {
  key: string;
  lineTemplateId: string;
  lineName: string;
  profile: string;
  lengthMm: number;
  quantity: number;
  totalLinealMm: number;
  pieceCodes: string[];
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

export function buildConsolidatedCubicationPauta(
  items: readonly CotizacionWorkflowItem[]
): ConsolidatedCubicationPauta {
  const rowMap = new Map<string, ConsolidatedCubicationRow>();
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
  let totalGlassM2 = 0;
  let itemCountWithPauta = 0;
  let totalBars = 0;
  let totalWasteMm = 0;
  let totalAccessories = 0;
  const barLengthCounts = new Map<number, number>();

  items.forEach((item) => {
    if (item.tipoItem === "item_libre_con_valor") {
      return;
    }

    const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
    const snapshot = presentation.cubicationSnapshot;
    if (!snapshot || snapshot.cuts.length === 0) {
      return;
    }

    itemCountWithPauta += 1;
    if (snapshot.glass) {
      totalGlassM2 += snapshot.glass.totalM2;
    }

    totalBars += snapshot.bars.length;
    totalWasteMm += snapshot.totalWasteMm || 0;
    totalAccessories += snapshot.accessoryUnits || 0;

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
      item.lineaComercial?.trim() ||
      presentation.referencia.trim() ||
      item.nombre.trim() ||
      item.codigo;
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
      const profile = cut.label.trim() || "Perfil";
      const lengthMm = Math.round(cut.lengthMm);
      const key = `${snapshot.lineTemplateId}|${profile.toLowerCase()}|${lengthMm}`;
      const existing = rowMap.get(key);
      const quantity = Math.max(1, Math.round(cut.quantity));
      const totalLinealMm = lengthMm * quantity;

      if (existing) {
        existing.quantity += quantity;
        existing.totalLinealMm += totalLinealMm;
        if (!existing.pieceCodes.includes(item.codigo)) {
          existing.pieceCodes.push(item.codigo);
        }
        return;
      }

      rowMap.set(key, {
        key,
        lineTemplateId: snapshot.lineTemplateId,
        lineName,
        profile,
        lengthMm,
        quantity,
        totalLinealMm,
        pieceCodes: [item.codigo],
      });
    });
  });

  const rows = Array.from(rowMap.values()).sort((left, right) => {
    const byLine = left.lineName.localeCompare(right.lineName, "es");
    if (byLine !== 0) return byLine;
    const byProfile = left.profile.localeCompare(right.profile, "es");
    if (byProfile !== 0) return byProfile;
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
    totalGlassM2,
    itemCountWithPauta,
    totalBars,
    totalWasteMm,
    totalAccessories,
    dominantBarLengthMm,
    lineGroups,
  };
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
    "Perfil | Medida mm | Cantidad | Total lineal | Línea | Piezas",
  ];

  pauta.rows.forEach((row) => {
    lines.push(
      [
        row.profile,
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
