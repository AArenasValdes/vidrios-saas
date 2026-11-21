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
  isAppliedTechnicalCostSuggestionOutdated?: boolean;
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
  costoIngresado,
  cantidad,
  hideMargenOption = false,
  technicalCostSummary = null,
  isResolvingTechnicalCost = false,
  hasAppliedTechnicalCostSuggestion = false,
  isAppliedTechnicalCostSuggestionOutdated = false,
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
  const effectiveQty = Number.isFinite(cantidad) && cantidad > 0 ? Math.round(cantidad) : 1;
  const manualBaseGroupCost =
    activePricingMode === "margen" && Number.isFinite(costoIngresado) && costoIngresado > 0
      ? costInputScope === "unit"
        ? Math.round(costoIngresado * effectiveQty)
        : Math.round(costoIngresado)
      : 0;
  const isManualBaseBelowKnownCost =
    activePricingMode === "margen" &&
    technicalCostSummary?.knownNetTotal != null &&
    manualBaseGroupCost > 0 &&
    manualBaseGroupCost < technicalCostSummary.knownNetTotal;

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
          {costInputScope === "unit" && costoIngresado > 0 && effectiveQty > 1 ? (
            <span className={s.stepTwoMobileInlineHelp}>
              Equivalente grupo ({effectiveQty} u): {formatNetClp(costoIngresado)} / u ×{" "}
              {effectiveQty} u = <strong>{formatNetClp(manualBaseGroupCost)}</strong> base total
            </span>
          ) : null}
        </div>
      ) : null}

      <span className={s.stepTwoMobileBlockHelp}>{priceHelp}</span>

      {isManualBaseBelowKnownCost ? (
        <div
          role="alert"
          style={{
            marginTop: "8px",
            padding: "8px 10px",
            borderRadius: "10px",
            border: "1px solid #f59f00",
            background: "#fff9db",
            color: "#664d03",
            fontSize: "0.8rem",
          }}
        >
          El costo base ingresado ({formatNetClp(manualBaseGroupCost)}) es menor que los materiales
          conocidos ({formatNetClp(technicalCostSummary!.knownNetTotal!)}). Verifica que incluya el
          total completo y no solo la diferencia.
        </div>
      ) : null}

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
            minWidth: 0,
            maxWidth: "100%",
            overflowWrap: "anywhere",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
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
                  <span className={s.stepTwoMobileInlineHelp}>
                    Solo materiales (perfiles, vidrio y accesorios). No incluye mano de obra ni
                    instalación.
                  </span>
                  {!technicalCostSummary.isRecipeValidated ? (
                    <span className={s.stepTwoMobileInlineHelp}>
                      Receta sin validación física de taller (estado{" "}
                      {technicalCostSummary.recipeStatus ?? "pendiente"}). No acredita fabricación
                      validada.
                    </span>
                  ) : null}
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
                    {" · "}
                    {technicalCostSummary.nonVerifiedReasons[0]
                      ? `${technicalCostSummary.nonVerifiedReasons[0]} `
                      : null}
                    {technicalCostSummary.missingItems.length > 0
                      ? `Falta ${technicalCostSummary.missingItems
                          .slice(0, 2)
                          .map((entry) => entry.description)
                          .join(", ")}. `
                      : null}
                    No se aplica recargo automático sobre suma parcial.
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
                    Costo base neto ({effectiveQty > 1 ? `grupo ${effectiveQty} u` : "grupo"}):{" "}
                    <strong>{formatNetClp(technicalCostSummary.usableBaseCostGroupNet)}</strong>
                    {" · "}Recargo {technicalCostSummary.defaultMarkupPct}%:{" "}
                    <strong>+{formatNetClp(technicalCostSummary.markupAmountNet)}</strong>
                  </div>
                  {effectiveQty > 1 ? (
                    <div style={{ fontSize: "0.78rem", color: "#486581" }}>
                      Equivalente por unidad:{" "}
                      <strong>
                        {formatNetClp(Math.round(technicalCostSummary.usableBaseCostGroupNet / effectiveQty))}
                      </strong>
                      {" → "}
                      <strong>
                        {formatNetClp(Math.round(technicalCostSummary.suggestedNetTotal / effectiveQty))}
                      </strong>{" "}
                      / u neto
                    </div>
                  ) : null}
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
                    ) : (
                      <>
                        {onApplyTechnicalCostSuggestion ? (
                          <button
                            type="button"
                            className={s.stepTwoMobileChoiceChip}
                            onClick={onApplyTechnicalCostSuggestion}
                          >
                            Usar sugerencia ({formatNetClp(technicalCostSummary.suggestedNetTotal)})
                          </button>
                        ) : null}
                        {isAppliedTechnicalCostSuggestionOutdated && onRevertTechnicalCostSuggestion ? (
                          <button
                            type="button"
                            className={s.stepTwoMobileSecondaryLink}
                            onClick={onRevertTechnicalCostSuggestion}
                          >
                            Revertir
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {isAppliedTechnicalCostSuggestionOutdated ? (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span className={s.stepTwoMobileInlineHelp}>
                    La configuración cambió: la sugerencia anterior quedó desactualizada.
                  </span>
                  {technicalCostSummary.status !== "complete" && onRevertTechnicalCostSuggestion ? (
                    <button
                      type="button"
                      className={s.stepTwoMobileSecondaryLink}
                      onClick={onRevertTechnicalCostSuggestion}
                    >
                      Revertir
                    </button>
                  ) : null}
                </div>
              ) : null}

              {activePricingMode === "margen" && technicalCostSummary.status !== "complete" ? (
                <span className={s.stepTwoMobileInlineHelp}>
                  Costo base manual: representa el total completo de la base (no se suma encima del
                  parcial).
                </span>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
