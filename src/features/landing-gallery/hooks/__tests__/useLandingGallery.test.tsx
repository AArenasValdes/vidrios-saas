/** @jest-environment jsdom */

import { renderHook, act, waitFor } from "@testing-library/react";

import { useLandingGallery } from "../useLandingGallery";
import type { LandingGalleryItem } from "@/features/landing-gallery/types/landing-gallery";
import type { ReorderLandingGalleryItemInput } from "@/features/landing-gallery/types/landing-gallery";

let authState: { organizacionId: number | null; cargando: boolean } = {
  organizacionId: 10,
  cargando: false,
};

const mockGallery: LandingGalleryItem[] = [
  {
    id: 1,
    organizationId: 10,
    imageUrl: "https://cdn.example.com/foto1.jpg",
    label: "Ventana",
    sortOrder: 0,
    isVisible: true,
    creadoEn: "2026-05-08T10:00:00Z",
  },
  {
    id: 2,
    organizationId: 10,
    imageUrl: "https://cdn.example.com/foto2.jpg",
    label: "Shower",
    sortOrder: 1,
    isVisible: true,
    creadoEn: "2026-05-08T10:01:00Z",
  },
];

const getGalleryByOrganizationId = jest.fn();
const addGalleryItem = jest.fn();
const updateGalleryItem = jest.fn();
const deleteGalleryItem = jest.fn();
const reorderGalleryItems = jest.fn();
const uploadGalleryImage = jest.fn();
const revalidatePublicLanding = jest.fn();

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

jest.mock("@/features/landing-gallery/services/landing-gallery.service", () => ({
  landingGalleryService: {
    getGalleryByOrganizationId: (...args: unknown[]) => getGalleryByOrganizationId(...args),
    addGalleryItem: (...args: unknown[]) => addGalleryItem(...args),
    updateGalleryItem: (...args: unknown[]) => updateGalleryItem(...args),
    deleteGalleryItem: (...args: unknown[]) => deleteGalleryItem(...args),
    reorderGalleryItems: (...args: unknown[]) => reorderGalleryItems(...args),
    uploadGalleryImage: (...args: unknown[]) => uploadGalleryImage(...args),
  },
}));

jest.mock("@/features/solicitudes/repositories/public-landing-cache.repository", () => ({
  publicLandingCacheRepository: {
    revalidate: (...args: unknown[]) => revalidatePublicLanding(...args),
  },
}));

