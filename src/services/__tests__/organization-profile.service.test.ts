import type { OrganizationProfileRepository } from "@/repositories/organization-profile.repository";

import {
  buildDefaultSolicitudPublicaHorarioPorDia,
  createOrganizationProfileService,
  DEFAULT_ORGANIZATION_BRAND_COLOR,
  DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA,
  DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE,
  DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA,
  DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA,
  DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD,
  DEFAULT_SOLICITUD_PUBLICA_VALOR,
} from "../organization-profile.service";

function createOrganizationProfileRepositoryMock(): jest.Mocked<OrganizationProfileRepository> {
  return {
    getByOrganizationId: jest.fn().mockResolvedValue(null),
    upsertByOrganizationId: jest.fn().mockImplementation(async (organizationId, input) => ({
      organizationId,
      ...input,
      creadoEn: "2026-03-17T10:00:00.000Z",
      actualizadoEn: "2026-03-17T10:00:00.000Z",
    })),
    uploadLogo: jest.fn().mockResolvedValue("https://cdn.example.com/logo.png"),
    uploadHeroImage: jest.fn().mockResolvedValue("https://cdn.example.com/hero.png"),
  } as unknown as jest.Mocked<OrganizationProfileRepository>;
}

describe("organization-profile.service", () => {
  it("debe devolver un perfil resuelto con defaults cuando no existe configuracion", async () => {
    const repository = createOrganizationProfileRepositoryMock();
    const service = createOrganizationProfileService({
      organizationProfileRepository: repository,
    });

    const profile = await service.getByOrganizationId("org-1");

    expect(profile).toMatchObject({
      organizationId: "org-1",
      empresaNombre: "Mi empresa",
      brandColor: DEFAULT_ORGANIZATION_BRAND_COLOR,
      solicitudPublicaSlug: "mi-empresa",
      solicitudPublicaDescripcionCorta:
        DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA,
      solicitudPublicaValor: DEFAULT_SOLICITUD_PUBLICA_VALOR,
      solicitudPublicaMensajeConfianza:
        DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA,
      solicitudPublicaPrivacidad: DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD,
      solicitudPublicaHorarioDesde: DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE,
      solicitudPublicaHorarioHasta: DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA,
      solicitudPublicaDiasAtencion: ["1", "2", "3", "4", "5", "6"],
      proveedorPreferido: "",
      modoPrecioPreferido: "margen",
    });
  });

  it("debe validar el nombre de empresa al guardar", async () => {
    const service = createOrganizationProfileService({
      organizationProfileRepository: createOrganizationProfileRepositoryMock(),
    });

await expect(
 service.updateByOrganizationId("org-1", {
 empresaNombre: " ",
 empresaLogoUrl: null,
 responsableComercial: "",
 empresaDireccion: "",
 empresaTelefono: "",
 empresaEmail: "",
 brandColor: "",
 formaPago: "",
 solicitudPublicaSlug: "",
 solicitudPublicaDescripcionCorta: "",
 solicitudPublicaValor: "",
 solicitudPublicaMensajeConfianza: "",
 solicitudPublicaPrivacidad: "",
 solicitudPublicaHorarioDesde: "",
 solicitudPublicaHorarioHasta: "",
 solicitudPublicaDiasAtencion: [],
 solicitudPublicaHorarioPorDia: [],
 proveedorPreferido: "",
 modoPrecioPreferido: "margen",
 margenDefecto: 100,
 publicName: "",
 publicSubtitle: "",
 publicZone: "",
 publicBusinessType: "",
 secondaryColor: "",
 heroMode: "gradient",
 heroImageUrl: null,
 heroTitle: "",
 heroSubtitle: "",
 showGallery: true,
 showSchedule: true,
 showRating: false,
 ratingLabel: "",
 jobsCountLabel: "",
 formTitle: "",
 formSubtitle: "",
 isPublished: false,
 })
    ).rejects.toThrow("El nombre de la empresa es obligatorio");
  });

  it("debe normalizar color, correo y datos publicos al guardar", async () => {
    const repository = createOrganizationProfileRepositoryMock();
    const service = createOrganizationProfileService({
      organizationProfileRepository: repository,
    });

await service.updateByOrganizationId("org-1", {
 empresaNombre: " San Marco ",
 empresaLogoUrl: null,
 responsableComercial: " Juan Perez ",
 empresaDireccion: " La Serena ",
 empresaTelefono: " +56 9 1234 5678 ",
 empresaEmail: " INFO@MARCA.CL ",
 brandColor: "azul",
 formaPago: " 50% anticipo ",
 solicitudPublicaSlug: " San Marco Norte ",
 solicitudPublicaDescripcionCorta:
 " Vidrios y aluminio para hogar y empresa ",
 solicitudPublicaValor: " Respuesta comercial rapida ",
 solicitudPublicaMensajeConfianza: " Tu solicitud queda guardada ",
 solicitudPublicaPrivacidad: " Tus datos quedan protegidos ",
 solicitudPublicaHorarioDesde: "08:30",
 solicitudPublicaHorarioHasta: "18:30",
 solicitudPublicaDiasAtencion: ["5", "3", "1", "2", "4"],
 solicitudPublicaHorarioPorDia: buildDefaultSolicitudPublicaHorarioPorDia({
 days: ["5", "3", "1", "2", "4"],
 from: "08:30",
 to: "18:30",
 }),
 proveedorPreferido: "Indalum",
 modoPrecioPreferido: "precio_directo",
 margenDefecto: 100,
 publicName: "",
 publicSubtitle: "",
 publicZone: "",
 publicBusinessType: "",
 secondaryColor: "",
 heroMode: "gradient",
 heroImageUrl: null,
 heroTitle: "",
 heroSubtitle: "",
 showGallery: true,
 showSchedule: true,
 showRating: false,
 ratingLabel: "",
 jobsCountLabel: "",
 formTitle: "",
 formSubtitle: "",
 isPublished: false,
 });

 expect(repository.upsertByOrganizationId).toHaveBeenCalledWith("org-1", expect.objectContaining({
 empresaNombre: "San Marco",
 empresaLogoUrl: null,
 responsableComercial: "Juan Perez",
 empresaDireccion: "La Serena",
 empresaTelefono: "+56 9 1234 5678",
 empresaEmail: "info@marca.cl",
 brandColor: DEFAULT_ORGANIZATION_BRAND_COLOR,
 formaPago: "50% anticipo",
 solicitudPublicaSlug: "san-marco-norte",
 solicitudPublicaDescripcionCorta:
 "Vidrios y aluminio para hogar y empresa",
 solicitudPublicaValor: "Respuesta comercial rapida",
 solicitudPublicaMensajeConfianza: "Tu solicitud queda guardada",
 solicitudPublicaPrivacidad: "Tus datos quedan protegidos",
  solicitudPublicaHorarioDesde: "08:30",
  solicitudPublicaHorarioHasta: "18:30",
  solicitudPublicaDiasAtencion: ["1", "2", "3", "4", "5"],
  solicitudPublicaHorarioPorDia: [
  { day: "1", enabled: true, from: "08:30", to: "18:30" },
  { day: "2", enabled: true, from: "08:30", to: "18:30" },
  { day: "3", enabled: true, from: "08:30", to: "18:30" },
  { day: "4", enabled: true, from: "08:30", to: "18:30" },
  { day: "5", enabled: true, from: "08:30", to: "18:30" },
  { day: "6", enabled: false, from: "08:30", to: "18:30" },
  { day: "0", enabled: false, from: "08:30", to: "18:30" },
  ],
  proveedorPreferido: "Indalum",
 modoPrecioPreferido: "precio_directo",
 margenDefecto: 100,
 publicName: "",
 publicSubtitle: "",
 publicZone: "",
 publicBusinessType: "",
  secondaryColor: DEFAULT_ORGANIZATION_BRAND_COLOR,
 heroMode: "gradient",
 heroImageUrl: null,
 heroTitle: "",
 heroSubtitle: "",
 showGallery: true,
 showSchedule: true,
 showRating: false,
 ratingLabel: "",
 jobsCountLabel: "",
 formTitle: "",
 formSubtitle: "",
 isPublished: false,
 }));
  });

  it("debe validar que el logo sea una imagen", async () => {
    const service = createOrganizationProfileService({
      organizationProfileRepository: createOrganizationProfileRepositoryMock(),
    });

    const file = new File(["hola"], "logo.txt", { type: "text/plain" });

    await expect(service.uploadLogo("org-1", file)).rejects.toThrow(
      "El logo debe ser una imagen"
    );
  });
});
