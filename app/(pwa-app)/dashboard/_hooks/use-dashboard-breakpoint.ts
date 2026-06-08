"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 861px)";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(DESKTOP_QUERY);
  const listener = () => onStoreChange();
  mediaQuery.addEventListener("change", listener);

  return () => mediaQuery.removeEventListener("change", listener);
}

function getSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useDashboardBreakpoint() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
