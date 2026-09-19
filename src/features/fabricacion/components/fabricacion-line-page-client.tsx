"use client";

import { useSyncExternalStore } from "react";

import { FabricacionLineWorkspace } from "@/features/fabricacion/components/fabricacion-line-workspace";
import { FabricacionLineMobileShell } from "@/features/fabricacion/components/mobile/fabricacion-line-mobile-shell";

type Props = {
  lineTemplateId: number;
  initialSuggestedRecipeId?: string | null;
};

function subscribeDesktopViewport(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(min-width: 1024px)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getDesktopViewportSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function getDesktopViewportServerSnapshot() {
  return false;
}

export function FabricacionLinePageClient({
  lineTemplateId,
  initialSuggestedRecipeId = null,
}: Props) {
  const isDesktopWorkspace = useSyncExternalStore(
    subscribeDesktopViewport,
    getDesktopViewportSnapshot,
    getDesktopViewportServerSnapshot
  );

  if (isDesktopWorkspace) {
    return (
      <FabricacionLineWorkspace
        lineTemplateId={lineTemplateId}
        initialSuggestedRecipeId={initialSuggestedRecipeId}
      />
    );
  }

  return (
    <FabricacionLineMobileShell
      lineTemplateId={lineTemplateId}
      initialSuggestedRecipeId={initialSuggestedRecipeId}
    />
  );
}
