"use client";

import { useEffect, useRef, useState } from "react";
import { LuFilter, LuX } from "react-icons/lu";

import {
  EMPTY_CLIENTES_FILTERS,
  FILTER_LABELS,
  QUICK_VIEWS,
  type AccountTypeFilter,
  type ClientesFiltersState,
  type PublicChannelFilter,
  type QuickViewId,
  type SavedClientesView,
  type SubscriptionStatusFilter,
  type UsageHealthFilter,
  listSavedClientesViews,
  saveClientesView,
  toggleFilterValue,
} from "@/features/admin/services/admin-clientes-filters.service";
import s from "./admin-clientes-filters-panel.module.css";

type AdminClientesFiltersPanelProps = {
  filters: ClientesFiltersState;
  onChange: (next: ClientesFiltersState) => void;
  onApplyQuickView: (viewId: QuickViewId) => void;
  isOpen: boolean;
  onClose: () => void;
};

const ACCOUNT_TYPES: AccountTypeFilter[] = ["real", "test"];
const SUBSCRIPTION_STATUSES: SubscriptionStatusFilter[] = [
  "active",
  "trial_active",
  "expiring_soon",
  "trial_expired",
  "subscription_expired",
];
const USAGE_FILTERS: UsageHealthFilter[] = [
  "no_first_quote",
  "no_recent_activity",
  "recent_activity",
  "pending_payment",
];

const PUBLIC_CHANNEL_FILTERS: PublicChannelFilter[] = [
  "page_published",
  "page_not_configured",
  "with_requests_30d",
  "without_requests_30d",
  "with_pending_requests",
];

export function AdminClientesFiltersPanel({
  filters,
  onChange,
  onApplyQuickView,
  isOpen,
  onClose,
}: AdminClientesFiltersPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [savedViews, setSavedViews] = useState<SavedClientesView[]>([]);
  const [viewName, setViewName] = useState("");

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => setSavedViews(listSavedClientesViews()));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function toggleAccountType(value: AccountTypeFilter) {
    onChange({
      ...filters,
      accountTypes: toggleFilterValue(filters.accountTypes, value),
    });
  }

  function toggleSubscription(value: SubscriptionStatusFilter) {
    onChange({
      ...filters,
      subscriptionStatuses: toggleFilterValue(filters.subscriptionStatuses, value),
    });
  }

  function toggleUsage(value: UsageHealthFilter) {
    onChange({
      ...filters,
      usage: toggleFilterValue(filters.usage, value),
    });
  }

  function togglePublicChannel(value: PublicChannelFilter) {
    onChange({
      ...filters,
      publicChannel: toggleFilterValue(filters.publicChannel, value),
    });
  }

  function handleSaveView() {
    if (!viewName.trim()) {
      return;
    }

    setSavedViews(saveClientesView(viewName, filters));
    setViewName("");
  }

  return (
    <div className={s.backdrop}>
      <div className={s.panel} ref={panelRef} role="dialog" aria-label="Filtros de clientes">
        <div className={s.header}>
          <div>
            <LuFilter aria-hidden />
            <strong>Filtros</strong>
          </div>
          <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Cerrar filtros">
            <LuX aria-hidden />
          </button>
        </div>

        <section className={s.group}>
          <h3>Vistas rápidas</h3>
          <div className={s.chipRow}>
            {(Object.keys(QUICK_VIEWS) as QuickViewId[]).map((viewId) => (
              <button
                key={viewId}
                type="button"
                className={s.chip}
                onClick={() => onApplyQuickView(viewId)}
              >
                {QUICK_VIEWS[viewId].label}
              </button>
            ))}
          </div>
        </section>

        <section className={s.group}>
          <h3>Tipo de cuenta</h3>
          <div className={s.chipRow}>
            {ACCOUNT_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                className={`${s.chip} ${filters.accountTypes.includes(value) ? s.chipActive : ""}`}
                onClick={() => toggleAccountType(value)}
              >
                {FILTER_LABELS.accountType[value]}
              </button>
            ))}
          </div>
        </section>

        <section className={s.group}>
          <h3>Estado de suscripción</h3>
          <div className={s.chipRow}>
            {SUBSCRIPTION_STATUSES.map((value) => (
              <button
                key={value}
                type="button"
                className={`${s.chip} ${filters.subscriptionStatuses.includes(value) ? s.chipActive : ""}`}
                onClick={() => toggleSubscription(value)}
              >
                {FILTER_LABELS.subscriptionStatus[value]}
              </button>
            ))}
          </div>
        </section>

        <section className={s.group}>
          <h3>Salud / uso</h3>
          <div className={s.chipRow}>
            {USAGE_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                className={`${s.chip} ${filters.usage.includes(value) ? s.chipActive : ""}`}
                onClick={() => toggleUsage(value)}
              >
                {FILTER_LABELS.usage[value]}
              </button>
            ))}
          </div>
        </section>

        <section className={s.group}>
          <h3>Canal público</h3>
          <div className={s.chipRow}>
            {PUBLIC_CHANNEL_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                className={`${s.chip} ${filters.publicChannel.includes(value) ? s.chipActive : ""}`}
                onClick={() => togglePublicChannel(value)}
              >
                {FILTER_LABELS.publicChannel[value]}
              </button>
            ))}
          </div>
        </section>

        <section className={s.group}>
          <h3>Guardar vista</h3>
          <div className={s.saveRow}>
            <input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder="Nombre de la vista"
            />
            <button type="button" className={s.secondaryBtn} onClick={handleSaveView}>
              Guardar
            </button>
          </div>
          {savedViews.length > 0 ? (
            <div className={s.savedList}>
              {savedViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={s.savedItem}
                  onClick={() =>
                    onChange({
                      ...EMPTY_CLIENTES_FILTERS,
                      ...view.filters,
                      search: filters.search,
                      sortField: filters.sortField,
                      sortDirection: filters.sortDirection,
                    })
                  }
                >
                  {view.name}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
