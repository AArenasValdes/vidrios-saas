"use client";

import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type { CostInputScope } from "@/features/cotizaciones/types/pricing-mode";
import { QUOTE_PROFITABILITY_COPY } from "@/features/cotizaciones/services/quote-studio-financial.service";
import type { GuidedTechnicalCostSuggestion } from "@/features/proveedor-catalogos/services/guided-technical-cost-suggestion.service";

import s from "../../page.module.css";

function formatNetClp(value: number) {
  return `$ ${Math.round(value).toLocaleString("es-CL")}`;
}

type Props = {
  activePricingMode: PricingMode;
  costInputScope: CostInputScope;
  formattedPriceValue: string;
  marginValue: string;
  costoIngresado: number;
  cantidad: number;
  hideMargenOption?: boolean;
  technicalCostSummary?: GuidedTechnicalCostSuggestion | null;
  isResolvingTechnicalCost?: boolean;
  hasAppliedTechnicalCostSuggestion?: boolean;
  onApplyTechnicalCostSuggestion?: () => void;
  onRevertTechnicalCostSuggestion?: () => void;
  onCompleteManualBaseCost?: () => void;
  onCostInputScopeChange: (scope: CostInputScope) => void;
  onMargenChange: (value: string) => void;
  onPrecioChange: (value: string) => void;
  onPricingModeChange: (mode: PricingMode) => void;
  priceHelp: string;
  priceLabel: string;
};

