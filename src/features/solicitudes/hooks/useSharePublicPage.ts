"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  sharePublicPage,
  type SharePublicPageInput,
  type SharePublicPageResult,
} from "@/features/solicitudes/services/share-public-page.service";

const COPIED_FEEDBACK = "Enlace copiado";
const COPIED_MS = 2000;

export function useSharePublicPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const sharePage = useCallback(
    async (
      input: SharePublicPageInput,
      key = "default"
    ): Promise<SharePublicPageResult> => {
      const result = await sharePublicPage(input);

      if (result !== "copied") {
        return result;
      }

      setCopiedKey(key);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
        timeoutRef.current = null;
      }, COPIED_MS);

      return result;
    },
    []
  );

  return {
    sharePage,
    copiedKey,
    copiedFeedback: COPIED_FEEDBACK,
    isCopied: (key = "default") => copiedKey === key,
  };
}
