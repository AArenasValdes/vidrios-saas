import { getSolicitudesResumen } from "../../features/solicitudes/services/solicitudes-summary.service";

describe("solicitudes-summary.service", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("debe pedir el resumen de solicitudes al endpoint unico", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        solicitudes: [
          {
            id: "lead-1",
            organizationId: "org-7",
            nombre: "Ana Soto",
            empresa: "Ventora Norte",
            correo: null,
            telefono: "+56998765432",
            contacto: "+56998765432",
            tipoTrabajo: "Cierre de terraza",
            mensaje: "Tengo medidas aproximadas",
            ayuda: "cotizacion",
            contexto: "empresa-publica",
            estado: "nueva",
            origen: "solicitud-publica",
            ip: null,
            userAgent: null,
            creadoEn: "2026-03-23T15:00:00.000Z",
            actualizadoEn: "2026-03-23T15:00:00.000Z",
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
            sourceUrl: null,
          },
        ],
      }),
    } as Response);

    const solicitudes = await getSolicitudesResumen();

    expect(fetchMock).toHaveBeenCalledWith("/api/solicitudes/resumen", {
      method: "GET",
      cache: "no-store",
    });
    expect(solicitudes).toHaveLength(1);
    expect(solicitudes[0]?.nombre).toBe("Ana Soto");
  });

  it("debe propagar error legible si el endpoint falla", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Fallo solicitudes",
      }),
    } as Response);

    await expect(getSolicitudesResumen()).rejects.toThrow("Fallo solicitudes");
  });
});
