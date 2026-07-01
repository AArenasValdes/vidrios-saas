"use client";

import { useEffect, useRef } from "react";
import { LuFilter, LuX } from "react-icons/lu";

import {
  EMPTY_PAGOS_FILTERS,
  PAGOS_FILTER_LABELS,
  type PagosFiltersState,
  type PaymentAccountFilter,
  type PaymentMethodFilter,
  type PaymentPlanFilter,
  type PaymentStatusFilter,
} from "@/features/admin/services/admin-payments-filters.service";
import s from "./admin-payments-filters-panel.module.css";

type AdminPaymentsFiltersPanelProps = {
  filters: PagosFiltersState;
  onChange: (next: PagosFiltersState) => void;
  isOpen: boolean;
  onClose: () => void;
};

function toggle<T extends string>(current: T[], value: T) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function AdminPaymentsFiltersPanel({
  filters,
  onChange,
  isOpen,
  onClose,
}: AdminPaymentsFiltersPanelProps) {
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
      <div className={s.panel} ref={panelRef} role="dialog" aria-label="Filtros de pagos">
        <div className={s.header}>
          <div><LuFilter aria-hidden /> <strong>Filtros</strong></div>
          <button type="button" className={s.iconBtn} onClick={onClose}><LuX aria-hidden /></button>
        </div>

        <FilterGroup
          title="Estado del pago"
          options={Object.entries(PAGOS_FILTER_LABELS.paymentStatus) as Array<[PaymentStatusFilter, string]>}
          selected={filters.paymentStatuses}
          onToggle={(value) => onChange({ ...filters, paymentStatuses: toggle(filters.paymentStatuses, value) })}
        />
        <FilterGroup
          title="Estado de cuenta"
          options={Object.entries(PAGOS_FILTER_LABELS.accountStatus) as Array<[PaymentAccountFilter, string]>}
          selected={filters.accountStatuses}
          onToggle={(value) => onChange({ ...filters, accountStatuses: toggle(filters.accountStatuses, value) })}
        />
        <FilterGroup
          title="Medio de pago"
          options={Object.entries(PAGOS_FILTER_LABELS.paymentMethod) as Array<[PaymentMethodFilter, string]>}
          selected={filters.paymentMethods}
          onToggle={(value) => onChange({ ...filters, paymentMethods: toggle(filters.paymentMethods, value) })}
        />
        <FilterGroup
          title="Plan"
          options={Object.entries(PAGOS_FILTER_LABELS.plan) as Array<[PaymentPlanFilter, string]>}
          selected={filters.plans}
          onToggle={(value) => onChange({ ...filters, plans: toggle(filters.plans, value) })}
        />

        <button type="button" className={s.clearBtn} onClick={() => onChange({ ...EMPTY_PAGOS_FILTERS, search: filters.search })}>
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
