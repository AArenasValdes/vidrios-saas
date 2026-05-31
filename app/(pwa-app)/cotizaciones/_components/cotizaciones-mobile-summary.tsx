import { LuCheck } from "react-icons/lu";

import type {
  CotizacionesMobileSummaryItem,
  CotizacionesMobileSummaryKey,
} from "./cotizaciones-page.types";

import s from "../page.module.css";

type CotizacionesMobileSummaryProps = {
  items: CotizacionesMobileSummaryItem[];
  onSelect: (key: CotizacionesMobileSummaryKey) => void;
};

export function CotizacionesMobileSummary({
  items,
  onSelect,
}: CotizacionesMobileSummaryProps) {
  return (
    <div className={s.mobileSummaryGrid}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={item.active}
          className={`${s.mobileSummaryCard} ${s[`mobileSummary${item.tone[0].toUpperCase()}${item.tone.slice(1)}`]}${item.active ? ` ${s.mobileSummaryCardActive}` : ""}`}
          onClick={() => onSelect(item.key)}
        >
          <span
            className={`${s.mobileSummaryIndicator}${item.active ? ` ${s.mobileSummaryIndicatorActive}` : ""}`}
            aria-hidden
          >
            <LuCheck />
          </span>
          <span className={s.mobileSummaryValue}>{item.value}</span>
          <span className={s.mobileSummaryLabel}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
