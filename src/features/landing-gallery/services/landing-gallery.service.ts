import { landingGalleryRepository, type LandingGalleryRepository } from "@/features/landing-gallery/repositories/landing-gallery.repository";
import type { EntityId } from "@/types/common";
import type {
  CreateLandingGalleryItemInput,
  ReorderLandingGalleryItemInput,
  UpdateLandingGalleryItemInput,
} from "@/features/landing-gallery/types/landing-gallery";

type LandingGalleryServiceDeps = {
  repository?: LandingGalleryRepository;
};

const MAX_GALLERY_ITEMS = 8;

export function createLandingGalleryService(deps: LandingGalleryServiceDeps = {}) {
  const repository = deps.repository ?? landingGalleryRepository;

  return {
    async getGalleryByOrganizationId(organizationId: EntityId) {
      return repository.listByOrganizationId(organizationId);
    },

    async addGalleryItem(organizationId: EntityId, input: Omit<CreateLandingGalleryItemInput, "organizationId">) {
      const existing = await repository.listByOrganizationId(organizationId);

      if (existing.length >= MAX_GALLERY_ITEMS) {
        throw new Error(`No puedes tener mas de ${MAX_GALLERY_ITEMS} fotos en la galeria.`);
      }

      return repository.create({
        organizationId,
        imageUrl: input.imageUrl,
        label: input.label,
        sortOrder: input.sortOrder ?? existing.length,
        isVisible: input.isVisible ?? true,
      });
    },

    async updateGalleryItem(id: EntityId, organizationId: EntityId, input: UpdateLandingGalleryItemInput) {
      return repository.update(id, organizationId, input);
    },

    async deleteGalleryItem(id: EntityId, organizationId: EntityId) {
      return repository.delete(id, organizationId);
    },

    async reorderGalleryItems(organizationId: EntityId, items: ReorderLandingGalleryItemInput[]) {
      return repository.reorder(organizationId, items);
    },

    async uploadGalleryImage(organizationId: EntityId, file: File) {
      return repository.uploadGalleryImage(organizationId, file);
    },
  };
}

export const landingGalleryService = createLandingGalleryService();
