"use client";

import {
  getLineTemplateGlassMetadata,
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
import { LuCheck, LuChevronRight, LuClock, LuEyeOff } from "react-icons/lu";
import { resolveDocumentedLineIdentity } from "./line-template-catalog-family";

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
  groupedByProvider?: boolean;
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

function resolveGlassFacts(template: CotizacionLineTemplate) {
  const metadata = template.catalogMetadata as Record<string, unknown> | null | undefined;
  const glass = getLineTemplateGlassMetadata(template.catalogMetadata);
  const code = [metadata?.codigo, metadata?.code, metadata?.sku]
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
    ?.trim();
  return [code ? `Código ${code}` : "", glass.espesor ?? "", glass.terminacion ?? ""]
    .filter(Boolean)
    .join(" · ");
}

function resolveGlassPurchaseSummary(template: CotizacionLineTemplate, formatMoney: (value: number) => string) {
  const glass = getLineTemplateGlassMetadata(template.catalogMetadata);
  return [
    glass.planchaAnchoMm && glass.planchaAltoMm
      ? `Plancha ${glass.planchaAnchoMm} × ${glass.planchaAltoMm} mm`
      : "",
    template.costoBase > 0 ? `Compra plancha ${formatMoney(template.costoBase)}` : "Sin costo de compra",
    template.mermaPct > 0 ? `Merma ${template.mermaPct}%` : "",
    template.minimoCobrable > 0 ? `Mín. venta ${formatMoney(template.minimoCobrable)}` : "Sin mínimo",
    template.redondeoPrecio > 0 ? `Redondeo ${formatMoney(template.redondeoPrecio)}` : "Sin redondeo",
  ].filter(Boolean).join(" · ");
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

export function resolveLineListBadge(
  template: CotizacionLineTemplate,
  technicalStatus: TechnicalStatus,
  needsPrice: boolean
): { label: string; tone: "ready" | "draft" | "unpriced" | "hidden" } {
  if (!template.isActive) return { label: "Oculta", tone: "hidden" };
  if (technicalStatus.tone === "draft" || technicalStatus.tone === "testing") {
    return { label: "Borrador", tone: "draft" };
  }
  if (needsPrice) return { label: "Sin precio", tone: "unpriced" };
  if (technicalStatus.tone === "quote_only" && template.categoria !== "vidrio") {
    return { label: "Sin configurar", tone: "draft" };
  }
  return { label: "Lista", tone: "ready" };
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
  groupedByProvider = false,
}: Props) {
  const needsPrice = lineTemplateNeedsCommercialPrice(template);
  const lineCode = resolveLineCode(template);
  const materialLabel = template.material || LINE_TEMPLATE_CATEGORIA_LABELS[template.categoria];
  const providerSummary = groupedByProvider ? null : resolveProviderSummary(template);
  const documented = resolveDocumentedLineIdentity(template);
  const displayName = documented.familyKey?.startsWith("veratec:") && documented.configurationLabel
    ? documented.configurationLabel : template.nombre;
  const metaLine = template.categoria === "vidrio"
    ? resolveGlassFacts(template)
    : [lineCode, materialLabel].filter(Boolean).join(" · ");
  const listBadge = resolveLineListBadge(template, technicalStatus, needsPrice);

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
          <strong className={s.lineName}>{displayName}</strong>
          <span
            className={`${s.linePrice} ${needsPrice ? s.linePriceMuted : s.linePriceReady}`}
          >
            {needsPrice
              ? "Sin precio"
              : template.categoria === "vidrio"
                ? `Venta ${formatLineTemplatePriceLabel(
                    template.unidadCobro,
                    template.precioM2Sugerido,
                    formatMoney
                  )}`
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
            {template.categoria === "vidrio" ? (
              <span className={`${s.lineMetaDetails} ${s.glassMetaDetails}`}>{resolveGlassPurchaseSummary(template, formatMoney)}</span>
            ) : null}
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

          <span className={s.lineListBadge} data-tone={listBadge.tone}>
            {listBadge.tone === "ready" ? <LuCheck aria-hidden /> : null}
            {listBadge.tone === "draft" ? <LuClock aria-hidden /> : null}
            {listBadge.tone === "hidden" ? <LuEyeOff aria-hidden /> : null}
            {listBadge.label}
          </span>
        </div>
      </div>

      <LuChevronRight className={s.lineRowChevron} aria-hidden />
    </article>
  );
}
