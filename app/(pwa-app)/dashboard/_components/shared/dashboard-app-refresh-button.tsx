"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  fetchRemoteAppVersion,
  forceAppUpdate,
  repairAppOnThisDevice,
} from "@/components/pwa/update-checker";
import { CURRENT_APP_VERSION } from "@/utils/app-version";

type DashboardAppRefreshButtonProps = {
  className?: string;
  label?: string;
};

const RELOAD_FALLBACK_MS = 900;

function reloadSoon() {
  window.setTimeout(() => {
    window.location.reload();
  }, RELOAD_FALLBACK_MS);
}

export function DashboardAppRefreshButton({
  className,
  label = "Actualizar",
}: DashboardAppRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setHasPendingUpdate(true);
    };

    window.addEventListener("ventora:app-update-available", handleUpdateAvailable);
    return () => {
      window.removeEventListener("ventora:app-update-available", handleUpdateAvailable);
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const remoteVersion = await fetchRemoteAppVersion();
      const shouldTryServiceWorkerUpdate =
        hasPendingUpdate || Boolean(remoteVersion && remoteVersion !== CURRENT_APP_VERSION);

      if (shouldTryServiceWorkerUpdate) {
        const result = await forceAppUpdate();
        if (result === "update-activated") {
          reloadSoon();
          return;
        }
      }

      await repairAppOnThisDevice();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, [hasPendingUpdate, isRefreshing]);

  return (
    <button
      aria-label="Actualizar app"
      className={className}
      data-refreshing={isRefreshing}
      disabled={isRefreshing}
      onClick={handleRefresh}
      title="Actualizar app"
      type="button"
    >
      <RefreshCw aria-hidden size={15} />
      <span>{isRefreshing ? "Actualizando" : label}</span>
    </button>
  );
}
