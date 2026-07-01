import {
  dedupeAdminTasks,
  deriveActivacionTasks,
  derivePaymentTasks,
  derivePublicChannelActionTasks,
} from "@/features/admin/services/admin-tareas-derivation.service";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { PlanCode } from "@/features/subscriptions/types/subscription";
import type { AdminPublicChannelSummary } from "@/features/admin/types/admin-public-channel";
import type { PublicSolicitudRow } from "@/features/admin/services/admin-public-channel.logic";
import type { AdminPaymentActionRow } from "@/features/admin/types/admin-payments";

describe("admin-tareas-derivation.service", () => {
  it("deduplica tareas del mismo organization_id priorizando pagos", () => {
    const paymentRow: AdminPaymentActionRow = {
      id: "payment-1",
      paymentId: 10,
      organizationId: 42,
      empresaNombre: "Vidriería Rivera",
      correo: "demo@test.com",
      paymentStatus: "pendiente",
      accountStatus: "trial_active",
      planLabel: "Founder",
      amountClp: 8990,
      paymentProvider: "manual",
      reference: "TRX-1",
      fecha: "2026-06-20T00:00:00.000Z",
      situation: "Pago informado, falta confirmar",
      proximaAccion: "Confirmar pago recibido",
      primaryAction: "confirm",
      whatsappUrl: null,
      publicPageUrl: null,
      isTestAccount: false,
    };

    const tasks = dedupeAdminTasks([
      ...derivePaymentTasks([paymentRow]),
      ...deriveActivacionTasks([
        {
          id: "activacion-42",
          organizationId: 42,
          empresaNombre: "Vidriería Rivera",
          correo: "demo@test.com",
          accountStatus: "trial_active",
          stage: "first_quote",
          stageLabel: "Primera cotización",
          segment: "activation",
          usageLabel: "2 cotiz.",
          lastActivityLabel: "Hoy",
          expiryLabel: "Trial",
          bloqueo: "Aún no llega al primer resultado",
          proximaAccion: "Guiar envío del PDF",
          primaryAction: "guide_send",
          whatsappUrl: null,
          publicPageUrl: null,
          cotizacionesCount: 2,
          pdfsGeneradosCount: 0,
          isTestAccount: false,
        },
      ]),
    ]);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.origin).toBe("pagos");
  });

  it("clasifica solicitudes públicas como origen solicitud_publica con empresa cliente", () => {
    const client: AdminClientListItem = {
      organizationId: 7,
      empresaNombre: "Dimasoli",
      correoPrincipal: "demo@dimasoli.cl",
      telefonoPrincipal: null,
      planCode: "founder_monthly" as PlanCode,
      planLabel: "Founder",
      estadoSuscripcion: "trial_active",
      estadoEfectivo: "trial_active",
      trialEndsAt: "2026-07-01T00:00:00.000Z",
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
      publicPageActive: true,
      createdAt: "2026-05-01T00:00:00.000Z",
      publicPageUrl: "/solicitud/dimasoli",
      publicChannel: {
        pageStatusLabel: "Publicada",
        solicitudesLast30Days: 1,
        lastSolicitudLabel: "1 solicitud · última hace 3 días",
        solicitudesPending: 1,
      },
    };

    const summary: AdminPublicChannelSummary = {
      pageStatus: "publicada",
      pageStatusLabel: "Publicada",
      slug: "dimasoli",
      publicPageUrl: "/solicitud/dimasoli",
      solicitudesTotal: 1,
      solicitudesLast30Days: 1,
      solicitudesPending: 1,
      lastSolicitudAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      lastSolicitanteNombre: "Macarena",
      oldestPendingAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      whatsappConfigured: true,
      formActive: true,
      companyDataComplete: true,
      scheduleConfigured: false,
      recommendedStatus: "Requiere revisar solicitudes",
      quotesFromRequestsAvailable: false,
    };

    const solicitudes = new Map<number, PublicSolicitudRow[]>([
      [
        7,
        [
          {
            id: "sol-1",
            nombre: "Macarena",
            organization_id: 7,
            contexto: "empresa-publica",
            estado: "nueva",
            creado_en: summary.lastSolicitudAt!,
            ayuda: null,
            contactada_at: null,
          },
        ],
      ],
    ]);

    const tasks = derivePublicChannelActionTasks(
      [client],
      new Map([[7, summary]]),
      solicitudes
    );

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.origin).toBe("solicitud_publica");
    expect(tasks[0]?.empresaNombre).toBe("Dimasoli");
    expect(tasks[0]?.contactoLabel).toBe("Macarena");
    expect(tasks[0]?.title).toBe("Solicitud pública recibida");
    expect(tasks[0]?.contexto).toContain("Macarena");
    expect(tasks[0]?.contexto).toContain("Dimasoli");
    expect(tasks[0]?.dueLabel).toMatch(/^Sin revisar · hace \d+ día/);
    expect(tasks[0]?.dueLabel).not.toContain("Venció");
  });
});
