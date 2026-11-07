"use client";

import { useMemo, useState } from "react";
import type { SupplierProfilePricePreview as PriceRow } from "../services/supplier-presentation-resolution.service";
import { saveQuickWorkshopProfileCost, saveQuotePresentationPrice } from "../services/mis-precios.client.service";
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
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
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
  onPricesSaved,
}: {
  lineTemplateId: number;
  familyKey: string;
  providerKey: string;
  finishName: string | null;
  references: readonly { technicalCode: string; profileName: string }[];
  prices: readonly PriceRow[];
  canManagePrice: boolean;
  onPricesSaved?: () => Promise<void> | void;
}) {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftCost, setDraftCost] = useState("");
  const [draftLength, setDraftLength] = useState("");
  const [draftFinish, setDraftFinish] = useState(finishName ?? "");
  const [savingCode, setSavingCode] = useState<string | null>(null);
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
    for (const [code, candidates] of grouped) {
      const row = candidates[0];
      if (!referencesByCode.has(code) && row) referencesByCode.set(code, { technicalCode: row.technicalCode, profileName: row.profileName });
    }
    return [...referencesByCode.entries()].map(([code, reference]) => {
      const candidates = grouped.get(code) ?? [];
      const ownRows = candidates.filter((row) => row.priceSource === "workshop" && row.providerKey.startsWith("taller:"));
      const own = ownRows.length === 1 ? ownRows[0] : undefined;
      const selected = candidates.find((row) => row.providerKey === providerKey);
      const fallback = candidates[0] ?? {
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
      const display = own ?? selected ?? fallback;
      return {
        technicalCode: reference.technicalCode,
        profileName: reference.profileName || display.profileName || display.presentationDescription || reference.technicalCode,
        workshop: own,
        selected,
        display,
        conflict: ownRows.length > 1 || display?.status === "ambiguous",
      };
    });
  }, [prices, providerKey, references]);
  const pricedCount = rows.filter((row) => row.display?.status === "priced" && row.display.netPrice != null &&
    row.display.finishPriceBasis !== "base_reference_other_finish").length;
  if (rows.length === 0) return null;

  function openEditor(row: ProfileCost) {
    const current = row.display;
    setError(null);
    setEditingCode(row.technicalCode);
    setDraftCost(current?.priceSource === "organization_override" || current?.priceSource === "workshop"
      ? String(current.netPrice ?? "")
      : "");
    setDraftLength(current?.priceSource === "workshop" ? String(current.commercialLengthMm ?? "") : "");
    setDraftFinish(finishName ?? "");
  }

  async function save(row: ProfileCost) {
    const cost = Number(draftCost);
    const lengthText = draftLength.trim();
    const length = lengthText ? Number(lengthText) : null;
    if (!Number.isFinite(cost) || cost <= 0) {
      setError("Ingresa un costo neto por tira mayor que cero.");
      return;
    }
    if (length !== null && (!Number.isSafeInteger(length) || length <= 0)) {
      setError("El largo debe ser un número entero de milímetros o quedar pendiente.");
      return;
    }
    if (!draftFinish.trim()) {
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
        });
      } else if (row.selected?.presentationId && row.selected.providerKey === providerKey &&
        row.selected.finishPriceBasis !== "base_reference_other_finish" &&
        row.selected.commercialLengthMm != null && row.selected.commercialLengthMm > 0) {
        await saveQuotePresentationPrice({
          providerKey, presentationId: row.selected.presentationId, familyKey,
          technicalCode: row.technicalCode, finishName: draftFinish.trim(), netPrice: cost, currency: "CLP",
        });
      } else {
        await saveQuickWorkshopProfileCost({
          kind: "create", lineTemplateId, technicalCode: row.technicalCode,
          profileName: row.profileName, finishName: draftFinish.trim(),
          commercialLengthMm: length, netPrice: cost,
        });
      }
      setEditingCode(null);
      setDraftCost("");
      setDraftLength("");
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
        <div><h3>Mis costos de perfiles</h3><p>{pricedCount} de {rows.length} perfiles con costo</p></div>
      </header>
      <ul className={s.list}>
        {rows.map((row) => {
          const current = row.display;
          const isEditing = editingCode === row.technicalCode;
          const hasCost = current?.status === "priced" && current.netPrice != null && current.currency != null;
          const hasSelectedPresentation = Boolean(row.selected?.presentationId && row.selected.providerKey === providerKey &&
            row.selected.finishPriceBasis !== "base_reference_other_finish");
          const cannotUseAmbiguous = row.conflict;
          const existingOwn = Boolean(row.workshop?.presentationId);
          const canEditPrivate = existingOwn && revisionFromPreview(row.workshop) !== null;
          const canSave = canManagePrice && !cannotUseAmbiguous && (existingOwn ? canEditPrivate : true);

          return (
            <li className={s.row} key={row.technicalCode}>
              <div className={s.identity}>
                <strong>{row.technicalCode} · {row.profileName}</strong>
                <small>Acabado cotizado: {finishName || "pendiente"} · {current?.commercialLengthMm
                  ? `${current.commercialLengthMm.toLocaleString("es-CL")} mm por tira`
                  : "largo de compra pendiente"}</small>
              </div>
              <div className={s.cost}>
                <strong>{hasCost ? formatNetPrice(current.netPrice!, current.currency!) : current?.status === "ambiguous" ? "Revisar presentación" : "Sin precio"}</strong>
                <small>{current?.finishPriceBasis === "base_reference_other_finish"
                  ? `Base comercial ${current.priceSourceFinishName || "de otro acabado"}; costo físico de ${finishName || "este acabado"} pendiente.`
                  : current?.priceSource === "workshop" || current?.priceSource === "organization_override"
                  ? "Costo guardado por tu empresa"
                  : current?.providerLabel || "Referencia de compra pendiente"}</small>
              </div>
              {canManagePrice ? (
                cannotUseAmbiguous ? <small className={s.pending}>Hay más de una referencia compatible. Revisa la presentación antes de guardar otro costo.</small> :
                  <button className={s.action} type="button" disabled={!canSave || Boolean(savingCode)} onClick={() => openEditor(row)}>
                    {row.workshop || current?.priceSource === "organization_override" ? "Editar costo" : "Agregar costo"}
                  </button>
              ) : null}
              {isEditing ? (
                <div className={s.editor}>
                  {!row.workshop ? (
                    <label>Acabado del perfil
                      <input value={draftFinish} readOnly={Boolean(finishName)} required maxLength={100} onChange={(event) => setDraftFinish(event.target.value)} />
                    </label>
                  ) : null}
                  {(!hasSelectedPresentation || row.workshop) ? (
                    <label>Largo de la tira {row.technicalCode} (mm)
                      <input type="number" inputMode="numeric" min="1" step="1" value={draftLength}
                        onChange={(event) => setDraftLength(event.target.value)} placeholder="Pendiente" />
                    </label>
                  ) : null}
                  <label>Costo neto por tira {row.technicalCode} (CLP)
                    <input type="number" inputMode="decimal" min="1" step="1" value={draftCost}
                      onChange={(event) => setDraftCost(event.target.value)} />
                  </label>
                  {!hasSelectedPresentation && !row.workshop ? <small>Se guardará como referencia privada de tu empresa, sin SKU de proveedor.</small> : null}
                  <div className={s.editorActions}>
                    <button type="button" onClick={() => { setEditingCode(null); setError(null); }}>Cancelar</button>
                    <button type="button" disabled={Boolean(savingCode) || !draftCost} onClick={() => void save(row)}>
                      {savingCode === row.technicalCode ? "Guardando…" : `Guardar costo ${row.technicalCode}`}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? <p className={s.error} role="alert">{error}</p> : null}
      <p className={s.note}>Costo de compra por tira. No modifica el precio de venta ni una cotización guardada.</p>
    </section>
  );
}
