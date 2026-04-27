import s from "./loading.module.css";

export default function Loading() {
  return (
    <main className={s.page} aria-live="polite">
      <div className={s.previewShell} aria-hidden>
        <div className={s.previewPage}>
          <div className={s.previewHeader} />
          <div className={s.previewRow} />
          <div className={s.previewRowShort} />
          <div className={s.previewBlock} />
          <div className={s.previewBlockTall} />
        </div>
      </div>

      <div className={s.floatingCard}>
        <div className={s.brandMark}>PDF</div>
        <div className={s.copy}>
          <strong>Abriendo visor PDF</strong>
          <span>Preparando la hoja final</span>
        </div>
        <div className={s.dots} aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}
