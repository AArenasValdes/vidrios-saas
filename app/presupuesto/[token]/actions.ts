"use server";

import { redirect } from "next/navigation";

import { publicCotizacionApprovalService } from "@/services/public-cotizacion-approval.service";

export async function acceptPublicQuoteAction(token: string) {
  await publicCotizacionApprovalService.accept(token);
  redirect(`/presupuesto/${token}?decision=aceptada`);
}

export async function rejectPublicQuoteAction(token: string) {
  await publicCotizacionApprovalService.reject(token);
  redirect(`/presupuesto/${token}?decision=rechazada`);
}
