"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { LuCheck, LuChevronDown, LuSearch, LuX } from "react-icons/lu";

import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { lineTemplateNeedsCommercialPrice } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  dedupeLineTemplatesForQuotePicker,
  formatLineTemplateQuotePickerLabel,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import {
  CLP,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  buildLineOptionViewModel,
  filterLineCatalogTemplates,
  getDefaultLineCatalogTab,
  groupLineCatalogTemplates,
  hasEnoughLineCompatibilityContext,
  type LineCatalogTab,
} from "@/features/cotizaciones/line-templates/services/line-option-presentation.service";
import type { LineCompatibilityContext } from "@/features/cotizaciones/line-templates/services/line-template-compatibility.service";

import { LinePriceEditor } from "./line-template-price-editor";
import styles from "./line-template-picker.module.css";

type MaterialFilter = "todos" | "Aluminio" | "PVC" | "Cristal";
type ProviderFilter = "todos" | "sin_proveedor" | string;

type LineTemplatePickerTriggerState = {
  open: boolean;
  selected: CotizacionLineTemplate | null;
  listId: string;
  toggle: () => void;
};

type LineTemplatePickerProps = {
  templates: readonly CotizacionLineTemplate[];
  value: string;
  onChange: (templateId: string) => void;
  /** Called when a template's price is saved from the inline editor. */
  onTemplatePriceUpdated?: (updated: CotizacionLineTemplate) => void;
  organizationId?: string | number | null;
  mode?: "profile" | "glass";
  preferredMaterial?: MaterialFilter | null;
  compatibilityContext?: LineCompatibilityContext | null;
  ariaLabel?: string;
  className?: string;
  renderTrigger?: (state: LineTemplatePickerTriggerState) => ReactNode;
};

function shouldFocusPickerSearch() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const wideEnough = window.matchMedia("(min-width: 768px)").matches;
  return finePointer && wideEnough;
}

function formatPricePerM2(value: number) {
  return `${CLP(value)}/m²`;
}

function formatMinimum(value: number) {
  return value > 0 ? `Mín. ${CLP(value)}` : "Sin mínimo";
}

