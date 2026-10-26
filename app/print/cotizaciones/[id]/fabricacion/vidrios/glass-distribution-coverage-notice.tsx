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
  const editUrl = (itemId: string) => {
    const params = new URLSearchParams({ edit: quoteId, step: "2" });
    if (itemId) {
      params.set("itemId", itemId);
      params.set("focus", "glass");
    }
    return `/cotizaciones/nueva?${params.toString()}`;
  };

  return (
    <aside className={s.notice} aria-label="Cobertura de medidas de vidrio" aria-live="polite">
      <div className={s.summary}>
        <strong>{partial ? "Distribución parcial" : "Medidas de vidrio pendientes"}</strong>
        <span>{coverage.completeReferenceCount} completas · {coverage.pendingReferenceCount} pendientes</span>
      </div>
      {coverage.pendingReferences.length > 0 ? (
        <ul>
          {coverage.pendingReferences.map((reference) => (
            <li key={`${reference.quoteItemId}:${reference.componentCode}`}>
              <div className={s.pendingCopy}>
                <b>Faltan las medidas del vidrio de {reference.componentCode} · {reference.componentName}</b>
                {reference.displayName ? <small>{reference.displayName}</small> : null}
              </div>
              <Link href={editUrl(reference.quoteItemId)}>Ingresar medidas</Link>
            </li>
          ))}
        </ul>
      ) : <p>Aún no hay medidas de vidrio disponibles para distribuir.</p>}
    </aside>
  );
}
