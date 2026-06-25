import type { SolicitudesContactoRepository } from "@/repositories/solicitudes-contacto.repository";
import type { WebPushNotificationsService } from "@/services/web-push-notifications.service";

import {
  createSolicitudesContactoService,
  SolicitudContactoValidationError,
} from "../solicitudes-contacto.service";

function createSolicitudesContactoRepositoryMock(): jest.Mocked<SolicitudesContactoRepository> {
  return {
    listRecent: jest.fn().mockResolvedValue([]),
    listByOrganizationId: jest.fn().mockResolvedValue([]),
    listResumenByOrganizationId: jest.fn().mockResolvedValue([]),
    getPublicConfigBySlug: jest.fn().mockResolvedValue({
      organizationId: "org-7",
      empresaNombre: "Ventora Norte",
      empresaLogoUrl: null,
      empresaDireccion: "Santiago RM",
      empresaTelefono: "+56998765432",
      empresaEmail: "hola@ventora.cl",
      brandColor: "#335ea9",
      solicitudPublicaSlug: "ventora-norte",
      solicitudPublicaDescripcionCorta: "Vidrios y aluminio.",
      solicitudPublicaValor: "Respuesta comercial inicial.",
      solicitudPublicaMensajeConfianza: "Tu solicitud queda guardada.",
      solicitudPublicaPrivacidad: "Tus datos no se comparten.",
      solicitudPublicaHorarioDesde: "09:00",
      solicitudPublicaHorarioHasta: "19:00",
      solicitudPublicaDiasAtencion: ["1", "2", "3", "4", "5", "6"],
    }),
    create: jest.fn().mockImplementation(async (input) => ({
      id: "lead-1",
      organizationId: null,
      nombre: input.nombre,
      empresa: input.empresa,
      correo: input.correo,
      telefono: input.telefono,
      contacto: input.correo || input.telefono,
      tipoTrabajo: null,
      mensaje: null,
      ayuda: input.ayuda,
      contexto: "landing",
      estado: "nueva",
      origen: input.origen ?? "landing",
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      creadoEn: "2026-03-23T15:00:00.000Z",
      actualizadoEn: "2026-03-23T15:00:00.000Z",
      contactadaAt: null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      sourceUrl: input.sourceUrl ?? null,
    })),
    createPublicRequest: jest.fn().mockImplementation(async (input) => ({
      id: "lead-public-1",
      organizationId: input.organizationId,
      nombre: input.nombre,
      empresa: input.empresa,
      correo: null,
      telefono: input.contacto,
      contacto: input.contacto,
      tipoTrabajo: input.tipoTrabajo,
      mensaje: input.mensaje ?? null,
      ayuda: "cotizacion",
      contexto: "empresa-publica",
      estado: "nueva",
      origen: input.origen ?? "solicitud-publica",
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      creadoEn: "2026-03-23T15:00:00.000Z",
      actualizadoEn: "2026-03-23T15:00:00.000Z",
      contactadaAt: null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      sourceUrl: input.sourceUrl ?? null,
    })),
    updateStatusById: jest.fn().mockImplementation(async (input) => ({
      id: input.id,
      organizationId: input.organizationId ?? "org-7",
      nombre: "Ana Soto",
      empresa: "Ventora Norte",
      correo: null,
      telefono: "+56998765432",
      contacto: "+56998765432",
      tipoTrabajo: "Cierre de terraza",
      mensaje: null,
      ayuda: "cotizacion",
      contexto: "empresa-publica",
      estado: input.estado,
      origen: "solicitud-publica",
      ip: null,
      userAgent: null,
      creadoEn: "2026-03-23T15:00:00.000Z",
      actualizadoEn: "2026-03-23T15:10:00.000Z",
      contactadaAt:
        input.estado === "contactada" ? "2026-03-23T15:10:00.000Z" : null,
      utmSource: "qr",
      utmMedium: "offline",
      utmCampaign: null,
      sourceUrl: null,
    })),
  } as jest.Mocked<SolicitudesContactoRepository>;
}

