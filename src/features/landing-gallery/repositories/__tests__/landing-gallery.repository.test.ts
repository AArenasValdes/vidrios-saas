import { createLandingGalleryRepository } from "../landing-gallery.repository";
import type { LandingGalleryItem } from "@/features/landing-gallery/types/landing-gallery";
import { organizationAssetsUploadRepository } from "@/features/organization-assets/repositories/organization-assets-upload.repository";

jest.mock("@/features/organization-assets/repositories/organization-assets-upload.repository", () => ({
  organizationAssetsUploadRepository: {
    uploadAsset: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createMockItem(overrides: Partial<LandingGalleryItem> = {}): LandingGalleryItem {
  return {
    id: 1,
    organizationId: 10,
    imageUrl: "https://cdn.example.com/foto.jpg",
    label: "Ventana",
    sortOrder: 0,
    isVisible: true,
    creadoEn: "2026-05-08T10:00:00Z",
    ...overrides,
  };
}

type MockClient = {
  from: jest.Mock;
};

function createMockClient(overrides: Partial<MockClient> = {}): MockClient {
  return {
    from: jest.fn(),
    ...overrides,
  };
}

describe("landing-gallery.repository", () => {
  describe("listByOrganizationId", () => {
    it("debe listar items ordenados por sort_order", async () => {
      const rows = [
        { id: 1, organization_id: 10, image_url: "https://cdn.example.com/foto1.jpg", label: "Ventana", sort_order: 0, is_visible: true, creado_en: "2026-05-08T10:00:00Z" },
        { id: 2, organization_id: 10, image_url: "https://cdn.example.com/foto2.jpg", label: "Shower", sort_order: 1, is_visible: true, creado_en: "2026-05-08T10:01:00Z" },
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: rows, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const result = await repository.listByOrganizationId(10);

      expect(mockFrom).toHaveBeenCalledWith("public_landing_gallery");
      expect(result).toHaveLength(2);
      expect(result[0].label).toBe("Ventana");
      expect(result[1].label).toBe("Shower");
    });

    it("debe lanzar error si Supabase falla", async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: { message: "RLS blocked" } });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });

      await expect(repository.listByOrganizationId(10)).rejects.toBeDefined();
    });

    it("debe mapear label null como string vacio", async () => {
      const row = { id: 1, organization_id: 10, image_url: "https://cdn.example.com/foto.jpg", label: null, sort_order: 0, is_visible: true, creado_en: "2026-05-08T10:00:00Z" };

      const mockOrder = jest.fn().mockResolvedValue({ data: [row], error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const result = await repository.listByOrganizationId(10);

      expect(result[0].label).toBe("");
    });

    it("debe retornar array vacio si no hay items", async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const result = await repository.listByOrganizationId(10);

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("debe insertar y retornar el item creado", async () => {
      const row = { id: 5, organization_id: 10, image_url: "https://cdn.example.com/nueva.jpg", label: "Terraza", sort_order: 2, is_visible: true, creado_en: "2026-05-08T10:00:00Z" };

      const mockSingle = jest.fn().mockResolvedValue({ data: row, error: null });
      const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const result = await repository.create({
        organizationId: 10,
        imageUrl: "https://cdn.example.com/nueva.jpg",
        label: "Terraza",
        sortOrder: 2,
      });

      expect(result.label).toBe("Terraza");
      expect(result.sortOrder).toBe(2);
    });

    it("debe lanzar error si Supabase falla en create", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } });
      const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });

      await expect(repository.create({
        organizationId: 10,
        imageUrl: "https://cdn.example.com/nueva.jpg",
        label: "Test",
      })).rejects.toBeDefined();
    });

    it("debe usar valores default para sortOrder e isVisible", async () => {
      const row = { id: 5, organization_id: 10, image_url: "https://cdn.example.com/nueva.jpg", label: "Test", sort_order: 0, is_visible: true, creado_en: "2026-05-08T10:00:00Z" };

      const mockSingle = jest.fn().mockResolvedValue({ data: row, error: null });
      const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      await repository.create({
        organizationId: 10,
        imageUrl: "https://cdn.example.com/nueva.jpg",
        label: "Test",
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_order: 0,
          is_visible: true,
        })
      );
    });

    it("debe guardar label como null si es string vacio", async () => {
      const row = { id: 5, organization_id: 10, image_url: "https://cdn.example.com/nueva.jpg", label: null, sort_order: 0, is_visible: true, creado_en: "2026-05-08T10:00:00Z" };

      const mockSingle = jest.fn().mockResolvedValue({ data: row, error: null });
      const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      await repository.create({
        organizationId: 10,
        imageUrl: "https://cdn.example.com/nueva.jpg",
        label: "",
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ label: null })
      );
    });
  });

  describe("update", () => {
    it("debe actualizar campos proporcionados", async () => {
      const row = { id: 5, organization_id: 10, image_url: "https://cdn.example.com/foto.jpg", label: "Mampara", sort_order: 0, is_visible: false, creado_en: "2026-05-08T10:00:00Z" };

      const mockSingle = jest.fn().mockResolvedValue({ data: row, error: null });
      const mockSelectAfterUpdate = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq2 = jest.fn().mockReturnValue({ select: mockSelectAfterUpdate });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const result = await repository.update(5, 10, { label: "Mampara", isVisible: false });

      expect(result.label).toBe("Mampara");
      expect(result.isVisible).toBe(false);
    });

    it("debe lanzar error si Supabase falla en update", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } });
      const mockSelectAfterUpdate = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq2 = jest.fn().mockReturnValue({ select: mockSelectAfterUpdate });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });

      await expect(repository.update(5, 10, { label: "Test" })).rejects.toBeDefined();
    });

    it("debe actualizar solo sortOrder si es lo unico proporcionado", async () => {
      const row = { id: 5, organization_id: 10, image_url: "https://cdn.example.com/foto.jpg", label: "Ventana", sort_order: 3, is_visible: true, creado_en: "2026-05-08T10:00:00Z" };

      const mockSingle = jest.fn().mockResolvedValue({ data: row, error: null });
      const mockSelectAfterUpdate = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq2 = jest.fn().mockReturnValue({ select: mockSelectAfterUpdate });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const result = await repository.update(5, 10, { sortOrder: 3 });

      expect(mockUpdate).toHaveBeenCalledWith({ sort_order: 3 });
      expect(result.sortOrder).toBe(3);
    });
  });

  describe("delete", () => {
    it("debe eliminar el item", async () => {
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });

      await expect(repository.delete(5, 10)).resolves.toBeUndefined();
    });

    it("debe lanzar error si Supabase falla", async () => {
      const mockEq2 = jest.fn().mockResolvedValue({ error: { message: "Not found" } });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });

      await expect(repository.delete(5, 10)).rejects.toBeDefined();
    });
  });

  describe("reorder", () => {
    it("debe reordenar items exitosamente", async () => {
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });

      const items = [
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 1 },
      ];

      await expect(repository.reorder(10, items)).resolves.toBeUndefined();
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });

    it("debe lanzar error si alguna actualizacion falla", async () => {
      const mockEq2 = jest.fn().mockRejectedValue(new Error("Update failed"));
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      const client = createMockClient({ from: mockFrom });
      const repository = createLandingGalleryRepository({ clientFactory: client as never });

      const items = [
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 1 },
      ];

      await expect(repository.reorder(10, items)).rejects.toThrow("No se pudieron reordenar algunas fotos de la galeria.");
    });
  });

  describe("uploadGalleryImage", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("debe rechazar archivos que no son imagenes", async () => {
      const client = createMockClient();
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const file = new File(["hola"], "doc.txt", { type: "text/plain" });

      await expect(repository.uploadGalleryImage(10, file)).rejects.toThrow(
        "La foto de galeria debe ser una imagen"
      );
    });

    it("debe rechazar archivos mayores a 20 MB", async () => {
      const client = createMockClient();
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const bigFile = new File(["x".repeat(21 * 1024 * 1024)], "big.jpg", {
        type: "image/jpeg",
      });

      Object.defineProperty(bigFile, "size", { value: 21 * 1024 * 1024 });

      await expect(repository.uploadGalleryImage(10, bigFile)).rejects.toThrow(
        "La foto no puede pesar mas de 20 MB antes de optimizarse."
      );
    });

    it("debe subir imagen y retornar URL publica", async () => {
      (organizationAssetsUploadRepository.uploadAsset as jest.Mock).mockResolvedValue(
        "https://cdn.example.com/uploaded.jpg"
      );

      const client = createMockClient();
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const file = new File(["data"], "foto.jpg", { type: "image/jpeg" });

      const url = await repository.uploadGalleryImage(10, file);

      expect(url).toBe("https://cdn.example.com/uploaded.jpg");
      expect(organizationAssetsUploadRepository.uploadAsset).toHaveBeenCalledWith(
        "gallery",
        file
      );
    });

    it("debe lanzar error si la API de upload falla", async () => {
      (organizationAssetsUploadRepository.uploadAsset as jest.Mock).mockRejectedValue(
        new Error("Storage error")
      );

      const client = createMockClient();
      const repository = createLandingGalleryRepository({ clientFactory: client as never });
      const file = new File(["data"], "foto.jpg", { type: "image/jpeg" });

      await expect(repository.uploadGalleryImage(10, file)).rejects.toBeDefined();
    });
  });
});
