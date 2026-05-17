"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { landingGalleryService } from "@/features/landing-gallery/services/landing-gallery.service";
import type {
  LandingGalleryItem,
  ReorderLandingGalleryItemInput,
} from "@/features/landing-gallery/types/landing-gallery";

export function useLandingGallery() {
  const { organizacionId } = useAuth();
  const [gallery, setGallery] = useState<LandingGalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeLoadIdRef = useRef(0);

  useEffect(() => {
    if (!organizacionId) {
      setGallery([]);
      return;
    }

    const loadId = ++activeLoadIdRef.current;
    setIsLoading(true);
    setError(null);

    let cancelled = false;

    landingGalleryService
      .getGalleryByOrganizationId(organizacionId)
      .then((items) => {
        if (cancelled || loadId !== activeLoadIdRef.current) return;
        setGallery(items);
      })
      .catch((err) => {
        if (cancelled || loadId !== activeLoadIdRef.current) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la galeria");
      })
      .finally(() => {
        if (!cancelled && loadId === activeLoadIdRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      activeLoadIdRef.current += 1;
    };
  }, [organizacionId]);

  async function uploadAndAddImage(
    file: File,
    label: string,
    metadata?: {
      workTitle?: string;
      workType?: string;
      workZone?: string;
      workBadge?: string;
    }
  ) {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsUploading(true);
    setError(null);

    try {
      const imageUrl = await landingGalleryService.uploadGalleryImage(organizacionId, file);
      const item = await landingGalleryService.addGalleryItem(organizacionId, {
        imageUrl,
        label,
        workTitle: metadata?.workTitle,
        workType: metadata?.workType,
        workZone: metadata?.workZone,
        workBadge: metadata?.workBadge,
      });

      setGallery((current) => [...current, item]);

      return item;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto");
      throw err;
    } finally {
      setIsUploading(false);
    }
  }

  async function updateImage(
    id: string | number,
    input:
      | {
          label?: string;
          workTitle?: string;
          workType?: string;
          workZone?: string;
          workBadge?: string;
          isVisible: boolean;
        }
      | string,
    legacyIsVisible?: boolean
  ) {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setError(null);

    const normalizedInput =
      typeof input === "string"
        ? {
            label: input,
            isVisible: legacyIsVisible ?? true,
          }
        : input;

    try {
      const updated = await landingGalleryService.updateGalleryItem(id, organizacionId, {
        label: normalizedInput.label,
        workTitle: normalizedInput.workTitle,
        workType: normalizedInput.workType,
        workZone: normalizedInput.workZone,
        workBadge: normalizedInput.workBadge,
        isVisible: normalizedInput.isVisible,
      });

      setGallery((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );

      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la foto");
      throw err;
    }
  }

  async function deleteImage(id: string | number) {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setError(null);

    try {
      await landingGalleryService.deleteGalleryItem(id, organizacionId);
      setGallery((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la foto");
      throw err;
    }
  }

  async function reorderImages(items: ReorderLandingGalleryItemInput[]) {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setError(null);

    try {
      await landingGalleryService.reorderGalleryItems(organizacionId, items);
      setGallery((current) => {
        const orderMap = new Map(items.map((item) => [item.id, item.sortOrder]));

        return current
          .map((item) => ({
            ...item,
            sortOrder: orderMap.get(item.id) ?? item.sortOrder,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reordenar la galeria");
      throw err;
    }
  }

  async function loadGallery() {
    if (!organizacionId) {
      setGallery([]);
      return;
    }

    const loadId = ++activeLoadIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const items = await landingGalleryService.getGalleryByOrganizationId(organizacionId);

      if (loadId !== activeLoadIdRef.current) return;

      setGallery(items);
    } catch (err) {
      if (loadId !== activeLoadIdRef.current) return;

      setError(err instanceof Error ? err.message : "No se pudo cargar la galeria");
    } finally {
      if (loadId === activeLoadIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  return {
    gallery,
    isLoading,
    isUploading,
    error,
    loadGallery,
    uploadAndAddImage,
    updateImage,
    deleteImage,
    reorderImages,
  };
}
