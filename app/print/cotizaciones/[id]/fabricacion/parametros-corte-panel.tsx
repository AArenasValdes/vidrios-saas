"use client";

import { useCallback, useRef, useState } from "react";
import { LuScissors } from "react-icons/lu";

import { useAuth } from "@/features/auth/hooks/useAuth";
import type { FabricacionParametrosCorteConfirmados } from "@/features/fabricacion/services/fabricacion-parametros-corte.service";
import s from "./parametros-corte-panel.module.css";

type SettingsPayload = {
  organizationId: number;
  perdidaCorteMm: number;
  despunteInicialMm: number;
  procedimiento: "por_pieza";
  confirmedBy: string;
  confirmedAt: string;
};
type ApiResponse = { settings?: SettingsPayload | null; error?: string };

type Props = {
  eligibleItemCount: number;
  onPreviewThisJob: (parameters: FabricacionParametrosCorteConfirmados) => Promise<{ updated: number; skipped: number; bars: number; cuts: number; physicalPending: number }>;
  onSaveJobPreview: () => Promise<void>;
};

export function ParametrosCortePanel({ eligibleItemCount, onPreviewThisJob, onSaveJobPreview }: Props) {
  const { user, rol } = useAuth();
  const canManage = rol === "admin" || rol === "tecnico";
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [kerf, setKerf] = useState("");
  const [trim, setTrim] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const saveInFlight = useRef(false);
  const [preview, setPreview] = useState<{ updated: number; skipped: number; bars: number; cuts: number; physicalPending: number } | null>(null);

  const valuesMatchSaved = Boolean(
    settings &&
    kerf.trim() !== "" &&
    trim.trim() !== "" &&
    Number(kerf) === settings.perdidaCorteMm &&
    Number(trim) === settings.despunteInicialMm
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/configuracion/fabricacion/parametros-corte", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => null) as ApiResponse | null;
      if (!response.ok) throw new Error(payload?.error ?? "No pudimos cargar los parámetros del taller.");
      setSettings(payload?.settings ?? null);
      setLoaded(true);
      setKerf(payload?.settings ? String(payload.settings.perdidaCorteMm) : "");
      setTrim(payload?.settings ? String(payload.settings.despunteInicialMm) : "");
      setError(null);
      setPreview(null);
    } catch (loadError) {
      setLoaded(true);
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar los parámetros del taller.");
    } finally { setLoading(false); }
  }, []);

  const readValues = (requireConfirmation = true) => {
    if (!kerf.trim() || !trim.trim()) {
      throw new Error("Ingresa ambos valores en milímetros. Usa 0 solo si el taller confirmó que no hay pérdida o despunte.");
    }
    const kerfMm = Number(kerf);
    const initialTrimMm = Number(trim);
    if (!Number.isInteger(kerfMm) || kerfMm < 0 || kerfMm > 20 || !Number.isInteger(initialTrimMm) || initialTrimMm < 0 || initialTrimMm > 1000) {
      throw new Error("Usa milímetros enteros: pérdida entre 0 y 20; despunte entre 0 y 1.000.");
    }
    if (requireConfirmation && !confirmed) throw new Error("Confirma el procedimiento habitual antes de continuar.");
    return { kerfMm, initialTrimMm };
  };

  const parametersForJob = (values: { kerfMm: number; initialTrimMm: number }): FabricacionParametrosCorteConfirmados => ({
    perdidaCorteMm: values.kerfMm,
    despunteInicialMm: values.initialTrimMm,
    procedimiento: "por_pieza",
    fuente: "Ajuste confirmado solo para este trabajo.",
    largosComercialesConfirmados: false,
    confirmedBy: user?.id ?? null,
    confirmedAt: new Date().toISOString(),
    organizationId: settings?.organizationId ?? null,
  });

  const saveForWorkshop = async () => {
    if (saveInFlight.current) return;
    setError(null); setNotice(null); setSavedNotice(null);
    try {
      const values = readValues(!valuesMatchSaved);
      if (valuesMatchSaved) {
        setSavedNotice("Los parámetros ya estaban guardados.");
        setOpen(false);
        setConfirmed(false);
        setPreview(null);
        return;
      }
      saveInFlight.current = true;
      setSaving(true);
      const response = await fetch("/api/configuracion/fabricacion/parametros-corte", {
        method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perdidaCorteMm: values.kerfMm, despunteInicialMm: values.initialTrimMm, procedimiento: "por_pieza", confirmacionExplicita: true }),
      });
      const payload = await response.json().catch(() => null) as ApiResponse | null;
      if (!response.ok || !payload?.settings) throw new Error(payload?.error ?? "No pudimos guardar los parámetros.");
      setSettings(payload.settings);
      setLoaded(true);
      setSavedNotice("Parámetros guardados para el taller. Las cotizaciones anteriores no cambiaron.");
      setConfirmed(false);
      setPreview(null);
      setOpen(false);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No pudimos guardar los parámetros."); }
    finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  const previewForThisJob = async () => {
    setError(null); setNotice(null);
    try {
      const values = readValues(!valuesMatchSaved);
      setApplying(true);
      const result = await onPreviewThisJob(parametersForJob(values));
      setPreview(result);
      setNotice(result.updated > 0
        ? `Vista previa: ${result.updated} componente${result.updated === 1 ? "" : "s"}, ${result.bars} barras y ${result.cuts} cortes. ${result.physicalPending ? `La revisión operativa sigue pendiente en ${result.physicalPending} componente(s).` : ""}${result.skipped ? ` ${result.skipped} componente(s) no compatibles quedaron sin cambios.` : ""}`
        : "No encontramos componentes con receta exacta y longitudes guardadas para recalcular.");
      setConfirmed(false);
    } catch (applyError) { setError(applyError instanceof Error ? applyError.message : "No pudimos recalcular esta pauta."); }
    finally { setApplying(false); }
  };

  const confirmJobPreview = async () => {
    setError(null); setNotice(null); setApplying(true);
    try {
      await onSaveJobPreview();
      setNotice("Pauta guardada solo en este trabajo. La configuración del taller no cambió.");
      setPreview(null);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No pudimos guardar la pauta recalculada."); }
    finally { setApplying(false); }
  };

  const toggleOpen = () => {
    const nextOpen = !open;
    if (nextOpen) setSavedNotice(null);
    setOpen(nextOpen);
    if (nextOpen && !loaded && !loading) void load();
  };

  return (
    <section className={s.panel} aria-label="Parámetros de corte">
      <div className={s.summary}>
        <span className={s.icon} aria-hidden><LuScissors /></span>
        <div className={s.summaryCopy}>
          <strong>Parámetros de corte</strong>
          <span>{settings ? `${settings.perdidaCorteMm} mm de pérdida · ${settings.despunteInicialMm} mm de despunte por tira` : "Sin parámetros del taller"}</span>
        </div>
        <button type="button" className={s.open} onClick={toggleOpen} aria-expanded={open} disabled={saving}>{open ? "Cerrar" : settings ? "Ajustar" : "Configurar cortes"}</button>
      </div>
      {savedNotice ? <p role="status" aria-live="polite" className={s.notice}>{savedNotice}</p> : null}
      {open ? <div className={s.form}>
        {loading ? <p className={s.muted}>Cargando configuración…</p> : <>
          <p className={s.muted}>Solo para perfiles de aluminio con pauta compatible. Los largos de compra se conservan por perfil; PVC y otros procesos no cambian.</p>
          <div className={s.fields}>
            <label><span>Pérdida por corte (mm)</span><input type="number" inputMode="numeric" min={0} max={20} step={1} value={kerf} onChange={(event) => { setKerf(event.target.value); setPreview(null); setSavedNotice(null); setError(null); }} placeholder="Ej. 3" disabled={saving} /></label>
            <label><span>Despunte inicial por tira (mm)</span><input type="number" inputMode="numeric" min={0} max={1000} step={1} value={trim} onChange={(event) => { setTrim(event.target.value); setPreview(null); setSavedNotice(null); setError(null); }} placeholder="Ej. 10" disabled={saving} /></label>
          </div>
          <label className={s.confirm}><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setPreview(null); }} disabled={saving} /><span>Confirmo que estos valores corresponden al procedimiento habitual de corte por pieza del taller.</span></label>
          {error ? <p role="alert" className={s.error}>{error}</p> : null}
          {notice ? <p role="status" className={s.notice}>{notice}</p> : null}
          {canManage ? <div className={s.actions}>
            <button type="button" onClick={() => void saveForWorkshop()} disabled={saving || applying || loading || (!confirmed && !valuesMatchSaved)}>{saving ? "Guardando…" : "Guardar para mi taller"}</button>
            {!preview ? <button type="button" className={s.secondary} onClick={() => void previewForThisJob()} disabled={saving || applying || loading || (!confirmed && !valuesMatchSaved) || eligibleItemCount === 0}>{applying ? "Calculando…" : "Previsualizar en este trabajo"}</button> : <button type="button" className={s.secondary} onClick={() => void confirmJobPreview()} disabled={saving || applying || loading || preview.updated === 0}>{applying ? "Guardando…" : "Confirmar y usar solo aquí"}</button>}
          </div> : <p className={s.muted}>Solo administradores y maestros pueden guardar parámetros de corte.</p>}
          <p className={s.muted}>{eligibleItemCount} componente{eligibleItemCount === 1 ? "" : "s"} con snapshot revisable en esta cotización.</p>
        </>}
      </div> : null}
    </section>
  );
}
