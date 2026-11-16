"use client";

import { useCallback, useRef, useState } from "react";
import { LuChevronDown, LuSettings2 } from "react-icons/lu";

import { useAuth } from "@/features/auth/hooks/useAuth";
import s from "./fabrication-cut-settings-section.module.css";

type SettingsPayload = {
  organizationId: number;
  perdidaCorteMm: number;
  despunteInicialMm: number;
  procedimiento: "por_pieza";
  confirmedAt: string;
  confirmedBy: string;
};

type ApiResponse = { settings?: SettingsPayload | null; error?: string };

export function FabricationCutSettingsSection() {
  const { rol } = useAuth();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [kerf, setKerf] = useState("");
  const [trim, setTrim] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const saveInFlight = useRef(false);
  const canManage = rol === "admin" || rol === "tecnico";

  const valuesMatchSaved = Boolean(
    settings &&
    kerf.trim() !== "" &&
    trim.trim() !== "" &&
    Number(kerf) === settings.perdidaCorteMm &&
    Number(trim) === settings.despunteInicialMm
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/configuracion/fabricacion/parametros-corte", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => null) as ApiResponse | null;
      if (!response.ok) throw new Error(payload?.error ?? "No pudimos cargar la configuración.");
      setSettings(payload?.settings ?? null);
      setKerf(payload?.settings ? String(payload.settings.perdidaCorteMm) : "");
      setTrim(payload?.settings ? String(payload.settings.despunteInicialMm) : "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar la configuración.");
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, []);

  const toggleOpen = () => {
    const nextOpen = !open;
    if (nextOpen) setSaved(null);
    setOpen(nextOpen);
    if (nextOpen && !loaded && !loading) void load();
  };

  const save = useCallback(async () => {
    if (saveInFlight.current) return;
    if (!kerf.trim() || !trim.trim()) {
      setError("Ingresa ambos valores en milímetros. Usa 0 solo si el taller confirmó que no hay pérdida o despunte.");
      return;
    }
    const perdidaCorteMm = Number(kerf);
    const despunteInicialMm = Number(trim);
    if (!Number.isInteger(perdidaCorteMm) || perdidaCorteMm < 0 || perdidaCorteMm > 20 ||
        !Number.isInteger(despunteInicialMm) || despunteInicialMm < 0 || despunteInicialMm > 1000) {
      setError("Usa milímetros enteros: pérdida entre 0 y 20; despunte entre 0 y 1.000.");
      return;
    }
    const unchanged = Boolean(
      settings &&
      Number(kerf) === settings.perdidaCorteMm &&
      Number(trim) === settings.despunteInicialMm
    );
    if (!confirmed && !unchanged) {
      setError("Confirma que estos valores corresponden al procedimiento habitual del taller.");
      return;
    }
    if (unchanged) {
      setError(null);
      setSaved("Los parámetros ya estaban guardados.");
      setOpen(false);
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const response = await fetch("/api/configuracion/fabricacion/parametros-corte", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perdidaCorteMm, despunteInicialMm, procedimiento: "por_pieza", confirmacionExplicita: true }),
      });
      const payload = await response.json().catch(() => null) as ApiResponse | null;
      if (!response.ok || !payload?.settings) throw new Error(payload?.error ?? "No pudimos guardar estos valores.");
      setSettings(payload.settings);
      setLoaded(true);
      setSaved("Parámetros guardados para el taller.");
      setConfirmed(false);
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pudimos guardar estos valores.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }, [confirmed, kerf, settings, trim]);

  const summary = settings
    ? `${settings.perdidaCorteMm} mm de pérdida · ${settings.despunteInicialMm} mm de despunte por tira`
    : "Sin parámetros confirmados";

  return (
    <section className={`${s.section} ${open ? s.sectionOpen : ""}`}>
      <button type="button" className={s.trigger} onClick={toggleOpen} aria-expanded={open} disabled={saving}>
        <span className={s.icon} aria-hidden><LuSettings2 /></span>
        <span className={s.triggerCopy}><small>Fabricación</small><strong>Parámetros de corte</strong><span>{summary}</span></span>
        <LuChevronDown className={`${s.chevron} ${open ? s.chevronOpen : ""}`} aria-hidden />
      </button>
      {saved ? <p role="status" aria-live="polite" className={s.savedNotice}>{saved}</p> : null}
      {open ? (
        <div className={s.panel}>
          {loading ? <p className={s.muted}>Cargando parámetros…</p> : (
            <>
              <p className={s.intro}>Se usarán en nuevas pautas compatibles de aluminio. No cambian las recetas, los largos de compra ni las cotizaciones guardadas.</p>
              {settings ? <p className={s.confirmed}>Confirmados por el taller.</p> : null}
              <div className={s.fields}>
                <label><span>Pérdida por corte (mm)</span><input type="number" inputMode="numeric" min={0} max={20} step={1} value={kerf} onChange={(event) => { setKerf(event.target.value); setError(null); setSaved(null); }} placeholder="Ej. 3" disabled={!canManage || saving} /></label>
                <label><span>Despunte inicial por tira (mm)</span><input type="number" inputMode="numeric" min={0} max={1000} step={1} value={trim} onChange={(event) => { setTrim(event.target.value); setError(null); setSaved(null); }} placeholder="Ej. 10" disabled={!canManage || saving} /></label>
              </div>
              <p className={s.muted}>Solo para corte de aluminio por pieza. PVC y otros procedimientos no se modifican.</p>
              {canManage ? <label className={s.confirm}><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setError(null); }} disabled={saving} /><span>Confirmo que estos valores y el procedimiento por pieza corresponden al trabajo habitual del taller.</span></label> : <p className={s.muted}>Solo administradores y maestros pueden guardar esta configuración.</p>}
              {error ? <p role="alert" className={s.error}>{error}</p> : null}
              {canManage ? <button className={s.save} type="button" onClick={() => void save()} disabled={saving || loading || (!confirmed && !valuesMatchSaved)}>{saving ? "Guardando…" : "Guardar para mi taller"}</button> : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
