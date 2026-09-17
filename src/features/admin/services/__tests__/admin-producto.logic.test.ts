import {
  buildProductoAccountRows,
  buildProductoBottlenecks,
  buildProductoFunnel,
  buildProductoKpis,
  buildProductoQuoteUsage,
  buildProductoSetupSteps,
  countIncompleteSetupAccounts,
} from "@/features/admin/services/admin-producto.logic";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { AdminPublicChannelSummary } from "@/features/admin/types/admin-public-channel";

const period = {
  preset: "30d" as const,
  start: "2026-06-01T00:00:00.000Z",
  end: "2026-06-30T23:59:59.999Z",
  previousStart: "2026-05-01T00:00:00.000Z",
  previousEnd: "2026-05-31T23:59:59.999Z",
  label: "Últimos 30 días",
};

function client(partial: Partial<AdminClientListItem> & Pick<AdminClientListItem, "organizationId">) {
  return {
    organizationId: partial.organizationId,
    empresaNombre: partial.empresaNombre ?? "Vidrios Demo",
    nombrePrincipal: null,
    correoPrincipal: null,
    telefonoPrincipal: "+56912345678",
    whatsappPrincipal: null,
    ciudadComuna: null,
    planCode: null,
    planLabel: "Trial",
    estadoSuscripcion: null,
    estadoEfectivo: "trial_active",
    trialEndsAt: null,
    subscriptionEndsAt: null,
    ultimoPagoAt: null,
    ultimoPagoMontoClp: null,
    ultimoPagoFuente: "sistema",
    isTestAccount: false,
    cotizacionesCount: 0,
    pdfsGeneradosCount: 0,
    clientesRegistradosCount: 0,
    firstQuoteAt: null,
    firstPdfAt: null,
    lastActivityAt: null,
    publicPageActive: false,
    createdAt: null,
    publicPageUrl: null,
    publicChannel: {
      pageStatusLabel: "No configurada",
      solicitudesLast30Days: 0,
      lastSolicitudLabel: null,
      solicitudesPending: 0,
    },
    ...partial,
  } satisfies AdminClientListItem;
}

