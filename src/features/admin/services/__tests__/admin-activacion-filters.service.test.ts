import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import {
  buildActivacionAttentionRow,
  buildActivacionAttentionRows,
  needsActivacionAttention,
  parseActivacionFiltersFromSearchParams,
  resolveActivacionStage,
} from "@/features/admin/services/admin-activacion-filters.service";

function buildClient(partial: Partial<AdminClientListItem>): AdminClientListItem {
  return {
    organizationId: 1,
    empresaNombre: "Vidriería Demo",
    nombrePrincipal: "Usuario Demo",
    correoPrincipal: "demo@test.com",
    telefonoPrincipal: "+56912345678",
    whatsappPrincipal: "+56912345678",
    ciudadComuna: "Santiago",
    planCode: "trial",
    planLabel: "Prueba gratis",
    estadoSuscripcion: "trial_active",
    estadoEfectivo: "trial_active",
    trialEndsAt: "2026-07-05T00:00:00.000Z",
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
    createdAt: "2026-06-20T00:00:00.000Z",
    publicPageUrl: null,
    publicChannel: {
      pageStatusLabel: "No configurada",
      solicitudesLast30Days: 0,
      lastSolicitudLabel: null,
      solicitudesPending: 0,
    },
    ...partial,
  };
}

describe("admin-activacion-filters.service", () => {
  it("clasifica cuenta sin cotización como accionable", () => {
    const client = buildClient({
      cotizacionesCount: 0,
      correoPrincipal: null,
      telefonoPrincipal: null,
      publicPageActive: false,
      trialEndsAt: "2026-12-31T00:00:00.000Z",
    });
    expect(resolveActivacionStage(client)).toBe("account_created");
    expect(needsActivacionAttention(client)).toBe(true);
    const row = buildActivacionAttentionRow(client);
    expect(row?.bloqueo).toBe("No ha iniciado una cotización");
    expect(row?.primaryAction).toBe("activate_account");
  });

  it("clasifica cotización sin PDF como guiar envío", () => {
    const client = buildClient({
      cotizacionesCount: 2,
      pdfsGeneradosCount: 0,
      firstQuoteAt: "2026-06-21T00:00:00.000Z",
      lastActivityAt: "2026-06-21T00:00:00.000Z",
      trialEndsAt: "2026-12-31T00:00:00.000Z",
    });
    expect(resolveActivacionStage(client)).toBe("first_quote");
    const row = buildActivacionAttentionRow(client);
    expect(row?.primaryAction).toBe("guide_send");
    expect(row?.bloqueo).toBe("Aún no llega al primer resultado");
  });

  it("excluye activación completa salvo cliente activo sin actividad", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const stale = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const complete = buildClient({
      cotizacionesCount: 3,
      pdfsGeneradosCount: 2,
      firstPdfAt: recent,
      lastActivityAt: recent,
      estadoEfectivo: "active",
      ultimoPagoAt: recent,
    });
    expect(resolveActivacionStage(complete)).toBe("activation_complete");
    expect(buildActivacionAttentionRow(complete)).toBeNull();

    const staleActive = buildClient({
      cotizacionesCount: 3,
      pdfsGeneradosCount: 2,
      firstPdfAt: stale,
      lastActivityAt: stale,
      estadoEfectivo: "active",
      ultimoPagoAt: stale,
    });
    const postRow = buildActivacionAttentionRow(staleActive);
    expect(postRow?.segment).toBe("post_activation");
    expect(postRow?.primaryAction).toBe("contact");
  });

  it("ordena filas accionables priorizando trials vencidos", () => {
    const rows = buildActivacionAttentionRows([
      buildClient({ organizationId: 1, cotizacionesCount: 0 }),
      buildClient({
        organizationId: 2,
        estadoEfectivo: "trial_expired",
        cotizacionesCount: 0,
      }),
    ]);
    expect(rows[0]?.organizationId).toBe(2);
  });

  it("parsea params vacíos con arrays iterables", () => {
    const parsed = parseActivacionFiltersFromSearchParams(new URLSearchParams());
    expect(Array.isArray(parsed.stages)).toBe(true);
    expect(parsed.stages).toEqual([]);
    expect(parsed.accountStatuses).toEqual([]);
    expect(parsed.view).toBe("activation");
  });

  it("separa filas de activación y seguimiento post-activación", () => {
    const rows = buildActivacionAttentionRows([
      buildClient({ organizationId: 1, cotizacionesCount: 0 }),
      buildClient({
        organizationId: 2,
        cotizacionesCount: 2,
        pdfsGeneradosCount: 1,
        estadoEfectivo: "active",
        ultimoPagoAt: "2026-05-01T00:00:00.000Z",
        lastActivityAt: "2026-05-01T00:00:00.000Z",
      }),
    ]);

    expect(rows.find((row) => row.organizationId === 1)?.segment).toBe("activation");
    expect(rows.find((row) => row.organizationId === 2)?.segment).toBe("post_activation");
  });
});
