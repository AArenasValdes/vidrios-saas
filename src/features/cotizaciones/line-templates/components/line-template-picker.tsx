"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCheck, LuChevronDown, LuSearch, LuX } from "react-icons/lu";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { getLineTemplateSystemMetadata } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  groupLineTemplatesByProvider,
  LINE_TEMPLATE_GROUP_NO_PROVIDER,
} from "@/features/cotizaciones/line-templates/services/line-template-group.service";
import { CLP } from "@/features/cotizaciones/new-quote/workflow-ui";

import styles from "./line-template-picker.module.css";

type MaterialFilter = "todos" | "Aluminio" | "PVC";
type ProviderFilter = "todos" | "sin_proveedor" | string;

type LineTemplatePickerProps = {
  templates: readonly CotizacionLineTemplate[];
  value: string;
  onChange: (templateId: string) => void;
  mode?: "profile" | "glass";
  ariaLabel?: string;
  className?: string;
};

function formatPricePerM2(value: number) {
  return `${CLP(value)}/m²`;
}

function formatMinimum(value: number) {
  return value > 0 ? `Mín. ${CLP(value)}` : "Sin mínimo";
}

function formatRounding(value: number) {
  return value > 0 ? `Redondeo ${CLP(value)}` : "Sin redondeo";
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
  const material = isGlass ? "Cristal" : template.material;
  const provider = normalizeProvider(template.proveedor);
  const system = getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem;

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
          <strong>{template.nombre}</strong>
          <span
            className={`${styles.materialChip} ${
              material === "PVC"
                ? styles.materialChipPvc
                : material === "Cristal"
                  ? styles.materialChipGlass
                  : styles.materialChipAluminio
            }`}
          >
            {material}
          </span>
        </span>
        <span className={styles.optionContext}>
          {provider ? (
            <span className={styles.providerLabel}>{provider}</span>
          ) : (
            <span className={styles.providerLabelMuted}>Sin proveedor</span>
          )}
          {system ? (
            <>
              <span aria-hidden>·</span>
              <span className={styles.systemLabel}>{system}</span>
            </>
          ) : null}
        </span>
        <span className={styles.optionPriceRow}>
          <em>{formatPricePerM2(template.precioM2Sugerido)}</em>
          <span className={styles.optionSecondary}>
            {formatMinimum(template.minimoCobrable)}
            <span aria-hidden> · </span>
            {formatRounding(template.redondeoPrecio)}
          </span>
        </span>
      </span>
      {selectedOption ? <LuCheck className={styles.optionCheck} aria-hidden /> : null}
    </button>
  );
}

export function LineTemplatePicker({
  templates,
  value,
  onChange,
  mode = "profile",
  ariaLabel,
  className,
}: LineTemplatePickerProps) {
  const listId = useId();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<MaterialFilter>("todos");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("todos");

  const isGlass = mode === "glass";
  const emptyLabel = isGlass ? "Precio manual o sin cristal" : "Precio manual o sin línea";
  const selected = templates.find((template) => String(template.id) === value) ?? null;
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
    const normalizedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      if (!isGlass && materialFilter !== "todos" && template.material !== materialFilter) {
        return false;
      }

      const provider = normalizeProvider(template.proveedor);
      if (providerFilter === "sin_proveedor") {
        if (provider) return false;
      } else if (providerFilter !== "todos" && provider !== providerFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const system =
        getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem ?? "";
      const haystack = [
        template.nombre,
        template.material,
        template.categoria,
        provider ?? "",
        system,
        String(Math.round(template.precioM2Sugerido)),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [isGlass, materialFilter, providerFilter, query, templates]);

  const providerGroups = useMemo(
    () => groupLineTemplatesByProvider(filteredTemplates),
    [filteredTemplates]
  );

  const showProviderGroups =
    !isGlass && providerFilter === "todos" && providerGroups.length > 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setMaterialFilter("todos");
      setProviderFilter("todos");
    }
  }, [open]);

  const selectValue = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const dialogTitle = isGlass ? "Elegir cristal" : "Elegir línea comercial";

  const overlay =
    open && mounted
      ? createPortal(
          <div className={styles.overlay} role="presentation">
            <button
              type="button"
              className={styles.backdrop}
              aria-label="Cerrar selector"
              onClick={() => setOpen(false)}
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
                      : "Elige proveedor y línea. El catálogo está ordenado para encontrar rápido."}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="Cerrar"
                  onClick={() => setOpen(false)}
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
                    <div className={styles.filterGroup}>
                      <span className={styles.filterLabel}>Material</span>
                      <div className={styles.filterRow} role="group" aria-label="Filtrar por material">
                        {(
                          [
                            ["todos", "Todas"],
                            ["Aluminio", "Aluminio"],
                            ["PVC", "PVC"],
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
                  </div>
                ) : null}
              </div>

              <div className={styles.resultMeta}>
                <span>
                  {filteredTemplates.length}{" "}
                  {filteredTemplates.length === 1 ? "opción" : "opciones"}
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
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  className={`${styles.option} ${styles.optionManual} ${
                    !value ? styles.optionActive : ""
                  }`}
                  onClick={() => selectValue("")}
                >
                  <span className={styles.optionMain}>
                    <strong>{emptyLabel}</strong>
                    <small>Sin plantilla · precio manual</small>
                  </span>
                  {!value ? <LuCheck className={styles.optionCheck} aria-hidden /> : null}
                </button>

                {showProviderGroups
                  ? providerGroups.map((group) => (
                      <section
                        key={group.provider}
                        className={styles.providerGroup}
                        aria-label={group.provider}
                      >
                        <header className={styles.providerGroupHeader}>
                          <strong>
                            {group.provider === LINE_TEMPLATE_GROUP_NO_PROVIDER
                              ? "Sin proveedor"
                              : group.provider}
                          </strong>
                          <span>
                            {group.templates.length}{" "}
                            {group.templates.length === 1 ? "línea" : "líneas"}
                          </span>
                        </header>
                        <div className={styles.optionGrid}>
                          {group.templates.map((template) =>
                            renderTemplateOption(template, value, isGlass, selectValue)
                          )}
                        </div>
                      </section>
                    ))
                  : (
                      <div className={styles.optionGrid}>
                        {filteredTemplates.map((template) =>
                          renderTemplateOption(template, value, isGlass, selectValue)
                        )}
                      </div>
                    )}

                {filteredTemplates.length === 0 ? (
                  <div className={styles.empty}>
                    {query.trim() || materialFilter !== "todos" || providerFilter !== "todos"
                      ? "No hay líneas con ese filtro."
                      : isGlass
                        ? "No hay cristales con precio guardados."
                        : "No hay líneas con precio guardadas."}
                  </div>
                ) : null}
              </div>
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
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""} ${
          selected ? styles.triggerSelected : ""
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel ?? (isGlass ? "Seleccionar cristal" : "Seleccionar línea comercial")}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <span className={styles.triggerBody}>
            <span className={styles.triggerTitleRow}>
              <strong className={styles.triggerTitle}>{selected.nombre}</strong>
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
              <em>{formatPricePerM2(selected.precioM2Sugerido)}</em>
              {selectedProvider ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{selectedProvider}</span>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <span>{formatMinimum(selected.minimoCobrable)}</span>
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

      {overlay}
    </div>
  );
}
