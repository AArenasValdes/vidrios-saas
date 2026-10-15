"use client";

import { LuX } from "react-icons/lu";
import { useState } from "react";

import { formatCurrencyInput } from "@/features/cotizaciones/new-quote/workflow-ui";
import s from "../../page.module.css";

type VariationOverlayItemDraft = {
  id: string;
  label: string;
  ancho: string;
  alto: string;
  precio: string;
  sistema: string;
};

type Props = {
  baseCode: string;
  tipo: string;
  totalItems: number;
  priceLabel: string;
  items: readonly VariationOverlayItemDraft[];
  systemOptions: readonly string[];
  onDraftChange: (
    itemId: string,
    key: "ancho" | "alto" | "precio" | "sistema",
    value: string
  ) => void;
  onApplyUnitPriceToAll: (value: string) => void;
  onEditFull: (itemId: string) => void;
  onClose: () => void;
};

export function PasoDosVariacionRapidaMovil({
  baseCode,
  tipo,
  totalItems,
  priceLabel,
  items,
  systemOptions,
  onDraftChange,
  onApplyUnitPriceToAll,
  onEditFull,
  onClose,
}: Props) {
  const [bulkPrice, setBulkPrice] = useState(() => {
    const firstPrice = items[0]?.precio.replace(/[^\d]/g, "") ?? "";
    return items.every((item) => item.precio.replace(/[^\d]/g, "") === firstPrice)
      ? firstPrice
      : "";
  });

  return (
    <div className={s.stepTwoMobileCreatorOverlay}>
      <div className={`${s.stepTwoMobileCreatorShell} ${s.stepTwoMobileVariationShell}`}>
        <div className={s.stepTwoMobileVariationHeader}>
          <div className={s.stepTwoMobileVariationHeaderCopy}>
            <span className={s.cardLabel}>Paso 2 / Ajuste por piezas</span>
            <h2>
              {totalItems} {tipo.toLowerCase()}
              {totalItems !== 1 ? "s" : ""}
            </h2>
            <strong className={s.stepTwoMobileVariationBaseCode}>{baseCode}</strong>
            <p>Al cerrar se guardan los cambios. Usa edicion completa solo si esa pieza necesita mas detalle.</p>
          </div>
          <button
            className={s.stepTwoMobileHeaderAction}
            onClick={onClose}
            type="button"
            aria-label="Cerrar y guardar cambios"
          >
            <LuX aria-hidden />
          </button>
        </div>

        <div className={`${s.stepTwoMobileCreatorBody} ${s.stepTwoMobileVariationBody}`}>
          <div className={s.stepTwoMobileVariationStack}>
            <section className={s.stepTwoMobileVariationBulkPrice} aria-label="Precio para todas las piezas">
              <label className={s.stepTwoMobileVariationField}>
                <span>{priceLabel} para todas</span>
                <input
                  className={s.stepTwoMobileVariationInput}
                  aria-label={`${priceLabel} para todas las piezas`}
                  inputMode="numeric"
                  placeholder="0"
                  type="text"
                  value={formatCurrencyInput(bulkPrice)}
                  onChange={(event) => setBulkPrice(event.target.value.replace(/[^\d]/g, ""))}
                />
              </label>
              <button
                className={s.stepTwoMobileVariationBulkPriceAction}
                disabled={!bulkPrice}
                onClick={() => onApplyUnitPriceToAll(bulkPrice)}
                type="button"
              >
                Aplicar a las {totalItems} piezas
              </button>
              <p>Luego puedes ajustar el valor de cualquier pieza por separado.</p>
            </section>

            {items.map((item) => (
              <article key={item.id} className={s.stepTwoMobileVariationUnitCard}>
                <div className={s.stepTwoMobileVariationUnitHead}>
                  <div>
                    <span className={s.cardLabel}>{item.label}</span>
                    <strong>{baseCode}</strong>
                  </div>
                  <button
                    className={s.stepTwoMobileVariationInlineLink}
                    onClick={() => onEditFull(item.id)}
                    type="button"
                  >
                    Edicion completa
                  </button>
                </div>

                <div className={s.stepTwoMobileVariationEditorGrid}>
                  <label className={s.stepTwoMobileVariationField}>
                    <span>Ancho</span>
                    <input
                      className={s.stepTwoMobileVariationInput}
                      inputMode="numeric"
                      placeholder="1200"
                      type="text"
                      value={item.ancho}
                      onChange={(event) =>
                        onDraftChange(
                          item.id,
                          "ancho",
                          event.target.value.replace(/[^\d]/g, "")
                        )
                      }
                    />
                  </label>

                  <label className={s.stepTwoMobileVariationField}>
                    <span>Alto</span>
                    <input
                      className={s.stepTwoMobileVariationInput}
                      inputMode="numeric"
                      placeholder="1500"
                      type="text"
                      value={item.alto}
                      onChange={(event) =>
                        onDraftChange(
                          item.id,
                          "alto",
                          event.target.value.replace(/[^\d]/g, "")
                        )
                      }
                    />
                  </label>
                </div>

                <label className={s.stepTwoMobileVariationField}>
                  <span>{priceLabel}</span>
                  <input
                    className={s.stepTwoMobileVariationInput}
                    inputMode="numeric"
                    placeholder="0"
                    type="text"
                    value={item.precio}
                    onChange={(event) =>
                      onDraftChange(
                        item.id,
                        "precio",
                        event.target.value.replace(/[^\d]/g, "")
                      )
                    }
                  />
                </label>

                <label className={s.stepTwoMobileVariationField}>
                  <span>Sistema</span>
                  <select
                    className={s.stepTwoMobileVariationSelect}
                    value={item.sistema}
                    onChange={(event) => onDraftChange(item.id, "sistema", event.target.value)}
                  >
                    {systemOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
