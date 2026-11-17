"use client";

import type { ReactNode } from "react";
import styles from "./quote-supplier-disclosure.module.css";

type Props = {
  summary: string;
  coverage?: string | null;
  warning?: string | null;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function QuoteSupplierDisclosure({ summary, coverage, warning, children, className, bodyClassName }: Props) {
  return (
    <section className={[styles.root, className].filter(Boolean).join(" ")} aria-label="Costos y proveedores">
      <div className={styles.heading}>
        <span>Costos y proveedores</span>
        <strong>{summary}</strong>
        {coverage ? <span className={styles.coverage}>{coverage}</span> : null}
        {warning ? <span className={styles.warning} role="status">{warning}</span> : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