function normalizeProvider(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

function renderTemplateOption(
  template: CotizacionLineTemplate,
  value: string,
  isGlass: boolean,
  onSelect: (next: string) => void
) {
  const selectedOption = String(template.id) === value;
  const model = buildLineOptionViewModel({
    template,
    selected: selectedOption,
    displayName: formatLineTemplateQuotePickerLabel(template),
  });

  return (
    <button
      key={template.id}
      type="button"
      role="option"
      aria-selected={selectedOption}
      className={`${styles.option} ${selectedOption ? styles.optionActive : ""}`}
      onClick={() => onSelect(String(template.id))}
    >
      <span className={styles.optionMain}>
        <span className={styles.optionTitleRow}>
            <strong>{model.name}</strong>
          <span
            className={`${styles.materialChip} ${
              model.material === "PVC"
                ? styles.materialChipPvc
                : model.material === "Cristal"
                  ? styles.materialChipGlass
                  : styles.materialChipAluminio
            }`}
          >
            {model.material}
          </span>
        </span>
        <span className={styles.optionContext}>
          {model.contextLabel || <span className={styles.providerLabelMuted}>Sin proveedor</span>}
        </span>
        <span className={styles.optionPriceRow}>
          {model.commercialPriceLabel === "Precio pendiente" ? <em className={styles.pricePending}>{model.commercialPriceLabel}</em> : <em>{model.commercialPriceLabel}</em>}
          {model.minimumLabel || model.roundingLabel ? <span className={styles.optionSecondary}>{[model.minimumLabel, model.roundingLabel].filter(Boolean).join(" · ")}</span> : null}
        </span>
        {!isGlass && model.technicalStateLabel ? <small className={styles.optionStates}>{model.technicalStateLabel}</small> : null}
      </span>
      {selectedOption ? <LuCheck className={styles.optionCheck} aria-hidden /> : null}
    </button>
  );
}

export function LineTemplatePicker({
  templates,
  value,
  onChange,
  onTemplatePriceUpdated,
  organizationId,
  mode = "profile",
  preferredMaterial = null,
  compatibilityContext = null,
  ariaLabel,
  className,
  renderTrigger,
}: LineTemplatePickerProps) {
  const { organizacionId: authOrgId } = useAuth();
  const resolvedOrgId = organizationId ?? authOrgId;
  const listId = useId();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<MaterialFilter>("todos");
  const [catalogTab, setCatalogTab] = useState<LineCatalogTab>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("todos");
  const [priceEditorTarget, setPriceEditorTarget] = useState<CotizacionLineTemplate | null>(null);

  const resetFilters = useCallback(() => {
    setQuery("");
    setMaterialFilter("todos");
    setProviderFilter("todos");
    setCatalogTab("all");
  }, []);

  const closePicker = useCallback(() => {
    setOpen(false);
    resetFilters();
  }, [resetFilters]);

  const togglePicker = () => {
    if (open) {
      closePicker();
      return;
    }
    setQuery("");
    setProviderFilter("todos");
    setMaterialFilter(preferredMaterial ?? "todos");
    setCatalogTab(getDefaultLineCatalogTab({
      hasCompatibilityContext: hasEnoughLineCompatibilityContext(compatibilityContext),
      hasOwnLines: templates.some((template) => !template.catalogKey?.startsWith("ventora:")),
    }));
    setOpen(true);
  };

  const isGlass = mode === "glass";
  const emptyLabel = isGlass ? "Precio manual o sin cristal" : "Precio manual o sin línea";
  const quoteTemplates = useMemo(
    () => (isGlass ? [...templates] : dedupeLineTemplatesForQuotePicker(templates)),
    [isGlass, templates]
  );
  const selected =
    templates.find((template) => String(template.id) === value) ??
    quoteTemplates.find((template) => String(template.id) === value) ??
    null;
  const selectedProvider = normalizeProvider(selected?.proveedor);

  const providerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let withoutProvider = 0;

    templates.forEach((template) => {
      const provider = normalizeProvider(template.proveedor);
      if (!provider) {
        withoutProvider += 1;
        return;
      }
      counts.set(provider, (counts.get(provider) ?? 0) + 1);
    });

    return {
      named: Array.from(counts.entries())
        .sort((left, right) => left[0].localeCompare(right[0], "es"))
        .map(([name, count]) => ({ name, count })),
      withoutProvider,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return filterLineCatalogTemplates({
      templates: quoteTemplates,
      tab: isGlass ? "all" : catalogTab,
      context: compatibilityContext,
      query,
      material: materialFilter === "todos" ? null : materialFilter,
      provider: providerFilter === "todos" ? null : providerFilter,
    });
  }, [catalogTab, compatibilityContext, isGlass, materialFilter, providerFilter, query, quoteTemplates]);
  const familyGroups = useMemo(
    () => (isGlass ? [] : groupLineCatalogTemplates(filteredTemplates)),
    [filteredTemplates, isGlass]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePicker();
      }
    };

    window.addEventListener("keydown", handleKey);
    const focusTimer = shouldFocusPickerSearch()
      ? window.setTimeout(() => searchRef.current?.focus(), 0)
      : null;

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      if (focusTimer != null) window.clearTimeout(focusTimer);
    };
  }, [closePicker, open]);

  const selectValue = (next: string) => {
    if (next && resolvedOrgId) {
      const target = templates.find((t) => String(t.id) === next);
      if (target && lineTemplateNeedsCommercialPrice(target)) {
        setPriceEditorTarget(target);
        return;
      }
    }
    onChange(next);
    closePicker();
  };

  const dialogTitle = isGlass ? "Elegir cristal" : "Elegir línea";
  const hasCompatibility = hasEnoughLineCompatibilityContext(compatibilityContext);
  const ownLineCount = quoteTemplates.filter((template) => !template.catalogKey?.startsWith("ventora:")).length;

  const overlay =
    open
      ? createPortal(
          <div className={styles.overlay} role="presentation">
            <button
              type="button"
              className={styles.backdrop}
              aria-label="Cerrar selector"
              onClick={closePicker}
            />
            <div
              ref={dialogRef}
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <header className={styles.dialogHeader}>
                <div className={styles.dialogHeaderCopy}>
                  <p className={styles.dialogEyebrow}>
                    {isGlass ? "Catálogo de cristales" : "Línea comercial"}
                  </p>
                  <h2 id={titleId}>{dialogTitle}</h2>
                  <p>
                    {isGlass
                      ? "Busca por nombre y elige el cristal con precio."
                      : [compatibilityContext?.material, compatibilityContext?.openingType, compatibilityContext?.leavesCount ? `${compatibilityContext.leavesCount} hojas` : null].filter(Boolean).join(" · ") || "Elige una línea del catálogo."}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="Cerrar"
                  onClick={closePicker}
                >
                  <LuX aria-hidden />
                </button>
              </header>

              <div className={styles.toolbar}>
                <div className={styles.searchRow}>
                  <LuSearch className={styles.searchIcon} aria-hidden />
                  <input
                    ref={searchRef}
                    className={styles.searchInput}
                    type="search"
                    readOnly={!shouldFocusPickerSearch()}
                    onPointerDown={(event) => {
                      event.currentTarget.readOnly = false;
                    }}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      isGlass
                        ? "Buscar cristal…"
                        : "Buscar por nombre, material o proveedor…"
                    }
                    aria-label={isGlass ? "Buscar cristal" : "Buscar línea comercial"}
                  />
                </div>

                {!isGlass ? (
                  <div className={styles.filtersBlock}>
                    <nav className={styles.catalogTabs} aria-label="Tipo de líneas">
                      {([
                        ...(hasCompatibility ? [["compatible", "Compatibles"] as const] : []),
                        ...(ownLineCount > 0 ? [["own", "Mis líneas"] as const] : []),
                        ["all", "Todas"] as const,
                      ]).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`${styles.catalogTab} ${catalogTab === key ? styles.catalogTabActive : ""}`}
                          aria-pressed={catalogTab === key}
                          onClick={() => setCatalogTab(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </nav>
                    {catalogTab === "all" ? (
                    <>
                    <div className={styles.filterGroup}>
                      <span className={styles.filterLabel}>Material</span>
                      <div className={styles.filterRow} role="group" aria-label="Filtrar por material">
                        {(
                          [
                            ["todos", "Todas"],
                            ["Aluminio", "Aluminio"],
                            ["PVC", "PVC"],
                            ["Cristal", "Cristal"],
                          ] as const
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            className={`${styles.filterChip} ${
                              materialFilter === key ? styles.filterChipActive : ""
                            }`}
                            aria-pressed={materialFilter === key}
                            onClick={() => setMaterialFilter(key)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {providerOptions.named.length > 0 || providerOptions.withoutProvider > 0 ? (
                      <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>Proveedor</span>
                        <div
                          className={styles.filterRow}
                          role="group"
                          aria-label="Filtrar por proveedor"
                        >
                          <button
                            type="button"
                            className={`${styles.filterChip} ${
                              providerFilter === "todos" ? styles.filterChipActive : ""
                            }`}
                            aria-pressed={providerFilter === "todos"}
                            onClick={() => setProviderFilter("todos")}
                          >
                            Todos
                          </button>
                          {providerOptions.named.map((provider) => (
                            <button
                              key={provider.name}
                              type="button"
                              className={`${styles.filterChip} ${styles.filterChipProvider} ${
                                providerFilter === provider.name ? styles.filterChipActive : ""
                              }`}
                              aria-pressed={providerFilter === provider.name}
                              onClick={() => setProviderFilter(provider.name)}
                            >
                              {provider.name}
                              <em>{provider.count}</em>
                            </button>
                          ))}
                          {providerOptions.withoutProvider > 0 ? (
                            <button
                              type="button"
                              className={`${styles.filterChip} ${
                                providerFilter === "sin_proveedor" ? styles.filterChipActive : ""
                              }`}
                              aria-pressed={providerFilter === "sin_proveedor"}
                              onClick={() => setProviderFilter("sin_proveedor")}
                            >
                              Sin proveedor
                              <em>{providerOptions.withoutProvider}</em>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    </>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className={styles.resultMeta}>
                <span>
                  {filteredTemplates.length}{" "}
                  {filteredTemplates.length === 1 ? "opción" : "opciones"}
                  {!isGlass && materialFilter === "todos" && preferredMaterial
                    ? ` · ${preferredMaterial} primero`
                    : ""}
                </span>
                {materialFilter !== "todos" || providerFilter !== "todos" || query.trim() ? (
                  <button
                    type="button"
                    className={styles.clearFilters}
                    onClick={() => {
                      setQuery("");
                      setMaterialFilter("todos");
                      setProviderFilter("todos");
                    }}
                  >
                    Limpiar filtros
                  </button>
                ) : null}
              </div>

              <div className={styles.list} id={listId} role="listbox" aria-label={ariaLabel}>
                <div className={styles.optionGrid}>
                  {isGlass
                    ? filteredTemplates.map((template) =>
                        renderTemplateOption(template, value, isGlass, selectValue)
                      )
                    : familyGroups.map((group) => (
                        <section className={styles.familyGroup} key={group.key}>
                          {group.origin === "catalogo" || group.origin === "propia" && catalogTab !== "own" ? (
                            <h3 className={styles.familyHeading}>{group.label}</h3>
                          ) : null}
                          {group.origin === "catalogo"
                            ? group.families.map((family) => (
                                <section className={styles.familyGroup} key={family.key}>
                                  <h4 className={styles.familyHeading}>{family.label}</h4>
                                  {family.templates.map((template) =>
                                    renderTemplateOption(template, value, isGlass, selectValue)
                                  )}
                                </section>
                              ))
                            : group.templates.map((template) =>
                                renderTemplateOption(template, value, isGlass, selectValue)
                              )}
                        </section>
                      ))}
                </div>

                {filteredTemplates.length === 0 ? (
                  <div className={styles.empty}>
                    {query.trim() || materialFilter !== "todos" || providerFilter !== "todos"
                      ? "No hay líneas con ese filtro."
                      : isGlass
                        ? "No hay cristales guardados."
                        : "No hay líneas guardadas."}
                  </div>
                ) : null}
              </div>
              {!isGlass ? (
                <aside className={styles.inspector} aria-label="Detalle de la selección">
                  {selected ? (() => {
                    const model = buildLineOptionViewModel({
                      template: selected,
                      selected: true,
                      displayName: formatLineTemplateQuotePickerLabel(selected),
                    });
                    return <>
                      <span className={styles.inspectorEyebrow}>Línea seleccionada</span>
                      <h3>{model.name}</h3>
                      <p>{model.contextLabel}</p>
                      <strong>{model.commercialPriceLabel}</strong>
                      {model.minimumLabel ? <small>{model.minimumLabel}</small> : null}
                      <p className={styles.inspectorStates}>{model.fabricationState} · {model.costState}</p>
                    </>;
                  })() : <p>Elige una línea de la lista para ver su precio y estado.</p>}
                </aside>
              ) : null}
              <footer className={styles.manualFooter}>
                <span>
                  <strong>¿No está tu línea?</strong>
                  <small>Usa precio manual sin aplicar una línea guardada.</small>
                </span>
                <button type="button" className={styles.manualAction} aria-pressed={!value} onClick={() => selectValue("")}>{!value ? "Actual" : emptyLabel}</button>
              </footer>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
    >
      {renderTrigger ? (
        renderTrigger({
          open,
          selected,
          listId,
          toggle: togglePicker,
        })
      ) : (
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""} ${
          selected ? styles.triggerSelected : ""
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel ?? (isGlass ? "Seleccionar cristal" : "Seleccionar línea comercial")}
        onClick={togglePicker}
      >
        {selected ? (
          <span className={styles.triggerBody}>
            <span className={styles.triggerTitleRow}>
              <strong className={styles.triggerTitle}>
                {formatLineTemplateQuotePickerLabel(selected)}
              </strong>
              <span
                className={`${styles.materialChip} ${
                  selected.material === "PVC"
                    ? styles.materialChipPvc
                    : selected.material === "Cristal"
                      ? styles.materialChipGlass
                      : styles.materialChipAluminio
                }`}
              >
                {isGlass ? "Cristal" : selected.material}
              </span>
            </span>
            <span className={styles.triggerMeta}>
              {lineTemplateNeedsCommercialPrice(selected) ? (
                <em className={styles.pricePending}>Precio pendiente</em>
              ) : (
                <>
                  <em>{formatPricePerM2(selected.precioM2Sugerido)}</em>
                  {selectedProvider ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{selectedProvider}</span>
                    </>
                  ) : null}
                  <span aria-hidden>·</span>
                  <span>{formatMinimum(selected.minimoCobrable)}</span>
                </>
              )}
            </span>
          </span>
        ) : (
          <span className={styles.triggerBody}>
            <strong className={styles.triggerTitleMuted}>
              {isGlass ? "Elegir cristal" : "Elegir línea"}
            </strong>
            <span className={styles.triggerMeta}>
              {isGlass
                ? "Catálogo de cristales con precio"
                : "Por proveedor · material · precio"}
            </span>
          </span>
        )}
        <LuChevronDown className={styles.triggerCaret} aria-hidden />
      </button>
      )}

      {overlay}

      {priceEditorTarget && resolvedOrgId ? (
        <LinePriceEditor
          template={priceEditorTarget}
          organizationId={resolvedOrgId}
          onSaved={(updated) => {
            setPriceEditorTarget(null);
            if (onTemplatePriceUpdated) {
              onTemplatePriceUpdated(updated);
            } else {
              onChange(String(updated.id));
            }
            closePicker();
          }}
          onClose={() => setPriceEditorTarget(null)}
        />
      ) : null}
    </div>
  );
}
