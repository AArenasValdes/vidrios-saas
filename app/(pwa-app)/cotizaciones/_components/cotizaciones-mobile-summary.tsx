"use client";

import { motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();

  return (
    <div className={s.mobileSummaryGrid}>
      {items.map((item) => (
        <motion.button
          key={item.key}
          type="button"
          aria-pressed={item.active}
          className={`${s.mobileSummaryCard} ${s[`mobileSummary${item.tone[0].toUpperCase()}${item.tone.slice(1)}`]}${item.active ? ` ${s.mobileSummaryCardActive}` : ""}`}
          onClick={() => onSelect(item.key)}
          whileHover={reduceMotion ? undefined : { y: -1 }}
          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <span
            className={`${s.mobileSummaryIndicator}${item.active ? ` ${s.mobileSummaryIndicatorActive}` : ""}`}
            aria-hidden
          >
            <LuCheck />
          </span>
          <span className={s.mobileSummaryValue}>{item.value}</span>
          <span className={s.mobileSummaryLabel}>{item.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
