"use client";

import { useCallback, useState } from "react";

import type { ProductFeedbackSubmission } from "@/features/product-feedback/types/product-feedback";

export function useProductFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (submission: ProductFeedbackSubmission) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/sugerencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos guardar tu propuesta.");
      }

      return true;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos guardar tu propuesta. Inténtalo otra vez."
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    isSubmitting,
    error,
    submit,
    resetError: () => setError(null),
  };
}
