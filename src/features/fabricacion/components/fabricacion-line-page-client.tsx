"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

type Props = {
  lineTemplateId: number;
  initialSuggestedRecipeId?: string | null;
  returnToCatalog?: boolean;
};

function FabricacionRouteLoading() {
  return (
    <div role="status" aria-live="polite" className="p-6 text-sm text-slate-600">
      Cargando fabricación…
    </div>
  );
}

const FabricacionLineWorkspace = dynamic(
  () =>
    import("@/features/fabricacion/components/fabricacion-line-workspace").then(
      (module) => module.FabricacionLineWorkspace
    ),
  { loading: FabricacionRouteLoading }
);

const FabricacionLineMobileShell = dynamic(
  () =>
    import("@/features/fabricacion/components/mobile/fabricacion-line-mobile-shell").then(
      (module) => module.FabricacionLineMobileShell
    ),
  { loading: FabricacionRouteLoading }
);

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
  returnToCatalog = false,
}: Props) {
  const catalogBackHref = returnToCatalog
    ? "/configuracion/empresa/lineas-precios?restaurarFabricacion=1"
    : "/configuracion/empresa/lineas-precios";
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
        catalogBackHref={catalogBackHref}
      />
    );
  }

  return (
    <FabricacionLineMobileShell
      lineTemplateId={lineTemplateId}
      initialSuggestedRecipeId={initialSuggestedRecipeId}
      catalogBackHref={catalogBackHref}
    />
  );
}
