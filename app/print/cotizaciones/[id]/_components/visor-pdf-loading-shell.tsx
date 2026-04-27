"use client";

import s from "../page.module.css";

type VisorPdfLoadingShellProps = {
  title?: string;
  description?: string;
};

export function VisorPdfLoadingShell({
  title = "Abriendo visor PDF",
  description = "Estamos cargando la hoja final para que puedas revisarla desde el telefono.",
}: VisorPdfLoadingShellProps) {
  return (
    <section className={s.viewerLoadingShell} aria-live="polite">
      <div className={s.loadingHero}>
        <div className={s.loadingHeroBody}>
          <div className={s.loadingPulse} aria-hidden />
          <div className={s.loadingCopy}>
            <h1 className={s.emptyTitle}>{title}</h1>
            <p className={s.emptyText}>{description}</p>
          </div>
        </div>
      </div>

      <div className={s.loadingPreviewCard} aria-hidden>
        <div className={s.loadingPreviewBar} />
        <div className={s.loadingPreviewGrid}>
          <div className={s.loadingPreviewBlock} />
          <div className={s.loadingPreviewBlock} />
          <div className={s.loadingPreviewWide} />
        </div>
      </div>
    </section>
  );
}
