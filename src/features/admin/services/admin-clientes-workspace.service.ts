import type { AdminClientDetail } from "@/features/admin/types/admin-client";

export {
  buildClientesAttentionRows,
  buildClientesKpis,
  formatStatusLabel,
  pluralizeCotizaciones,
  formatOperationalExpiry,
  formatRelativeActivity,
  type ClientesAttentionRow,
} from "@/features/admin/services/admin-clientes-filters.service";

const MS_DAY = 24 * 60 * 60 * 1000;

export function buildRecommendedAction(client: AdminClientDetail) {
  const whatsappUrl = client.quickLinks.whatsappUrl;

  if (client.subscription.effectiveStatus === "trial_expired") {
    return {
      title: "Trial vencido",
      detail:
        client.usage.cotizacionesCount === 0
          ? "Trial vencido sin cotizaciones: sugerir contacto por WhatsApp."
          : "Trial vencido con uso: contactar para conversión.",
      ctaLabel: client.usage.cotizacionesCount === 0 ? "Enviar WhatsApp" : "Registrar pago",
      ctaType: client.usage.cotizacionesCount === 0 ? "whatsapp" : "payment",
      whatsappUrl,
    } as const;
  }

  if (
    client.subscription.effectiveStatus === "past_due" ||
    client.subscription.effectiveStatus === "cancelled"
  ) {
    return {
      title: "Suscripción vencida",
      detail: "Cuenta con suscripción vencida: registrar pago o reactivar.",
      ctaLabel: "Registrar pago",
      ctaType: "payment",
      whatsappUrl,
    } as const;
  }

  if (client.subscription.effectiveStatus === "trial_expiring") {
    return {
      title: "Trial por vencer",
      detail: "Trial vence pronto: sugerir recordatorio y cierre.",
      ctaLabel: "Extender trial",
      ctaType: "extend",
      whatsappUrl,
    } as const;
  }

  if (client.usage.cotizacionesCount === 0) {
    return {
      title: "Sin primera cotización",
      detail: "La cuenta aún no genera valor en producto.",
      ctaLabel: whatsappUrl ? "Enviar WhatsApp" : "Ver cotizaciones",
      ctaType: whatsappUrl ? "whatsapp" : "detail",
      whatsappUrl,
    } as const;
  }

  if (
    client.usage.lastActivityAt &&
    Date.now() - new Date(client.usage.lastActivityAt).getTime() > 14 * MS_DAY
  ) {
    return {
      title: "Sin actividad reciente",
      detail: "Cliente activo sin uso reciente: sugerir seguimiento.",
      ctaLabel: whatsappUrl ? "Enviar WhatsApp" : "Ver ficha",
      ctaType: whatsappUrl ? "whatsapp" : "detail",
      whatsappUrl,
    } as const;
  }

  if (client.subscription.effectiveStatus === "active") {
    return {
      title: "Cuenta en buen estado",
      detail: "Cliente pagado y activo: sin acción urgente.",
      ctaLabel: "Ver cotizaciones",
      ctaType: "detail",
      whatsappUrl,
    } as const;
  }

  return {
    title: "Seguimiento recomendado",
    detail: "Revisar estado comercial y próximo paso.",
    ctaLabel: "Ver ficha",
    ctaType: "detail",
    whatsappUrl,
  } as const;
}

export type ClientActivityEvent = {
  id: string;
  label: string;
  at: string;
};

export function buildClientActivityTimeline(client: AdminClientDetail): ClientActivityEvent[] {
  const events: ClientActivityEvent[] = [];

  if (client.createdAt) {
    events.push({ id: "created", label: "Cuenta creada", at: client.createdAt });
  }

  if (client.subscription.trialStartedAt) {
    events.push({
      id: "trial-start",
      label: "Trial iniciado",
      at: client.subscription.trialStartedAt,
    });
  }

  if (client.usage.firstQuoteAt) {
    events.push({
      id: "first-quote",
      label: "Primera cotización",
      at: client.usage.firstQuoteAt,
    });
  }

  if (client.usage.lastActivityAt && client.usage.lastActivityAt !== client.usage.firstQuoteAt) {
    events.push({
      id: "last-quote",
      label: "Última cotización",
      at: client.usage.lastActivityAt,
    });
  }

  for (const payment of client.payments) {
    if (payment.status === "aprobado") {
      events.push({
        id: `payment-${payment.id}`,
        label: `Pago registrado · ${payment.planCode}`,
        at: payment.paidAt ?? payment.createdAt,
      });
    }
  }

  if (client.profile.solicitudPublicaSlug) {
    events.push({
      id: "public-page",
      label: "Página pública configurada",
      at: client.updatedAt ?? client.createdAt ?? new Date().toISOString(),
    });
  }

  if (client.subscription.effectiveStatus === "trial_expired") {
    events.push({
      id: "trial-expired",
      label: "Trial vencido",
      at:
        client.subscription.trialEndsAt ??
        client.updatedAt ??
        new Date().toISOString(),
    });
  }

  if (
    client.subscription.effectiveStatus === "past_due" ||
    client.subscription.effectiveStatus === "cancelled"
  ) {
    events.push({
      id: "subscription-expired",
      label: "Suscripción vencida",
      at:
        client.subscription.subscriptionEndsAt ??
        client.updatedAt ??
        new Date().toISOString(),
    });
  }

  return events.sort(
    (left, right) => new Date(right.at).getTime() - new Date(left.at).getTime()
  );
}

export type ClientHealthTone = "healthy" | "activation" | "risk" | "expired";

export function resolveClientHealth(client: {
  estadoEfectivo: AdminClientDetail["subscription"]["effectiveStatus"];
  cotizacionesCount: number;
  lastActivityAt: string | null;
}): {
  label: string;
  tone: ClientHealthTone;
} {
  if (client.estadoEfectivo === "active") {
    return { label: "Saludable", tone: "healthy" };
  }

  if (client.estadoEfectivo === "trial_expired") {
    return { label: "Trial vencido", tone: "expired" };
  }

  if (client.estadoEfectivo === "past_due" || client.estadoEfectivo === "cancelled") {
    return { label: "Suscripción vencida", tone: "expired" };
  }

  if (client.cotizacionesCount === 0) {
    return { label: "Requiere activación", tone: "activation" };
  }

  if (
    client.estadoEfectivo === "trial_expiring" ||
    (client.lastActivityAt &&
      Date.now() - new Date(client.lastActivityAt).getTime() > 14 * MS_DAY)
  ) {
    return { label: "En riesgo", tone: "risk" };
  }

  return { label: "Seguimiento", tone: "risk" };
}
