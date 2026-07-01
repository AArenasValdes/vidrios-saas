"use client";

import { useEffect, useRef } from "react";
import { LuFilter, LuX } from "react-icons/lu";

import {
  ACTIVACION_FILTER_LABELS,
  EMPTY_ACTIVACION_FILTERS,
  type ActivacionAccountStatusFilter,
  type ActivacionAccountTypeFilter,
  type ActivacionActivityFilter,
  type ActivacionFiltersState,
  type ActivacionStageFilter,
} from "@/features/admin/services/admin-activacion-filters.service";
import s from "./admin-payments-filters-panel.module.css";

type AdminActivacionFiltersPanelProps = {
  filters: ActivacionFiltersState;
  onChange: (next: ActivacionFiltersState) => void;
  isOpen: boolean;
  onClose: () => void;
};

function toggle<T extends string>(current: T[], value: T) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function AdminActivacionFiltersPanel({
  filters,
  onChange,
  isOpen,
  onClose,
}: AdminActivacionFiltersPanelProps) {
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
      <div className={s.panel} ref={panelRef} role="dialog" aria-label="Filtros de activación">
        <div className={s.header}>
          <div>
            <LuFilter aria-hidden /> <strong>Filtros</strong>
          </div>
          <button type="button" className={s.iconBtn} onClick={onClose}>
            <LuX aria-hidden />
          </button>
        </div>

        <FilterGroup
          title="Etapa de activación"
          options={Object.entries(ACTIVACION_FILTER_LABELS.stage) as Array<[ActivacionStageFilter, string]>}
          selected={filters.stages}
          onToggle={(value) => onChange({ ...filters, stages: toggle(filters.stages, value) })}
        />
        <FilterGroup
          title="Estado de cuenta"
          options={
            Object.entries(ACTIVACION_FILTER_LABELS.accountStatus) as Array<
              [ActivacionAccountStatusFilter, string]
            >
          }
          selected={filters.accountStatuses}
          onToggle={(value) =>
            onChange({ ...filters, accountStatuses: toggle(filters.accountStatuses, value) })
          }
        />
        <FilterGroup
          title="Actividad"
          options={
            Object.entries(ACTIVACION_FILTER_LABELS.activity) as Array<
              [ActivacionActivityFilter, string]
            >
          }
          selected={filters.activity}
          onToggle={(value) => onChange({ ...filters, activity: toggle(filters.activity, value) })}
        />
        <FilterGroup
          title="Tipo"
          options={
            Object.entries(ACTIVACION_FILTER_LABELS.accountType) as Array<
              [ActivacionAccountTypeFilter, string]
            >
          }
          selected={filters.accountTypes}
          onToggle={(value) =>
            onChange({ ...filters, accountTypes: toggle(filters.accountTypes, value) })
          }
        />

        <button
          type="button"
          className={s.clearBtn}
          onClick={() => onChange({ ...EMPTY_ACTIVACION_FILTERS, search: filters.search })}
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
}: {
  title: string;
  options: Array<[T, string]>;
  selected: T[];
  onToggle: (value: T) => void;
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
            onClick={() => onToggle(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
