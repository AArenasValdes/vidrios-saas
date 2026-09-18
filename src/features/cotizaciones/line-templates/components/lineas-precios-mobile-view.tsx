"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  LuArrowLeft,
  LuChevronDown,
  LuChevronRight,
  LuDoorOpen,
  LuGem,
  LuLayers,
  LuLayoutGrid,
  LuPlus,
  LuRotateCcw,
  LuSearch,
  LuSlidersHorizontal,
  LuSparkles,
  LuSquare,
  LuUser,
  LuX,
} from "react-icons/lu";
import type { IconType } from "react-icons";

import {
  lineTemplateNeedsCommercialPrice,
  type CotizacionLineTemplate,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { partitionLineTemplatesByCatalogOrigin } from "@/features/cotizaciones/line-templates/services/line-template-group.service";

import {
  groupLineTemplatesByFamily,
  type LineTemplateFamilyKey,
} from "./line-template-catalog-family";
import type { LineTemplateActionKind } from "./line-template-card-actions";
import {
  LineasPreciosMobileLineRow,
  resolveFabricationActionLabel,
} from "./lineas-precios-mobile-line-row";
import {
  formatLineTemplatePriceLabel,
} from "@/features/cotizaciones/line-templates/utils/catalog-labels";
import s from "./lineas-precios-mobile-view.module.css";

export type MobileStatusFilter = "todas" | "activas" | "inactivas";
export type MobileCategoryFilter = "Todo" | "aluminio" | "pvc" | "vidrio";
export type MobileTechnicalFilter =
  | "todas"
  | "solo_cotizar"
  | "borradores"
  | "listas_para_probar"
  | "validadas";

type TechnicalStatus = {
  tone: "quote_only" | "draft" | "testing" | "validated";
  label: string;
  detail: string;
  actionLabel: string;
  filter: Exclude<MobileTechnicalFilter, "todas">;
};

type Props = {
  templates: CotizacionLineTemplate[];
  filteredTemplates: CotizacionLineTemplate[];
  activeCount: number;
  inactiveCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: MobileStatusFilter;
  onStatusFilterChange: (value: MobileStatusFilter) => void;
  categoryFilter: MobileCategoryFilter;
  onCategoryFilterChange: (value: MobileCategoryFilter) => void;
  technicalFilter: MobileTechnicalFilter;
  onTechnicalFilterChange: (value: MobileTechnicalFilter) => void;
  providerFilter: string;
  providerFilterAll: string;
  providerOptions: string[];
  onProviderFilterChange: (value: string) => void;
  technicalStatuses: Map<string, TechnicalStatus>;
  technicalCounts: Record<MobileTechnicalFilter, number>;
  isLoading: boolean;
  error: string | null;
  feedback: { kind: "success" | "error"; message: string } | null;
  onNew: () => void;
  onEdit: (template: CotizacionLineTemplate) => void;
  onEditPrice: (template: CotizacionLineTemplate) => void;
  onToggleActive: (template: CotizacionLineTemplate) => void;
  onDuplicate: (template: CotizacionLineTemplate) => void;
  onRequestDelete: (template: CotizacionLineTemplate) => void;
  isSaving?: boolean;
  pendingLineAction?: {
    templateId: string | number;
    kind: LineTemplateActionKind;
  } | null;
  formatMoney: (value: number) => string;
  isChileCatalog?: boolean;
  organizationName?: string;
};

const MATERIAL_OPTIONS: Array<{ value: MobileCategoryFilter; label: string }> = [
  { value: "Todo", label: "Todos" },
  { value: "aluminio", label: "Aluminio" },
  { value: "pvc", label: "PVC" },
  { value: "vidrio", label: "Cristales" },
];

const TECHNICAL_OPTIONS: Array<{ value: MobileTechnicalFilter; label: string }> = [
  { value: "todas", label: "Todos" },
  { value: "solo_cotizar", label: "Sin configurar" },
  { value: "borradores", label: "Borrador" },
  { value: "listas_para_probar", label: "Lista para probar" },
  { value: "validadas", label: "Validada" },
];

const FAMILY_ICONS: Record<LineTemplateFamilyKey | "propias", IconType> = {
  propias: LuUser,
  correderas: LuLayoutGrid,
  proyectantes: LuSquare,
  puertas: LuDoorOpen,
  fachadas: LuLayers,
  cristales: LuSparkles,
  especiales: LuGem,
  otras: LuLayers,
};

export function LineasPreciosMobileView({
  templates,
  filteredTemplates,
  activeCount,
  inactiveCount,
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  technicalFilter,
  onTechnicalFilterChange,
  providerFilter,
  providerFilterAll,
  providerOptions,
  onProviderFilterChange,
  technicalStatuses,
  technicalCounts,
  isLoading,
  error,
  feedback,
  onNew,
  onEdit,
  onEditPrice,
  onToggleActive,
  onDuplicate,
  onRequestDelete,
  isSaving = false,
  pendingLineAction = null,
  formatMoney,
  isChileCatalog = false,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});
  const [selectedLine, setSelectedLine] = useState<CotizacionLineTemplate | null>(null);

  const selectedLineContext = useMemo(() => {
    if (!selectedLine) return null;

    const needsPrice = lineTemplateNeedsCommercialPrice(selectedLine);
    const technicalStatus = technicalStatuses.get(String(selectedLine.id)) ?? {
      tone: "quote_only" as const,
      label: "Sin configurar",
      detail: "",
      actionLabel: "Configurar fabricación",
      filter: "solo_cotizar" as const,
    };

    const priceLabel = needsPrice
      ? "Sin precio"
      : formatLineTemplatePriceLabel(
          selectedLine.unidadCobro,
          selectedLine.precioM2Sugerido,
          formatMoney
        );

    const subtitleParts = [priceLabel, selectedLine.isActive ? "Activa" : "Pausada"];

    return {
      needsPrice,
      technicalStatus,
      subtitle: subtitleParts.join(" · "),
      fabricationActionLabel: resolveFabricationActionLabel(technicalStatus, needsPrice),
    };
  }, [formatMoney, selectedLine, technicalStatuses]);

  const appliedFilterCount = [
    categoryFilter !== "Todo",
    technicalFilter !== "todas",
    providerFilter !== providerFilterAll,
  ].filter(Boolean).length;

  const catalogGroups = useMemo(() => {
    const { ventora, propias } = partitionLineTemplatesByCatalogOrigin(filteredTemplates);
    const groups: Array<{
      key: string;
      label: string;
      iconKey: LineTemplateFamilyKey | "propias";
      templates: CotizacionLineTemplate[];
    }> = [];

    if (propias.length > 0) {
      groups.push({
        key: "propias",
        label: "Tus líneas",
        iconKey: "propias",
        templates: propias,
      });
    }

    for (const family of groupLineTemplatesByFamily(ventora)) {
      groups.push({
        key: `ventora:${family.key}`,
        label: family.label,
        iconKey: family.key,
        templates: family.templates,
      });
    }

    return groups;
  }, [filteredTemplates]);

  const clearSecondaryFilters = () => {
    onCategoryFilterChange("Todo");
    onTechnicalFilterChange("todas");
    onProviderFilterChange(providerFilterAll);
  };

  const isFamilyExpanded = useCallback(
    (familyKey: string, defaultExpanded: boolean) =>
      expandedFamilies[familyKey] ?? defaultExpanded,
    [expandedFamilies]
  );

  const toggleFamily = useCallback(
    (familyKey: string, currentlyExpanded: boolean) => {
      setExpandedFamilies((current) => ({
        ...current,
        [familyKey]: !currentlyExpanded,
      }));
    },
    []
  );

  return (
    <main className={s.page}>
      <header className={s.header}>
        <Link
          href="/configuracion/empresa"
          className={s.backButton}
          aria-label="Volver a empresa"
        >
          <LuArrowLeft aria-hidden />
        </Link>

        <div className={s.headerCopy}>
          {isChileCatalog ? (
            <span className={s.catalogRegionLabel}>Catálogo base de Chile</span>
          ) : null}
          <h1>Líneas y precios</h1>
          <p className={s.headerCount}>
            {templates.length}{" "}
            {templates.length === 1 ? "línea guardada" : "líneas guardadas"}
          </p>
        </div>

        <button type="button" className={s.newButton} onClick={onNew}>
          <LuPlus aria-hidden />
          <span>Nueva</span>
        </button>
      </header>

      <section className={s.controls} aria-label="Buscar y filtrar líneas">
        <div className={s.searchRow}>
          <label className={s.searchField}>
            <LuSearch aria-hidden />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar línea o proveedor"
              aria-label="Buscar líneas"
            />
          </label>
          <button
            type="button"
            className={s.filterButton}
            onClick={() => setFiltersOpen(true)}
            aria-label={`Abrir filtros${appliedFilterCount ? `, ${appliedFilterCount} activos` : ""}`}
          >
            <LuSlidersHorizontal aria-hidden />
            {appliedFilterCount ? <span>{appliedFilterCount}</span> : null}
          </button>
        </div>

        <div className={s.materialQuickFilters} role="group" aria-label="Filtrar por material">
          {MATERIAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={categoryFilter === option.value ? s.materialQuickFilterActive : ""}
              onClick={() => onCategoryFilterChange(option.value)}
              aria-pressed={categoryFilter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className={s.statusTabs} aria-label="Estado de las líneas">
          {([
            { value: "todas" as const, label: "Todas", count: templates.length },
            { value: "activas" as const, label: "Activas", count: activeCount },
            { value: "inactivas" as const, label: "Inactivas", count: inactiveCount },
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              className={statusFilter === option.value ? s.tabActive : ""}
              onClick={() => onStatusFilterChange(option.value)}
              aria-pressed={statusFilter === option.value}
            >
              {option.label}
              <span>{option.count}</span>
            </button>
          ))}
        </div>
      </section>

      {feedback ? (
        <div className={feedback.kind === "error" ? s.errorBand : s.successBand}>
          {feedback.message}
        </div>
      ) : null}
      {error ? <div className={s.errorBand}>{error}</div> : null}

      {isLoading ? (
        <div className={s.loadingSkeleton} aria-busy="true" aria-label="Cargando líneas">
          {[0, 1].map((groupIndex) => (
            <div key={groupIndex} className={s.skeletonFamily}>
              <div className={s.skeletonFamilyHeader} />
              {[0, 1, 2].map((rowIndex) => (
                <div key={rowIndex} className={s.skeletonRow}>
                  <div className={s.skeletonRowTop}>
                    <div className={s.skeletonRowLine} />
                    <div className={s.skeletonRowLine} />
                  </div>
                  <div className={s.skeletonRowMeta} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && templates.length === 0 ? (
        <section className={s.emptyState}>
          <strong>Aún no tienes líneas en tu catálogo privado</strong>
          <p>
            Crea una línea con precio y mínimo para cotizar. Luego puedes
            configurar fabricación y cubicación desde el celular.
          </p>
          <button type="button" onClick={onNew}>
            <LuPlus aria-hidden />
            Crear línea
          </button>
        </section>
      ) : null}

      {!isLoading && templates.length > 0 && filteredTemplates.length === 0 ? (
        <section className={s.emptyState}>
          <strong>No encontramos líneas</strong>
          <p>Prueba otra búsqueda o limpia los filtros.</p>
          <button type="button" onClick={clearSecondaryFilters}>
            <LuRotateCcw aria-hidden />
            Limpiar filtros
          </button>
        </section>
      ) : null}

      {catalogGroups.length > 0 ? (
        <section className={s.list} aria-label="Líneas guardadas">
          {catalogGroups.map((group, groupIndex) => {
            const defaultExpanded = groupIndex === 0;
            const isExpanded = isFamilyExpanded(group.key, defaultExpanded);
            const GroupIcon = FAMILY_ICONS[group.iconKey];

            return (
              <section
                key={group.key}
                className={s.familyPanel}
                data-expanded={isExpanded ? "true" : "false"}
              >
                <button
                  type="button"
                  className={s.familyHeader}
                  onClick={() => toggleFamily(group.key, isExpanded)}
                  aria-expanded={isExpanded}
                >
                  <span className={s.familyHeaderLeading}>
                    <LuChevronDown className={s.familyChevron} aria-hidden />
                    <GroupIcon className={s.familyIcon} aria-hidden />
                    <span className={s.familyName}>{group.label}</span>
                  </span>
                  <span className={s.familyCount}>
                    {group.templates.length}{" "}
                    {group.templates.length === 1 ? "línea" : "líneas"}
                  </span>
                </button>

                <div className={`${s.familyBody} ${isExpanded ? s.familyBodyOpen : ""}`}>
                  <div className={s.familyBodyInner}>
                    {group.templates.map((template, rowIndex) => {
                      const technicalStatus = technicalStatuses.get(String(template.id));
                      if (!technicalStatus) return null;

                      return (
                        <LineasPreciosMobileLineRow
                          key={template.id}
                          template={template}
                          technicalStatus={technicalStatus}
                          formatMoney={formatMoney}
                          onOpenActions={() => setSelectedLine(template)}
                          onEditPrice={() => onEditPrice(template)}
                          rowIndex={rowIndex}
                        />
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </section>
      ) : null}

      {filtersOpen ? (
        <div className={s.sheetBackdrop} role="presentation" onClick={() => setFiltersOpen(false)}>
          <section
            className={s.filterSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <h2 id="mobile-filter-title">Filtros</h2>
                <p>Acota la lista solo cuando lo necesites.</p>
              </div>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros">
                <LuX aria-hidden />
              </button>
            </header>

            <div className={s.sheetBody}>
              <label className={s.sheetField}>
                <span>Proveedor</span>
                <select value={providerFilter} onChange={(event) => onProviderFilterChange(event.target.value)}>
                  <option value={providerFilterAll}>Todos los proveedores</option>
                  {providerOptions.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className={s.filterGroup}>
                <legend>Material</legend>
                <div>
                  {MATERIAL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={categoryFilter === option.value ? s.filterSelected : ""}
                      onClick={() => onCategoryFilterChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className={s.filterGroup}>
                <legend>Estado de fabricación</legend>
                <div>
                  {TECHNICAL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={technicalFilter === option.value ? s.filterSelected : ""}
                      onClick={() => onTechnicalFilterChange(option.value)}
                    >
                      {option.label}
                      <span>{technicalCounts[option.value]}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <footer>
              <button type="button" className={s.clearButton} onClick={clearSecondaryFilters}>
                Limpiar
              </button>
              <button type="button" className={s.applyButton} onClick={() => setFiltersOpen(false)}>
                Ver {filteredTemplates.length}{" "}
                {filteredTemplates.length === 1 ? "línea" : "líneas"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {selectedLine ? (
        <div
          className={s.sheetBackdrop}
          role="presentation"
          onClick={() => setSelectedLine(null)}
        >
          <section
            className={s.lineActionSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-line-actions-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div className={s.lineSheetHeaderCopy}>
                <h2 id="mobile-line-actions-title">{selectedLine.nombre}</h2>
                <p>{selectedLineContext?.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLine(null)}
                aria-label="Cerrar acciones"
              >
                <LuX aria-hidden />
              </button>
            </header>

            <div className={s.lineActionList}>
              <button
                type="button"
                className={`${s.lineSheetAction} ${s.lineSheetActionPrimary}`}
                onClick={() => {
                  const template = selectedLine;
                  setSelectedLine(null);
                  onEdit(template);
                }}
              >
                Configurar línea
                <LuChevronRight aria-hidden />
              </button>
              <button
                type="button"
                className={s.lineSheetAction}
                onClick={() => {
                  const template = selectedLine;
                  setSelectedLine(null);
                  onEditPrice(template);
                }}
              >
                {lineTemplateNeedsCommercialPrice(selectedLine)
                  ? "Agregar precio"
                  : "Editar precio"}
              </button>
              {selectedLine.categoria !== "vidrio" ? (
                <Link
                  href={`/configuracion/empresa/lineas-precios/${selectedLine.id}/fabricacion`}
                  className={s.lineSheetAction}
                  onClick={() => setSelectedLine(null)}
                >
                  {selectedLineContext?.fabricationActionLabel ?? "Cubicación y pauta"}
                </Link>
              ) : null}
              <button
                type="button"
                className={s.lineSheetAction}
                onClick={() => {
                  const template = selectedLine;
                  setSelectedLine(null);
                  onToggleActive(template);
                }}
              >
                {selectedLine.isActive ? "Desactivar" : "Activar"}
              </button>
              <button
                type="button"
                className={s.lineSheetAction}
                disabled={isSaving}
                onClick={() => {
                  const template = selectedLine;
                  setSelectedLine(null);
                  onDuplicate(template);
                }}
              >
                {pendingLineAction?.templateId === selectedLine.id &&
                pendingLineAction.kind === "duplicate"
                  ? "Duplicando..."
                  : "Duplicar línea"}
              </button>
              <button
                type="button"
                className={`${s.lineSheetAction} ${s.lineSheetActionDanger}`}
                disabled={isSaving}
                onClick={() => {
                  const template = selectedLine;
                  setSelectedLine(null);
                  onRequestDelete(template);
                }}
              >
                Eliminar línea
              </button>
            </div>
          </section>
        </div>
      ) : null}

    </main>
  );
}
