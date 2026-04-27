import { notFound } from "next/navigation";

import { publicCotizacionApprovalService } from "@/features/cotizaciones/public-approval/services/public-cotizacion-approval.service";

import { PublicQuoteDocument } from "./public-quote-document";

export default async function PresupuestoPublicoDocumentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ download?: string; embed?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const quote = await publicCotizacionApprovalService.resolveByToken(token);

  if (!quote) {
    notFound();
  }

  return (
    <PublicQuoteDocument
      quote={quote}
      backHref={`/presupuesto/${token}`}
      downloadOnLoad={query.download === "1"}
      embedded={query.embed === "1"}
    />
  );
}
