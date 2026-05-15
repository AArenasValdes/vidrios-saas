"use client";

import dynamic from "next/dynamic";

import type { PublicPreviewQuote } from "./public-quote-preview";
import s from "./page.module.css";

const PublicQuotePreview = dynamic(
  () => import("./public-quote-preview").then((mod) => mod.PublicQuotePreview),
  {
    ssr: false,
    loading: () => (
      <article className={s.previewLoadingCard}>
        <p className={s.eyebrow}>Documento comercial</p>
        <h2 className={s.stateTitle}>Preparando vista completa</h2>
        <p className={s.stateText}>
          Cargamos propuesta detallada en segundo plano para acelerar apertura.
        </p>
      </article>
    ),
  }
);

type PublicQuotePreviewLoaderProps = {
  quote: PublicPreviewQuote;
};

export function PublicQuotePreviewLoader({
  quote,
}: PublicQuotePreviewLoaderProps) {
  return <PublicQuotePreview quote={quote} />;
}
