"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuCopy, LuCheck } from "react-icons/lu";

import {
  buildConsolidatedCubicationPauta,
  formatConsolidatedPautaPlainText,
} from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { resolveSupplierPresentationsForQuote } from "@/features/proveedor-catalogos/services/supplier-presentations.client";
import { resolveSupplierFinishName } from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";
import type { FabricacionTrabajoPresentationSelection } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

import d from "../paso-dos-panel-desktop.module.css";

type Props = {
  items: readonly CotizacionWorkflowItem[];
};

function formatMm(value: number) {
  return `${Math.round(value).toLocaleString("es-CL")} mm`;
}

export function PautaConsolidadaPanel({ items }: Props) {
  const resolutionRequests = useMemo(() => items.flatMap((item) => {
    const snapshot = item.fabricacionSnapshot;
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
    if (!snapshot?.supplierFamilyKey || !meta.catalogLineKey || snapshot.result.perfiles.length === 0) return [];
    return [{
      itemId: String(item.id),
      catalogLineKey: meta.catalogLineKey,
      familyKey: snapshot.supplierFamilyKey,
      finishName: resolveSupplierFinishName(meta.catalogTerminacion, meta.colorHex),
      technicalCodes: [...new Set(snapshot.result.perfiles.map((row) => row.codigoPerfil.trim()).filter(Boolean))],
    }];
  }), [items]);
  const resolutionKey = useMemo(() => JSON.stringify(resolutionRequests), [resolutionRequests]);
  const [resolution, setResolution] = useState<{
    key: string;
    enabled: boolean;
    selections: Record<string, FabricacionTrabajoPresentationSelection[]>;
  } | null>(null);

  useEffect(() => {
    if (resolutionRequests.length === 0) {
      setResolution(null);
      return;
    }
    let active = true;
    void resolveSupplierPresentationsForQuote(resolutionRequests).then((result) => {
      if (!active) return;
      setResolution({
        key: resolutionKey,
        enabled: result?.enabled === true,
        selections: result?.selections ?? {},
      });
    });
    return () => { active = false; };
  }, [resolutionKey, resolutionRequests]);

  const currentResolution = resolution?.key === resolutionKey ? resolution : null;
  const pauta = useMemo(() => buildConsolidatedCubicationPauta(items, {
    supplierPresentationResolutionEnabled: currentResolution?.enabled,
    supplierPresentationSelections: currentResolution?.selections,
  }), [currentResolution, items]);
  const [copied, setCopied] = useState(false);
  const resolvingPresentation = resolutionRequests.length > 0 && currentResolution === null;
  const missingItem = pauta.trabajoSnapshot?.missingPresentations?.[0];
  const missingQuoteItem = missingItem ? items.find((item) => String(item.id) === missingItem.itemId) : null;
  const missingLineMeta = missingQuoteItem ? decodeCotizacionItemPresentationMeta(missingQuoteItem.observaciones) : null;
  const missingFamilyKey = missingQuoteItem?.fabricacionSnapshot?.supplierFamilyKey;

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
          <p className={d.consolidatedPautaEyebrow}>Fabricación</p>
          <h3>Pauta del trabajo</h3>
          <p>{pauta.itemCountWithPauta} {pauta.itemCountWithPauta === 1 ? "pieza" : "piezas"} con despiece</p>
          <strong className={d.consolidatedPautaBars}>
            {resolvingPresentation ? "Resolviendo presentaciones…" : `${pauta.trabajoSnapshot?.totalBars ?? pauta.totalBars} barras sugeridas`}
          </strong>
        </div>
        <button type="button" className={d.consolidatedPautaCopy} onClick={handleCopy}>
          {copied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </header>

      <details className={d.consolidatedPautaDetails}>
        <summary>Ver perfiles y medidas</summary>
      <div className={d.consolidatedPautaTable} role="table" aria-label="Perfiles y medidas consolidados">
        <div className={d.consolidatedPautaHead} role="row">
          <span role="columnheader">Perfil</span>
          <span role="columnheader">Función</span>
          <span role="columnheader">Medida</span>
          <span role="columnheader">Cant.</span>
          <span role="columnheader">Total</span>
          <span role="columnheader">Línea</span>
        </div>
        {pauta.rows.map((row) => (
          <div key={row.key} className={d.consolidatedPautaRow} role="row">
            <strong role="cell">{row.profile}</strong>
            <span role="cell" title={row.measureExplanation ?? undefined}>
              {row.functionLabel}
            </span>
            <span role="cell">{formatMm(row.lengthMm)}</span>
            <span role="cell">{row.quantity}</span>
            <span role="cell">{formatMm(row.totalLinealMm)}</span>
            <span role="cell" title={row.pieceCodes.join(", ")}>
              {row.lineName}
            </span>
          </div>
        ))}
      </div>
      </details>
      {pauta.trabajoSnapshot ? (
        <details className={d.consolidatedPautaDistribution}>
          <summary>{pauta.trabajoSnapshot.missingPresentations?.length ? "Ver pauta y faltantes de presentación" : "Ver cortes distribuidos por barra"}</summary>
          {pauta.trabajoSnapshot.missingPresentations?.map((missing) => (
            <p key={`${missing.itemId}-${missing.technicalCode}-${missing.finishKey}`} role="status">
              {missing.technicalCode}: {missing.reason}
            </p>
          ))}
          {missingLineMeta?.lineTemplateId && missingFamilyKey?.startsWith("veratec:") ? (
            <p>
              <Link href={`/configuracion/empresa/mis-precios?supplier=veratec&family=${encodeURIComponent(missingFamilyKey)}&lineTemplateId=${encodeURIComponent(missingLineMeta.lineTemplateId)}`} target="_blank" rel="noopener noreferrer">Completar presentación o costo</Link>
              {" · "}
              <Link href={`/configuracion/empresa/lineas-precios/${encodeURIComponent(missingLineMeta.lineTemplateId)}/fabricacion`} target="_blank" rel="noopener noreferrer">Configurar fabricación</Link>
            </p>
          ) : null}
          <ol>
            {pauta.trabajoSnapshot.bars.map((bar) => (
              <li key={`${bar.materialKey}-${bar.acabadoKey}-${bar.largoComercialMm}-${bar.indice}`}>
                <strong>{bar.codigoPerfil} · Barra {bar.indice} · {formatMm(bar.largoComercialMm)}</strong>
                <span>
                  {bar.cortes.map((cut) => `${cut.codigoItem}: ${cut.funcion} ${formatMm(cut.largoMm)}`).join(" · ")}
                </span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
