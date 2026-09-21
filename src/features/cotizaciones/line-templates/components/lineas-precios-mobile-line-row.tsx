"use client";

import {
  getLineTemplateSystemMetadata,
  lineTemplateNeedsCommercialPrice,
  type CotizacionLineTemplate,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  formatLineTemplatePriceLabel,
  LINE_TEMPLATE_CATEGORIA_LABELS,
} from "@/features/cotizaciones/line-templates/utils/catalog-labels";
import { resolveLineFabricationActionLabel } from "@/features/cotizaciones/line-templates/utils/line-fabrication-entry";
import { getLineVariantSlotsForFabricationTree } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { LuChevronRight } from "react-icons/lu";

import s from "./lineas-precios-mobile-view.module.css";

const SERIES_42_PROVIDER_BY_CATALOG_KEY: Record<string, string> = {
  "ventora:serie-42-proyectante-camara": "ALAR",
  "ventora:serie-42-proyectante-sin-camara": "SODAL",
};

type TechnicalStatus = {
  tone: "quote_only" | "draft" | "testing" | "validated";
  label: string;
};

type Props = {
  template: CotizacionLineTemplate;
  technicalStatus: TechnicalStatus;
  formatMoney: (value: number) => string;
  onOpenActions: () => void;
  onEditPrice: () => void;
  rowIndex: number;
};

function resolveLineCode(template: CotizacionLineTemplate) {
  const metadata = template.catalogMetadata as Record<string, unknown> | null | undefined;
  const lineSystem = getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem?.trim();
  const plantillaId =
    typeof metadata?.ventoraPlantillaId === "string"
      ? metadata.ventoraPlantillaId.trim()
      : "";

  return lineSystem || plantillaId || null;
}

function resolveProviderSummary(template: CotizacionLineTemplate) {
  const lineProvider = template.proveedor?.trim();
  if (lineProvider) {
    return { label: "Proveedor", providers: [lineProvider] };
  }

  const specificProvider = template.catalogKey
    ? SERIES_42_PROVIDER_BY_CATALOG_KEY[template.catalogKey]
    : null;
  if (specificProvider) {
    return { label: "Proveedor", providers: [specificProvider] };
  }

  const providers = Array.from(
    new Set(
      getLineVariantSlotsForFabricationTree(template.catalogKey)
        .map((slot) => slot.sourceName?.trim())
        .filter((provider): provider is string => Boolean(provider))
    )
  );

  return providers.length > 0
    ? { label: providers.length > 1 ? "Variantes de proveedor" : "Proveedor", providers }
    : null;
}

export function resolveLineCommercialStatus(
  template: CotizacionLineTemplate,
  needsPrice: boolean
): { label: string; tone: "paused" | "pending_price" | "ready" } {
  if (!template.isActive) {
    return { label: "Pausada", tone: "paused" };
  }

  if (needsPrice) {
    return { label: "Precio pendiente", tone: "pending_price" };
  }

  return { label: "Lista para cotizar", tone: "ready" };
}

export function resolveFabricationHint(
  template: CotizacionLineTemplate,
  technicalStatus: TechnicalStatus,
  needsPrice: boolean
): { label: string; tone: "optional" | "progress" | "ready" } | null {
  if (template.categoria === "vidrio" || needsPrice) {
    return null;
  }

  if (technicalStatus.tone === "validated") {
    return { label: "Con cubicación", tone: "ready" };
  }

  if (technicalStatus.tone === "testing") {
    return { label: "Cubicación en prueba", tone: "progress" };
  }

  if (technicalStatus.tone === "draft") {
    return { label: "Cubicación en borrador", tone: "progress" };
  }

  return { label: "Cubicación opcional", tone: "optional" };
}

export function resolveFabricationActionLabel(
  technicalStatus: TechnicalStatus,
  needsPrice: boolean,
  catalogKey?: string | null
): string {
  return resolveLineFabricationActionLabel({
    catalogKey,
    technicalTone: technicalStatus.tone,
    needsPrice,
  });
}

export function LineasPreciosMobileLineRow({
  template,
  technicalStatus,
  formatMoney,
  onOpenActions,
  onEditPrice,
  rowIndex,
}: Props) {
  const needsPrice = lineTemplateNeedsCommercialPrice(template);
  const lineCode = resolveLineCode(template);
  const materialLabel = template.material || LINE_TEMPLATE_CATEGORIA_LABELS[template.categoria];
  const providerSummary = resolveProviderSummary(template);
  const metaLine = [lineCode, materialLabel].filter(Boolean).join(" · ");
  const commercialStatus = resolveLineCommercialStatus(template, needsPrice);
  const fabricationHint = resolveFabricationHint(template, technicalStatus, needsPrice);

  return (
    <article
      className={`${s.lineRow} ${template.isActive ? "" : s.lineRowInactive}`}
      style={{ animationDelay: `${Math.min(rowIndex, 8) * 24}ms` }}
    >
      <div
        className={s.lineRowMain}
        role="button"
        tabIndex={0}
        onClick={onOpenActions}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onOpenActions();
        }}
        aria-label={`Acciones de ${template.nombre}`}
      >
        <div className={s.lineRowTop}>
          <strong className={s.lineName}>{template.nombre}</strong>
          <span
            className={`${s.linePrice} ${needsPrice ? s.linePriceMuted : s.linePriceReady}`}
          >
            {needsPrice
              ? "Sin precio"
              : formatLineTemplatePriceLabel(
                  template.unidadCobro,
                  template.precioM2Sugerido,
                  formatMoney
                )}
          </span>
        </div>

        {providerSummary || metaLine ? (
          <div className={s.lineMeta}>
            {providerSummary ? (
              <span
                className={s.lineProviderSummary}
                aria-label={`${providerSummary.label}: ${providerSummary.providers.join(", ")}`}
              >
                <span className={s.lineProviderLabel}>{providerSummary.label}</span>
                {providerSummary.providers.map((provider) => (
                  <span className={s.lineProviderBadge} key={provider}>
                    {provider}
                  </span>
                ))}
              </span>
            ) : null}
            {metaLine ? <span className={s.lineMetaDetails}>{metaLine}</span> : null}
          </div>
        ) : null}

        <div className={s.lineRowFooter}>
          <button
            type="button"
            className={s.lineInlineAction}
            onClick={(event) => {
              event.stopPropagation();
              onEditPrice();
            }}
          >
            {needsPrice ? "Agregar precio" : "Editar precio"}
          </button>

          <div className={s.lineStatusGroup}>
            <span className={s.lineStatusChip} data-tone={commercialStatus.tone}>
              <span className={s.lineStatusDot} aria-hidden />
              {commercialStatus.label}
            </span>

            {fabricationHint ? (
              <span className={s.lineStatusChip} data-tone={fabricationHint.tone}>
                <span className={s.lineStatusDot} aria-hidden />
                {fabricationHint.label}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <LuChevronRight className={s.lineRowChevron} aria-hidden />
    </article>
  );
}
