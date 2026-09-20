"use client";

import {
  LuChevronDown,
  LuChevronRight,
  LuDoorOpen,
  LuGem,
  LuLayers,
  LuLayoutGrid,
  LuMinimize2,
  LuSparkles,
  LuSquare,
} from "react-icons/lu";
import type { IconType } from "react-icons";

import type { TechnicalCardStatus } from "@/features/cotizaciones/line-templates/services/catalogo-fabricacion-card-status";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

import type { LineTemplateFamilyKey } from "./line-template-catalog-family";
import { LineTemplateCatalogRow } from "./line-template-catalog-row";
import type { LineTemplateActionKind } from "./line-template-card-actions";
import accordion from "./line-template-catalog-accordion.module.css";

const FAMILY_ICONS: Record<LineTemplateFamilyKey, IconType> = {
  correderas: LuLayoutGrid,
  fijos: LuMinimize2,
  proyectantes: LuSquare,
  puertas: LuDoorOpen,
  fachadas: LuLayers,
  cristales: LuSparkles,
  especiales: LuGem,
  otras: LuLayers,
};

type Props = {
  familyKey: LineTemplateFamilyKey;
  label: string;
  templates: CotizacionLineTemplate[];
  isExpanded: boolean;
  onToggle: () => void;
  technicalStatusesByTemplateId: Map<string, TechnicalCardStatus>;
  formatMoney: (value: number) => string;
  openMenuId: string | number | null;
  isSaving: boolean;
  pendingLineAction: { templateId: string | number; kind: LineTemplateActionKind } | null;
  onToggleMenu: (templateId: string | number) => void;
  onCloseMenu: () => void;
  onDuplicate: (templateId: string | number) => void;
  onRequestDelete: (template: CotizacionLineTemplate) => void;
  onEdit: (template: CotizacionLineTemplate) => void;
  onEditPrice: (template: CotizacionLineTemplate) => void;
  onToggleActive: (template: CotizacionLineTemplate) => void;
};

export function LineTemplateCatalogAccordion({
  familyKey,
  label,
  templates,
  isExpanded,
  onToggle,
  technicalStatusesByTemplateId,
  formatMoney,
  openMenuId,
  isSaving,
  pendingLineAction,
  onToggleMenu,
  onCloseMenu,
  onDuplicate,
  onRequestDelete,
  onEdit,
  onEditPrice,
  onToggleActive,
}: Props) {
  const FamilyIcon = FAMILY_ICONS[familyKey];
  const lineCountLabel = `${templates.length} ${
    templates.length === 1 ? "línea" : "líneas"
  }`;

  return (
    <section className={accordion.panel} data-expanded={isExpanded ? "true" : "false"}>
      <button
        type="button"
        className={accordion.header}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className={accordion.headerLeading}>
          {isExpanded ? (
            <LuChevronDown className={accordion.chevron} aria-hidden />
          ) : (
            <LuChevronRight className={accordion.chevron} aria-hidden />
          )}
          <FamilyIcon className={accordion.familyIcon} aria-hidden />
          <span className={accordion.familyName}>{label}</span>
        </span>
        <span className={accordion.lineCount}>{lineCountLabel}</span>
      </button>

      {isExpanded ? (
        <div className={accordion.body}>
          {templates.map((template) => {
            const technicalStatus = technicalStatusesByTemplateId.get(String(template.id));
            if (!technicalStatus) return null;

            const isMenuOpen = openMenuId === template.id;
            const pendingAction =
              pendingLineAction?.templateId === template.id
                ? pendingLineAction.kind
                : null;

            return (
              <LineTemplateCatalogRow
                key={template.id}
                template={template}
                technicalStatus={technicalStatus}
                formatMoney={formatMoney}
                isMenuOpen={isMenuOpen}
                isSaving={isSaving}
                pendingAction={pendingAction}
                onToggleMenu={() => onToggleMenu(template.id)}
                onCloseMenu={onCloseMenu}
                onDuplicate={() => onDuplicate(template.id)}
                onRequestDelete={() => onRequestDelete(template)}
                onEdit={() => onEdit(template)}
                onEditPrice={() => onEditPrice(template)}
                onToggleActive={() => onToggleActive(template)}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
