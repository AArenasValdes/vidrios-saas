import { createOrganizationProfileService, DEFAULT_ORGANIZATION_BRAND_COLOR } from "../organization-profile.service";
import type { OrganizationProfileRepository } from "@/repositories/organization-profile.repository";

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
        empresaNombre: "   ",
        empresaLogoUrl: null,
        empresaDireccion: "",
        empresaTelefono: "",
        empresaEmail: "",
        brandColor: "#123456",
        formaPago: "",
        proveedorPreferido: "",
        modoPrecioPreferido: "margen",
      })
    ).rejects.toThrow("El nombre de la empresa es obligatorio");
  });

  it("debe normalizar color y correo al guardar", async () => {
    const repository = createOrganizationProfileRepositoryMock();
    const service = createOrganizationProfileService({
      organizationProfileRepository: repository,
    });

    await service.updateByOrganizationId("org-1", {
      empresaNombre: " San Marco ",
      empresaLogoUrl: null,
      empresaDireccion: " La Serena ",
      empresaTelefono: " +56 9 1234 5678 ",
      empresaEmail: " INFO@MARCA.CL ",
      brandColor: "azul",
      formaPago: " 50% anticipo ",
      proveedorPreferido: " Indalum ",
      modoPrecioPreferido: " precio_directo ",
    });

    expect(repository.upsertByOrganizationId).toHaveBeenCalledWith("org-1", {
      empresaNombre: "San Marco",
      empresaLogoUrl: null,
      empresaDireccion: "La Serena",
      empresaTelefono: "+56 9 1234 5678",
      empresaEmail: "info@marca.cl",
      brandColor: DEFAULT_ORGANIZATION_BRAND_COLOR,
      formaPago: "50% anticipo",
      proveedorPreferido: "Indalum",
      modoPrecioPreferido: "precio_directo",
    });
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
