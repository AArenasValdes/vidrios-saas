"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LuChevronRight } from "react-icons/lu";

import type { CotizacionesMobileRow } from "./cotizaciones-page.types";

import s from "../page.module.css";

type CotizacionMobileCardProps = {
  row: CotizacionesMobileRow;
  index: number;
};

export function CotizacionMobileCard({
  row,
  index,
}: CotizacionMobileCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className={row.cardClassName}
      data-testid="cotizacion-mobile-card"
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              duration: 0.18,
              delay: Math.min(index * 0.03, 0.12),
              ease: "easeOut",
            }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.992 }}
    >
      <Link
        className={s.cotCardMainLink}
        href={row.detailHref}
        onPointerEnter={row.onPrefetchDetail}
        onFocus={row.onPrefetchDetail}
        onTouchStart={row.onPrefetchDetail}
      >
        <div className={s.cotCardHead}>
          <div className={s.cotCardHeadCopy}>
            <div className={s.cotCardNombre}>{row.clienteNombre}</div>
            <div className={s.cotCardObra}>{row.obra}</div>
            <span className={s.cotCardFechaInline}>{row.fecha}</span>
          </div>
          <div className={s.cotCardHeadMeta}>
            <span className={s.cotCardTotal}>{row.total}</span>
            <span className={`${s.badge} ${s[row.responseMeta.cls]}`}>
              {row.responseMeta.label}
            </span>
          </div>
        </div>
        <div className={s.cotCardBottom}>
          <div className={s.cotCardBottomMeta}>
            <span className={s.cotCardNum}>{row.codigo}</span>
          </div>
          <span className={s.cotCardHint}>
            Ver detalle
            <LuChevronRight aria-hidden />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
