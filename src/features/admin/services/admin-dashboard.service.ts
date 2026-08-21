import "server-only";

import {
  listAdminOrganizationsSnapshot,
  type AdminOrganizationPaymentRow,
} from "@/features/admin/repositories/admin-clients.repository";
import {
  listAdminClientsFromSnapshot,
  type listAdminClients,
} from "@/features/admin/services/admin-clients.service";
import type {
  AdminDashboard,
  AdminDashboardActionItem,
  AdminDashboardActivityItem,
  AdminDashboardFocusItem,
  AdminDashboardHealthBucket,
  AdminDashboardWeeklyRevenue,
} from "@/features/admin/types/admin-dashboard";
import {
  buildMonthlyCashSummary,
  resolveSantiagoCalendarMonth,
} from "@/features/admin/services/admin-dashboard-metrics.logic";
import { mapDbStatusToUi } from "@/features/growth/services/growth-prospect-mapper";
import type { GrowthDbProspectStatus } from "@/features/growth/types/growth-supabase";
import { createAdminClient } from "@/lib/supabase/admin";

const MS_DAY = 24 * 60 * 60 * 1000;

type QuoteRow = {
  organization_id: number;
  creado_en: string;
  pdf_descargado_en: string | null;
};
type ProspectRow = {
  id: string;
  empresa: string;
  estado: GrowthDbProspectStatus;
  no_contactar: boolean;
  creado_en: string;
  actualizado_en: string;
  proxima_accion_en: string | null;
  converted_organization_id: number | null;
};
type TaskRow = {
  id: string;
  titulo: string;
  tipo: string;
  vence_en: string | null;
  creado_en: string;
};
type SolicitudRow = {
  id: number;
  nombre: string | null;
  creado_en: string;
  organization_id: number | null;
  contexto: string;
};
function pctChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function isWithinRange(iso: string | null, start: Date, end: Date) {
  if (!iso) {
    return false;
  }

  const time = new Date(iso).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function formatRelativeTime(iso: string | null) {
  if (!iso) {
    return "Sin registro";
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / MS_DAY);

  if (diffDays <= 0) {
    return "Hoy";
  }

  if (diffDays === 1) {
    return "Ayer";
  }

  return `Hace ${diffDays} días`;
}

function buildWeeklyRevenue(
  payments: AdminOrganizationPaymentRow[],
  testOrgIds: Set<number>,
  now: Date
): AdminDashboardWeeklyRevenue[] {
  const weeks: AdminDashboardWeeklyRevenue[] = [];

  for (let index = 3; index >= 0; index -= 1) {
    const weekEnd = new Date(now.getTime() - index * 7 * MS_DAY);
    const weekStart = new Date(weekEnd.getTime() - 7 * MS_DAY);
    const amountClp = payments.reduce((total, payment) => {
      if (payment.status !== "aprobado" || testOrgIds.has(Number(payment.organization_id))) {
        return total;
      }
      return isWithinRange(payment.paid_at ?? payment.creado_en, weekStart, weekEnd)
        ? total + Number(payment.amount_clp ?? 0)
        : total;
    }, 0);

    weeks.push({
      label: `Sem. ${4 - index}`,
      amountClp,
    });
  }

  return weeks;
}

function buildActionItems(input: {
  clients: Awaited<ReturnType<typeof listAdminClients>>;
  firstQuoteByOrg: Map<number, string>;
  prospects: ProspectRow[];
  tasks: TaskRow[];
}): AdminDashboardActionItem[] {
  const items: AdminDashboardActionItem[] = [];
  const now = Date.now();

  for (const client of input.clients) {
    if (client.isTestAccount) {
      continue;
    }

    const hasQuote = input.firstQuoteByOrg.has(client.organizationId);
    const trialEndsAt = client.trialEndsAt
      ? new Date(client.trialEndsAt).getTime()
      : null;
    const daysToTrialEnd =
      trialEndsAt !== null
        ? Math.ceil((trialEndsAt - now) / MS_DAY)
        : null;

    if (
      (client.estadoEfectivo === "trial_active" ||
        client.estadoEfectivo === "trial_expiring") &&
      !hasQuote
    ) {
      items.push({
        id: `trial-no-quote-${client.organizationId}`,
        priority: daysToTrialEnd !== null && daysToTrialEnd <= 3 ? "alta" : "media",
        empresa: client.empresaNombre,
        situacion: "Trial activo sin cotización",
        ultimaActividad: formatRelativeTime(client.trialEndsAt),
        proximaAccion: "Enviar WhatsApp",
        href: `/admin/clientes/${client.organizationId}`,
        actionLabel: "Contactar",
      });
    }

    if (
      client.estadoEfectivo === "trial_expiring" ||
      (daysToTrialEnd !== null && daysToTrialEnd <= 2 && daysToTrialEnd >= 0)
    ) {
      items.push({
        id: `trial-expiring-${client.organizationId}`,
        priority: "alta",
        empresa: client.empresaNombre,
        situacion:
          daysToTrialEnd !== null && daysToTrialEnd >= 0
            ? `Trial vence en ${daysToTrialEnd} días`
            : "Trial por vencer",
        ultimaActividad: formatRelativeTime(client.trialEndsAt),
        proximaAccion: "Recordar suscripción",
        href: `/admin/clientes/${client.organizationId}`,
        actionLabel: "Ver cuenta",
      });
    }

    if (
      client.estadoEfectivo === "trial_expired" ||
      client.estadoEfectivo === "past_due"
    ) {
      items.push({
        id: `expired-${client.organizationId}`,
        priority: "alta",
        empresa: client.empresaNombre,
        situacion: "Cuenta vencida",
        ultimaActividad: formatRelativeTime(client.subscriptionEndsAt),
        proximaAccion: "Registrar pago",
        href: `/admin/clientes/${client.organizationId}`,
        actionLabel: "Ver cuenta",
      });
    }
  }

  for (const task of input.tasks) {
    if (task.tipo !== "followup" || !task.vence_en) {
      continue;
    }

    if (new Date(task.vence_en).getTime() > now) {
      continue;
    }

    items.push({
      id: `followup-${task.id}`,
      priority: "alta",
      empresa: task.titulo,
      situacion: "Follow-up vencido",
      ultimaActividad: formatRelativeTime(task.vence_en),
      proximaAccion: "Retomar conversación",
      href: "/admin/tareas",
      actionLabel: "Ver seguimiento",
    });
  }

  for (const prospect of input.prospects) {
    if (prospect.no_contactar) {
      continue;
    }

    const uiStatus = mapDbStatusToUi(prospect.estado);
    if (uiStatus !== "demo_agendada" && uiStatus !== "respondio") {
      continue;
    }

    items.push({
      id: `prospect-${prospect.id}`,
      priority: uiStatus === "demo_agendada" ? "media" : "baja",
      empresa: prospect.empresa,
      situacion:
        uiStatus === "demo_agendada" ? "Pidió demo" : "Respondió, pendiente avanzar",
      ultimaActividad: formatRelativeTime(
        prospect.proxima_accion_en ?? prospect.actualizado_en
      ),
      proximaAccion:
        uiStatus === "demo_agendada" ? "Agendar reunión" : "Enviar propuesta",
      href: "/admin/prospectos",
      actionLabel: "Ver ficha",
    });
  }

  const priorityRank = { alta: 0, media: 1, baja: 2 };

  return items
    .sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority])
    .slice(0, 8);
}

