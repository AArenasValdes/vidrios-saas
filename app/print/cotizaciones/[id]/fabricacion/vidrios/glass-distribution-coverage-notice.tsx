import Link from "next/link";

import type { GlassDistributionCoverage } from "@/features/fabricacion/services/glass-distribution-coverage.service";

import s from "./glass-distribution-coverage-notice.module.css";

export function GlassDistributionCoverageNotice({
  quoteId,
  coverage,
}: {
  quoteId: string;
  coverage: GlassDistributionCoverage | null;
}) {
  if (!coverage || coverage.status === "complete") return null;

  const partial = coverage.status === "partial";
  return (
    <aside className={s.notice} role="alert" aria-live="polite">
      <strong>{partial ? "Distribución parcial" : "Distribución no disponible"}</strong>
      <p>
        {partial
          ? "La vista previa incluye solo referencias con medidas verificadas; no representa toda la cotización. No descargues este plano como pedido completo."
          : "No hay referencias de paño con medidas técnicas completas para preparar un pedido al proveedor."}
      </p>
      {coverage.pendingReferences.length > 0 ? (
        <ul>
          {coverage.pendingReferences.map((reference) => (
            <li key={`${reference.quoteItemId}:${reference.componentCode}`}>
              <b>{reference.componentCode} · {reference.componentName}</b>
              {reference.displayName ? ` · ${reference.displayName}` : ""}: {reference.reason}
            </li>
          ))}
        </ul>
      ) : null}
      {coverage.pendingReferences.length === 0 && coverage.diagnostics[0] ? <p>{coverage.diagnostics[0]}</p> : null}
      <Link href={`/cotizaciones/${encodeURIComponent(quoteId)}`}>Corregir cotización</Link>
    </aside>
  );
}
