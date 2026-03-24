"use server";

import { redirect } from "next/navigation";

import { publicCotizacionApprovalService } from "@/services/public-cotizacion-approval.service";
import { webPushNotificationsService } from "@/services/web-push-notifications.service";

export async function acceptPublicQuoteAction(token: string) {
  const current = await publicCotizacionApprovalService.resolveByToken(token);
  const shouldNotify = Boolean(current?.canRespond && !current.isExpired);
  const quote = await publicCotizacionApprovalService.accept(token);

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

  redirect(`/presupuesto/${token}?decision=aceptada`);
}

export async function rejectPublicQuoteAction(token: string) {
  const current = await publicCotizacionApprovalService.resolveByToken(token);
  const shouldNotify = Boolean(current?.canRespond && !current.isExpired);
  const quote = await publicCotizacionApprovalService.reject(token);

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

  redirect(`/presupuesto/${token}?decision=rechazada`);
}