function buildAccountHealth(
  clients: Awaited<ReturnType<typeof listAdminClients>>,
  firstQuoteByOrg: Map<number, string>
): AdminDashboardHealthBucket[] {
  const now = Date.now();
  let healthy = 0;
  let noQuote = 0;
  let inactive = 0;
  let expiringSoon = 0;
  let expired = 0;

  for (const client of clients) {
    if (client.isTestAccount) {
      continue;
    }

    if (client.estadoEfectivo === "active") {
      healthy += 1;
      continue;
    }

    if (
      client.estadoEfectivo === "trial_expired" ||
      client.estadoEfectivo === "past_due"
    ) {
      expired += 1;
      continue;
    }

    const hasQuote = firstQuoteByOrg.has(client.organizationId);
    const trialEndsAt = client.trialEndsAt
      ? new Date(client.trialEndsAt).getTime()
      : null;
    const daysToTrialEnd =
      trialEndsAt !== null
        ? Math.ceil((trialEndsAt - now) / MS_DAY)
        : null;

    if (
      (client.estadoEfectivo === "trial_active" ||
        client.estadoEfectivo === "trial_expiring") &&
      !hasQuote
    ) {
      noQuote += 1;
    }

    if (daysToTrialEnd !== null && daysToTrialEnd <= 7 && daysToTrialEnd >= 0) {
      expiringSoon += 1;
    }

    if (
      client.estadoEfectivo === "trial_active" &&
      hasQuote &&
      client.ultimoPagoAt === null
    ) {
      const quoteAt = firstQuoteByOrg.get(client.organizationId);
      if (quoteAt && Date.now() - new Date(quoteAt).getTime() > 14 * MS_DAY) {
        inactive += 1;
      }
    }
  }

  return [
    {
      id: "healthy",
      label: "Saludables",
      count: healthy,
      href: "/admin/clientes",
      tone: "success",
    },
    {
      id: "no-quote",
      label: "Sin primera cotización",
      count: noQuote,
      href: "/admin/clientes",
      tone: "warning",
    },
    {
      id: "inactive",
      label: "Sin actividad reciente",
      count: inactive,
      href: "/admin/clientes",
      tone: "neutral",
    },
    {
      id: "expiring",
      label: "Próximas a vencer",
      count: expiringSoon,
      href: "/admin/clientes",
      tone: "warning",
    },
    {
      id: "expired",
      label: "Vencidas",
      count: expired,
      href: "/admin/clientes",
      tone: "danger",
    },
  ];
}

