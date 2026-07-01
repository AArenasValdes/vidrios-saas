import "server-only";

import {
  buildActivacionAttentionRows,
  hasNoRecentActivity,
  isNewAccount,
  isTrialExpiringSoon,
  resolveActivacionStage,
} from "@/features/admin/services/admin-activacion-filters.service";
import { listAdminClients } from "@/features/admin/services/admin-clients.service";
import type {
  ActivacionFunnelStep,
  ActivacionKpi,
  ActivacionTimelineEvent,
  ActivacionWorkspace,
} from "@/features/admin/types/admin-activacion";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";

const MS_DAY = 24 * 60 * 60 * 1000;
const TIMELINE_DAYS = 30;

function buildKpis(clients: AdminClientListItem[]): ActivacionKpi[] {
  const realClients = clients.filter((client) => !client.isTestAccount);
  const newAccounts = realClients.filter((client) => isNewAccount(client));
  const noFirstQuote = realClients.filter(
    (client) =>
      client.cotizacionesCount === 0 && resolveActivacionStage(client) !== "activation_complete"
  );
  const quoteNoPdf = realClients.filter(
    (client) => client.cotizacionesCount > 0 && client.pdfsGeneradosCount === 0
  );
  const trialsAtRisk = realClients.filter(
    (client) => isTrialExpiringSoon(client) && hasNoRecentActivity(client)
  );
  const completed = realClients.filter((client) => client.pdfsGeneradosCount > 0);

  return [
    {
      id: "new_accounts",
      label: "Nuevas cuentas",
      value: newAccounts.length,
      displayValue: String(newAccounts.length),
      subtitle: "creadas en los últimos 7 días",
      insight: newAccounts.length > 0 ? "Entrada reciente al funnel" : "Sin altas recientes",
      tone: "blue",
      badge: newAccounts.length > 0 ? "Nuevas" : undefined,
    },
    {
      id: "no_first_quote",
      label: "Sin primera cotización",
      value: noFirstQuote.length,
      displayValue: String(noFirstQuote.length),
      subtitle: "requieren activación inicial",
      insight:
        noFirstQuote.length > 0
          ? `${noFirstQuote.length} cuentas sin cotización`
          : "Todas iniciaron cotización",
      tone: "violet",
      badge: noFirstQuote.length > 0 ? "Onboarding" : undefined,
    },
    {
      id: "quote_no_pdf",
      label: "Cotización sin PDF",
      value: quoteNoPdf.length,
      displayValue: String(quoteNoPdf.length),
      subtitle: "cerca del primer resultado",
      insight:
        quoteNoPdf.length > 0
          ? "Falta generar o compartir PDF"
          : "Sin cuentas en esta etapa",
      tone: "amber",
      badge: quoteNoPdf.length > 0 ? "Casi" : undefined,
    },
    {
      id: "trials_at_risk",
      label: "Trials en riesgo",
      value: trialsAtRisk.length,
      displayValue: String(trialsAtRisk.length),
      subtitle: "vencen pronto sin actividad",
      insight:
        trialsAtRisk.length > 0
          ? "Priorizar recordatorio"
          : "Sin trials en riesgo inmediato",
      tone: "red",
      badge: trialsAtRisk.length > 0 ? "Urgente" : undefined,
    },
    {
      id: "completed",
      label: "Activaciones completas",
      value: completed.length,
      displayValue: String(completed.length),
      subtitle: "primer PDF generado",
      insight:
        completed.length > 0
          ? "Cuentas con primer resultado"
          : "Aún sin activaciones completas",
      tone: "green",
      badge: completed.length > 0 ? "Logrado" : undefined,
    },
  ];
}

