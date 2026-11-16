"use client";

import { forwardRef, type ReactNode } from "react";
import styles from "./quote-supplier-disclosure.module.css";

type Props = {
  summary: string;
  warning?: string | null;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export const QuoteSupplierDisclosure = forwardRef<HTMLDetailsElement, Props>(function QuoteSupplierDisclosure(
  { summary, warning, children, className, bodyClassName }, ref,
) {
  return (
    <details ref={ref} className={[styles.root, className].filter(Boolean).join(" ")}>
      <summary>
        <span className={styles.label}>Costos y proveedores</span>
        <strong>{summary}</strong>
        {warning ? <span className={styles.warning}>{warning}</span> : null}
      </summary>
      <div className={bodyClassName}>{children}</div>
    </details>
  );
});
