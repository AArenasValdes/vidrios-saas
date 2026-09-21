import "server-only";

import { createProductFeedbackRepository } from "@/features/product-feedback/repositories/product-feedback.repository";
import {
  isProductFeedbackCategory,
  type ProductFeedbackSubmission,
} from "@/features/product-feedback/types/product-feedback";

export class ProductFeedbackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductFeedbackValidationError";
  }
}

export function parseProductFeedbackSubmission(value: unknown): ProductFeedbackSubmission {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProductFeedbackValidationError("Revisa los datos de tu propuesta.");
  }

  const input = value as Record<string, unknown>;
  if (!isProductFeedbackCategory(input.category)) {
    throw new ProductFeedbackValidationError("Elige un área para tu propuesta.");
  }

  const rawDescription = typeof input.description === "string" ? input.description : "";
  const description = rawDescription.trim();
  if (description.length > 1000) {
    throw new ProductFeedbackValidationError("El comentario puede tener hasta 1.000 caracteres.");
  }

  const rawPagePath = typeof input.pagePath === "string" ? input.pagePath.trim() : "";
  const pagePath = rawPagePath.startsWith("/") && !rawPagePath.startsWith("//")
    ? rawPagePath.split(/[?#]/, 1)[0].slice(0, 180)
    : null;

  return {
    category: input.category,
    description: description || null,
    pagePath: pagePath || null,
  };
}

export async function submitProductFeedback(
  submission: ProductFeedbackSubmission & {
    organizationId: string | number;
    authUserId: string;
  }
) {
  const repository = createProductFeedbackRepository();
  await repository.insert(submission);
}
