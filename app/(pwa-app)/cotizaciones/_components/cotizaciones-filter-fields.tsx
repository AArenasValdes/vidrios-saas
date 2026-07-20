"use client";

import { LuFilterX } from "react-icons/lu";

import s from "../page.module.css";

type SelectOption = {
  value: string;
  label: string;
};

type CotizacionesFilterFieldsProps = {
  estados: string[];
  clientes: string[];
  periodos: readonly SelectOption[];
  ordenes: readonly SelectOption[];
  estadoFiltro: string;
  clienteFiltro: string;
  periodoFiltro: string;
  ordenFiltro: string;
  onEstadoChange: (value: string) => void;
  onClienteChange: (value: string) => void;
  onPeriodoChange: (value: string) => void;
  onOrdenChange: (value: string) => void;
  onLimpiar: () => void;
  canClear?: boolean;
};

export function CotizacionesFilterFields({
  estados,
  clientes,
  periodos,
  ordenes,
  estadoFiltro,
  clienteFiltro,
  periodoFiltro,
  ordenFiltro,
  onEstadoChange,
  onClienteChange,
  onPeriodoChange,
  onOrdenChange,
  onLimpiar,
  canClear = true,
}: CotizacionesFilterFieldsProps) {
  return (
    <>
      <div className={s.filterGroup}>
        <label className={s.filterLabel}>Estado</label>
        <select
          className={s.filterSelect}
          value={estadoFiltro}
          onChange={(event) => onEstadoChange(event.target.value)}
        >
          {estados.map((estado) => (
            <option key={estado}>{estado}</option>
          ))}
        </select>
      </div>

      <div className={s.filterGroup}>
        <label className={s.filterLabel}>Periodo</label>
        <select
          className={s.filterSelect}
          value={periodoFiltro}
          onChange={(event) => onPeriodoChange(event.target.value)}
        >
          {periodos.map((periodo) => (
            <option key={periodo.value} value={periodo.value}>
              {periodo.label}
            </option>
          ))}
        </select>
      </div>

      <div className={s.filterGroup}>
        <label className={s.filterLabel}>Cliente</label>
        <select
          className={s.filterSelect}
          value={clienteFiltro}
          onChange={(event) => onClienteChange(event.target.value)}
        >
          {clientes.map((cliente) => (
            <option key={cliente}>{cliente}</option>
          ))}
        </select>
      </div>

      <div className={s.filterGroup}>
        <label className={s.filterLabel}>Ordenar por</label>
        <select
          className={s.filterSelect}
          value={ordenFiltro}
          onChange={(event) => onOrdenChange(event.target.value)}
        >
          {ordenes.map((orden) => (
            <option key={orden.value} value={orden.value}>
              {orden.label}
            </option>
          ))}
        </select>
      </div>

      <button
        className={s.btnGhost}
        onClick={onLimpiar}
        type="button"
        aria-disabled={!canClear}
        data-active={canClear}
      >
        <LuFilterX aria-hidden />
        Limpiar
      </button>
    </>
  );
}
