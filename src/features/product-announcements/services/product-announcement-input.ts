import {
  isProductAnnouncementCategory,
  isProductAnnouncementStatus,
  type ProductAnnouncementInput,
  type ProductAnnouncementStatus,
} from "@/features/product-announcements/types/product-announcement";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseProductAnnouncementInput(value: unknown): ProductAnnouncementInput | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const summary = typeof record.summary === "string" ? record.summary.trim() : "";
  const body = typeof record.body === "string" ? record.body.trim() : "";
  const category = record.category;
  const actionLabel = typeof record.actionLabel === "string" ? record.actionLabel.trim() : "";
  const actionHref = typeof record.actionHref === "string" ? record.actionHref.trim() : "";
  const relatedFeedbackId = record.relatedFeedbackId === undefined || record.relatedFeedbackId === null || record.relatedFeedbackId === ""
    ? null
    : record.relatedFeedbackId;

  if (
    title.length < 1 || title.length > 120 ||
    summary.length < 1 || summary.length > 240 ||
    body.length < 1 || body.length > 6000 ||
    !isProductAnnouncementCategory(category) ||
    actionLabel.length > 48 || actionHref.length > 180 ||
    Boolean(actionLabel) !== Boolean(actionHref) ||
    (actionHref !== "" && (!actionHref.startsWith("/") || actionHref.startsWith("//"))) ||
    (relatedFeedbackId !== null && (typeof relatedFeedbackId !== "string" || !UUID_PATTERN.test(relatedFeedbackId)))
  ) {
    return null;
  }

  return {
    title,
    summary,
    body,
    category,
    actionLabel: actionLabel || null,
    actionHref: actionHref || null,
    relatedFeedbackId: relatedFeedbackId as string | null,
  };
}

export function parseProductAnnouncementStatus(value: unknown): ProductAnnouncementStatus | null {
  return isProductAnnouncementStatus(value) ? value : null;
}

export function isProductAnnouncementId(value: string) {
  return UUID_PATTERN.test(value);
}
