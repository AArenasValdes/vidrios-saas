import { aggregateSolicitudesResumenGlobal } from "../solicitudes-summary.service";

describe("aggregateSolicitudesResumenGlobal", () => {
  it("cuenta estados y solicitudes de hoy en un solo pasada", () => {
    const now = new Date(2026, 8, 20, 15, 0, 0);
    const summary = aggregateSolicitudesResumenGlobal(
      [
        { estado: "nueva", creado_en: new Date(2026, 8, 20, 12, 0, 0).toISOString() },
        { estado: "nueva", creado_en: new Date(2026, 8, 19, 12, 0, 0).toISOString() },
        { estado: "contactada", creado_en: new Date(2026, 8, 20, 8, 0, 0).toISOString() },
        { estado: "cerrada", creado_en: new Date(2026, 8, 18, 8, 0, 0).toISOString() },
      ],
      now
    );

    expect(summary).toEqual({
      total: 4,
      hoy: 2,
      counts: {
        nueva: 2,
        contactada: 1,
        cerrada: 1,
        descartada: 0,
      },
    });
  });

  it("no infla el resumen con estados desconocidos", () => {
    const summary = aggregateSolicitudesResumenGlobal([
      { estado: "otra", creado_en: "2026-09-20T12:00:00.000Z" },
    ]);

    expect(summary.total).toBe(1);
    expect(summary.counts).toEqual({
      nueva: 0,
      contactada: 0,
      cerrada: 0,
      descartada: 0,
    });
  });
});