function buildFunnel(clients: AdminClientListItem[]): {
  steps: ActivacionFunnelStep[];
  dropStageId: string | null;
} {
  const realClients = clients.filter((client) => !client.isTestAccount);
  const total = realClients.length || 1;

  const accountAccess = realClients.length;
  const firstQuote = realClients.filter((client) => client.cotizacionesCount > 0).length;
  const firstPdf = realClients.filter((client) => client.pdfsGeneradosCount > 0).length;
  const activationComplete = realClients.filter(
    (client) =>
      client.pdfsGeneradosCount > 0 &&
      client.estadoEfectivo === "active" &&
      Boolean(client.ultimoPagoAt)
  ).length;

  const rawSteps: Array<{ id: ActivacionFunnelStep["id"]; label: string; count: number }> = [
    { id: "account_access", label: "Cuenta con acceso", count: accountAccess },
    { id: "first_quote", label: "Primera cotización creada", count: firstQuote },
    { id: "pdf_generated", label: "Primer PDF generado o enviado", count: firstPdf },
  ];

  if (activationComplete > 0 && activationComplete !== firstPdf) {
    rawSteps.push({
      id: "activation_complete",
      label: "Activación completa",
      count: activationComplete,
    });
  }

  let maxDrop = 0;
  let dropStageId: string | null = null;

  const steps: ActivacionFunnelStep[] = rawSteps.map((item, index) => {
    const previous = index === 0 ? item.count : rawSteps[index - 1]?.count ?? item.count;
    const conversionFromPrevious =
      index === 0 || previous === 0 ? null : Math.round((item.count / previous) * 100);

    if (index > 0 && previous > 0) {
      const drop = previous - item.count;
      if (drop > maxDrop) {
        maxDrop = drop;
        dropStageId = item.id;
      }
    }

    return {
      id: item.id,
      label: item.label,
      count: item.count,
      pct: Math.round((item.count / total) * 100),
      conversionFromPrevious,
      hasRealSignal: true,
    };
  });

  return { steps, dropStageId: maxDrop > 0 ? dropStageId : null };
}

function isWithinTimeline(iso: string | null, days = TIMELINE_DAYS) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= Date.now() - days * MS_DAY;
}

function buildRecentEvents(clients: AdminClientListItem[]): {
  events: ActivacionTimelineEvent[];
  limited: boolean;
} {
  const events: ActivacionTimelineEvent[] = [];

  for (const client of clients) {
    if (client.isTestAccount) continue;

    if (client.firstQuoteAt && isWithinTimeline(client.firstQuoteAt)) {
      events.push({
        id: `quote-${client.organizationId}-${client.firstQuoteAt}`,
        organizationId: client.organizationId,
        empresaNombre: client.empresaNombre,
        type: "first_quote",
        label: "Primera cotización creada",
        fecha: client.firstQuoteAt,
      });
    }

    if (client.firstPdfAt && isWithinTimeline(client.firstPdfAt)) {
      events.push({
        id: `pdf-${client.organizationId}-${client.firstPdfAt}`,
        organizationId: client.organizationId,
        empresaNombre: client.empresaNombre,
        type: "first_pdf",
        label: "Primer PDF generado",
        fecha: client.firstPdfAt,
      });
    }

    if (
      client.estadoEfectivo === "active" &&
      client.ultimoPagoAt &&
      isWithinTimeline(client.ultimoPagoAt) &&
      client.pdfsGeneradosCount > 0
    ) {
      events.push({
        id: `reactivated-${client.organizationId}-${client.ultimoPagoAt}`,
        organizationId: client.organizationId,
        empresaNombre: client.empresaNombre,
        type: "account_reactivated",
        label: "Cuenta reactivada con pago",
        fecha: client.ultimoPagoAt,
      });
    }
  }

  const sorted = events.sort(
    (left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime()
  );

  const deduped = sorted.filter(
    (event, index, array) => array.findIndex((item) => item.id === event.id) === index
  );

  return {
    events: deduped.slice(0, 12),
    limited: deduped.length === 0,
  };
}

export async function getAdminActivacionWorkspace(): Promise<ActivacionWorkspace> {
  const clients = await listAdminClients();
  const attentionRows = buildActivacionAttentionRows(clients);
  const { steps, dropStageId } = buildFunnel(clients);
  const { events, limited } = buildRecentEvents(clients);

  return {
    syncedAt: new Date().toISOString(),
    accounts: clients,
    attentionRows,
    kpis: buildKpis(clients),
    funnel: steps,
    funnelDropStageId: dropStageId,
    recentEvents: events,
    timelineLimited: limited,
  };
}
