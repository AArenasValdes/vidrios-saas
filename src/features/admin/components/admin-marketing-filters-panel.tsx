"use client";

import { useEffect, useRef } from "react";
import { LuFilter, LuX } from "react-icons/lu";

import {
  EMPTY_MARKETING_FILTERS,
  MARKETING_FILTER_LABELS,
  type MarketingAcquisitionChannelFilter,
  type MarketingCommercialStateFilter,
  type MarketingFiltersState,
  type MarketingPeriodFilter,
  type MarketingPublicPageFilter,
} from "@/features/admin/services/admin-marketing-filters.service";
import s from "./admin-payments-filters-panel.module.css";

type AdminMarketingFiltersPanelProps = {
  filters: MarketingFiltersState;
  onChange: (next: MarketingFiltersState) => void;
  isOpen: boolean;
  onClose: () => void;
};

function toggle<T extends string>(current: T[], value: T) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function AdminMarketingFiltersPanel({
  filters,
  onChange,
  isOpen,
  onClose,
}: AdminMarketingFiltersPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={s.backdrop}>
      <div className={s.panel} ref={panelRef} role="dialog" aria-label="Filtros de marketing">
        <div className={s.header}>
          <div>
            <LuFilter aria-hidden /> <strong>Filtros</strong>
          </div>
          <button type="button" className={s.iconBtn} onClick={onClose}>
            <LuX aria-hidden />
          </button>
        </div>

        <FilterGroup<MarketingPeriodFilter>
          title="Período"
          options={Object.entries(MARKETING_FILTER_LABELS.period) as Array<[MarketingPeriodFilter, string]>}
          selected={[filters.period]}
          onToggle={(value) => onChange({ ...filters, period: value })}
          singleSelect
        />

        {filters.period === "custom" ? (
          <section className={s.group}>
            <h3>Rango personalizado</h3>
            <div className={s.chipRow}>
              <label>
                Desde{" "}
                <input
                  type="date"
                  value={filters.customStart}
                  onChange={(event) =>
                    onChange({ ...filters, customStart: event.target.value })
                  }
                />
              </label>
              <label>
                Hasta{" "}
                <input
                  type="date"
                  value={filters.customEnd}
                  onChange={(event) => onChange({ ...filters, customEnd: event.target.value })}
                />
              </label>
            </div>
          </section>
        ) : null}

        <FilterGroup<MarketingAcquisitionChannelFilter>
          title="Adquisición Ventora"
          options={
            Object.entries(MARKETING_FILTER_LABELS.acquisitionChannels) as Array<
              [MarketingAcquisitionChannelFilter, string]
            >
          }
          selected={filters.acquisitionChannels}
          onToggle={(value) =>
            onChange({
              ...filters,
              acquisitionChannels: toggle(filters.acquisitionChannels, value),
            })
          }
        />

        <FilterGroup<MarketingCommercialStateFilter>
          title="Estado comercial"
          options={
            Object.entries(MARKETING_FILTER_LABELS.commercialStates) as Array<
              [MarketingCommercialStateFilter, string]
            >
          }
          selected={filters.commercialStates}
          onToggle={(value) =>
            onChange({
              ...filters,
              commercialStates: toggle(filters.commercialStates, value),
            })
          }
        />

        <FilterGroup<MarketingPublicPageFilter>
          title="Página pública"
          options={
            Object.entries(MARKETING_FILTER_LABELS.publicPageFilters) as Array<
              [MarketingPublicPageFilter, string]
            >
          }
          selected={filters.publicPageFilters}
          onToggle={(value) =>
            onChange({
              ...filters,
              publicPageFilters: toggle(filters.publicPageFilters, value),
            })
          }
        />

        <button
          type="button"
          className={s.clearBtn}
          onClick={() => onChange(EMPTY_MARKETING_FILTERS)}
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
  singleSelect = false,
}: {
  title: string;
  options: Array<[T, string]>;
  selected: T[];
  onToggle: (value: T) => void;
  singleSelect?: boolean;
}) {
  return (
    <section className={s.group}>
      <h3>{title}</h3>
      <div className={s.chipRow}>
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`${s.chip} ${selected.includes(value) ? s.chipActive : ""}`}
            onClick={() => {
              if (singleSelect) {
                onToggle(value);
                return;
              }
              onToggle(value);
            }}
            aria-pressed={selected.includes(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