describe("admin-producto.logic", () => {
  it("agrega uso móvil, PC, guiada y constructor", () => {
    const usage = buildProductoQuoteUsage([
      {
        organizationId: 1,
        pricingMode: "por_item",
        creationSurface: "mobile_guiada",
        pdfDownloadedAt: null,
        solicitudId: null,
        creadoEn: "2026-06-10",
      },
      {
        organizationId: 1,
        pricingMode: "por_item",
        creationSurface: "desktop_constructor",
        pdfDownloadedAt: "2026-06-11",
        solicitudId: null,
        creadoEn: "2026-06-11",
      },
      {
        organizationId: 2,
        pricingMode: "total_global",
        creationSurface: "total_global",
        pdfDownloadedAt: null,
        solicitudId: null,
        creadoEn: "2026-06-12",
      },
    ]);

    expect(usage.mobileQuotes).toBe(1);
    expect(usage.desktopQuotes).toBe(1);
    expect(usage.guidedQuotes).toBe(1);
    expect(usage.constructorQuotes).toBe(1);
    expect(usage.totalGlobalQuotes).toBe(1);
  });

  it("calcula KPIs de setup incompleto", () => {
    const usage = buildProductoQuoteUsage([]);
    const kpis = buildProductoKpis({
      usage,
      period,
      incompleteSetupAccounts: 4,
      solicitudesInPeriod: 2,
    });

    expect(kpis.find((kpi) => kpi.id === "setup_incomplete")?.value).toBe(4);
    expect(kpis.find((kpi) => kpi.id === "public_requests")?.value).toBe(2);
  });

  it("detecta la mayor caída del embudo", () => {
    const clients = [
      client({ organizationId: 1, cotizacionesCount: 1, pdfsGeneradosCount: 0 }),
      client({ organizationId: 2, cotizacionesCount: 1, pdfsGeneradosCount: 0 }),
      client({ organizationId: 3, cotizacionesCount: 0 }),
    ];
    const summaries = new Map<number, AdminPublicChannelSummary>();

    const funnel = buildProductoFunnel({
      clients,
      summaries,
      solicitudesByOrg: new Map(),
      quotesByOrg: new Map(),
      orgsWithQuoteFromRequest: new Set(),
    });

    expect(funnel.dropStageId).toBe("pdf_generated");
    expect(funnel.insight).toContain("Primer PDF");
  });

  it("construye setup desde perfil y onboarding", () => {
    const steps = buildProductoSetupSteps({
      client: client({
        organizationId: 9,
        empresaNombre: "Taller",
        telefonoPrincipal: "+56911111111",
        pdfsGeneradosCount: 1,
      }),
      summary: {
        pageStatus: "publicada",
        pageStatusLabel: "Publicada",
        slug: "taller",
        publicPageUrl: "/solicitud/taller",
        solicitudesTotal: 1,
        solicitudesLast30Days: 1,
        solicitudesPending: 0,
        lastSolicitudAt: "2026-06-01",
        lastSolicitanteNombre: "Ana",
        oldestPendingAt: null,
        whatsappConfigured: true,
        formActive: true,
        companyDataComplete: true,
        scheduleConfigured: false,
        recommendedStatus: "Tiene solicitudes recientes",
        quotesFromRequestsAvailable: false,
      },
      onboardingRows: [{ organizationId: 9, stepKey: "channel_ready", estado: "completado" }],
      lineTemplatesCount: 2,
      solicitudesTotal: 1,
    });

    expect(steps.filter((step) => step.completed).map((step) => step.key)).toEqual([
      "company",
      "pdf",
      "page",
      "channels",
      "first_lead",
      "lines",
    ]);
  });

  it("excluye cuentas de prueba en filas accionables", () => {
    const rows = buildProductoAccountRows({
      clients: [
        client({ organizationId: 1, isTestAccount: true, cotizacionesCount: 5 }),
        client({ organizationId: 2, cotizacionesCount: 1 }),
      ],
      summaries: new Map(),
      solicitudesByOrg: new Map(),
      quotesByOrg: new Map(),
      onboardingRows: [],
      lineTemplatesByOrg: new Map(),
      orgsWithQuoteFromRequest: new Set(),
      period,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.organizationId).toBe(2);
  });

  it("prioriza cuellos de botella con mayor conteo", () => {
    const accounts = buildProductoAccountRows({
      clients: [
        client({ organizationId: 1, cotizacionesCount: 2, pdfsGeneradosCount: 0 }),
        client({ organizationId: 2, cotizacionesCount: 0 }),
        client({
          organizationId: 3,
          cotizacionesCount: 0,
          publicChannel: {
            pageStatusLabel: "Publicada",
            solicitudesLast30Days: 2,
            lastSolicitudLabel: "Hoy",
            solicitudesPending: 1,
          },
        }),
      ],
      summaries: new Map([
        [
          3,
          {
            pageStatus: "publicada",
            pageStatusLabel: "Publicada",
            slug: "demo",
            publicPageUrl: "/solicitud/demo",
            solicitudesTotal: 2,
            solicitudesLast30Days: 2,
            solicitudesPending: 1,
            lastSolicitudAt: "2026-06-01",
            lastSolicitanteNombre: "Ana",
            oldestPendingAt: null,
            whatsappConfigured: true,
            formActive: true,
            companyDataComplete: true,
            scheduleConfigured: false,
            recommendedStatus: "Tiene solicitudes recientes",
            quotesFromRequestsAvailable: false,
          },
        ],
      ]),
      solicitudesByOrg: new Map([
        [
          3,
          [
            {
              id: "s1",
              nombre: "Ana",
              organization_id: 3,
              contexto: "empresa-publica",
              estado: "nueva",
              creado_en: "2026-06-01",
              ayuda: null,
              contactada_at: null,
            },
          ],
        ],
      ]),
      quotesByOrg: new Map([
        [1, [{ organizationId: 1, pricingMode: "por_item", creationSurface: "mobile_guiada", pdfDownloadedAt: null, solicitudId: null, creadoEn: "2026-06-01" }]],
      ]),
      onboardingRows: [],
      lineTemplatesByOrg: new Map(),
      orgsWithQuoteFromRequest: new Set(),
      period,
    });

    const bottlenecks = buildProductoBottlenecks({ accounts });
    expect(bottlenecks.length).toBeGreaterThan(0);
    expect(bottlenecks[0]?.count).toBeGreaterThanOrEqual(bottlenecks[1]?.count ?? 0);
    expect(countIncompleteSetupAccounts(accounts)).toBeGreaterThan(0);
  });
});
