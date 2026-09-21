"use client";

import { useMemo } from "react";

import type { GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  resolveComponentPreviewSvg,
  shouldRenderComponentPreview,
  type ComponentPreviewInput,
} from "@/features/cotizaciones/services/resolve-component-preview-svg";

import s from "./component-preview.module.css";

export type ComponentPreviewProps = {
  type: string;
  system?: string | null;
  configuration?: string | null;
  width?: number | null;
  height?: number | null;
  colorHex?: string | null;
  material?: string | null;
  sheetScheme?: string | null;
  sheetVariant?: string | null;
  presentation?: "mobile-guided";
  customSchemeDescription?: string | null;
  isCustomScheme?: boolean;
  hojasBase?: 1 | 2 | 3 | 4 | 5 | null;
  referencia?: string | null;
  palilloEnabled?: boolean;
  palilloType?: string | null;
  mirrorFormat?: "single" | "divided";
  mirrorPaneCount?: number | null;
  mirrorPaneDirection?: "vertical" | "horizontal";
  mirrorInteriorLine?: "fine" | "marked";
  guidedVisualConfig?: GuidedVisualConfig | null;
  maxW?: number;
  maxH?: number;
  className?: string;
  size?: "compact" | "default" | "hero";
  fallbackLabel?: string;
  ariaLabel?: string;
};

function buildPreviewInput(props: ComponentPreviewProps): ComponentPreviewInput {
  return {
    type: props.type,
    system: props.system,
    configuration: props.configuration,
    width: props.width,
    height: props.height,
    colorHex: props.colorHex,
    material: props.material,
    sheetScheme: props.sheetScheme,
    sheetVariant: props.sheetVariant,
    presentation: props.presentation,
    customSchemeDescription: props.customSchemeDescription,
    isCustomScheme: props.isCustomScheme,
    hojasBase: props.hojasBase,
    referencia: props.referencia,
    palilloEnabled: props.palilloEnabled,
    palilloType: props.palilloType,
    mirrorFormat: props.mirrorFormat,
    mirrorPaneCount: props.mirrorPaneCount,
    mirrorPaneDirection: props.mirrorPaneDirection,
    mirrorInteriorLine: props.mirrorInteriorLine,
    guidedVisualConfig: props.guidedVisualConfig,
    maxW: props.maxW,
    maxH: props.maxH,
  };
}

export function ComponentPreview(props: ComponentPreviewProps) {
  const {
    type,
    className,
    size = "default",
    fallbackLabel,
    ariaLabel,
  } = props;

  const previewInput = useMemo(() => buildPreviewInput(props), [
    props.colorHex,
    props.configuration,
    props.customSchemeDescription,
    props.guidedVisualConfig,
    props.height,
    props.hojasBase,
    props.isCustomScheme,
    props.material,
    props.maxH,
    props.maxW,
    props.mirrorFormat,
    props.mirrorInteriorLine,
    props.mirrorPaneCount,
    props.mirrorPaneDirection,
    props.palilloEnabled,
    props.palilloType,
    props.presentation,
    props.referencia,
    props.sheetScheme,
    props.sheetVariant,
    props.system,
    props.type,
    props.width,
  ]);

  const svgMarkup = useMemo(
    () => resolveComponentPreviewSvg(previewInput),
    [previewInput]
  );

  if (!shouldRenderComponentPreview(type)) {
    return null;
  }

  const sizeClass =
    size === "compact" ? s.wrapCompact : size === "hero" ? s.wrapHero : "";

  if (!svgMarkup) {
    return (
      <div
        className={[s.wrap, sizeClass, className].filter(Boolean).join(" ")}
        aria-label={ariaLabel ?? fallbackLabel ?? type}
      >
        <span className={s.fallback}>{fallbackLabel ?? type.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <div
      className={[s.wrap, sizeClass, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel ?? type}
    >
      <div
        className={s.svgHost}
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  );
}
