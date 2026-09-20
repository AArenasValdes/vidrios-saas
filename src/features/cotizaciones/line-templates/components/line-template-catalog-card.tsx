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
import { shouldOfferLineFabricationWorkspace } from "@/features/cotizaciones/line-templates/utils/line-fabrication-entry";

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
  onEdit: () => void;
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
  onEdit,
  onEditPrice,
  onToggleActive,
}: Props) {
  const needsPrice = lineTemplateNeedsCommercialPrice(template);
  const lineSystem = getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem;
  const lineContext = [template.proveedor, lineSystem].filter(Boolean).join(" · ");
  const statusBadge = getCardStatusBadge(template, needsPrice);
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
          {!needsPrice ? (
            <span>
              {`Mín. ${
                template.minimoCobrable > 0
                  ? formatMoney(template.minimoCobrable)
                  : "sin mínimo"
              }`}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className={`${needsPrice ? s.addPriceBtn : s.editPriceBtn} ${desktop.priceAction}`}
          onClick={(event) => {
            event.stopPropagation();
            onEditPrice();
          }}
        >
          {needsPrice ? "Agregar precio" : "Editar precio"}
        </button>
      </div>

      {shouldOfferLineFabricationWorkspace(template) ? (
        <Link
          href={`/configuracion/empresa/lineas-precios/${template.id}/fabricacion`}
          className={`${desktop.fabricationCompactRow}`}
          data-tech-status={technicalStatus.tone}
          aria-label={`Fabricación: ${technicalStatus.label}`}
          onClick={(event) => event.stopPropagation()}
        >
          <span>
            <small>Fabricación</small>
            <strong>{technicalStatus.label}</strong>
          </span>
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
        <button
          type="button"
          className={desktop.cardPrimaryCta}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          Configurar línea
        </button>

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