function buildRecentActivity(input: {
  prospects: ProspectRow[];
  payments: AdminOrganizationPaymentRow[];
  solicitudes: SolicitudRow[];
  clients: Awaited<ReturnType<typeof listAdminClients>>;
  firstQuoteByOrg: Map<number, string>;
}): AdminDashboardActivityItem[] {
  const events: AdminDashboardActivityItem[] = [];

  for (const prospect of input.prospects.slice(0, 12)) {
    events.push({
      id: `prospect-${prospect.id}`,
      type: "prospecto_ventora",
      label: `Prospecto Ventora: ${prospect.empresa}`,
      at: prospect.creado_en,
      href: "/admin/prospectos",
    });
  }

  for (const client of input.clients.slice(0, 8)) {
    if (client.isTestAccount) {
      continue;
    }

    if (
      (client.estadoEfectivo === "trial_active" ||
        client.estadoEfectivo === "trial_expiring") &&
      client.trialEndsAt
    ) {
      events.push({
        id: `trial-${client.organizationId}`,
        type: "trial",
        label: `Trial activo: ${client.empresaNombre}`,
        at: client.trialEndsAt,
        href: `/admin/clientes/${client.organizationId}`,
      });
    }
  }

  for (const [organizationId, quoteAt] of input.firstQuoteByOrg.entries()) {
    const client = input.clients.find(
      (item) => item.organizationId === organizationId
    );
    events.push({
      id: `quote-${organizationId}`,
      type: "cotizacion",
      label: `Primera cotización: ${client?.empresaNombre ?? `Org ${organizationId}`}`,
      at: quoteAt,
      href: client ? `/admin/clientes/${organizationId}` : "/admin/clientes",
    });
  }

  for (const payment of input.payments) {
    if (payment.status !== "aprobado") {
      continue;
    }

    events.push({
      id: `payment-${payment.id}`,
      type: "pago",
      label: `Pago registrado: $${Number(payment.amount_clp).toLocaleString("es-CL")}`,
      at: payment.paid_at ?? payment.creado_en,
      href: `/admin/clientes/${payment.organization_id}`,
    });
  }

  for (const solicitud of input.solicitudes) {
    if (solicitud.contexto !== "empresa-publica" || !solicitud.organization_id) {
      continue;
    }

    const client = input.clients.find(
      (item) => item.organizationId === Number(solicitud.organization_id)
    );
    const empresaNombre = client?.empresaNombre ?? `Org ${solicitud.organization_id}`;
    const solicitante = solicitud.nombre?.trim() || "Solicitante";

    events.push({
      id: `solicitud-publica-${solicitud.id}`,
      type: "solicitud_publica",
      label: `Solicitud pública recibida para ${empresaNombre}`,
      subtitle: `${solicitante} · ${formatRelativeTime(solicitud.creado_en)}`,
      at: solicitud.creado_en,
      href: `/admin/clientes/${solicitud.organization_id}?solicitud=${solicitud.id}`,
      secondaryHref: `/admin/clientes/${solicitud.organization_id}`,
      secondaryLabel: "Ver cuenta",
    });
  }

  return events
    .filter((event) => Boolean(event.at))
    .sort(
      (left, right) =>
        new Date(right.at).getTime() - new Date(left.at).getTime()
    )
    .slice(0, 10);
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const admin = createAdminClient();
  const now = new Date();
  const month = resolveSantiagoCalendarMonth(now);
  const snapshotPromise = listAdminOrganizationsSnapshot();
  const clientsPromise = snapshotPromise.then(listAdminClientsFromSnapshot);

  const [clients, snapshot, prospectsResult, tasksResult, quotesResult, solicitudesResult] =
    await Promise.all([
      clientsPromise,
      snapshotPromise,
      admin
        .from("growth_prospects")
        .select(
          "id, empresa, estado, no_contactar, creado_en, actualizado_en, proxima_accion_en, converted_organization_id"
        )
        .is("eliminado_en", null)
        .order("actualizado_en", { ascending: false }),
      admin
        .from("growth_tasks")
        .select("id, titulo, tipo, vence_en, creado_en")
        .is("eliminado_en", null)
        .is("completada_en", null)
        .order("vence_en", { ascending: true }),
      admin
        .from("cotizaciones")
        .select("organization_id, creado_en, pdf_descargado_en")
        .is("eliminado_en", null)
        .order("creado_en", { ascending: true }),
      admin
        .from("solicitudes_contacto")
        .select("id, nombre, creado_en, organization_id, contexto")
        .eq("contexto", "empresa-publica")
        .order("creado_en", { ascending: false })
        .limit(12),
    ]);

  const testOrgIds = new Set(
    snapshot.profiles
      .filter((profile) => profile.is_test_account)
      .map((profile) => Number(profile.organization_id))
  );

  const revenue = buildMonthlyCashSummary({
    payments: snapshot.payments,
    testOrganizationIds: testOrgIds,
    month,
  });

  const firstQuoteByOrg = new Map<number, string>();
  const quotes = (quotesResult.data ?? []) as QuoteRow[];
  for (const quote of quotes) {
    const organizationId = Number(quote.organization_id);
    if (!firstQuoteByOrg.has(organizationId)) {
      firstQuoteByOrg.set(organizationId, quote.creado_en);
    }
  }

  const prospects = (prospectsResult.data ?? []) as ProspectRow[];
  const tasks = (tasksResult.data ?? []) as TaskRow[];
  const solicitudes = (solicitudesResult.data ?? []) as SolicitudRow[];

  const trialsWithoutQuote = clients.filter(
    (client) =>
      !client.isTestAccount &&
      (client.estadoEfectivo === "trial_active" ||
        client.estadoEfectivo === "trial_expiring") &&
      !firstQuoteByOrg.has(client.organizationId)
  ).length;

  const overdueFollowups = tasks.filter(
    (task) =>
      task.tipo === "followup" &&
      task.vence_en &&
      new Date(task.vence_en).getTime() <= Date.now()
  ).length;

  const upcomingPayments = clients.filter(
    (client) =>
      !client.isTestAccount &&
      (client.estadoEfectivo === "trial_expiring" ||
        client.estadoEfectivo === "trial_expired" ||
        client.estadoEfectivo === "past_due")
  ).length;

  const focusToday: AdminDashboardFocusItem[] = [
    {
      id: "followups",
      label: "Follow-ups urgentes",
      count: overdueFollowups,
      href: "/admin/tareas",
      actionLabel: "Ver seguimientos",
      tone: overdueFollowups > 0 ? "danger" : "info",
    },
    {
      id: "trials-no-quote",
      label: "Trials sin cotización",
      count: trialsWithoutQuote,
      href: "/admin/clientes",
      actionLabel: "Activar clientes",
      tone: trialsWithoutQuote > 0 ? "info" : "success",
    },
    {
      id: "payments",
      label: "Pagos próximos o vencidos",
      count: upcomingPayments,
      href: "/admin/clientes",
      actionLabel: "Revisar pagos",
      tone: upcomingPayments > 0 ? "success" : "info",
    },
  ];

  const quotesThisMonth = quotes.filter(
    (quote) =>
      !testOrgIds.has(Number(quote.organization_id)) &&
      isWithinRange(quote.creado_en, month.start, now)
  );
  const accountsToResolve = clients.filter(
    (client) =>
      !client.isTestAccount &&
      (client.estadoEfectivo === "trial_expiring" ||
        client.estadoEfectivo === "trial_expired" ||
        client.estadoEfectivo === "past_due")
  ).length;
  const activeProspects = prospects.filter(
    (prospect) =>
      !prospect.no_contactar &&
      !["sin_respuesta", "no_calza", "no_contactar", "pagado"].includes(prospect.estado)
  );
  const contactedProspects = activeProspects.filter((prospect) =>
    ["contactado", "respondio", "calificado", "demo_agendada", "piloto_activo", "activado"].includes(
      prospect.estado
    )
  );

  return {
    syncedAt: now.toISOString(),
    revenue: {
      label: month.label,
      previousLabel: month.previousLabel,
      collectedClp: revenue.collectedClp,
      previousMonthCollectedClp: revenue.previousMonthCollectedClp,
      changePct: pctChange(revenue.collectedClp, revenue.previousMonthCollectedClp),
      newSalesClp: revenue.newSalesClp,
      renewalsClp: revenue.renewalsClp,
      newCustomers: revenue.newCustomers,
      renewalPayments: revenue.renewalPayments,
    },
    focusToday,
    kpis: {
      clientesActivos: clients.filter(
        (client) => client.estadoEfectivo === "active" && !client.isTestAccount
      ).length,
      trialsActivos: clients.filter(
        (client) =>
          !client.isTestAccount &&
          (client.estadoEfectivo === "trial_active" ||
            client.estadoEfectivo === "trial_expiring")
      ).length,
      cuentasPorResolver: accountsToResolve,
      trialsSinCotizacion: trialsWithoutQuote,
    },
    productUsage: {
      quotesCreated: quotesThisMonth.length,
      pdfsGenerated: quotesThisMonth.filter((quote) => quote.pdf_descargado_en !== null).length,
      organizationsWithQuotes: new Set(
        quotesThisMonth.map((quote) => Number(quote.organization_id))
      ).size,
    },
    outboundProspecting: {
      activeProspects: activeProspects.length,
      contactedProspects: contactedProspects.length,
    },
    actionItems: buildActionItems({
      clients,
      firstQuoteByOrg,
      prospects,
      tasks,
    }),
    weeklyRevenue: buildWeeklyRevenue(snapshot.payments, testOrgIds, now),
    accountHealth: buildAccountHealth(clients, firstQuoteByOrg),
    recentActivity: buildRecentActivity({
      prospects,
      payments: snapshot.payments,
      solicitudes,
      clients,
      firstQuoteByOrg,
    }),
  };
}
