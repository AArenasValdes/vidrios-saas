"use client";

import { useState } from "react";
import type { SupplierProfilePricePreview } from "../services/supplier-presentation-resolution.service";
import { saveQuotePresentationPrice } from "../services/mis-precios.client.service";
import s from "./supplier-profile-price-preview.module.css";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SupplierProfilePricePreview({
  prices,
  providerKey,
  familyKey,
  finishName,
  canManagePrice = false,
  onPriceSaved,
}: {
  prices: readonly SupplierProfilePricePreview[];
  providerKey?: string | null;
  familyKey?: string | null;
  finishName?: string | null;
  canManagePrice?: boolean;
  onPriceSaved?: () => Promise<void> | void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const visiblePrices = providerKey
    ? [...new Map(prices.map((price) => [price.technicalCode, price])).values()].map((reference) => {
        const selectedProviderPrice = prices.find((price) =>
          price.technicalCode === reference.technicalCode && price.providerKey === providerKey
        );
        return selectedProviderPrice ?? {
          ...reference,
          providerKey,
          providerLabel: providerKey,
          presentationId: "",
          supplierSku: "",
          purchaseUnit: "",
          commercialLengthMm: null,
          netPrice: null,
          currency: null,
          priceSource: null,
          status: "missing_price" as const,
        };
      })
    : prices;
  if (visiblePrices.length === 0) return null;
  const profileCount = new Set(visiblePrices.map((price) => price.technicalCode)).size;

  return (
    <details className={s.root}>
      <summary>Ver precios de {profileCount} perfiles</summary>
      <p className={s.note}>Precio de compra por perfil y presentación. No calcula el costo total de la pieza.</p>
      <ul className={s.list}>
        {visiblePrices.map((price, index) => (
          <li className={s.row} key={`${price.technicalCode}:${price.providerKey}:${price.presentationId || index}`}>
            <span className={s.profile}>
              <strong>{price.profileName || price.presentationDescription}</strong>
              <small>{price.technicalCode}{price.supplierSku ? ` · ${price.supplierSku}` : ""}</small>
            </span>
            <span className={s.amount}>
              {price.status === "priced" && price.netPrice != null && price.currency
                ? <><strong>{formatPrice(price.netPrice, price.currency)}</strong><small>por {price.purchaseUnit}{price.commercialLengthMm ? ` · ${price.commercialLengthMm.toLocaleString("es-CL")} mm` : ""}</small></>
                : <strong className={s.pending}>{price.status === "ambiguous" ? "Presentación ambigua" : "Sin precio"}</strong>}
              <small>{price.priceSource === "organization_override" ? "Precio ingresado por tu taller" : price.providerLabel}</small>
              {canManagePrice && Boolean(providerKey) && price.providerKey === providerKey && price.status === "missing_price" && price.presentationId && price.providerKey &&
              familyKey && finishName && price.currency ? (
                <span className={s.priceEntry}>
                  <label>
                    <span>Agregar precio neto ({price.currency})</span>
                    <input
                      aria-label={`Precio neto ${price.technicalCode}`}
                      inputMode="decimal"
                      type="number"
                      min="1"
                      step="1"
                      value={drafts[price.presentationId] ?? ""}
                      onChange={(event) => setDrafts((current) => ({ ...current, [price.presentationId]: event.target.value }))}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={savingId === price.presentationId || !Number.isFinite(Number(drafts[price.presentationId])) || Number(drafts[price.presentationId]) <= 0}
                    onClick={() => {
                      const netPrice = Number(drafts[price.presentationId]);
                      if (!Number.isFinite(netPrice) || netPrice <= 0) return;
                      setSavingId(price.presentationId);
                      setSaveError(null);
                      void saveQuotePresentationPrice({
                        providerKey: price.providerKey,
                        presentationId: price.presentationId,
                        familyKey,
                        technicalCode: price.technicalCode,
                        finishName,
                        netPrice,
                        currency: price.currency!,
                      }).then(async () => {
                        setDrafts((current) => ({ ...current, [price.presentationId]: "" }));
                        await onPriceSaved?.();
                      }).catch((error: unknown) => {
                        setSaveError(error instanceof Error ? error.message : "No se pudo guardar este precio.");
                      }).finally(() => setSavingId(null));
                    }}
                  >
                    {savingId === price.presentationId ? "Guardando…" : "Guardar en Mis precios"}
                  </button>
                </span>
              ) : canManagePrice && Boolean(providerKey) && price.providerKey === providerKey && price.status === "missing_price" && !price.presentationId ? (
                <small className={s.capturePending}>No hay una presentación confirmada para este acabado; no se puede guardar un precio sin asociarla.</small>
              ) : canManagePrice && Boolean(providerKey) && price.providerKey === providerKey && price.status === "missing_price" && price.presentationId && !price.currency ? (
                <small className={s.capturePending}>Falta la moneda de esta presentación; no se guardará un precio sin ese dato.</small>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {saveError ? <p className={s.saveError} role="alert">{saveError}</p> : null}
    </details>
  );
}
