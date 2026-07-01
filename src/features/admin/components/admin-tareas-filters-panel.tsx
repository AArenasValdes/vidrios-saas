"use client";

import { useEffect, useRef } from "react";
import { LuFilter, LuX } from "react-icons/lu";

import {
  EMPTY_TAREAS_FILTERS,
  TAREAS_FILTER_LABELS,
  type TareasActionFilter,
  type TareasFiltersState,
  type TareasOriginFilter,
  type TareasPriorityFilter,
  type TareasStatusFilter,
} from "@/features/admin/services/admin-tareas-filters.service";
import s from "./admin-payments-filters-panel.module.css";

type AdminTareasFiltersPanelProps = {
  filters: TareasFiltersState;
  onChange: (next: TareasFiltersState) => void;
  isOpen: boolean;
  onClose: () => void;
};

function toggle<T extends string>(current: T[], value: T) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function AdminTareasFiltersPanel({
  filters,
  onChange,
  isOpen,
  onClose,
}: AdminTareasFiltersPanelProps) {
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
      <div className={s.panel} ref={panelRef} role="dialog" aria-label="Filtros de tareas">
        <div className={s.header}>
          <div>
            <LuFilter aria-hidden /> <strong>Filtros</strong>
          </div>
          <button type="button" className={s.iconBtn} onClick={onClose}>
            <LuX aria-hidden />
          </button>
        </div>

        <FilterGroup
          title="Estado"
          options={Object.entries(TAREAS_FILTER_LABELS.status) as Array<[TareasStatusFilter, string]>}
          selected={filters.statuses}
          onToggle={(value) => onChange({ ...filters, statuses: toggle(filters.statuses, value) })}
        />
        <FilterGroup
          title="Prioridad"
          options={
            Object.entries(TAREAS_FILTER_LABELS.priority) as Array<[TareasPriorityFilter, string]>
          }
          selected={filters.priorities}
          onToggle={(value) =>
            onChange({ ...filters, priorities: toggle(filters.priorities, value) })
          }
        />
        <FilterGroup
          title="Origen"
          options={Object.entries(TAREAS_FILTER_LABELS.origin) as Array<[TareasOriginFilter, string]>}
          selected={filters.origins}
          onToggle={(value) => onChange({ ...filters, origins: toggle(filters.origins, value) })}
        />
        <FilterGroup
          title="Tipo de acción"
          options={Object.entries(TAREAS_FILTER_LABELS.action) as Array<[TareasActionFilter, string]>}
          selected={filters.actions}
          onToggle={(value) => onChange({ ...filters, actions: toggle(filters.actions, value) })}
        />

        <div className={s.footer}>
          <button
            type="button"
            className={s.secondaryBtn}
            onClick={() => onChange({ ...EMPTY_TAREAS_FILTERS, search: filters.search })}
          >
            Limpiar filtros
          </button>
          <button type="button" className={s.primaryBtn} onClick={onClose}>
            Aplicar
          </button>
        </div>
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
    <div className={s.group}>
      <h3>{title}</h3>
      <div className={s.chips}>
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={selected.includes(value) ? s.chipActive : s.chip}
            onClick={() => onToggle(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
