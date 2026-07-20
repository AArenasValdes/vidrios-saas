import {
  isCotizacionPendingSend,
  resolvePendingSendAction,
} from "@/features/dashboard/services/dashboard-pending-send.service";

describe("dashboard-pending-send.service", () => {
  it("incluye creada, borrador y estados abiertos", () => {
    expect(isCotizacionPendingSend("creada")).toBe(true);
    expect(isCotizacionPendingSend("borrador")).toBe(true);
    expect(isCotizacionPendingSend("Creada")).toBe(true);
  });

  it("excluye enviada, aprobada, rechazada y terminada", () => {
    expect(isCotizacionPendingSend("enviada")).toBe(false);
    expect(isCotizacionPendingSend("aprobada")).toBe(false);
    expect(isCotizacionPendingSend("rechazada")).toBe(false);
    expect(isCotizacionPendingSend("terminada")).toBe(false);
  });

  it("elige PDF si aún no se descargó y WhatsApp si ya hay PDF", () => {
    expect(resolvePendingSendAction({ pdfDescargadoEn: null })).toBe("pdf");
    expect(resolvePendingSendAction({ pdfDescargadoEn: "2026-07-01T00:00:00.000Z" })).toBe(
      "whatsapp"
    );
  });
});
