"use client";

import { useMemo, useRef, useState } from "react";
import { isEffectiveSupplierProfilePrice, type SupplierProfilePricePreview as PriceRow } from "../services/supplier-presentation-resolution.service";
import { saveQuickWorkshopProfileCost } from "../services/mis-precios.client.service";
import s from "./quote-profile-costs.module.css";

type ProfileCost = {
  technicalCode: string;
  profileName: string;
  workshop?: PriceRow;
  selected?: PriceRow;
  display?: PriceRow;
  conflict: boolean;
};

function formatNetPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function revisionFromPreview(row: PriceRow | undefined) {
  const match = row?.priceListRevision?.match(/^taller-v(\d+)$/);
  return match?.[1] ? Number(match[1]) : null;
}

export function QuoteProfileCosts({
  lineTemplateId,
  familyKey,
  providerKey,
  finishName,
  references,
  prices,
  canManagePrice,
  allowMixedWorkshopCosts = false,
  onPricesSaved,
  onUseWorkshopCost,
}: {
  lineTemplateId: number;
  familyKey: string;
  providerKey: string;
  finishName: string | null;
  references: readonly { technicalCode: string; profileName: string }[];
  prices: readonly PriceRow[];
  canManagePrice: boolean;
  allowMixedWorkshopCosts?: boolean;
  onPricesSaved?: () => Promise<void> | void;
  onUseWorkshopCost?: (providerKey: string) => void;
}) {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftCost, setDraftCost] = useState("");
  const [draftLength, setDraftLength] = useState("");
  const [suggestedL25Length, setSuggestedL25Length] = useState(false);
  const [draftFinish, setDraftFinish] = useState(finishName ?? "");
  const [draftAllFinishes, setDraftAllFinishes] = useState(false);
  const [draftSupplier, setDraftSupplier] = useState("");
  const [sharedLength, setSharedLength] = useState("");
  const [sharedSupplier, setSharedSupplier] = useState("");
  const [preparedDefaults, setPreparedDefaults] = useState<Record<string, { length: string; supplier: string }>>({});
  const [appliedCount, setAppliedCount] = useState(0);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [lastSavedCode, setLastSavedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo<ProfileCost[]>(() => {
    const grouped = new Map<string, PriceRow[]>();
    for (const price of prices) {
      const code = price.technicalCode.trim().toLocaleUpperCase("en-US");
      if (!code) continue;
      grouped.set(code, [...(grouped.get(code) ?? []), price]);
    }
    const referencesByCode = new Map<string, { technicalCode: string; profileName: string }>();
    for (const reference of references) {
      const code = reference.technicalCode.trim().toLocaleUpperCase("en-US");
      if (code) referencesByCode.set(code, reference);
    }
    return [...referencesByCode.entries()].map(([code, reference]) => {
      const candidates = grouped.get(code) ?? [];
      const ownRows = candidates.filter((row) => row.priceSource === "workshop" && row.providerKey.startsWith("taller:"));
      const own = ownRows.length === 1 ? ownRows[0] : undefined;
      const selected = candidates.find((row) => row.providerKey === providerKey);
      const fallback = (!providerKey.startsWith("taller:") ? candidates[0] : undefined) ?? {
        technicalCode: reference.technicalCode,
        profileName: reference.profileName,
        providerKey: "",
        providerLabel: "Sin presentación compatible",
        presentationId: "",
        supplierSku: "",
        presentationDescription: reference.profileName,
        purchaseUnit: "",
        commercialLengthMm: null,
        netPrice: null,
        currency: null,
        priceSource: null,
        status: "missing_price" as const,
      };
      // The selected supplier is the effective purchase source. A saved own
      // cost remains visible as a separate option, but must not look applied.
      const display = providerKey.startsWith("taller:")
        ? selected ?? fallback
        : allowMixedWorkshopCosts && own && isEffectiveSupplierProfilePrice(own) ? own : selected ?? own ?? fallback;
      return {
        technicalCode: reference.technicalCode,
        profileName: reference.profileName || display?.profileName || display?.presentationDescription || reference.technicalCode,
        workshop: own,
        selected,
        display,
        conflict: ownRows.length > 1 || display?.status === "ambiguous",
      };
    });
  }, [allowMixedWorkshopCosts, prices, providerKey, references]);
  // Progress measures workshop prices, never external supplier reference coverage.
  const readyOwnCount = rows.filter((row) =>
    Boolean(row.workshop && isEffectiveSupplierProfilePrice(row.workshop))
  ).length;
  const pendingOwnCount = rows.filter((row) => !row.conflict && !Boolean(row.workshop && isEffectiveSupplierProfilePrice(row.workshop))).length;
  const hasUnappliedPrivateCost = !allowMixedWorkshopCosts && rows.some((row) => row.workshop && row.workshop.providerKey !== providerKey);
  if (rows.length === 0) return (
    <section className={s.root} aria-label="Mis costos de perfiles">
      <header className={s.heading}><h3>Mis costos de perfiles</h3></header>
      <p className={s.note}>Perfiles pendientes de configurar. La cotización comercial puede continuar sin registrar costos de fabricación.</p>
    </section>
  );

  function openEditor(row: ProfileCost) {
    const current = row.display;
    const prepared = preparedDefaults[row.technicalCode];
    setError(null);
    setLastSavedCode(null);
    setEditingCode(row.technicalCode);
    setDraftCost(row.workshop?.netPrice != null ? String(row.workshop.netPrice) : "");
    const confirmedLength = Boolean(
      current?.commercialLengthMm && current.commercialLengthMm > 0 &&
      current.finishPriceBasis !== "base_reference_other_finish"
    );
    setSuggestedL25Length(
      familyKey === "universal:aluminio:l25" && !row.workshop && !confirmedLength && !prepared?.length
    );
    setDraftLength(row.workshop?.commercialLengthMm
      ? String(row.workshop.commercialLengthMm) : prepared?.length ?? "");
    setDraftFinish(finishName ?? "");
    // Choosing every finish is a deliberate per-profile decision, never inherited.
    setDraftAllFinishes(false);
    setDraftSupplier(row.workshop?.workshopSupplierName ?? prepared?.supplier ?? "");
  }

  function applySharedToPending() {
    const length = sharedLength.trim();
    const supplier = sharedSupplier.trim();
    if (length && (!/^[0-9]+$/.test(length) || !Number.isSafeInteger(Number(length)) || Number(length) <= 0)) {
      setError("El largo común debe ser un número entero positivo en milímetros.");
      return;
    }
    if (!length && !supplier) return;
    const pending = rows.filter((row) => !row.conflict && !Boolean(row.workshop && isEffectiveSupplierProfilePrice(row.workshop)));
    setPreparedDefaults((previous) => {
      const next = { ...previous };
      for (const row of pending) {
        next[row.technicalCode] = {
          length: length || previous[row.technicalCode]?.length || "",
          supplier: supplier || previous[row.technicalCode]?.supplier || "",
        };
      }
      return next;
    });
    // An already-open pending editor receives only the two explicitly shared fields.
    if (pending.some((row) => row.technicalCode === editingCode)) {
      if (length) setDraftLength(length);
      if (supplier) setDraftSupplier(supplier);
    }
    setAppliedCount(pending.length);
    setError(null);
  }

  async function save(row: ProfileCost) {
    const costText = draftCost.trim().replace(/\s/g, "");
    const groupedCLP = /^[0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{1,2})?$/.test(costText);
    const decimalCLP = /^[0-9]+(?:[.,][0-9]{1,2})?$/.test(costText);
    const cost = groupedCLP
      ? Number(costText.replace(/\./g, "").replace(",", "."))
      : decimalCLP ? Number(costText.replace(",", ".")) : NaN;
    const lengthText = draftLength.trim();
    const length = lengthText
      ? /^[0-9]+$/.test(lengthText) ? Number(lengthText) : NaN
      : null;
    if (!Number.isFinite(cost) || cost <= 0) {
      setError("Ingresa un costo neto por tira mayor que cero.");
      return;
    }
    if (length !== null && (!Number.isSafeInteger(length) || length <= 0)) {
      setError("El largo debe ser un número entero de milímetros o quedar pendiente.");
      return;
    }
    if (!row.workshop && !draftAllFinishes && !draftFinish.trim()) {
      setError("Indica el acabado del perfil para guardar su costo.");
      return;
    }

    setSavingCode(row.technicalCode);
    setError(null);
    try {
      if (row.workshop) {
        const expectedRevision = revisionFromPreview(row.workshop);
        if (!expectedRevision || !row.workshop.presentationId) throw new Error("No se pudo confirmar la revisión de este costo privado. Vuelve a cargar la pieza.");
        await saveQuickWorkshopProfileCost({
          kind: "update", lineTemplateId, presentationId: row.workshop.presentationId,
          expectedRevision, commercialLengthMm: length, netPrice: cost,
          supplierName: draftSupplier.trim() || (row.workshop.workshopSupplierName ? null : undefined),
        });
      } else {
        await saveQuickWorkshopProfileCost({
          kind: "create", lineTemplateId, technicalCode: row.technicalCode,
          profileName: row.profileName, finishName: draftAllFinishes ? null : draftFinish.trim(),
          commercialLengthMm: length, netPrice: cost, supplierName: draftSupplier.trim() || null,
        });
      }
      setLastSavedCode(row.technicalCode);
      setEditingCode(null);
      setDraftCost("");
      setDraftLength("");
      setSuggestedL25Length(false);
      await onPricesSaved?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el costo del perfil.");
    } finally {
      setSavingCode(null);
    }
  }

  return (
    <section className={s.root} aria-label="Mis costos de perfiles">
      <header className={s.heading}>
        <h3>Mis costos de perfiles</h3>
        <p><strong>{readyOwnCount} de {rows.length} perfiles listos</strong> · costos propios</p>
      </header>
      <progress className={s.progress} value={readyOwnCount} max={rows.length} aria-label="Progreso de costos propios" />

      <details className={s.sharedDefaults}>
        <summary>Reutilizar largo y proveedor <span>Opcional</span></summary>
        <div className={s.sharedBody}>
          <p>Completa estos datos una vez y aplícalos a perfiles sin costo propio. Nunca se copia el precio ni se guarda automáticamente.</p>
          <div className={s.sharedFields}>
            <label>Largo común de tira (mm)
              <input inputMode="numeric" type="text" pattern="[0-9]*" value={sharedLength}
                onChange={(event) => { setSharedLength(event.target.value); setAppliedCount(0); }}
                placeholder="Ej: 6000" enterKeyHint="next" />
            </label>
            <label>Proveedor (opcional)
              <input type="text" value={sharedSupplier} maxLength={120}
                onChange={(event) => { setSharedSupplier(event.target.value); setAppliedCount(0); }}
                placeholder="Ej: Aluminera local" enterKeyHint="done" />
            </label>
          </div>
          <button type="button" className={s.sharedAction}
            disabled={!canManagePrice || pendingOwnCount === 0 || (!sharedLength.trim() && !sharedSupplier.trim())}
            onClick={applySharedToPending}>
            Aplicar a {pendingOwnCount} perfiles pendientes
          </button>
          <small role="status">{appliedCount > 0
            ? "Datos preparados para " + appliedCount + " perfiles. Abre cada uno, indica su precio y guárdalo individualmente."
            : "Los datos solo se rellenarán cuando abras un perfil después de aplicarlos."}</small>
        </div>
      </details>

      {hasUnappliedPrivateCost ? (
        <p className={s.scopeNotice}>
          Cambiar a costo propio puede dejar pendientes los perfiles que aún no tengan costo. Revisa la cobertura antes de continuar.
        </p>
      ) : null}
      {error && !editingCode ? <p className={s.error} role="alert">{error}</p> : null}

      <ul className={s.list}>
        {rows.map((row) => {
          const current = row.display;
          const isEditing = editingCode === row.technicalCode;
          const readyOwn = Boolean(row.workshop && isEffectiveSupplierProfilePrice(row.workshop));
          const cannotUseAmbiguous = row.conflict;
          const existingOwn = Boolean(row.workshop?.presentationId);
          const workshopIsSelected = Boolean(row.workshop && (row.workshop.providerKey === providerKey ||
            allowMixedWorkshopCosts && isEffectiveSupplierProfilePrice(row.workshop)));
          const canEditPrivate = existingOwn && revisionFromPreview(row.workshop) !== null;
          const canSave = canManagePrice && !cannotUseAmbiguous && (existingOwn ? canEditPrivate : true);
          const externalPrice = current?.priceSource !== "workshop" && current?.status === "priced" &&
            current.netPrice != null && current.currency
            ? formatNetPrice(current.netPrice, current.currency) : null;

          return (
            <li className={s.row} key={row.technicalCode}>
              <div className={s.rowMain}>
                <div className={s.identity}>
                  <strong>{row.technicalCode} · {row.profileName}</strong>
                  <small>{row.workshop?.commercialLengthMm
                    ? row.workshop.commercialLengthMm.toLocaleString("es-CL") + " mm por tira"
                    : "Largo propio pendiente"} · {finishName || "Acabado pendiente"}</small>
                </div>
                <div className={s.rowRight}>
                  <div className={s.cost}>
                    <strong className={!readyOwn ? s.pendingPrice : undefined}>
                      {readyOwn && row.workshop?.netPrice != null && row.workshop.currency
                        ? formatNetPrice(row.workshop.netPrice, row.workshop.currency) : "Pendiente"}
                    </strong>
                    <small>{readyOwn ? "Costo propio listo" : "Costo propio sin completar"}</small>
                  </div>
                  {canManagePrice ? (
                    cannotUseAmbiguous
                      ? <small className={s.pending}>Revisar presentación ambigua</small>
                      : <button className={s.action} type="button" disabled={!canSave || Boolean(savingCode)}
                          aria-expanded={isEditing} onClick={() => {
                            if (isEditing) {
                              setEditingCode(null);
                              setError(null);
                            } else {
                              openEditor(row);
                            }
                          }}>
                          {isEditing ? "Cerrar" : row.workshop ? "Editar costo" : "Agregar costo"}
                        </button>
                  ) : null}
                </div>
              </div>

              {externalPrice ? (
                <small className={s.externalPrice}>Referencia seleccionada: {current?.providerLabel || "Proveedor"} · {externalPrice}
                  {current?.finishPriceBasis === "base_reference_other_finish"
                    ? " (otro acabado: no confirma costo físico)" : null}
                </small>
              ) : null}
              {lastSavedCode === row.technicalCode ? <small className={s.savedNotice} role="status">Costo guardado</small> : null}
              {row.workshop && !workshopIsSelected ? (
                <div className={s.otherCost}>
                  <small>Costo propio guardado, todavía no aplicado a esta pieza.</small>
                  {onUseWorkshopCost ? (
                    <button type="button" className={s.useOwn}
                      onClick={() => onUseWorkshopCost(row.workshop!.providerKey)}>
                      Usar costo propio en esta pieza
                    </button>
                  ) : null}
                </div>
              ) : null}
              {row.workshop && workshopIsSelected ? (
                <small className={s.appliedNotice}>
                  {allowMixedWorkshopCosts
                    ? "Costo propio aplicado a este perfil; los demás mantienen su proveedor."
                    : "Costo privado aplicado a esta pieza."}
                </small>
              ) : null}

              {isEditing ? (
                <div className={s.editor}>
                  <strong className={s.editorTitle}>{row.workshop ? "Editar" : "Agregar"} costo · {row.technicalCode}</strong>
                  {!row.workshop ? (
                    <fieldset className={s.finishScope}>
                      <legend>Alcance de este costo</legend>
                      <div className={s.scopeOptions}>
                        <label className={s.scopeOption}>
                          <input type="radio" name={"finish-scope-" + row.technicalCode} checked={!draftAllFinishes}
                            onChange={() => setDraftAllFinishes(false)} />
                          {finishName ? "Solo " + finishName : "Un acabado"}
                        </label>
                        <label className={s.scopeOption}>
                          <input type="radio" name={"finish-scope-" + row.technicalCode} checked={draftAllFinishes}
                            onChange={() => setDraftAllFinishes(true)} />
                          Todos los acabados
                        </label>
                      </div>
                      {draftAllFinishes ? (
                        <small>El mismo precio de este perfil se utilizará en cualquier color.</small>
                      ) : !finishName ? (
                        <label>Acabado del perfil
                          <input type="text" value={draftFinish} maxLength={100}
                            onChange={(event) => setDraftFinish(event.target.value)} />
                        </label>
                      ) : null}
                    </fieldset>
                  ) : null}
                  <div className={s.editorFields}>
                    <label>Largo de la tira {row.technicalCode} (mm)
                      <input type="text" inputMode="numeric" pattern="[0-9]*"
                        value={draftLength} placeholder="Pendiente" enterKeyHint="next"
                        onChange={(event) => setDraftLength(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") { event.preventDefault(); priceInputRef.current?.focus(); }
                        }} />
                      {suggestedL25Length && !draftLength ? (
                        <button type="button" className={s.suggestion} onClick={() => setDraftLength("6000")}>
                          Usar 6.000 mm sugeridos para L25
                        </button>
                      ) : null}
                    </label>
                    <label>Costo neto por tira {row.technicalCode} (CLP)
                      <input ref={priceInputRef} type="text" inputMode="decimal"
                        value={draftCost} placeholder="Ej: 15000,50" enterKeyHint="next"
                        onChange={(event) => setDraftCost(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") { event.preventDefault(); supplierInputRef.current?.focus(); }
                        }} />
                    </label>
                    <label className={s.supplierField}>Proveedor (opcional)
                      <input ref={supplierInputRef} type="text" maxLength={120}
                        value={draftSupplier} placeholder="Ej: Aluminera local" enterKeyHint="done"
                        onChange={(event) => setDraftSupplier(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
                        }} />
                    </label>
                  </div>
                  {error ? <p className={s.error} role="alert">{error}</p> : null}
                  <div className={s.editorActions}>
                    <button type="button" disabled={Boolean(savingCode)}
                      onClick={() => { setEditingCode(null); setError(null); setSuggestedL25Length(false); }}>
                      Cancelar
                    </button>
                    <button type="button" disabled={Boolean(savingCode) || !draftCost.trim()}
                      onClick={() => void save(row)}>
                      {savingCode === row.technicalCode ? "Guardando…" : "Guardar costo " + row.technicalCode}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className={s.note}>Cada precio corresponde a un perfil y una tira. No modifica el precio comercial ni las cotizaciones guardadas.</p>
    </section>
  );
}
