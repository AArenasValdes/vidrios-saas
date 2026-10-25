"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import { loadMyPrices, saveMyPriceChange, type MyPresentationPrice, type MyPricesCatalog } from "@/features/proveedor-catalogos/services/mis-precios.client.service";
import styles from "./costo-tecnico-parcial-panel.module.css";

type PanelResponse = {
  enabled?: boolean;
  canCalculate?: boolean;
  canRefresh?: boolean;
  canConfigure?: boolean;
  snapshotIsStale?: boolean;
  snapshot?: TechnicalCostSnapshot | null;
  error?: string;
};

type PendingPriceChoice = MyPresentationPrice & { providerKey: string; providerName: string };

function matchesPendingTechnicalCode(row: MyPresentationPrice, technicalCode: string) {
  const code = technicalCode.trim().toLocaleLowerCase("es-CL");
  if (!code) return false;
  if ((row.technicalCodes ?? []).some((value) => value.trim().toLocaleLowerCase("es-CL") === code)) return true;
  const sku = row.sku.trim().toLocaleLowerCase("es-CL");
  return sku === code || (sku.startsWith(code) && /^\d{3}$/.test(sku.slice(code.length)));
}

function formatMoney(value: number | null, currency: string | null) {
  if (value == null || !currency || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function CostoTecnicoParcialPanel({ quoteId, onSnapshotChange }: { quoteId: string; onSnapshotChange?: (snapshot: TechnicalCostSnapshot | null) => void }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [canCalculate, setCanCalculate] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const [canConfigure, setCanConfigure] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [snapshot, setSnapshot] = useState<TechnicalCostSnapshot | null>(null);
  const [snapshotIsStale, setSnapshotIsStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [priceCatalog, setPriceCatalog] = useState<MyPricesCatalog | null>(null);
  const [activePriceEntry, setActivePriceEntry] = useState<string | null>(null);
  const [priceChoices, setPriceChoices] = useState<PendingPriceChoice[]>([]);
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [priceEditorBusy, setPriceEditorBusy] = useState(false);
  const [priceEditorMessage, setPriceEditorMessage] = useState<string | null>(null);
  const initialCalculationStarted = useRef(false);

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
        setCanRefresh(Boolean(payload.canRefresh));
        setCanConfigure(Boolean(payload.canConfigure));
        setSnapshot(payload.snapshot ?? null);
        setSnapshotIsStale(Boolean(payload.snapshotIsStale));
        onSnapshotChange?.(payload.snapshot ?? null);
      } catch (error) {
        if (alive) setMessage(error instanceof Error ? error.message : "No pudimos cargar el costo parcial.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [onSnapshotChange, quoteId]);

  const calculate = useCallback(async (refreshExisting = false) => {
    setBusy(true);
    setMessage(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/costo-tecnico-parcial`, {
        method: "POST",
        ...(refreshExisting ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh: true }) } : {}),
      });
      const payload = await response.json() as PanelResponse;
      if (!response.ok) throw new Error(payload.error || "No pudimos calcular el costo parcial.");
      setSnapshot(payload.snapshot ?? null);
      setSnapshotIsStale(Boolean(payload.snapshotIsStale));
      onSnapshotChange?.(payload.snapshot ?? null);
      setCanCalculate(false);
      setCanRefresh(Boolean(payload.snapshot));
      if (refreshExisting) setNotice("Costos actualizados con la pauta y los precios vigentes.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos calcular el costo parcial.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [onSnapshotChange, quoteId]);

  useEffect(() => {
    if (!canCalculate || snapshot || initialCalculationStarted.current) return;
    initialCalculationStarted.current = true;
    void calculate();
  }, [calculate, canCalculate, snapshot]);

  const openPendingPrice = async (entryKey: string, technicalCode: string) => {
    setActivePriceEntry(entryKey);
    setPriceEditorMessage(null);
    setSelectedPriceId("");
    setPriceInput("");
    setPriceEditorBusy(true);
    try {
      const catalog = priceCatalog ?? await loadMyPrices();
      setPriceCatalog(catalog);
      const matches = catalog.providers.flatMap((provider) => provider.presentations
        .filter((row) => matchesPendingTechnicalCode(row, technicalCode))
        .map((row) => ({ ...row, providerKey: provider.providerKey, providerName: provider.providerName })));
      setPriceChoices(matches);
      if (matches.length === 1) {
        setSelectedPriceId(matches[0].presentationId);
        setPriceInput(matches[0].ownNetPrice == null ? "" : String(Math.round(matches[0].ownNetPrice)));
      }
      if (matches.length === 0) setPriceEditorMessage("No encontramos una presentación asociada a este código. Puedes revisar Mis precios.");
    } catch (error) {
      setPriceEditorMessage(error instanceof Error ? error.message : "No pudimos cargar tus presentaciones.");
    } finally {
      setPriceEditorBusy(false);
    }
  };

  const selectedPriceChoice = priceChoices.find((choice) => choice.presentationId === selectedPriceId) ?? null;

  const savePendingPrice = async () => {
    if (!selectedPriceChoice) return;
    const netPrice = Number(priceInput.replace(/\D/g, ""));
    if (!Number.isFinite(netPrice) || netPrice <= 0) {
      setPriceEditorMessage("Ingresa un precio neto mayor que cero.");
      return;
    }
    setPriceEditorBusy(true);
    setPriceEditorMessage(null);
    try {
      await saveMyPriceChange({
        kind: "override",
        providerKey: selectedPriceChoice.providerKey,
        presentationId: selectedPriceChoice.presentationId,
        netPrice,
        currency: selectedPriceChoice.currency ?? "CLP",
      });
      setPriceCatalog((current) => current ? ({
        providers: current.providers.map((provider) => provider.providerKey !== selectedPriceChoice.providerKey ? provider : ({
          ...provider,
          presentations: provider.presentations.map((row) => row.presentationId === selectedPriceChoice.presentationId
            ? { ...row, ownNetPrice: netPrice, effective: { unitNetPrice: netPrice, source: "organization_override" as const, currency: selectedPriceChoice.currency ?? "CLP" } }
            : row),
        })),
      }) : current);
      const refreshed = await calculate(true);
      setNotice(refreshed
        ? "Precio guardado y costo actualizado para esta cotización. El precio de venta no cambia."
        : "Precio guardado para próximas cotizaciones. No pudimos actualizar el costo de esta cotización.");
    } catch (error) {
      setPriceEditorMessage(error instanceof Error ? error.message : "No pudimos guardar el precio.");
    } finally {
      setPriceEditorBusy(false);
    }
  };

  if (!enabled && !message) return <section className={styles.panel} aria-label="Costo estimado de materiales" data-testid="supplier-technical-cost-panel">
    <h2>Costo estimado de materiales</h2>
    <p className={styles.empty} role="status">{loading ? "Cargando costos…" : "No hay un costo técnico disponible para esta cotización."}</p>
  </section>;
  const knownTotal = formatMoney(snapshot?.knownNetTotal ?? null, snapshot?.currency ?? null);
  const presentationDescription = (line: TechnicalCostSnapshot["lines"][number]) =>
    line.quantity != null
      ? `${line.finishName} · ${line.quantity} ${line.purchaseUnit}`
      : `${line.finishName} · ${((line.commercialLengthMm ?? 0) / 1000).toLocaleString("es-CL")} m · ${line.bars} ${line.bars === 1 ? "tira" : "tiras"}`;
  const origin = snapshot?.priceOrigin === "none" ? "Sin precios" : snapshot?.priceOrigin === "mixed" ? "Mixto" : snapshot?.priceOrigin === "own" ? "Mis precios" : "Referencial";
  const status = snapshot?.status === "no_data" ? "Sin datos" : snapshot?.status === "complete" ? "Completo" : "Parcial";

  return (
    <section className={styles.panel} aria-label="Costo estimado de materiales" data-testid="supplier-technical-cost-panel">
      <header className={styles.header}>
        <div>
          <h2>Costo estimado de materiales</h2>
        </div>
        {canCalculate ? <button type="button" className={styles.action} onClick={() => void calculate()} disabled={busy}>{busy ? "Calculando costo…" : message ? "Reintentar cálculo" : "Calcular costo"}</button> : canRefresh ? <button type="button" className={styles.action} onClick={() => void calculate(true)} disabled={busy}>{busy ? "Actualizando…" : "Actualizar costos"}</button> : null}
      </header>
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {!snapshot ? (
        <p className={styles.empty} role="status" aria-live="polite">{busy ? "Calculando con la pauta guardada…" : message ? "Puedes volver a intentarlo cuando quieras." : canCalculate ? "El costo se calcula con los precios vigentes." : "El costo aparecerá cuando haya una pauta guardada."}</p>
      ) : (
        <>
          <div className={styles.summary}>
            <div>
              <span>{snapshotIsStale ? "Costo guardado (desactualizado)" : "Total neto conocido"}</span>
              <strong>{knownTotal ?? "Sin monto calculable"}</strong>
              <small>{origin} · {status}</small>
            </div>
            <div>
              <span>Materiales</span>
              <strong>{new Set(snapshot.lines.map((line) => line.supplierTechnicalCode ?? line.technicalCode)).size} insumos valorizados</strong>
              <small>{snapshot.missing.length} pendientes</small>
            </div>
          </div>
          {snapshotIsStale ? (
            <p className={styles.staleNotice} role="status">
              {canRefresh
                ? "Cambió la pauta o el proveedor desde este cálculo. Actualiza el costo para revisar el valor vigente; el monto guardado no se ha recalculado."
                : "Este monto corresponde a una pauta anterior y se conserva como referencia histórica. No hay una pauta guardada disponible para recalcularlo."}
            </p>
          ) : null}
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
              <ul>{snapshot.missing.map((entry, index) => {
                const entryKey = `${entry.technicalCode ?? "missing"}-${entry.description}-${index}`;
                const isEditing = activePriceEntry === entryKey;
                return (
                <li key={entryKey}>
                  <div className={styles.pendingIdentity}>
                    <div>
                      <strong>{entry.description}</strong>
                      {entry.technicalCode ? <span>Código técnico: {entry.technicalCode}</span> : null}
                      {entry.quantity != null ? <span>{entry.quantity} {entry.unit ?? "unidad"}</span> : null}
                      {entry.reason ? <p className={styles.pendingReason}>{entry.reason}</p> : null}
                    </div>
                    {canConfigure && entry.technicalCode ? <button type="button" className={styles.priceAction} onClick={() => isEditing ? setActivePriceEntry(null) : void openPendingPrice(entryKey, entry.technicalCode!)} aria-expanded={isEditing}>
                      {isEditing ? "Cerrar" : "Agregar mi precio"}
                    </button> : null}
                  </div>
                  {isEditing ? <div className={styles.priceEditor}>
                    {priceEditorBusy ? <p role="status">Cargando…</p> : priceChoices.length > 1 ? <label className={styles.priceField}>
                      <span>Presentación</span>
                      <select value={selectedPriceId} onChange={(event) => {
                        const choice = priceChoices.find((candidate) => candidate.presentationId === event.target.value);
                        setSelectedPriceId(event.target.value);
                        setPriceInput(choice?.ownNetPrice == null ? "" : String(Math.round(choice.ownNetPrice)));
                        setPriceEditorMessage(null);
                      }}>
                        <option value="">Elige proveedor, acabado y largo</option>
                        {priceChoices.map((choice) => <option key={`${choice.providerKey}-${choice.presentationId}`} value={choice.presentationId}>
                          {choice.providerName} · {choice.sku}{choice.finish ? ` · ${choice.finish}` : ""}{choice.commercialLengthMm ? ` · ${(choice.commercialLengthMm / 1000).toLocaleString("es-CL")} m` : ` · ${choice.purchaseUnit}`}
                        </option>)}
                      </select>
                    </label> : selectedPriceChoice ? <p className={styles.priceChoice}>
                      {selectedPriceChoice.providerName} · {selectedPriceChoice.sku}{selectedPriceChoice.finish ? ` · ${selectedPriceChoice.finish}` : ""}{selectedPriceChoice.commercialLengthMm ? ` · ${(selectedPriceChoice.commercialLengthMm / 1000).toLocaleString("es-CL")} m` : ` · ${selectedPriceChoice.purchaseUnit}`}
                    </p> : null}
                    {selectedPriceChoice ? <label className={styles.priceField}>
                      <span>Precio neto por presentación ({selectedPriceChoice.currency ?? "CLP"})</span>
                      <input inputMode="numeric" autoComplete="off" value={priceInput} onChange={(event) => { setPriceInput(event.target.value.replace(/\D/g, "")); setPriceEditorMessage(null); }} placeholder="Ej. 31.500" />
                    </label> : null}
                    {priceEditorMessage ? <p className={styles.priceEditorMessage} role="status">{priceEditorMessage}</p> : null}
                    {selectedPriceChoice ? <button type="button" className={styles.priceSave} onClick={() => void savePendingPrice()} disabled={priceEditorBusy || busy}>
                      {priceEditorBusy || busy ? "Guardando…" : "Guardar y actualizar esta cotización"}
                    </button> : null}
                    {!priceEditorBusy && priceChoices.length === 0 ? <Link className={styles.priceLink} href="/configuracion/empresa/mis-precios">Abrir Mis precios</Link> : null}
                  </div> : null}
                </li>
              ); })}</ul>
            ) : <p>Sin materiales pendientes.</p>}
          </div>
          </> : null}
          {snapshot.missing.length > 0 ? <p className={styles.pendingNote}>El costo no incluye los materiales pendientes.</p> : null}
        </>
      )}
    </section>
  );
}
