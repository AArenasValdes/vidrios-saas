"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LuCheck, LuChevronDown, LuSearch, LuX } from "react-icons/lu";

import {
  buildGlassValue,
  GLASS_OPTIONS,
} from "@/features/cotizaciones/new-quote/workflow-ui";

import styles from "./glass-option-picker.module.css";

type GlassOptionPickerProps = {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
  placeholder?: string;
};

type GlassPickerGroup = {
  grupo: string;
  options: string[];
};

const SEARCH_ALIASES: Record<string, string> = {
  inc: "incoloro",
  dvh: "dvh",
  termo: "termopanel",
  temp: "templado",
  lam: "laminado",
  ref: "reflectivo",
  esm: "esmerilado",
  esp: "espejo",
  sat: "satinado",
};

function normalizeKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function resolveSearchTerm(query: string) {
  const normalized = normalizeKey(query);
  if (!normalized) return "";
  const alias = Object.entries(SEARCH_ALIASES).find(([key]) => normalized.startsWith(key));
  return alias ? alias[1] : normalized;
}

function matchesGlassQuery(option: string, query: string) {
  const term = resolveSearchTerm(query);
  if (!term) return true;
  return normalizeKey(option).includes(term);
}

function buildCatalogGroups(
  availableOptions: readonly string[],
  query: string
): GlassPickerGroup[] {
  const availableByKey = new Map(
    availableOptions.map((option) => [normalizeKey(option), option] as const)
  );
  const matchedKeys = new Set<string>();

  const groups: GlassPickerGroup[] = GLASS_OPTIONS.map((group) => {
    const options = group.items
      .map((item) => buildGlassValue(group.prefix, item))
      .map((catalogValue) => {
        const key = normalizeKey(catalogValue);
        const match = availableByKey.get(key);
        if (!match || !matchesGlassQuery(match, query)) return null;
        matchedKeys.add(key);
        return match;
      })
      .filter((option): option is string => Boolean(option));

    return {
      grupo: group.grupo,
      options,
    };
  }).filter((group) => group.options.length > 0);

  const others = availableOptions
    .filter((option) => !matchedKeys.has(normalizeKey(option)))
    .filter((option) => matchesGlassQuery(option, query))
    .sort((left, right) =>
      left.localeCompare(right, "es", { sensitivity: "base", numeric: true })
    );

  if (others.length > 0) {
    groups.push({
      grupo: "Otros vidrios",
      options: others,
    });
  }

  return groups;
}

export function GlassOptionPicker({
  options,
  value,
  onChange,
  ariaLabel = "Elegir vidrio",
  placeholder = "Elegir vidrio",
}: GlassOptionPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => buildCatalogGroups(options, query), [options, query]);
  const totalVisible = useMemo(
    () => groups.reduce((count, group) => count + group.options.length, 0),
    [groups]
  );

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selectValue = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""} ${
          value ? styles.triggerSelected : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.triggerBody}>
          {value ? (
            <>
              <strong>{value}</strong>
              <small>Toca para cambiar</small>
            </>
          ) : (
            <>
              <strong className={styles.triggerMuted}>{placeholder}</strong>
              <small>Catálogo de vidrios</small>
            </>
          )}
        </span>
        <LuChevronDown className={styles.triggerCaret} aria-hidden />
      </button>

      {open ? (
        <div className={styles.panel} id={listId} role="listbox" aria-label={ariaLabel}>
          <div className={styles.searchWrap}>
            <LuSearch className={styles.searchIcon} aria-hidden />
            <input
              ref={searchRef}
              className={styles.searchInput}
              type="text"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              data-embedded-search=""
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar: incoloro, DVH, 5 mm…"
              aria-label="Buscar vidrio"
            />
            {query ? (
              <button
                type="button"
                className={styles.searchClear}
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery("")}
              >
                <LuX aria-hidden />
              </button>
            ) : null}
          </div>

          <div className={styles.list}>
            {totalVisible === 0 ? (
              <div className={styles.empty}>No hay vidrios con ese texto.</div>
            ) : (
              groups.map((group) => (
                <section key={group.grupo} className={styles.group} aria-label={group.grupo}>
                  <header className={styles.groupHeader}>
                    <strong>{group.grupo}</strong>
                    <span>
                      {group.options.length}{" "}
                      {group.options.length === 1 ? "opción" : "opciones"}
                    </span>
                  </header>
                  <div className={styles.groupOptions}>
                    {group.options.map((option) => {
                      const selected = option === value;
                      return (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`${styles.option} ${selected ? styles.optionActive : ""}`}
                          onClick={() => selectValue(option)}
                        >
                          <span>{option}</span>
                          {selected ? <LuCheck aria-hidden /> : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>

          {value ? (
            <div className={styles.footer}>
              <button type="button" className={styles.clearButton} onClick={() => selectValue("")}>
                Quitar vidrio
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
