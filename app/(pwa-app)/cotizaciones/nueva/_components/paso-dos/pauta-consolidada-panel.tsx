"use client";

import { useMemo, useState } from "react";
import { LuCopy, LuCheck } from "react-icons/lu";

import {
  buildConsolidatedCubicationPauta,
  formatConsolidatedPautaPlainText,
} from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

import d from "../paso-dos-panel-desktop.module.css";

type Props = {
  items: readonly CotizacionWorkflowItem[];
};

function formatMm(value: number) {
  return `${Math.round(value).toLocaleString("es-CL")} mm`;
}

export function PautaConsolidadaPanel({ items }: Props) {
  const pauta = useMemo(() => buildConsolidatedCubicationPauta(items), [items]);
  const [copied, setCopied] = useState(false);

  if (pauta.rows.length === 0) {
    return null;
  }

  const handleCopy = async () => {
    const text = formatConsolidatedPautaPlainText(pauta);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className={d.consolidatedPauta} aria-label="Pauta consolidada">
      <header className={d.consolidatedPautaHeader}>
        <div>
          <p className={d.consolidatedPautaEyebrow}>Cubicación</p>
          <h3>Pauta consolidada</h3>
          <p>
            {pauta.itemCountWithPauta}{" "}
            {pauta.itemCountWithPauta === 1 ? "pieza" : "piezas"} ·{" "}
            {(pauta.totalProfilesLinealMm / 1000).toFixed(2)} ml perfiles ·{" "}
            {pauta.totalGlassM2.toLocaleString("es-CL", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            m² vidrio
          </p>
        </div>
        <button type="button" className={d.consolidatedPautaCopy} onClick={handleCopy}>
          {copied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </header>

      <div className={d.consolidatedPautaTable} role="table" aria-label="Cortes consolidados">
        <div className={d.consolidatedPautaHead} role="row">
          <span role="columnheader">Perfil</span>
          <span role="columnheader">Medida</span>
          <span role="columnheader">Cant.</span>
          <span role="columnheader">Total</span>
          <span role="columnheader">Línea</span>
        </div>
        {pauta.rows.map((row) => (
          <div key={row.key} className={d.consolidatedPautaRow} role="row">
            <strong role="cell">{row.profile}</strong>
            <span role="cell">{formatMm(row.lengthMm)}</span>
            <span role="cell">{row.quantity}</span>
            <span role="cell">{formatMm(row.totalLinealMm)}</span>
            <span role="cell" title={row.pieceCodes.join(", ")}>
              {row.lineName}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