export function PasoDosWizardPrecioMovil({
  activePricingMode,
  costInputScope,
  formattedPriceValue,
  marginValue,
  hideMargenOption = false,
  technicalCostSummary = null,
  isResolvingTechnicalCost = false,
  hasAppliedTechnicalCostSuggestion = false,
  onApplyTechnicalCostSuggestion,
  onRevertTechnicalCostSuggestion,
  onCompleteManualBaseCost,
  onCostInputScopeChange,
  onMargenChange,
  onPrecioChange,
  onPricingModeChange,
  priceHelp,
  priceLabel,
}: Props) {
  const pricingOptions = hideMargenOption
    ? [{ value: "precio_directo" as const, label: "Valor directo" }]
    : [
        { value: "precio_directo" as const, label: "Valor directo" },
        { value: "margen" as const, label: "Costo + recargo" },
      ];

  return (
    <div className={s.stepTwoMobileBlockPrecio}>
      <div className={s.stepTwoMobileBlockLabel}>Modo de precio</div>
      <div
        className={s.stepTwoMobilePricingRadioGroup}
        role="radiogroup"
        aria-label="Modo de precio"
      >
        {pricingOptions.map((option) => (
          <button
            key={option.value}
            className={`${s.stepTwoMobilePricingRadio} ${
              activePricingMode === option.value ? s.stepTwoMobilePricingRadioActive : ""
            }`}
            role="radio"
            aria-checked={activePricingMode === option.value}
            tabIndex={activePricingMode === option.value ? 0 : -1}
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onPricingModeChange(option.value)}
          >
            <span className={s.stepTwoMobilePricingRadioControl} aria-hidden />
            <span className={s.stepTwoMobilePricingRadioLabel}>{option.label}</span>
          </button>
        ))}
      </div>

      {activePricingMode === "margen" ? (
        <div className={s.stepTwoMobilePricingModeSlot}>
          <div className={s.stepTwoMobileMarginField}>
            <label className={s.stepTwoMobileMedidaLabel} htmlFor="grupo-margen">
              Recargo sobre costo (%)
            </label>
            <input
              aria-describedby="grupo-margen-help"
              className={s.stepTwoMobileMarginInput}
              id="grupo-margen"
              inputMode="numeric"
              placeholder="100"
              type="text"
              value={marginValue}
              onChange={(event) => onMargenChange(event.target.value)}
            />
            <span className={s.stepTwoMobileInlineHelp} id="grupo-margen-help">
              {QUOTE_PROFITABILITY_COPY.recargoDuplica}
            </span>
          </div>
        </div>
      ) : null}

      <div className={s.stepTwoMobileBlockLabel}>{priceLabel}</div>
      <input
        className={s.stepTwoMobilePrecioInput}
        id="grupo-precio"
        inputMode="numeric"
        placeholder="$ 120.000"
        type="text"
        value={formattedPriceValue}
        onChange={(event) => onPrecioChange(event.target.value)}
      />

      {activePricingMode === "margen" ? (
        <div className={s.costScopeRow}>
          <span className={s.costScopeLabel}>Este costo corresponde a</span>
          <div className={s.costScopeChips}>
            <button
              className={`${s.costScopeChip} ${costInputScope === "group_total" ? s.costScopeChipActive : ""}`}
              onClick={() => onCostInputScopeChange("group_total")}
              type="button"
            >
              Total del grupo
            </button>
            <button
              className={`${s.costScopeChip} ${costInputScope === "unit" ? s.costScopeChipActive : ""}`}
              onClick={() => onCostInputScopeChange("unit")}
              type="button"
            >
              Por unidad
            </button>
          </div>
          <span className={s.stepTwoMobileInlineHelp}>
            {costInputScope === "group_total"
              ? "Aplica a todas las unidades del grupo."
              : "Se multiplicará por la cantidad."}
          </span>
        </div>
      ) : null}

      <span className={s.stepTwoMobileBlockHelp}>{priceHelp}</span>

      {isResolvingTechnicalCost || technicalCostSummary ? (
        <section
          aria-label="Costo técnico de fabricación"
          style={{
            marginTop: "12px",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #d9e2ec",
            background: "#f8fafc",
            display: "grid",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <strong style={{ fontSize: "0.86rem", color: "#102a43" }}>
              Costo técnico de fabricación
            </strong>
            {isResolvingTechnicalCost ? (
              <span className={s.stepTwoMobileInlineHelp}>Calculando…</span>
            ) : technicalCostSummary?.status === "complete" ? (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#0f5132",
                  background: "#d1e7dd",
                  padding: "2px 8px",
                  borderRadius: "999px",
                }}
              >
                Costo verificado
              </span>
            ) : technicalCostSummary?.status === "partial" ? (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#664d03",
                  background: "#fff3cd",
                  padding: "2px 8px",
                  borderRadius: "999px",
                }}
              >
                Costo parcial
              </span>
            ) : (
              <span className={s.stepTwoMobileInlineHelp}>No disponible</span>
            )}
          </div>

          {!isResolvingTechnicalCost && technicalCostSummary ? (
            <>
              {technicalCostSummary.status === "unavailable" ? (
                <span className={s.stepTwoMobileInlineHelp}>
                  {technicalCostSummary.reason ?? "Faltan datos para calcular el costo técnico."}
                </span>
              ) : (
                <div style={{ display: "grid", gap: "4px", fontSize: "0.82rem", color: "#334e68" }}>
                  <div>
                    Perfiles conocidos:{" "}
                    <strong>
                      {technicalCostSummary.profilesCostNet != null
                        ? formatNetClp(technicalCostSummary.profilesCostNet)
                        : "Pendiente"}
                    </strong>
                  </div>
                  <div>
                    Vidrio:{" "}
                    <strong>
                      {technicalCostSummary.glassCostNet != null
                        ? formatNetClp(technicalCostSummary.glassCostNet)
                        : "Pendiente de precio de compra"}
                    </strong>
                  </div>
                  {technicalCostSummary.accessoriesCostNet != null ? (
                    <div>
                      Accesorios:{" "}
                      <strong>{formatNetClp(technicalCostSummary.accessoriesCostNet)}</strong>
                    </div>
                  ) : null}
                </div>
              )}

              {technicalCostSummary.status === "partial" ? (
                <div style={{ display: "grid", gap: "6px" }}>
                  <span className={s.stepTwoMobileInlineHelp}>
                    Costo conocido parcial:{" "}
                    <strong>
                      {technicalCostSummary.knownNetTotal != null
                        ? formatNetClp(technicalCostSummary.knownNetTotal)
                        : "$ 0"}
                    </strong>
                    {" · No incluye "}
                    {technicalCostSummary.missingItems
                      .slice(0, 2)
                      .map((entry) => entry.description)
                      .join(", ") || "materiales pendientes"}
                    . No se aplica recargo automático sobre suma parcial.
                  </span>
                  {onCompleteManualBaseCost ? (
                    <button
                      type="button"
                      className={s.stepTwoMobileSecondaryLink}
                      onClick={onCompleteManualBaseCost}
                      style={{ justifySelf: "start" }}
                    >
                      Completar costo base manual
                    </button>
                  ) : null}
                </div>
              ) : null}

              {technicalCostSummary.status === "complete" &&
              technicalCostSummary.usableBaseCostGroupNet != null &&
              technicalCostSummary.markupAmountNet != null &&
              technicalCostSummary.suggestedNetTotal != null ? (
                <div style={{ display: "grid", gap: "6px", borderTop: "1px solid #d9e2ec", paddingTop: "8px" }}>
                  <div style={{ fontSize: "0.82rem", color: "#102a43" }}>
                    Costo base neto (grupo):{" "}
                    <strong>{formatNetClp(technicalCostSummary.usableBaseCostGroupNet)}</strong>
                    {" · "}Recargo {technicalCostSummary.defaultMarkupPct}%:{" "}
                    <strong>+{formatNetClp(technicalCostSummary.markupAmountNet)}</strong>
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "#102a43" }}>
                    Precio neto sugerido:{" "}
                    <strong>{formatNetClp(technicalCostSummary.suggestedNetTotal)}</strong>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {hasAppliedTechnicalCostSuggestion && onRevertTechnicalCostSuggestion ? (
                      <>
                        <span className={s.stepTwoMobileInlineHelp}>Sugerencia aplicada</span>
                        <button
                          type="button"
                          className={s.stepTwoMobileSecondaryLink}
                          onClick={onRevertTechnicalCostSuggestion}
                        >
                          Revertir
                        </button>
                      </>
                    ) : onApplyTechnicalCostSuggestion ? (
                      <button
                        type="button"
                        className={s.stepTwoMobileChoiceChip}
                        onClick={onApplyTechnicalCostSuggestion}
                      >
                        Usar sugerencia ({formatNetClp(technicalCostSummary.suggestedNetTotal)})
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activePricingMode === "margen" && technicalCostSummary.status !== "complete" ? (
                <span className={s.stepTwoMobileInlineHelp}>
                  Costo base manual (incluye faltantes no verificados).
                </span>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
