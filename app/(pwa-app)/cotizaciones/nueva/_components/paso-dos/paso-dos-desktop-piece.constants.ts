import type { IconType } from "react-icons";
import {
  LuAppWindow,
  LuDoorOpen,
  LuDroplets,
  LuFence,
  LuSquare,
  LuColumns3,
} from "react-icons/lu";

import { getComponentDescripcion } from "@/features/cotizaciones/services/component-catalog.service";

export const DESKTOP_FREQUENT_TYPES = [
  "Ventana",
  "Vidrio / Cristal",
  "Puerta",
  "Paño fijo",
  "Shower door",
  "Cierre terraza/logia",
  "Baranda",
] as const;

export const DESKTOP_OTHER_TYPES_PRIMARY = [
  "Espejo",
  "Cubierta de mesa",
  "Trabajo libre / Mantencion",
] as const;

export const DESKTOP_OTHER_TYPES_EXPANDED = [
  "Fachada vidriada",
  "Vitrina",
  "Muro cortina",
  "Lucarna o techo vidriado",
  "Trabajo personalizado",
] as const;

export const DESKTOP_OTHER_TYPES = [
  ...DESKTOP_OTHER_TYPES_PRIMARY,
  ...DESKTOP_OTHER_TYPES_EXPANDED,
] as const;

export const DESKTOP_TYPE_ICONS: Partial<Record<string, IconType>> = {
  Ventana: LuAppWindow,
  Puerta: LuDoorOpen,
  "Shower door": LuDroplets,
  "Cierre terraza/logia": LuFence,
  "Paño fijo": LuSquare,
  "Vidrio / Cristal": LuSquare,
  Baranda: LuColumns3,
};

export function getDesktopTypeStepHint(subtipo: string): string {
  const catalogHint = getComponentDescripcion(subtipo).trim();

  if (catalogHint) {
    return catalogHint;
  }

  return "Elige sistema, configuracion, medidas, color y vidrio.";
}

export function shortenCompositionLabel(label: string, max = 42): string {
  if (label.length <= max) {
    return label;
  }

  return `${label.slice(0, max - 3).trim()}...`;
}

export function buildDesktopConfigSummary(input: {
  sistema: string;
  configuracion: string;
  sheetScheme: string;
  sheetVariant: string;
}): string {
  const parts = [
    input.sistema,
    input.configuracion,
    input.sheetScheme,
    input.sheetVariant && input.sheetVariant !== "Otro" ? input.sheetVariant : "",
  ].filter(Boolean);

  return parts.join(" · ");
}
