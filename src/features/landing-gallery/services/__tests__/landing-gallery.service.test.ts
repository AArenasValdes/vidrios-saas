import { createLandingGalleryService } from "../landing-gallery.service";
import type { LandingGalleryRepository } from "@/features/landing-gallery/repositories/landing-gallery.repository";
import type { LandingGalleryItem } from "@/features/landing-gallery/types/landing-gallery";

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

function createRepositoryMock(items: LandingGalleryItem[] = []): jest.Mocked<LandingGalleryRepository> {
  return {
    listByOrganizationId: jest.fn().mockResolvedValue(items),
    create: jest.fn().mockImplementation(async (input) =>
      createMockItem({
        id: Date.now(),
        organizationId: input.organizationId,
        imageUrl: input.imageUrl,
        label: input.label ?? "",
        sortOrder: input.sortOrder ?? 0,
        isVisible: input.isVisible ?? true,
      })
    ),
    update: jest.fn().mockImplementation(async (id, _orgId, input) =>
      createMockItem({ id, ...input })
    ),
    delete: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn().mockResolvedValue(undefined),
    uploadGalleryImage: jest.fn().mockResolvedValue("https://cdn.example.com/uploaded.jpg"),
  } as unknown as jest.Mocked<LandingGalleryRepository>;
}