describe("useLandingGallery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = { organizacionId: 10, cargando: false };
    getGalleryByOrganizationId.mockResolvedValue([...mockGallery]);
    addGalleryItem.mockResolvedValue({
      id: 3,
      organizationId: 10,
      imageUrl: "https://cdn.example.com/nueva.jpg",
      label: "Terraza",
      sortOrder: 2,
      isVisible: true,
      creadoEn: "2026-05-08T10:02:00Z",
    });
    updateGalleryItem.mockResolvedValue({
      id: 1,
      organizationId: 10,
      imageUrl: "https://cdn.example.com/foto1.jpg",
      label: "Mampara",
      sortOrder: 0,
      isVisible: true,
      creadoEn: "2026-05-08T10:00:00Z",
    });
    deleteGalleryItem.mockResolvedValue(undefined);
    reorderGalleryItems.mockResolvedValue(undefined);
    uploadGalleryImage.mockResolvedValue("https://cdn.example.com/uploaded.jpg");
    revalidatePublicLanding.mockResolvedValue(true);
  });

  it("carga la galeria al montar", async () => {
    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getGalleryByOrganizationId).toHaveBeenCalledWith(10);
    expect(result.current.gallery).toHaveLength(2);
    expect(result.current.gallery[0].label).toBe("Ventana");
  });

  it("retorna galeria vacia si no hay organizacion", async () => {
    authState = { organizacionId: null, cargando: false };

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.gallery).toEqual([]);
  });

  it("uploadAndAddImage sube imagen y agrega item", async () => {
    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(["data"], "foto.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.uploadAndAddImage(file, "Terraza");
    });

    expect(uploadGalleryImage).toHaveBeenCalledWith(10, file);
    expect(addGalleryItem).toHaveBeenCalledWith(10, {
      imageUrl: "https://cdn.example.com/uploaded.jpg",
      label: "Terraza",
    });
    expect(result.current.gallery).toHaveLength(3);
  });

  it("uploadAndAddImage lanza error si no hay organizacion", async () => {
    authState = { organizacionId: null, cargando: false };

    const { result } = renderHook(() => useLandingGallery());

    const file = new File(["data"], "foto.jpg", { type: "image/jpeg" });

    await act(async () => {
      await expect(
        result.current.uploadAndAddImage(file, "Test")
      ).rejects.toThrow("No hay organizacion activa");
    });
  });

  it("updateImage actualiza label e isVisible", async () => {
    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateImage(1, "Mampara", true);
    });

    expect(updateGalleryItem).toHaveBeenCalledWith(1, 10, {
      label: "Mampara",
      isVisible: true,
    });

    expect(result.current.gallery.find((i) => i.id === 1)?.label).toBe("Mampara");
  });

  it("updateImage lanza error si no hay organizacion", async () => {
    authState = { organizacionId: null, cargando: false };

    const { result } = renderHook(() => useLandingGallery());

    await act(async () => {
      await expect(
        result.current.updateImage(1, "Test", true)
      ).rejects.toThrow("No hay organizacion activa");
    });
  });

  it("updateImage maneja error del service", async () => {
    updateGalleryItem.mockRejectedValue(new Error("Error al actualizar"));

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.updateImage("1", "Test", true);
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe("Error al actualizar");
  });

  it("deleteImage elimina el item de la galeria", async () => {
    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteImage(1);
    });

    expect(deleteGalleryItem).toHaveBeenCalledWith(1, 10);
    expect(result.current.gallery).toHaveLength(1);
    expect(result.current.gallery[0].id).toBe(2);
  });

  it("deleteImage lanza error si no hay organizacion", async () => {
    authState = { organizacionId: null, cargando: false };

    const { result } = renderHook(() => useLandingGallery());

    await act(async () => {
      await expect(
        result.current.deleteImage("1")
      ).rejects.toThrow("No hay organizacion activa");
    });
  });

  it("deleteImage maneja error del service", async () => {
    deleteGalleryItem.mockRejectedValue(new Error("Error al eliminar"));

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.deleteImage(1);
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe("Error al eliminar");
    expect(result.current.gallery).toHaveLength(2);
  });

  it("reorderImages actualiza sortOrder localmente", async () => {
    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newOrder: ReorderLandingGalleryItemInput[] = [
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
    ];

    await act(async () => {
      await result.current.reorderImages(newOrder);
    });

    expect(reorderGalleryItems).toHaveBeenCalledWith(10, newOrder);
    expect(result.current.gallery[0].id).toBe(2);
    expect(result.current.gallery[0].sortOrder).toBe(0);
  });

  it("reorderImages lanza error si no hay organizacion", async () => {
    authState = { organizacionId: null, cargando: false };

    const { result } = renderHook(() => useLandingGallery());

    const newOrder: ReorderLandingGalleryItemInput[] = [{ id: 1, sortOrder: 0 }];

    await act(async () => {
      await expect(
        result.current.reorderImages(newOrder)
      ).rejects.toThrow("No hay organizacion activa");
    });
  });

  it("reorderImages maneja error del service", async () => {
    reorderGalleryItems.mockRejectedValue(new Error("Error al reordenar"));

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newOrder: ReorderLandingGalleryItemInput[] = [{ id: 1, sortOrder: 0 }];

    await act(async () => {
      try {
        await result.current.reorderImages(newOrder);
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe("Error al reordenar");
  });

  it("maneja error en carga y lo expone", async () => {
    getGalleryByOrganizationId.mockRejectedValue(new Error("Fallo de red"));

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Fallo de red");
    expect(result.current.gallery).toEqual([]);
  });

  it("maneja error en uploadAndAddImage", async () => {
    uploadGalleryImage.mockRejectedValue(new Error("Storage error"));

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(["data"], "foto.jpg", { type: "image/jpeg" });

    await act(async () => {
      try {
        await result.current.uploadAndAddImage(file, "Test");
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe("Storage error");
  });

  it("isUploading se activa durante subida", async () => {
    let resolveUpload: (url: string) => void;
    const uploadPromise = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    uploadGalleryImage.mockReturnValue(uploadPromise);

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(["data"], "foto.jpg", { type: "image/jpeg" });

    act(() => {
      void result.current.uploadAndAddImage(file, "Test");
    });

    expect(result.current.isUploading).toBe(true);

    await act(async () => {
      resolveUpload!("https://cdn.example.com/uploaded.jpg");
    });

    expect(result.current.isUploading).toBe(false);
  });

  it("isUploading se resetea en error", async () => {
    let rejectUpload: (error: Error) => void;
    const uploadPromise = new Promise<string>((_, reject) => {
      rejectUpload = reject;
    });
    uploadGalleryImage.mockReturnValue(uploadPromise);

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(["data"], "foto.jpg", { type: "image/jpeg" });

    act(() => {
      void result.current.uploadAndAddImage(file, "Test").catch(() => {});
    });

    expect(result.current.isUploading).toBe(true);

    await act(async () => {
      rejectUpload!(new Error("Upload failed"));
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBe("Upload failed");
  });

  it("loadGallery puede ser llamada manualmente para recargar", async () => {
    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getGalleryByOrganizationId).toHaveBeenCalledTimes(1);

    const updatedGallery = [mockGallery[0]];
    getGalleryByOrganizationId.mockResolvedValue(updatedGallery);

    await act(async () => {
      await result.current.loadGallery();
    });

    expect(getGalleryByOrganizationId).toHaveBeenCalledTimes(2);
    expect(result.current.gallery).toHaveLength(1);
  });

  it("maneja error que no es instancia de Error en carga", async () => {
    getGalleryByOrganizationId.mockRejectedValue("error string");

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("No se pudo cargar la galeria");
  });

  it("maneja error que no es instancia de Error en uploadAndAddImage", async () => {
    uploadGalleryImage.mockRejectedValue("error string");

    const { result } = renderHook(() => useLandingGallery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(["data"], "foto.jpg", { type: "image/jpeg" });

    await act(async () => {
      try {
        await result.current.uploadAndAddImage(file, "Test");
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe("No se pudo subir la foto");
  });
});
