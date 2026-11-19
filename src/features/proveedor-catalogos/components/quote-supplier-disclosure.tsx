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
    <details className={[styles.root, className].filter(Boolean).join(" ")} aria-label="Costos y proveedores">
      <summary className={styles.heading}>
        <span>Costos y proveedores</span>
        <strong>{summary}</strong>
        {coverage ? <span className={styles.coverage}>{coverage}</span> : null}
        {warning ? <span className={styles.warning} role="status">{warning}</span> : null}
      </summary>
      <div className={bodyClassName}>{children}</div>
    </details>
  );
}
