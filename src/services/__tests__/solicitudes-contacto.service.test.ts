import {
  createSolicitudesContactoService,
  SolicitudContactoValidationError,
} from "../solicitudes-contacto.service";
import type { SolicitudesContactoRepository } from "@/repositories/solicitudes-contacto.repository";

function createSolicitudesContactoRepositoryMock(): jest.Mocked<SolicitudesContactoRepository> {
  return {
    listRecent: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(async (input) => ({
      id: "lead-1",
      nombre: input.nombre,
      empresa: input.empresa,
      correo: input.correo,
      telefono: input.telefono,
      ayuda: input.ayuda,
      estado: "nueva",
      origen: input.origen ?? "landing",
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      creadoEn: "2026-03-23T15:00:00.000Z",
      actualizadoEn: "2026-03-23T15:00:00.000Z",
    })),
  } as jest.Mocked<SolicitudesContactoRepository>;
}

describe("solicitudes-contacto.service", () => {
  it("debe crear una solicitud normalizando los campos principales", async () => {
    const repository = createSolicitudesContactoRepositoryMock();
    const service = createSolicitudesContactoService({ repository });

    await service.createSolicitud({
      nombre: " Juan Perez ",
      empresa: " Vidrios Sur ",
      correo: " JUAN@EMPRESA.CL ",
      telefono: " +56 9 8765 4321 ",
      ayuda: "demo",
    });

    expect(repository.create).toHaveBeenCalledWith({
      nombre: "Juan Perez",
      empresa: "Vidrios Sur",
      correo: "juan@empresa.cl",
      telefono: "+56 9 8765 4321",
      ayuda: "demo",
      origen: "landing",
      ip: null,
      userAgent: null,
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
        telefono: "+56 9 8765 4321",
        ayuda: "demo",
      })
    ).rejects.toBeInstanceOf(SolicitudContactoValidationError);
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
        telefono: "+56 9 8765 4321",
        ayuda: "soporte" as never,
      })
    ).rejects.toThrow("Selecciona el tipo de ayuda que necesitas.");
  });
});
