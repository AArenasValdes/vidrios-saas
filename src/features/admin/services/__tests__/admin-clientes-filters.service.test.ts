import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import {
  EMPTY_CLIENTES_FILTERS,
  filterAndSortClientesList,
  matchesClientesFilters,
  type ClientesFiltersState,
} from "@/features/admin/services/admin-clientes-filters.service";

function buildClient(partial: Partial<AdminClientListItem>): AdminClientListItem {
  return {
    organizationId: 1,
    empresaNombre: "Empresa",
    correoPrincipal: "a@test.com",
    telefonoPrincipal: null,
    planCode: "founder_full",
    planLabel: "Founder",
    estadoSuscripcion: "active",
    estadoEfectivo: "active",
    trialEndsAt: null,
    subscriptionEndsAt: "2027-06-18T00:00:00.000Z",
    ultimoPagoAt: "2026-01-01T00:00:00.000Z",
    ultimoPagoMontoClp: 79990,
    ultimoPagoFuente: "manual",
    isTestAccount: false,
    cotizacionesCount: 0,
    pdfsGeneradosCount: 0,
    clientesRegistradosCount: 0,
    firstQuoteAt: null,
    lastActivityAt: null,
    publicPageActive: false,
    createdAt: "2026-01-01T00:00:00.000Z",
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

describe("admin-clientes-filters.service", () => {
  it("combina Real AND Activa AND Sin primera cotización", () => {
    const clients = [
      buildClient({ organizationId: 1, estadoEfectivo: "active", cotizacionesCount: 0 }),
      buildClient({ organizationId: 2, estadoEfectivo: "active", cotizacionesCount: 3 }),
      buildClient({
        organizationId: 3,
        estadoEfectivo: "trial_active",
        cotizacionesCount: 0,
      }),
      buildClient({
        organizationId: 4,
        estadoEfectivo: "active",
        cotizacionesCount: 0,
        isTestAccount: true,
      }),
    ];

    const filters: ClientesFiltersState = {
      ...EMPTY_CLIENTES_FILTERS,
      accountTypes: ["real"],
      subscriptionStatuses: ["active"],
      usage: ["no_first_quote"],
    };

    const result = filterAndSortClientesList(clients, filters);
    expect(result.map((client) => client.organizationId)).toEqual([1]);
  });

  it("aplica OR dentro del mismo grupo de estado", () => {
    const clients = [
      buildClient({ organizationId: 1, estadoEfectivo: "trial_active" }),
      buildClient({ organizationId: 2, estadoEfectivo: "trial_expiring" }),
      buildClient({ organizationId: 3, estadoEfectivo: "active" }),
    ];

    const filters: ClientesFiltersState = {
      ...EMPTY_CLIENTES_FILTERS,
      subscriptionStatuses: ["trial_active", "expiring_soon"],
    };

    const result = filterAndSortClientesList(clients, filters);
    expect(result.map((client) => client.organizationId).sort()).toEqual([1, 2]);
  });

  it("diferencia trial vencido de suscripción vencida", () => {
    const trialExpired = buildClient({ estadoEfectivo: "trial_expired" });
    const subscriptionExpired = buildClient({ estadoEfectivo: "past_due" });

    expect(
      matchesClientesFilters(trialExpired, {
        ...EMPTY_CLIENTES_FILTERS,
        subscriptionStatuses: ["trial_expired"],
      })
    ).toBe(true);

    expect(
      matchesClientesFilters(subscriptionExpired, {
        ...EMPTY_CLIENTES_FILTERS,
        subscriptionStatuses: ["trial_expired"],
      })
    ).toBe(false);

    expect(
      matchesClientesFilters(subscriptionExpired, {
        ...EMPTY_CLIENTES_FILTERS,
        subscriptionStatuses: ["subscription_expired"],
      })
    ).toBe(true);
  });
});
