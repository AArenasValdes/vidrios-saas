import { buildCotizacionAlerts } from "../cotizacion-alerts.service";
import type { CotizacionWorkflowRecord } from "@/types/cotizacion-workflow";

function createRecord(
  partial: Partial<CotizacionWorkflowRecord>
): CotizacionWorkflowRecord {
  return {
    id: partial.id ?? "cot-1",
    codigo: partial.codigo ?? "COT-1",
    clientId: partial.clientId ?? "cli-1",
    projectId: partial.projectId ?? "pro-1",
    clienteNombre: partial.clienteNombre ?? "Alejandro Flores",
    clienteTelefono: partial.clienteTelefono ?? "+56911111111",
    obra: partial.obra ?? "Casa pruebas",
    direccion: partial.direccion ?? "Los test 123",
    validez: partial.validez ?? "30 dias",
    descuentoPct: partial.descuentoPct ?? 0,
    observaciones: partial.observaciones ?? "",
    estado: partial.estado ?? "creada",
    approvalToken: partial.approvalToken ?? "approval-token",
    approvalTokenExpiresAt: partial.approvalTokenExpiresAt ?? null,
    clienteVioEn: partial.clienteVioEn ?? null,
    clienteRespondioEn: partial.clienteRespondioEn ?? null,
    clienteRespuestaCanal: partial.clienteRespuestaCanal ?? null,
    createdAt: partial.createdAt ?? "2026-03-20T12:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-03-20T12:00:00.000Z",
    items: partial.items ?? [],
    subtotal: partial.subtotal ?? 100000,
    descuentoValor: partial.descuentoValor ?? 0,
    neto: partial.neto ?? 100000,
    iva: partial.iva ?? 19000,
    flete: partial.flete ?? 0,
    total: partial.total ?? 119000,
  };
}

describe("cotizacion-alerts.service", () => {
  const now = new Date("2026-03-21T12:00:00.000Z");

  it("debe crear alertas de cotizacion aprobada y rechazada", () => {
    const alerts = buildCotizacionAlerts(
      [
        createRecord({
          id: "cot-apr",
          codigo: "COT-APR",
          estado: "aprobada",
          clienteRespondioEn: "2026-03-21T10:00:00.000Z",
        }),
        createRecord({
          id: "cot-rej",
          codigo: "COT-REJ",
          estado: "rechazada",
          clienteRespondioEn: "2026-03-21T09:00:00.000Z",
        }),
      ],
      { now }
    );

    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toMatchObject({
      kind: "aprobada",
      cotizacionId: "cot-apr",
      title: "Cotizacion aprobada",
    });
    expect(alerts[1]).toMatchObject({
      kind: "rechazada",
      cotizacionId: "cot-rej",
      title: "Cotizacion rechazada",
    });
  });

  it("debe crear alerta cuando el cliente vio la cotizacion pero aun no responde", () => {
    const alerts = buildCotizacionAlerts(
      [
        createRecord({
          id: "cot-view",
          codigo: "COT-VIEW",
          estado: "creada",
          clienteVioEn: "2026-03-21T11:00:00.000Z",
          clienteRespondioEn: null,
        }),
      ],
      { now }
    );

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      kind: "vista",
      title: "Cotizacion vista sin respuesta",
      cotizacionId: "cot-view",
    });
  });

  it("debe excluir respuestas antiguas para que el panel no quede pegado al pasado", () => {
    const alerts = buildCotizacionAlerts(
      [
        createRecord({
          id: "cot-old",
          estado: "aprobada",
          clienteRespondioEn: "2026-02-01T09:00:00.000Z",
        }),
      ],
      { now }
    );

    expect(alerts).toHaveLength(0);
  });

  it("debe ordenar las alertas desde la mas reciente a la mas antigua", () => {
    const alerts = buildCotizacionAlerts(
      [
        createRecord({
          id: "cot-2",
          codigo: "COT-2",
          estado: "rechazada",
          clienteRespondioEn: "2026-03-21T08:00:00.000Z",
        }),
        createRecord({
          id: "cot-1",
          codigo: "COT-1",
          estado: "aprobada",
          clienteRespondioEn: "2026-03-21T11:00:00.000Z",
        }),
      ],
      { now }
    );

    expect(alerts.map((item) => item.cotizacionId)).toEqual(["cot-1", "cot-2"]);
  });

  it("debe respetar el limite solicitado sin perder el orden mas reciente", () => {
    const alerts = buildCotizacionAlerts(
      [
        createRecord({
          id: "cot-3",
          codigo: "COT-3",
          estado: "rechazada",
          clienteRespondioEn: "2026-03-21T07:00:00.000Z",
        }),
        createRecord({
          id: "cot-2",
          codigo: "COT-2",
          estado: "rechazada",
          clienteRespondioEn: "2026-03-21T08:00:00.000Z",
        }),
        createRecord({
          id: "cot-1",
          codigo: "COT-1",
          estado: "aprobada",
          clienteRespondioEn: "2026-03-21T11:00:00.000Z",
        }),
      ],
      { now, limit: 2 }
    );

    expect(alerts.map((item) => item.cotizacionId)).toEqual(["cot-1", "cot-2"]);
  });
});
