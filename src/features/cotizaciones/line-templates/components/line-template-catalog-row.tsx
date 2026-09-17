"use client";

import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";

import type { TechnicalCardStatus } from "@/features/cotizaciones/line-templates/services/catalogo-fabricacion-card-status";
import { isVentoraCatalogKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  getLineTemplateSystemMetadata,
  lineTemplateNeedsCommercialPrice,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  formatLineTemplatePriceLabel,
  LINE_TEMPLATE_CATEGORIA_LABELS,
} from "@/features/cotizaciones/line-templates/utils/catalog-labels";

import {
  LineTemplateCardActions,
  type LineTemplateActionKind,
} from "./line-template-card-actions";
import row from "./line-template-catalog-row.module.css";

type Props = {
  template: CotizacionLineTemplate;
  technicalStatus: TechnicalCardStatus;
  formatMoney: (value: number) => string;
  isMenuOpen: boolean;
  isSaving: boolean;
  pendingAction: LineTemplateActionKind | null;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  onEdit: () => void;
  onEditPrice: () => void;
  onToggleActive: () => void;
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

function resolveRowStatus(
  template: CotizacionLineTemplate,
  needsPrice: boolean,
  technicalStatus: TechnicalCardStatus
): { label: string; tone: "pending_price" | "pending_config" | "ready" | "muted" } {
  if (!template.isActive) {
    return { label: "Pausada", tone: "muted" };
  }

  if (needsPrice) {
    return { label: "Precio pendiente", tone: "pending_price" };
  }

  if (technicalStatus.tone === "validated") {
    return { label: "Fabricación validada", tone: "ready" };
  }

  return { label: "Lista para cotizar", tone: "ready" };
}

export function LineTemplateCatalogRow({
  template,
  technicalStatus,
  formatMoney,
  isMenuOpen,
  isSaving,
  pendingAction,
  onToggleMenu,
  onCloseMenu,
  onDuplicate,
  onRequestDelete,
  onEdit,
  onEditPrice,
  onToggleActive,
}: Props) {
  const needsPrice = lineTemplateNeedsCommercialPrice(template);
  const lineCode = resolveLineCode(template);
  const providerLabel = template.proveedor?.trim() || (isVentoraCatalogKey(template.catalogKey) ? "Ventora" : null);
  const materialLabel = LINE_TEMPLATE_CATEGORIA_LABELS[template.categoria];
  const rowStatus = resolveRowStatus(template, needsPrice, technicalStatus);
  const fabricationHref = `/configuracion/empresa/lineas-precios/${template.id}/fabricacion`;
  const showFabricationEntry = template.categoria !== "vidrio";

  return (
    <article
      className={`${row.row} ${template.isActive ? "" : row.rowInactive} ${
        isMenuOpen ? row.rowMenuOpen : ""
      }`}
      data-material={template.material}
    >
      <div className={row.identity}>
        <strong>{template.nombre}</strong>
        {lineCode ? <span className={row.code}>{lineCode}</span> : null}
      </div>

      <div className={row.badges} aria-label="Material y proveedor">
        <span className={row.badge} data-material={template.material}>
          {materialLabel}
        </span>
        {providerLabel ? (
          <>
            <span className={row.badgeDot} aria-hidden>
              ·
            </span>
            <span className={`${row.badge} ${row.badgeProvider}`}>{providerLabel}</span>
          </>
        ) : null}
      </div>

      <div className={row.priceBlock}>
        <strong className={row.priceValue}>
          {needsPrice
            ? "Sin precio"
            : formatLineTemplatePriceLabel(
                template.unidadCobro,
                template.precioM2Sugerido,
                formatMoney
              )}
        </strong>
        {needsPrice ? (
          <button
            type="button"
            className={row.priceLink}
            onClick={(event) => {
              event.stopPropagation();
              onEditPrice();
            }}
          >
            Agregar precio
          </button>
        ) : (
          <span className={row.priceMeta}>
            {`Mín. ${
              template.minimoCobrable > 0
                ? formatMoney(template.minimoCobrable)
                : "sin mínimo"
            }`}
          </span>
        )}
      </div>

      <div className={row.statusBlock}>
        {needsPrice ? (
          <span className={`${row.statusPill} ${row.statusPill_pending_price}`}>
            <span className={row.statusDot} aria-hidden />
            Precio pendiente
          </span>
        ) : null}

        {!template.isActive ? (
          <span className={`${row.statusPill} ${row.statusPill_muted}`}>
            <span className={row.statusDot} aria-hidden />
            Pausada
          </span>
        ) : null}

        {showFabricationEntry ? (
          <Link
            href={fabricationHref}
            className={row.fabricationLink}
            data-tech-status={technicalStatus.tone}
            aria-label={`Fabricación: ${technicalStatus.label}`}
            onClick={(event) => event.stopPropagation()}
          >
            <span className={row.fabricationLinkCopy}>
              <span className={row.fabricationLinkLabel}>Fabricación</span>
              <span className={row.fabricationLinkValue}>{technicalStatus.label}</span>
            </span>
            <LuChevronRight className={row.fabricationLinkIcon} aria-hidden />
          </Link>
        ) : !needsPrice && template.isActive ? (
          <span className={`${row.statusPill} ${row[`statusPill_${rowStatus.tone}`]}`}>
            <span className={row.statusDot} aria-hidden />
            {rowStatus.label}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className={`${row.switch} ${template.isActive ? row.switchOn : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleActive();
        }}
        aria-pressed={template.isActive}
        aria-label={`${template.isActive ? "Desactivar" : "Activar"} ${template.nombre}`}
      >
        <span className={row.switchThumb} />
      </button>

      <button
        type="button"
        className={row.configureBtn}
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
      >
        Configurar
      </button>

      <div className={row.menu}>
        <LineTemplateCardActions
          templateName={template.nombre}
          isOpen={isMenuOpen}
          isBusy={isSaving}
          pendingAction={pendingAction}
          onToggle={onToggleMenu}
          onClose={onCloseMenu}
          onDuplicate={onDuplicate}
          onRequestDelete={onRequestDelete}
        />
      </div>
    </article>
  );
}
