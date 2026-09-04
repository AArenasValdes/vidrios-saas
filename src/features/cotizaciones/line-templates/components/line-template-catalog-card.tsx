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

import { LineProfileReferencesSection } from "./line-profile-references-section";
import {
  LineTemplateCardActions,
  type LineTemplateActionKind,
} from "./line-template-card-actions";
import s from "./lineas-precios-page-client.module.css";
import desktop from "./lineas-precios-page-client.desktop.module.css";

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
  onEditPrice: () => void;
  onToggleActive: () => void;
};

function getCardStatusBadge(
  template: CotizacionLineTemplate,
  needsPrice: boolean
): { label: string; tone: "ready" | "pending" | "muted" } {
  if (!template.isActive) {
    return { label: "Pausada para cotizar", tone: "muted" };
  }
  if (needsPrice) {
    return { label: "Precio pendiente", tone: "pending" };
  }
  return { label: "Lista para cotizar", tone: "ready" };
}

function getFabricationRowLabel(tone: TechnicalCardStatus["tone"]): string {
  if (tone === "validated") return "Configuración completa";
  if (tone === "testing") return "Fabricación en prueba";
  return "Configuración pendiente";
}

function getPrimaryCta(
  template: CotizacionLineTemplate,
  needsPrice: boolean,
  technicalStatus: TechnicalCardStatus
): { label: string; href?: string; onClick?: () => void } {
  if (needsPrice) {
    return { label: "Agregar precio", onClick: undefined };
  }
  if (technicalStatus.tone !== "validated" && template.categoria !== "vidrio") {
    return {
      label: "Completar fabricación",
      href: `/configuracion/empresa/lineas-precios/${template.id}/fabricacion`,
    };
  }
  return { label: "Nueva cotización", href: "/cotizaciones/nueva" };
}

export function LineTemplateCatalogCard({
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
  onEditPrice,
  onToggleActive,
}: Props) {
  const needsPrice = lineTemplateNeedsCommercialPrice(template);
  const lineSystem = getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem;
  const lineContext = [template.proveedor, lineSystem].filter(Boolean).join(" · ");
  const statusBadge = getCardStatusBadge(template, needsPrice);
  const primaryCta = getPrimaryCta(template, needsPrice, technicalStatus);
  const isVentoraLine = isVentoraCatalogKey(template.catalogKey);

  return (
    <article
      className={`${s.card} ${desktop.card} ${template.isActive ? "" : s.cardInactive} ${
        isMenuOpen ? s.cardMenuOpen : ""
      } ${isVentoraLine ? desktop.cardVentora : desktop.cardPropia}`}
      data-material={template.material}
    >
      <div
        className={`${desktop.catalogStatusBadge} ${desktop[`catalogStatusBadge_${statusBadge.tone}`]}`}
      >
        {statusBadge.label}
      </div>

      <div className={`${s.cardTop} ${desktop.cardTop}`}>
        <div className={`${s.cardTitleBlock} ${desktop.cardTitleBlock}`}>
          <div className={s.cardTitleText}>
            <strong>{template.nombre}</strong>
            <span className={s.materialPill} data-material={template.material}>
              {LINE_TEMPLATE_CATEGORIA_LABELS[template.categoria]}
            </span>
            {isVentoraLine ? (
              <span className={desktop.ventoraOriginPill}>Ventora</span>
            ) : null}
          </div>
          {lineContext ? <span className={s.cardHierarchy}>{lineContext}</span> : null}
        </div>

        <div className={`${s.cardActions} ${desktop.cardActions}`}>
          <LineTemplateCardActions
            templateId={template.id}
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
      </div>

      <div className={`${s.priceRow} ${desktop.priceRow}`}>
        <div>
          <strong>
            {needsPrice
              ? "Sin precio"
              : formatLineTemplatePriceLabel(
                  template.unidadCobro,
                  template.precioM2Sugerido,
                  formatMoney
                )}
          </strong>
          <span>
            {needsPrice
              ? "Define el precio comercial"
              : `Mín. ${
                  template.minimoCobrable > 0
                    ? formatMoney(template.minimoCobrable)
                    : "sin mínimo"
                }`}
          </span>
        </div>
        <button
          type="button"
          className={needsPrice ? s.addPriceBtn : s.editPriceBtn}
          onClick={(event) => {
            event.stopPropagation();
            onEditPrice();
          }}
        >
          {needsPrice ? "Agregar precio" : "Editar precio"}
        </button>
      </div>

      {template.categoria !== "vidrio" ? (
        <Link
          href={`/configuracion/empresa/lineas-precios/${template.id}/fabricacion`}
          className={`${desktop.fabricationCompactRow}`}
          data-tech-status={technicalStatus.tone}
          onClick={(event) => event.stopPropagation()}
        >
          <span>{getFabricationRowLabel(technicalStatus.tone)}</span>
          <LuChevronRight aria-hidden />
        </Link>
      ) : null}

      <div className={desktop.cardProfiles}>
        <LineProfileReferencesSection
          catalogMetadata={template.catalogMetadata}
          variant="desktop"
          compact
        />
      </div>

      <div className={`${desktop.cardCtaRow}`}>
        {primaryCta.href ? (
          <Link href={primaryCta.href} className={desktop.cardPrimaryCta}>
            {primaryCta.label}
          </Link>
        ) : (
          <button
            type="button"
            className={desktop.cardPrimaryCta}
            onClick={(event) => {
              event.stopPropagation();
              onEditPrice();
            }}
          >
            {primaryCta.label}
          </button>
        )}

        <button
          type="button"
          className={`${s.switch} ${template.isActive ? s.switchOn : ""} ${desktop.cardActiveSwitch}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleActive();
          }}
          aria-pressed={template.isActive}
          aria-label={`${template.isActive ? "Desactivar" : "Activar"} ${template.nombre}`}
        >
          <span className={s.switchThumb} />
        </button>
      </div>
    </article>
  );
}
