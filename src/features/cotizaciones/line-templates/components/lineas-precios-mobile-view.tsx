"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LuArrowLeft,
  LuChevronRight,
  LuMonitor,
  LuPlus,
  LuRotateCcw,
  LuSearch,
  LuSlidersHorizontal,
  LuX,
} from "react-icons/lu";

import {
  getLineTemplateSystemMetadata,
  lineTemplateNeedsCommercialPrice,
  type CotizacionLineTemplate,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CatalogoInicioRapidoItem } from "@/features/cotizaciones/line-templates/services/catalogo-usar-base-ventora.service";
import {
  formatLineTemplatePriceLabel,
  LINE_TEMPLATE_CATEGORIA_LABELS,
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
  baseRecommendations: CatalogoInicioRapidoItem[];
  isUsingBase: boolean;
  usingBaseId: string | null;
  onUseBase: (recommendation: CatalogoInicioRapidoItem) => void;
  formatMoney: (value: number) => string;
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

function getCommercialStatus(
  template: CotizacionLineTemplate,
  needsPrice: boolean
) {
  if (!template.isActive) {
    return {
      tone: "paused",
      label: "Pausada para cotizar",
      detail: "No aparece al crear cotizaciones.",
    } as const;
  }
  if (needsPrice) {
    return {
      tone: "pending",
      label: "Precio pendiente",
      detail: "Agrega un precio para poder cotizar.",
    } as const;
  }
  return {
    tone: "ready",
    label: "Lista para cotizar",
    detail: "Disponible al crear cotizaciones.",
  } as const;
}

function getFabricationStatus(status: TechnicalStatus) {
  // En móvil solo se consulta el resumen; la configuración vive en desktop.
  const action = "Ver fabricación";
  if (status.tone === "validated") {
    return {
      tone: "validated",
      label: "Validada",
      detail: "Lista para despiece en cotización.",
      action,
    } as const;
  }
  if (status.tone === "testing") {
    return {
      tone: "testing",
      label: "En prueba",
      detail: "Configurada en desktop · pendiente de activar.",
      action,
    } as const;
  }
  if (status.tone === "draft") {
    return {
      tone: "pending",
      label: "Borrador",
      detail: "Hay un borrador · sigue en el computador.",
      action,
    } as const;
  }
  return {
    tone: "pending",
    label: "Sin configurar",
    detail: "Puedes cotizar · fabricación se arma en desktop.",
    action,
  } as const;
}

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
  baseRecommendations,
  isUsingBase: _isUsingBase,
  usingBaseId: _usingBaseId,
  onUseBase: _onUseBase,
  formatMoney,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const appliedFilterCount = [
    categoryFilter !== "Todo",
    technicalFilter !== "todas",
    providerFilter !== providerFilterAll,
  ].filter(Boolean).length;

  const clearSecondaryFilters = () => {
    onCategoryFilterChange("Todo");
    onTechnicalFilterChange("todas");
    onProviderFilterChange(providerFilterAll);
  };

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
          <h1>Líneas y precios</h1>
          <p>{templates.length} {templates.length === 1 ? "línea guardada" : "líneas guardadas"}</p>
        </div>
        <button type="button" className={s.newButton} onClick={onNew}>
          <span aria-hidden>+</span>
          <span>Nueva línea</span>
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

        <div className={s.statusChips} aria-label="Estado de las líneas">
          {([
            { value: "todas" as const, label: "Todas", count: templates.length },
            { value: "activas" as const, label: "Activas", count: activeCount },
            { value: "inactivas" as const, label: "Inactivas", count: inactiveCount },
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              className={statusFilter === option.value ? s.chipActive : ""}
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

      <aside className={s.desktopFabricationNotice} role="note">
        <span className={s.desktopFabricationNoticeIcon} aria-hidden>
          <LuMonitor />
        </span>
        <div>
          <strong>Fabricación en el computador</strong>
          <p>
            Plantillas, cubicación, pauta de corte y despiece se configuran en
            desktop. Aquí revisas precio y el estado de cada línea.
          </p>
        </div>
      </aside>

      {isLoading ? <div className={s.loading}>Cargando líneas…</div> : null}

      {!isLoading && templates.length === 0 ? (
        <section className={s.emptyState}>
          <strong>Aún no tienes líneas en tu catálogo privado</strong>
          <p>
            Crea una línea con precio y mínimo para cotizar. Las plantillas de
            fabricación se aplican desde el computador.
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

      {filteredTemplates.length > 0 ? (
        <section className={s.list} aria-label="Líneas guardadas">
          {filteredTemplates.map((template) => {
            const technicalStatus = technicalStatuses.get(String(template.id));
            if (!technicalStatus) return null;
            const needsPrice = lineTemplateNeedsCommercialPrice(template);
            const system = getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem;
            const context = [template.proveedor, system].filter(Boolean).join(" · ");
            const commercialStatus = getCommercialStatus(template, needsPrice);
            const fabricationStatus = getFabricationStatus(technicalStatus);

            return (
              <article
                key={template.id}
                className={`${s.card} ${template.isActive ? "" : s.cardInactive}`}
              >
                <div className={s.cardHeader}>
                  <div>
                    <h2>{template.nombre}</h2>
                    <p>
                      {LINE_TEMPLATE_CATEGORIA_LABELS[template.categoria]}
                      {context ? ` · ${context}` : ""}
                    </p>
                  </div>
                </div>

                <div className={s.priceBlock}>
                  <strong>
                    {needsPrice
                      ? "Precio pendiente"
                      : formatLineTemplatePriceLabel(
                          template.unidadCobro,
                          template.precioM2Sugerido,
                          formatMoney
                        )}
                  </strong>
                  <span>
                    Mínimo {template.minimoCobrable > 0
                      ? formatMoney(template.minimoCobrable)
                      : "sin definir"}
                  </span>
                </div>

                <div className={s.statusList} aria-label="Estado de la línea">
                  <div className={s.statusRow} data-tone={commercialStatus.tone}>
                    <span className={s.statusDot} aria-hidden />
                    <div>
                      <strong>{commercialStatus.label}</strong>
                      <small>{commercialStatus.detail}</small>
                    </div>
                  </div>
                  <div className={s.statusRow} data-tone={fabricationStatus.tone}>
                    <span className={s.statusDot} aria-hidden />
                    <div>
                      <strong>{fabricationStatus.label}</strong>
                      <small>{fabricationStatus.detail}</small>
                    </div>
                  </div>
                </div>

                <div className={s.cardActions}>
                  <Link
                    href={`/configuracion/empresa/lineas-precios/${template.id}/fabricacion`}
                  >
                    {fabricationStatus.action}
                    <LuChevronRight aria-hidden />
                  </Link>
                  <button type="button" onClick={() => onEdit(template)}>
                    Precio y datos
                  </button>
                </div>
              </article>
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
                    <option key={provider} value={provider}>{provider}</option>
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
                Ver {filteredTemplates.length} {filteredTemplates.length === 1 ? "línea" : "líneas"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
