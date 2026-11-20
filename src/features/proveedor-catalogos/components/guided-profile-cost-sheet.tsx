"use client";

import { useEffect, useRef, useState } from "react";
import { saveQuickWorkshopProfileCost } from "../services/mis-precios.client.service";
import { isEffectiveSupplierProfilePrice, type SupplierProfilePricePreview } from "../services/supplier-presentation-resolution.service";
import styles from "./guided-profile-cost-sheet.module.css";

type Reference = { technicalCode: string; profileName: string };
type Props = {
  lineTemplateId: number;
  familyKey: string;
  finishName: string | null;
  references: readonly Reference[];
  prices: readonly SupplierProfilePricePreview[];
  canManagePrice: boolean;
  providerKey: string | null;
  allowMixedWorkshopCosts?: boolean;
  onPricesSaved?: () => Promise<void> | void;
};

type Draft = { price: string; length: string; supplier: string };
type Filter = "todos" | "pendientes" | "guardados";
type ApplyScope = "pendientes" | "todos";

function key(code: string) { return code.trim().toLocaleUpperCase("en-US"); }
function formatPrice(value: string) {
  const normalized = /^\d+\.\d{1,2}$/.test(value) ? value.replace(".", ",") : value;
  const [integer, ...decimals] = normalized.replace(/[^0-9,]/g, "").split(",");
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (decimals.length ? `,${decimals.join("").slice(0, 2)}` : "");
}
function parsePrice(value: string) {
  const clean = value.trim().replace(/\s/g, "");
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(clean)) return Number(clean.replace(/\./g, "").replace(",", "."));
  return /^\d+(?:[.,]\d{1,2})?$/.test(clean) ? Number(clean.replace(",", ".")) : NaN;
}

