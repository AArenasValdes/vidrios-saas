import s from "./page.module.css";

export default function SolicitudesLoading() {
  return (
    <main className={s.root} aria-busy="true" aria-label="Cargando solicitudes">
      <section className={s.mobileHeader}>
        <p className={s.mobileTitle}>Solicitudes</p>
        <p className={s.mobileSubtitle}>Cargando consultas…</p>
      </section>
      <section className={s.loadingList}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`solicitud-route-skeleton-${index}`} className={s.loadingCard}>
            <div className={s.loadingCardTop}>
              <span className={s.loadingAvatar} aria-hidden />
              <div className={s.loadingIdentity}>
                <span className={s.loadingLineStrong} aria-hidden />
                <span className={s.loadingLine} aria-hidden />
              </div>
              <span className={s.loadingPill} aria-hidden />
            </div>
            <span className={s.loadingLineWide} aria-hidden />
          </div>
        ))}
      </section>
    </main>
  );
}