describe("landing-gallery.service", () => {
  describe("getGalleryByOrganizationId", () => {
    it("delega al repository", async () => {
      const items = [createMockItem(), createMockItem({ id: 2, label: "Shower" })];
      const repository = createRepositoryMock(items);
      const service = createLandingGalleryService({ repository });

      const result = await service.getGalleryByOrganizationId(10);

      expect(repository.listByOrganizationId).toHaveBeenCalledWith(10);
      expect(result).toEqual(items);
    });

    it("propaga error del repository", async () => {
      const repository = createRepositoryMock();
      repository.listByOrganizationId.mockRejectedValue(new Error("Fallo de conexion"));
      const service = createLandingGalleryService({ repository });

      await expect(service.getGalleryByOrganizationId(10)).rejects.toThrow("Fallo de conexion");
    });
  });

  describe("addGalleryItem", () => {
    it("agrega item cuando hay espacio", async () => {
      const repository = createRepositoryMock([createMockItem()]);
      const service = createLandingGalleryService({ repository });

      const result = await service.addGalleryItem(10, {
        imageUrl: "https://cdn.example.com/nueva.jpg",
        label: "Terraza",
      });

      expect(result.label).toBe("Terraza");
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 10,
          imageUrl: "https://cdn.example.com/nueva.jpg",
          label: "Terraza",
          sortOrder: 1,
          isVisible: true,
        })
      );
    });

    it("asigna sortOrder igual al largo actual si no se especifica", async () => {
      const existing = Array.from({ length: 3 }, (_, i) =>
        createMockItem({ id: i + 1, sortOrder: i })
      );
      const repository = createRepositoryMock(existing);
      const service = createLandingGalleryService({ repository });

      await service.addGalleryItem(10, {
        imageUrl: "https://cdn.example.com/nueva.jpg",
        label: "Puerta",
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 3 })
      );
    });

    it("rechaza cuando ya hay 8 items", async () => {
      const existing = Array.from({ length: 8 }, (_, i) =>
        createMockItem({ id: i + 1, sortOrder: i })
      );
      const repository = createRepositoryMock(existing);
      const service = createLandingGalleryService({ repository });

      await expect(
        service.addGalleryItem(10, {
          imageUrl: "https://cdn.example.com/nueva.jpg",
          label: "Extra",
        })
      ).rejects.toThrow("No puedes tener mas de 8 fotos en la galeria.");

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("permite agregar cuando hay 7 items", async () => {
      const existing = Array.from({ length: 7 }, (_, i) =>
        createMockItem({ id: i + 1, sortOrder: i })
      );
      const repository = createRepositoryMock(existing);
      const service = createLandingGalleryService({ repository });

      await service.addGalleryItem(10, {
        imageUrl: "https://cdn.example.com/nueva.jpg",
        label: "Octava",
      });

      expect(repository.create).toHaveBeenCalled();
    });

    it("propaga error del repository al crear", async () => {
      const repository = createRepositoryMock([createMockItem()]);
      repository.create.mockRejectedValue(new Error("Insert failed"));
      const service = createLandingGalleryService({ repository });

      await expect(
        service.addGalleryItem(10, {
          imageUrl: "https://cdn.example.com/nueva.jpg",
          label: "Test",
        })
      ).rejects.toThrow("Insert failed");
    });

    it("respeta sortOrder proporcionado", async () => {
      const repository = createRepositoryMock([createMockItem()]);
      const service = createLandingGalleryService({ repository });

      await service.addGalleryItem(10, {
        imageUrl: "https://cdn.example.com/nueva.jpg",
        label: "Test",
        sortOrder: 5,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 5 })
      );
    });

    it("respeta isVisible proporcionado", async () => {
      const repository = createRepositoryMock([createMockItem()]);
      const service = createLandingGalleryService({ repository });

      await service.addGalleryItem(10, {
        imageUrl: "https://cdn.example.com/nueva.jpg",
        label: "Test",
        isVisible: false,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isVisible: false })
      );
    });
  });

  describe("updateGalleryItem", () => {
    it("delega al repository", async () => {
      const repository = createRepositoryMock();
      const service = createLandingGalleryService({ repository });

      await service.updateGalleryItem(5, 10, { label: "Mampara" });

      expect(repository.update).toHaveBeenCalledWith(5, 10, { label: "Mampara" });
    });

    it("propaga error del repository", async () => {
      const repository = createRepositoryMock();
      repository.update.mockRejectedValue(new Error("Update failed"));
      const service = createLandingGalleryService({ repository });

      await expect(
        service.updateGalleryItem(5, 10, { label: "Test" })
      ).rejects.toThrow("Update failed");
    });
  });

  describe("deleteGalleryItem", () => {
    it("delega al repository", async () => {
      const repository = createRepositoryMock();
      const service = createLandingGalleryService({ repository });

      await service.deleteGalleryItem(5, 10);

      expect(repository.delete).toHaveBeenCalledWith(5, 10);
    });

    it("propaga error del repository", async () => {
      const repository = createRepositoryMock();
      repository.delete.mockRejectedValue(new Error("Delete failed"));
      const service = createLandingGalleryService({ repository });

      await expect(service.deleteGalleryItem(5, 10)).rejects.toThrow("Delete failed");
    });
  });

  describe("reorderGalleryItems", () => {
    it("delega al repository", async () => {
      const repository = createRepositoryMock();
      const service = createLandingGalleryService({ repository });

      const items = [
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 1 },
      ];

      await service.reorderGalleryItems(10, items);

      expect(repository.reorder).toHaveBeenCalledWith(10, items);
    });

    it("propaga error del repository", async () => {
      const repository = createRepositoryMock();
      repository.reorder.mockRejectedValue(new Error("Reorder failed"));
      const service = createLandingGalleryService({ repository });

      const items = [{ id: 1, sortOrder: 0 }];

      await expect(service.reorderGalleryItems(10, items)).rejects.toThrow("Reorder failed");
    });
  });

  describe("uploadGalleryImage", () => {
    it("delega al repository", async () => {
      const repository = createRepositoryMock();
      const service = createLandingGalleryService({ repository });
      const file = new File(["data"], "foto.jpg", { type: "image/jpeg" });

      const url = await service.uploadGalleryImage(10, file);

      expect(repository.uploadGalleryImage).toHaveBeenCalledWith(10, file);
      expect(url).toBe("https://cdn.example.com/uploaded.jpg");
    });

    it("propaga error del repository", async () => {
      const repository = createRepositoryMock();
      repository.uploadGalleryImage.mockRejectedValue(new Error("La foto de galeria debe ser una imagen"));
      const service = createLandingGalleryService({ repository });
      const file = new File(["data"], "doc.txt", { type: "text/plain" });

      await expect(service.uploadGalleryImage(10, file)).rejects.toThrow(
        "La foto de galeria debe ser una imagen"
      );
    });
  });
});
