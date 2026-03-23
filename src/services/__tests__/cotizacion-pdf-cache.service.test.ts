import {
  createCotizacionPdfCacheService,
} from "../cotizacion-pdf-cache.service";

describe("cotizacion-pdf-cache service", () => {
  it("debe construir una ruta de storage versionada por actualizacion", () => {
    const service = createCotizacionPdfCacheService();

    expect(
      service.buildStoragePath({
        organizationId: "org-1",
        cotizacionId: "cot-1",
        updatedAt: "2026-03-19T14:45:10.000Z",
      })
    ).toBe("org-1/quotes/cot-1/pdf-2026-03-19t14-45-10.000z.pdf");
  });

  it("debe devolver null cuando no existe PDF persistido", async () => {
    const service = createCotizacionPdfCacheService({
      repository: {
        buildPath: jest.fn(),
        getPublicUrl: jest.fn(),
        exists: jest.fn().mockResolvedValue(false),
        upload: jest.fn(),
      },
    });

    await expect(
      service.resolveCachedPdf({
        organizationId: "org-1",
        cotizacionId: "cot-1",
        updatedAt: "2026-03-19T14:45:10.000Z",
      })
    ).resolves.toBeNull();
  });

  it("debe rechazar archivos que no sean pdf al persistir", async () => {
    const service = createCotizacionPdfCacheService({
      repository: {
        buildPath: jest.fn(),
        getPublicUrl: jest.fn(),
        exists: jest.fn(),
        upload: jest.fn(),
      },
    });

    const file = new File(["hola"], "nota.txt", { type: "text/plain" });

    await expect(
      service.persistPdf(
        {
          organizationId: "org-1",
          cotizacionId: "cot-1",
          updatedAt: "2026-03-19T14:45:10.000Z",
        },
        file
      )
    ).rejects.toThrow("El archivo a persistir debe ser un PDF");
  });
});
