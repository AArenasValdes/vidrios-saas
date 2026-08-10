"use client";

import { useEffect, useLayoutEffect } from "react";

type Options = {
  active?: boolean;
  lockBodyScroll?: boolean;
};

const VIEWPORT_HEIGHT_VAR = "--cq-viewport-height";
const VIEWPORT_TOP_VAR = "--cq-viewport-top";

let viewportConsumers = 0;
let bodyLockConsumers = 0;
let previousBodyOverflow = "";
let previousBodyOverscrollBehavior = "";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function syncViewportVariables() {
  if (typeof window === "undefined") return;

  const viewport = window.visualViewport;
  const height = Math.max(1, Math.round(viewport?.height ?? window.innerHeight));
  const top = Math.max(0, Math.round(viewport?.offsetTop ?? 0));

  document.documentElement.style.setProperty(VIEWPORT_HEIGHT_VAR, `${height}px`);
  document.documentElement.style.setProperty(VIEWPORT_TOP_VAR, `${top}px`);
}

function clearViewportVariables() {
  document.documentElement.style.removeProperty(VIEWPORT_HEIGHT_VAR);
  document.documentElement.style.removeProperty(VIEWPORT_TOP_VAR);
}

/**
 * Keeps fixed mobile surfaces inside Safari's visual viewport while the
 * keyboard, browser chrome or orientation changes the available height.
 * Consumers are reference-counted because Constructor can open Composition
 * without unmounting its parent surface.
 */
export function useMobileViewportStability({
  active = true,
  lockBodyScroll = true,
}: Options = {}) {
  useClientLayoutEffect(() => {
    if (!active || typeof window === "undefined") return;

    viewportConsumers += 1;
    syncViewportVariables();

    const viewport = window.visualViewport;
    const handleViewportChange = () => syncViewportVariables();
    viewport?.addEventListener("resize", handleViewportChange);
    viewport?.addEventListener("scroll", handleViewportChange);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    if (lockBodyScroll) {
      if (bodyLockConsumers === 0) {
        previousBodyOverflow = document.body.style.overflow;
        previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
      }
      bodyLockConsumers += 1;
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    }

    return () => {
      viewport?.removeEventListener("resize", handleViewportChange);
      viewport?.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);

      viewportConsumers = Math.max(0, viewportConsumers - 1);
      if (viewportConsumers === 0) {
        clearViewportVariables();
      }

      if (lockBodyScroll) {
        bodyLockConsumers = Math.max(0, bodyLockConsumers - 1);
        if (bodyLockConsumers === 0) {
          document.body.style.overflow = previousBodyOverflow;
          document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
        }
      }
    };
  }, [active, lockBodyScroll]);
}