export function GuidedProfileCostSheet({ lineTemplateId, familyKey, finishName, references, prices, canManagePrice, providerKey, allowMixedWorkshopCosts = false, onPricesSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [source, setSource] = useState<"propios" | "proveedor">("propios");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [sharedLength, setSharedLength] = useState("");
  const [sharedSupplier, setSharedSupplier] = useState("");
  const [prepared, setPrepared] = useState<{ length: string; supplier: string } | null>(null);
  const [preparedCount, setPreparedCount] = useState(0);
  const [applyScope, setApplyScope] = useState<ApplyScope>("pendientes");
  const [message, setMessage] = useState("");
  const unique = [...new Map(references.filter((r) => r.technicalCode.trim()).map((r) => [key(r.technicalCode), r])).values()];
  const own = (code: string) => prices.filter((p) => key(p.technicalCode) === key(code) && p.priceSource === "workshop" && p.providerKey.startsWith("taller:"));
  const ready = (code: string) => { const found = own(code); return found.length === 1 && isEffectiveSupplierProfilePrice(found[0]); };
  const count = unique.filter((r) => ready(r.technicalCode)).length;
  const pending = unique.filter((r) => !ready(r.technicalCode));
  const hasOtherUnit = unique.some((r) => own(r.technicalCode).some((p) => p.purchaseUnit && !["UN", "TR"].includes(p.purchaseUnit)));
  const targets = applyScope === "todos" ? unique : pending;
  const targetHasDifferentData = targets.some((r) => {
    const saved = own(r.technicalCode)[0];
    const draft = drafts[r.technicalCode];
    const currentLength = draft?.length || (saved?.commercialLengthMm ? String(saved.commercialLengthMm) : "");
    const currentSupplier = draft?.supplier ?? saved?.workshopSupplierName ?? "";
    const resultingLength = applyScope === "todos" ? sharedLength || currentLength : currentLength || sharedLength;
    const resultingSupplier = applyScope === "todos" ? sharedSupplier.trim() || currentSupplier : currentSupplier || sharedSupplier.trim();
    return Boolean((sharedLength && resultingLength !== currentLength) || (sharedSupplier.trim() && resultingSupplier !== currentSupplier));
  });
  const canPrepare = targets.length > 0 && Boolean(sharedLength.trim() || sharedSupplier.trim()) && targetHasDifferentData;
  const sourceLabel = allowMixedWorkshopCosts && count > 0 && providerKey && !providerKey.startsWith("taller:")
    ? "Mixto"
    : providerKey?.startsWith("taller:") || !providerKey ? "Mis precios" : "Proveedor";

  function close() { if (!saving) { dialog.current?.close(); trigger.current?.focus(); } }
  function commonSavedValue(select: (code: string) => string | undefined) {
    const values = unique.map((r) => select(r.technicalCode)).filter((value): value is string => Boolean(value));
    const distinct = [...new Set(values)];
    return distinct.length === 1 ? distinct[0] : "";
  }
  function open() {
    setDrafts({}); setErrors({}); setPrepared(null); setPreparedCount(0); setMessage(""); setSource("propios");
    setSharedLength(commonSavedValue((code) => { const value = own(code)[0]?.commercialLengthMm; return value ? String(value) : undefined; }));
    setSharedSupplier(commonSavedValue((code) => own(code)[0]?.workshopSupplierName ?? undefined));
    setApplyScope(pending.length ? "pendientes" : "todos");
    setFilter(pending.length ? "pendientes" : "todos"); dialog.current?.showModal();
  }
  useEffect(() => { const d = dialog.current; return () => { if (d?.open) d.close(); }; }, []);

  function setPrice(code: string, price: string) {
    const found = own(code);
    setDrafts((old) => ({ ...old, [code]: { price, length: old[code]?.length ?? (found[0]?.commercialLengthMm ? String(found[0].commercialLengthMm) : prepared?.length ?? ""), supplier: old[code]?.supplier ?? found[0]?.workshopSupplierName ?? prepared?.supplier ?? "" } }));
    setErrors((old) => { const next = { ...old }; delete next[code]; return next; });
  }

  async function save() {
    const issues: Record<string, string> = {};
    const entries = Object.entries(drafts);
    for (const [code, draft] of entries) {
      const found = own(code);
      if (!Number.isFinite(parsePrice(draft.price)) || parsePrice(draft.price) <= 0) issues[code] = "Ingresa un precio válido mayor que cero.";
      else if (found.length > 1) issues[code] = "Hay más de un costo propio; revisa su presentación.";
      else if (found[0] && (!found[0].priceListRevision?.match(/^taller-v\d+$/) || found[0].purchaseUnit !== "UN")) issues[code] = "Este costo requiere edición detallada en Mis precios.";
      else if (!found[0] && !finishName) issues[code] = "Selecciona un acabado para guardar.";
      else if (!draft.length || !/^\d+$/.test(draft.length) || Number(draft.length) <= 0) issues[code] = "Indica un largo de tira válido.";
    }
    if (Object.keys(issues).length) { setErrors(issues); return; }
    setSaving(true); setMessage("");
    const failed: Record<string, string> = {};
    const succeeded: string[] = [];
    async function saveEntry([code, draft]: [string, Draft]) {
      const found = own(code)[0];
      try {
        if (found) await saveQuickWorkshopProfileCost({ kind: "update", lineTemplateId, presentationId: found.presentationId, expectedRevision: Number(found.priceListRevision!.match(/^taller-v(\d+)$/)![1]), commercialLengthMm: Number(draft.length), netPrice: parsePrice(draft.price), supplierName: draft.supplier.trim() || (found.workshopSupplierName ? null : undefined) });
        else {
          const ref = unique.find((r) => r.technicalCode === code)!;
          await saveQuickWorkshopProfileCost({ kind: "create", lineTemplateId, technicalCode: code, profileName: ref.profileName, finishName, commercialLengthMm: Number(draft.length), netPrice: parsePrice(draft.price), supplierName: draft.supplier.trim() || null });
        }
        succeeded.push(code);
      } catch (e) { failed[code] = e instanceof Error ? e.message : "No se pudo guardar."; }
    }
    for (let index = 0; index < entries.length; index += 3) {
      await Promise.all(entries.slice(index, index + 3).map(saveEntry));
    }
    if (succeeded.length) {
      setDrafts((old) => Object.fromEntries(Object.entries(old).filter(([code]) => !succeeded.includes(code))));
      try { await onPricesSaved?.(); } catch { setMessage("Precios guardados. Vuelve a abrir para actualizar la lista."); }
    }
    setErrors(failed); setSaving(false);
    if (!Object.keys(failed).length) { setMessage("Precios guardados."); dialog.current?.close(); trigger.current?.focus(); }
    else setMessage(`${succeeded.length} ${succeeded.length === 1 ? "guardado" : "guardados"}; revisa los errores.`);
  }

  const visible = unique.filter((r) => filter === "todos" || (filter === "guardados" ? ready(r.technicalCode) : !ready(r.technicalCode)));
  return <div className={styles.root}>
    <div className={styles.head}>
      <span><small>Fuente · {sourceLabel}</small><strong>Mis costos · {count}/{unique.length} listos</strong></span>
      <button ref={trigger} type="button" onClick={open}>Editar precios</button>
    </div>
    {message ? <small role="status">{message}</small> : null}
    <dialog ref={dialog} className={styles.dialog} onCancel={(event) => { if (saving) event.preventDefault(); }} onClose={() => trigger.current?.focus()}>
      <div className={styles.sheet}>
        <header className={styles.title}><div><h3>Precios de perfiles</h3><p>Completa tus precios de compra</p></div><button type="button" onClick={close} disabled={saving} aria-label="Cerrar">×</button></header>
        {providerKey && !providerKey.startsWith("taller:") ? <div className={styles.filters} aria-label="Origen de precios"><button type="button" aria-pressed={source === "propios"} onClick={() => setSource("propios")}>Mis costos</button><button type="button" aria-pressed={source === "proveedor"} onClick={() => setSource("proveedor")}>Proveedor</button></div> : null}
        {source === "propios" ? <div className={styles.filters} aria-label="Filtrar perfiles">{(["pendientes", "todos", "guardados"] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item === "todos" ? `Todos (${unique.length})` : item === "pendientes" ? `Pendientes (${unique.length - count})` : `Guardados (${count})`}</button>)}</div> : null}
        <div className={styles.scroll}>
          {source === "proveedor" ? <><p>Precios del proveedor seleccionado · solo consulta.</p><ul className={styles.list}>{unique.map((r) => { const row = prices.find((p) => key(p.technicalCode) === key(r.technicalCode) && p.providerKey === providerKey); return <li key={key(r.technicalCode)}><div className={styles.row}><strong>{r.technicalCode} · {r.profileName}</strong><span>{row?.netPrice != null && row.currency ? new Intl.NumberFormat("es-CL", { style: "currency", currency: row.currency }).format(row.netPrice) : "Sin precio"}</span></div>{row?.finishPriceBasis === "base_reference_other_finish" ? <small>Referencia de otro acabado; no es costo confirmado.</small> : null}</li>; })}</ul></> : <>
          <p className={styles.subtitle}>{finishName || "Acabado pendiente"} · {hasOtherUnit ? "Precios de compra" : "Precios de compra por tira"}</p>
          <div className={styles.purchaseData}>
            <strong>Datos de compra</strong>
            <div className={styles.common}>
              <label>Largo de tira (mm)<input inputMode="numeric" value={sharedLength} onChange={(e) => { setSharedLength(e.target.value); setPrepared(null); setPreparedCount(0); }} /></label>
              <label>Proveedor (opcional)<input value={sharedSupplier} onChange={(e) => { setSharedSupplier(e.target.value); setPrepared(null); setPreparedCount(0); }} maxLength={120} /></label>
              <label className={styles.scope}>Aplicar a<select value={applyScope} onChange={(e) => { setApplyScope(e.target.value as ApplyScope); setPrepared(null); setPreparedCount(0); }}>
                <option value="pendientes">Perfiles pendientes ({pending.length})</option>
                <option value="todos">Todos los perfiles ({unique.length})</option>
              </select></label>
              <button type="button" disabled={saving || !canPrepare} onClick={() => {
                if (sharedLength && (!/^\d+$/.test(sharedLength) || Number(sharedLength) <= 0)) { setMessage("Ingresa un largo válido en milímetros."); return; }
                const targetCodes = new Set(targets.map((r) => key(r.technicalCode)));
                setPrepared({ length: sharedLength, supplier: sharedSupplier.trim() });
                setPreparedCount(targets.length);
                setDrafts((old) => {
                  const next = { ...old };
                  for (const ref of targets) {
                    const code = ref.technicalCode;
                    const saved = own(code)[0];
                    const draft = old[code];
                    next[code] = {
                      price: draft?.price ?? (saved?.netPrice != null ? formatPrice(String(saved.netPrice).replace(".", ",")) : ""),
                      length: applyScope === "todos"
                        ? sharedLength.trim() || draft?.length || (saved?.commercialLengthMm ? String(saved.commercialLengthMm) : "")
                        : draft?.length || (saved?.commercialLengthMm ? String(saved.commercialLengthMm) : "") || sharedLength.trim(),
                      supplier: applyScope === "todos"
                        ? sharedSupplier.trim() || draft?.supplier || saved?.workshopSupplierName || ""
                        : draft?.supplier || saved?.workshopSupplierName || sharedSupplier.trim(),
                    };
                  }
                  for (const [code, draft] of Object.entries(old)) if (!targetCodes.has(key(code))) next[code] = draft;
                  return next;
                });
                setMessage("");
              }}>{preparedCount > 0 ? "Datos preparados" : !canPrepare ? "Datos iguales" : applyScope === "todos" ? `Preparar para todos (${unique.length})` : `Aplicar a pendientes (${pending.length})`}</button>
              {familyKey === "universal:aluminio:l25" && !sharedLength ? <button type="button" onClick={() => setSharedLength("6000")}>Sugerir 6.000 mm</button> : null}
            </div>
            {preparedCount > 0 ? <p className={styles.preparedNotice} role="status">Datos listos para {preparedCount} perfiles. Los precios se conservan; revisa y guarda.</p> : null}
          </div>
          <ul className={styles.list}>{visible.map((r) => {
            const code = r.technicalCode; const found = own(code); const draft = drafts[code];
            const unit = found[0]?.purchaseUnit;
            return <li key={key(code)}><div className={styles.row}><label htmlFor={`price-${key(code)}`}><strong>{code} · {r.profileName}</strong><small>{ready(code) ? (providerKey === found[0].providerKey || allowMixedWorkshopCosts ? "Aplicado" : "Guardado · no aplicado") : "Pendiente"}{unit && !["UN", "TR"].includes(unit) ? ` · unidad: ${unit}` : ""}</small></label><div><input id={`price-${key(code)}`} aria-label={`Precio ${code}`} type="text" inputMode="decimal" placeholder="Precio" value={draft?.price ?? (found.length === 1 && found[0].netPrice != null ? formatPrice(String(found[0].netPrice).replace(".", ",")) : "")} disabled={!canManagePrice || saving} onChange={(e) => { const input = e.currentTarget; const pos = input.selectionStart ?? input.value.length; const previous = draft?.price ?? (found[0]?.netPrice != null ? formatPrice(String(found[0].netPrice).replace(".", ",")) : ""); const raw = input.value === previous + "." ? previous + "," : input.value; const cursor = formatPrice(raw.slice(0, pos)).length; setPrice(code, formatPrice(raw)); requestAnimationFrame(() => input.setSelectionRange(cursor, cursor)); }} /><span>$</span></div></div>
              {draft ? <details open={Boolean(errors[code] && !draft.length) || undefined}><summary>Datos de tira {code}</summary><div className={styles.fields}><label>Largo (mm)<input aria-label={`Largo ${code}`} inputMode="numeric" value={draft.length} onChange={(e) => setDrafts((old) => ({ ...old, [code]: { ...old[code], length: e.target.value } }))} /></label><label>Proveedor (opcional)<input aria-label={`Proveedor ${code}`} value={draft.supplier} maxLength={120} onChange={(e) => setDrafts((old) => ({ ...old, [code]: { ...old[code], supplier: e.target.value } }))} /></label></div></details> : null}
              {errors[code] ? <small className={styles.error} role="alert">{errors[code]}</small> : null}
            </li>;
          })}</ul>
          <p><a href={`/configuracion/empresa/mis-precios?supplier=taller&family=${encodeURIComponent(familyKey)}&lineTemplateId=${lineTemplateId}`} target="_blank" rel="noreferrer">Opciones avanzadas en Mis precios</a></p>
          </>}
          {message ? <p role="status">{message}</p> : null}
        </div>
        <footer className={styles.footer}><button type="button" onClick={close} disabled={saving}>Cancelar</button>{source === "propios" ? <button type="button" disabled={saving || !Object.keys(drafts).length} onClick={() => void save()}>{saving ? "Guardando…" : "Guardar precios"}</button> : null}</footer>
      </div>
    </dialog>
  </div>;
}
