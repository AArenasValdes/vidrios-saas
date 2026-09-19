"use client";

import s from "./fabricacion-mobile.module.css";

export function FabricacionLineLoadingSkeleton() {
  return (
    <main className={`${s.shell} ${s.page} ${s.loadingSkeleton}`} aria-busy="true">
      <header className={s.header}>
        <div className={s.skeletonBlock} data-variant="square" />
        <div className={s.skeletonHeaderCopy}>
          <div className={s.skeletonBlock} data-variant="line-short" />
          <div className={s.skeletonBlock} data-variant="line-long" />
        </div>
      </header>

      <section className={s.skeletonCard}>
        <div className={s.skeletonBlock} data-variant="line-short" />
        <div className={s.skeletonBlock} data-variant="price" />
        <div className={s.skeletonBlock} data-variant="line-long" />
      </section>

      <section className={s.skeletonCard}>
        <div className={s.skeletonBlock} data-variant="line-short" />
        <div className={s.skeletonBlock} data-variant="line-long" />
        <div className={s.skeletonBlock} data-variant="button" />
        <div className={s.skeletonBlock} data-variant="button-secondary" />
      </section>
    </main>
  );
}
