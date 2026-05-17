"use server";

import { redirect } from "next/navigation";

import {
  publicCotizacionApprovalService,
  revalidatePublicApprovalQuotesCache,
} from "@/features/cotizaciones/public-approval/services/public-cotizacion-approval.service";
import { webPushNotificationsService } from "@/features/notificaciones/services/web-push-notifications.service";

export async function acceptPublicQuoteAction(token: string) {
  const current = await publicCotizacionApprovalService.resolveByToken(token);
  const shouldNotify = Boolean(current?.canRespond && !current.isExpired);
  const quote = await publicCotizacionApprovalService.accept(token);
  const redirectToken = encodeURIComponent(token);

  if (shouldNotify && quote) {
    try {
      await webPushNotificationsService.sendQuoteDecisionPush({
        organizationId: quote.organizationId,
        cotizacionId: quote.id,
        codigo: quote.codigo,
        clienteNombre: quote.clienteNombre,
        decision: "aprobada",
      });
    } catch (error) {
      console.error("No pudimos enviar el push de aprobacion.", error);
    }
  }

  if (typeof revalidatePublicApprovalQuotesCache === "function") {
    revalidatePublicApprovalQuotesCache();
  }

  redirect(`/presupuesto/${redirectToken}?decision=aceptada`);
}

export async function rejectPublicQuoteAction(token: string) {
  const current = await publicCotizacionApprovalService.resolveByToken(token);
  const shouldNotify = Boolean(current?.canRespond && !current.isExpired);
  const quote = await publicCotizacionApprovalService.reject(token);
  const redirectToken = encodeURIComponent(token);

  if (shouldNotify && quote) {
    try {
      await webPushNotificationsService.sendQuoteDecisionPush({
        organizationId: quote.organizationId,
        cotizacionId: quote.id,
        codigo: quote.codigo,
        clienteNombre: quote.clienteNombre,
        decision: "rechazada",
      });
    } catch (error) {
      console.error("No pudimos enviar el push de rechazo.", error);
    }
  }

  if (typeof revalidatePublicApprovalQuotesCache === "function") {
    revalidatePublicApprovalQuotesCache();
  }

  redirect(`/presupuesto/${redirectToken}?decision=rechazada`);
}
