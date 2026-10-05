"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import styles from "./costo-tecnico-parcial-panel.module.css";

type PanelResponse = {
  enabled?: boolean;
  canCalculate?: boolean;
  canConfigure?: boolean;
  snapshot?: TechnicalCostSnapshot | null;
  error?: string;
};

function formatMoney(value: number | null, currency: string | null) {
  if (value == null || !currency || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function CostoTecnicoParcialPanel({ quoteId, onSnapshotChange }: { quoteId: string; onSnapshotChange?: (snapshot: TechnicalCostSnapshot | null) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [canCalculate, setCanCalculate] = useState(false);
  const [canConfigure, setCanConfigure] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [snapshot, setSnapshot] = useState<TechnicalCostSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/costo-tecnico-parcial`, { cache: "no-store" });
        if (response.status === 404) return;
        const payload = await response.json() as PanelResponse;
        if (!response.ok) throw new Error(payload.error || "No pudimos cargar el costo parcial.");
        if (!alive) return;
        setEnabled(Boolean(payload.enabled));
        setCanCalculate(Boolean(payload.canCalculate));
        setCanConfigure(Boolean(payload.canConfigure));
        setSnapshot(payload.snapshot ?? null);
        onSnapshotChange?.(payload.snapshot ?? null);
      } catch (error) {
        if (alive) setMessage(error instanceof Error ? error.message : "No pudimos cargar el costo parcial.");
      }
    }
    void load();
    return () => { alive = false; };
  }, [onSnapshotChange, quoteId]);

  const calculate = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/costo-tecnico-parcial`, { method: "POST" });
      const payload = await response.json() as PanelResponse;
      if (!response.ok) throw new Error(payload.error || "No pudimos calcular el costo parcial.");
      setSnapshot(payload.snapshot ?? null);
      onSnapshotChange?.(payload.snapshot ?? null);
      setCanCalculate(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos calcular el costo parcial.");
    } finally {
      setBusy(false);
    }
  }, [onSnapshotChange, quoteId]);

  if (!enabled && !message) return null;
  const knownTotal = formatMoney(snapshot?.knownNetTotal ?? null, snapshot?.currency ?? null);
  const presentationDescription = (line: TechnicalCostSnapshot["lines"][number]) =>
    line.quantity != null
      ? `${line.finishName} · ${line.quantity} ${line.purchaseUnit}`
      : `${line.finishName} · ${((line.commercialLengthMm ?? 0) / 1000).toLocaleString("es-CL")} m · ${line.bars} ${line.bars === 1 ? "barra" : "barras"}`;
  const origin = snapshot?.priceOrigin === "none" ? "Sin precios" : snapshot?.priceOrigin === "mixed" ? "Mixto" : snapshot?.priceOrigin === "own" ? "Mis precios" : "Referencial";
  const status = snapshot?.status === "no_data" ? "Sin datos" : snapshot?.status === "complete" ? "Completo" : "Parcial";

  return (
    <section className={styles.panel} aria-label="Costo estimado de materiales" data-testid="supplier-technical-cost-panel">
      <header className={styles.header}>
        <div>
          <h2>Costo estimado de materiales</h2>
        </div>
        {canCalculate ? <button type="button" className={styles.action} onClick={() => void calculate()} disabled={busy}>{busy ? "Calculando…" : "Calcular costo"}</button> : null}
      </header>
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      {!snapshot ? (
        <p className={styles.empty}>El cálculo usa los cortes ya guardados en esta cotización. Los perfiles sin presentación o precio compatible quedan pendientes.</p>
      ) : (
        <>
          <div className={styles.summary}>
            <div>
              <span>Total neto conocido</span>
              <strong>{knownTotal ?? "Sin monto calculable"}</strong>
              <small>{origin} · {status}</small>
            </div>
            <div>
              <span>Materiales</span>
              <strong>{new Set(snapshot.lines.map((line) => line.supplierTechnicalCode ?? line.technicalCode)).size} insumos valorizados</strong>
              <small>{snapshot.missing.length} pendientes</small>
            </div>
          </div>
          <div className={styles.controls}>
            <button type="button" className={styles.detailsButton} onClick={() => setShowMaterials((value) => !value)} aria-expanded={showMaterials}>{showMaterials ? "Ocultar materiales" : "Ver materiales"}</button>
            {canConfigure ? <Link href="/configuracion/empresa/mis-precios">Configurar mis precios</Link> : null}
          </div>
          {showMaterials ? <><div className={styles.materials}>
            {snapshot.lines.map((line, index) => (
              <div className={styles.materialRow} key={`${line.technicalCode}-${line.finishCode}-${index}`}>
                <div>
                  <strong>{line.technicalName}</strong>
                  <span>{presentationDescription(line)}</span>
                  <span>Precio: {line.effectivePriceSource === "organization_override" ? "Mi precio" : line.effectivePriceSource === "provider_adjustment" ? "Mi ajuste" : "Referencial"}</span>
                </div>
                <strong>{formatMoney(line.lineNet, line.currency) ?? "Sin precio"}</strong>
              </div>
            ))}
          </div>
          <div className={styles.details}>
            <h3>Materiales pendientes</h3>
            {snapshot.missing.length ? (
              <ul>{snapshot.missing.map((entry, index) => (
                <li key={`${entry.technicalCode ?? "missing"}-${entry.description}-${index}`}>
                  <strong>{entry.description}</strong>
                  {entry.quantity != null ? <span>{entry.quantity} {entry.unit ?? "unidad"}</span> : null}
                </li>
              ))}</ul>
            ) : <p>Sin materiales pendientes.</p>}
          </div>
          </> : null}
          {snapshot.missing.length > 0 ? <p className={styles.pendingNote}>El costo no incluye los materiales pendientes.</p> : null}
        </>
      )}
    </section>
  );
}