function createNotificationsServiceMock(): jest.Mocked<WebPushNotificationsService> {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    registerSubscription: jest.fn(),
    unregisterSubscription: jest.fn(),
    sendQuoteDecisionPush: jest.fn(),
    sendLeadCreatedPush: jest.fn().mockResolvedValue({ sent: 1, skipped: false }),
  } as unknown as jest.Mocked<WebPushNotificationsService>;
}

describe("solicitudes-contacto.service", () => {
  it("debe crear una solicitud normalizando los campos principales", async () => {
    const repository = createSolicitudesContactoRepositoryMock();
    const service = createSolicitudesContactoService({ repository });

    await service.createSolicitud({
      nombre: " Juan Perez ",
      empresa: " Vidrios Sur ",
      correo: " JUAN@EMPRESA.CL ",
      telefono: " 9 8765 4321 ",
      ayuda: "demo",
    });

    expect(repository.create).toHaveBeenCalledWith({
      nombre: "Juan Perez",
      empresa: "Vidrios Sur",
      correo: "juan@empresa.cl",
      telefono: "+56987654321",
      ayuda: "demo",
      origen: "landing",
      ip: null,
      userAgent: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      sourceUrl: null,
    });
  });

  it("debe rechazar correos invalidos", async () => {
    const service = createSolicitudesContactoService({
      repository: createSolicitudesContactoRepositoryMock(),
    });

    await expect(
      service.createSolicitud({
        nombre: "Juan Perez",
        empresa: "Vidrios Sur",
        correo: "correo-invalido",
        telefono: "987654321",
        ayuda: "demo",
      })
    ).rejects.toBeInstanceOf(SolicitudContactoValidationError);
  });

  it("debe limitar campos largos antes de guardar", async () => {
    const repository = createSolicitudesContactoRepositoryMock();
    const service = createSolicitudesContactoService({ repository });

    await service.createSolicitud({
      nombre: "Juan ".repeat(30),
      empresa: "Vidrios ".repeat(30),
      correo: `${"correo".repeat(20)}@empresa.cl`,
      telefono: "987654321",
      ayuda: "demo",
      origen: "landing-publica-con-un-origen-demasiado-largo",
      ip: "192.168.0.1 ".repeat(12),
      userAgent: "Chrome ".repeat(80),
    });

    const saved = repository.create.mock.calls[0]?.[0];

    expect(saved?.nombre).toHaveLength(80);
    expect(saved?.empresa).toHaveLength(100);
    expect(saved?.correo.length).toBeLessThanOrEqual(160);
    expect(saved?.telefono).toBe("+56987654321");
    expect(saved?.origen).toHaveLength(40);
    expect(saved?.ip).toHaveLength(80);
    expect(saved?.userAgent).toHaveLength(240);
  });

  it("debe descartar sourceUrl con protocolos no permitidos", async () => {
    const repository = createSolicitudesContactoRepositoryMock();
    const service = createSolicitudesContactoService({ repository });

    await service.createSolicitud({
      nombre: "Juan Perez",
      empresa: "Vidrios Sur",
      correo: "juan@empresa.cl",
      telefono: "987654321",
      ayuda: "demo",
      sourceUrl: "javascript:alert('xss')",
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceUrl: null,
      })
    );
  });

  it("debe rechazar ayudas fuera del catalogo", async () => {
    const service = createSolicitudesContactoService({
      repository: createSolicitudesContactoRepositoryMock(),
    });

    await expect(
      service.createSolicitud({
        nombre: "Juan Perez",
        empresa: "Vidrios Sur",
        correo: "juan@empresa.cl",
        telefono: "987654321",
        ayuda: "soporte" as never,
      })
    ).rejects.toThrow("Selecciona el tipo de ayuda que necesitas.");
  });

  it("debe crear una solicitud publica por empresa y notificar a la organizacion", async () => {
    const repository = createSolicitudesContactoRepositoryMock();
    const notificationsService = createNotificationsServiceMock();
    const service = createSolicitudesContactoService({
      repository,
      notificationsService,
    });

    await service.createPublicRequest({
      organizationId: "org-7",
      empresa: "Ventora Norte",
      nombre: " Ana Soto ",
      contacto: " +56 9 9876 5432 ",
      tipoTrabajo: " Cierre de terraza ",
      mensaje: " Tengo medidas aproximadas ",
      origen: "qr",
      utmSource: "qr",
      utmMedium: "offline",
    });

    expect(repository.createPublicRequest).toHaveBeenCalledWith({
      organizationId: "org-7",
      empresa: "Ventora Norte",
      nombre: "Ana Soto",
      contacto: "+56998765432",
      tipoTrabajo: "Cierre de terraza",
      mensaje: "Tengo medidas aproximadas",
      origen: "qr",
      ip: null,
      userAgent: null,
      utmSource: "qr",
      utmMedium: "offline",
      utmCampaign: null,
      sourceUrl: null,
    });
    expect(notificationsService.sendLeadCreatedPush).toHaveBeenCalledWith({
      organizationId: "org-7",
      prospectoNombre: "Ana Soto",
      tipoTrabajo: "Cierre de terraza",
      empresaNombre: "Ventora Norte",
    });
  });

  it("debe mantener creada la solicitud publica aunque falle el push", async () => {
    const repository = createSolicitudesContactoRepositoryMock();
    const notificationsService = createNotificationsServiceMock();
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    notificationsService.sendLeadCreatedPush.mockRejectedValueOnce(
      new Error("Push no disponible")
    );
    const service = createSolicitudesContactoService({
      repository,
      notificationsService,
    });

    const solicitud = await service.createPublicRequest({
      organizationId: "org-7",
      empresa: "Ventora Norte",
      nombre: "Ana Soto",
      contacto: "+56998765432",
      tipoTrabajo: "Cierre de terraza",
    });

    expect(solicitud.id).toBe("lead-public-1");
    expect(notificationsService.sendLeadCreatedPush).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("debe rechazar una solicitud publica sin contacto valido", async () => {
    const service = createSolicitudesContactoService({
      repository: createSolicitudesContactoRepositoryMock(),
      notificationsService: createNotificationsServiceMock(),
    });

    await expect(
      service.createPublicRequest({
        organizationId: "org-7",
        empresa: "Ventora Norte",
        nombre: "Ana Soto",
        contacto: "abc",
        tipoTrabajo: "Cierre terraza",
      })
    ).rejects.toBeInstanceOf(SolicitudContactoValidationError);
  });

  it("debe actualizar el estado de una solicitud existente", async () => {
    const repository = createSolicitudesContactoRepositoryMock();
    const service = createSolicitudesContactoService({ repository });

    await service.updateSolicitudStatus({
      id: "lead-public-1",
      estado: "contactada",
      organizationId: "org-7",
    });

    expect(repository.updateStatusById).toHaveBeenCalledWith({
      id: "lead-public-1",
      estado: "contactada",
      organizationId: "org-7",
    });
  });

  it("debe pedir el resumen liviano de solicitudes por organizacion", async () => {
    const repository = createSolicitudesContactoRepositoryMock();
    const service = createSolicitudesContactoService({ repository });

    await service.listSolicitudesResumenByOrganizationId("org-7");

    expect(repository.listResumenByOrganizationId).toHaveBeenCalledWith("org-7");
  });

  it("debe rechazar un estado invalido al actualizar una solicitud", async () => {
    const service = createSolicitudesContactoService({
      repository: createSolicitudesContactoRepositoryMock(),
    });

    await expect(
      service.updateSolicitudStatus({
        id: "lead-public-1",
        estado: "cerrando" as never,
      })
    ).rejects.toBeInstanceOf(SolicitudContactoValidationError);
  });
});
