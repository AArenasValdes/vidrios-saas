export const PRODUCT_ANNOUNCEMENT_CATEGORIES = [
  { value: "nueva_funcion", label: "Nueva función" },
  { value: "mejora", label: "Mejora" },
  { value: "correccion", label: "Corrección" },
  { value: "general", label: "General" },
] as const;

export type ProductAnnouncementCategory =
  (typeof PRODUCT_ANNOUNCEMENT_CATEGORIES)[number]["value"];
export type ProductAnnouncementStatus = "draft" | "published" | "archived";

export type ProductAnnouncement = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: ProductAnnouncementCategory;
  status: ProductAnnouncementStatus;
  publishedAt: string | null;
  actionLabel: string | null;
  actionHref: string | null;
  isRead: boolean;
  createdAt: string;
};

export type AdminProductAnnouncement = Omit<ProductAnnouncement, "isRead"> & {
  updatedAt: string;
  relatedFeedbackId: string | null;
};

export type CompletedFeedbackOption = {
  id: string;
  label: string;
  description: string | null;
};

export type AdminProductAnnouncementWorkspace = {
  announcements: AdminProductAnnouncement[];
  completedSuggestions: CompletedFeedbackOption[];
};

export type ProductAnnouncementInput = {
  title: string;
  summary: string;
  body: string;
  category: ProductAnnouncementCategory;
  actionLabel: string | null;
  actionHref: string | null;
  relatedFeedbackId: string | null;
};

export function isProductAnnouncementCategory(
  value: unknown
): value is ProductAnnouncementCategory {
  return PRODUCT_ANNOUNCEMENT_CATEGORIES.some((item) => item.value === value);
}

export function isProductAnnouncementStatus(
  value: unknown
): value is ProductAnnouncementStatus {
  return value === "draft" || value === "published" || value === "archived";
}
