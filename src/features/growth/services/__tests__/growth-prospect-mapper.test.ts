import { mapUiStatusToDb } from "@/features/growth/services/growth-prospect-mapper";
import type { GrowthProspect } from "@/features/growth/types/growth-dashboard";

describe("growth prospect mapper", () => {
  it("maps legacy v3 statuses to db statuses", () => {
    expect(mapUiStatusToDb("demo_enviada")).toBe("respondio");
    expect(mapUiStatusToDb("esperando_pago")).toBe("esperando_pago");
    expect(mapUiStatusToDb("perdido")).toBe("sin_respuesta");
    expect(mapUiStatusToDb("contactado")).toBe("contactado");
  });

  it("preserves legacy source id for idempotent import", () => {
    const prospect: GrowthProspect = {
      id: "prospecto-vidrieria-la-serena",
      nombre: "",
      empresa: "Vidrieria La Serena",
      whatsapp: "+56 9 1234 5678",
      ciudad: "La Serena",
      origen: "Facebook",
      estado: "nuevo",
      proximoPaso: "Enviar mensaje",
      fechaProximoSeguimiento: "2026-05-21",
      notas: "Notas",
      dataStatus: "real",
      createdAt: "2026-05-21T10:00:00.000Z",
      updatedAt: "2026-05-21T10:00:00.000Z",
    };

    expect(prospect.id).toBe("prospecto-vidrieria-la-serena");
    expect(mapUiStatusToDb(prospect.estado)).toBe("nuevo");
  });
});
