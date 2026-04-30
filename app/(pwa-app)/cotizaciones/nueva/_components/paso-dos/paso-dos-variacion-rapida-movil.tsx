"use client";

import { LuX } from "react-icons/lu";

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
  onEditFull,
  onClose,
}: Props) {
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
