import type {
  FabricationRecipeSourceType,
  FabricationRecipeStatus,
} from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";

/**
 * Procedencia comercial/técnica de una receta.
 * Independiente del país y del proveedor: no altera el motor de cubicación.
 *
 * - base_ventora: estructura tipológica sugerida (ajustes por confirmar)
 * - plantilla_ventora: plantilla con parámetros conocidos (L5000/L20/L25)
 * - receta_taller: configuración propia del taller
 * - borrador_ia: propuesta asistida; siempre revisable
 * - plantilla_verificada: línea/fabricante documentada (futuro; no implica motor aparte)
 */
export const FABRICACION_RECETA_PROCEDENCIAS = [
  "base_ventora",
  "plantilla_ventora",
  "receta_taller",
  "borrador_ia",
  "plantilla_verificada",
] as const;

export type FabricacionRecetaProcedencia =
  (typeof FABRICACION_RECETA_PROCEDENCIAS)[number];

export const FABRICACION_RECETA_PROCEDENCIA_LABEL: Record<
  FabricacionRecetaProcedencia,
  string
> = {
  base_ventora: "Base Ventora",
  plantilla_ventora: "Plantilla Ventora",
  receta_taller: "Receta del taller",
  borrador_ia: "Borrador con IA",
  plantilla_verificada: "Plantilla técnica verificada",
};

const BASE_VENTORA_PREFIX = "base-ventora:";
const BASE_TIPOLOGICA_PREFIX = "base-tipologica:";
const PLANTILLA_VENTORA_PREFIX = "plantilla-ventora:";
const PLANTILLA_VERIFICADA_PREFIX = "plantilla-verificada:";

export type FabricacionProcedenciaPersistence = {
  sourceType: FabricationRecipeSourceType;
  sourceReference: string | null;
};

export type FabricacionProcedenciaResolved = {
  procedencia: FabricacionRecetaProcedencia;
  label: string;
  detail: string | null;
  tipologica?: FabricacionTipologia | null;
  hojas?: number | null;
  plantillaId?: string | null;
};

export function buildBaseVentoraSourceReference(
  tipologica: FabricacionTipologia,
  hojas: number
): string {
  return `${BASE_VENTORA_PREFIX}${tipologica}:${Math.max(1, hojas)}`;
}

export function buildPlantillaVentoraSourceReference(plantillaId: string): string {
  return `${PLANTILLA_VENTORA_PREFIX}${plantillaId.trim()}`;
}

export function buildPlantillaVerificadaSourceReference(plantillaId: string): string {
  return `${PLANTILLA_VERIFICADA_PREFIX}${plantillaId.trim()}`;
}

export function buildProcedenciaPersistence(
  procedencia: FabricacionRecetaProcedencia,
  options?: {
    tipologica?: FabricacionTipologia | null;
    hojas?: number | null;
    plantillaId?: string | null;
  }
): FabricacionProcedenciaPersistence {
  switch (procedencia) {
    case "borrador_ia":
      return {
        sourceType: "imported_ai",
        sourceReference: "text-assistant",
      };
    case "base_ventora":
      return {
        sourceType: "manual",
        sourceReference: buildBaseVentoraSourceReference(
          options?.tipologica ?? "personalizada",
          options?.hojas ?? 1
        ),
      };
    case "plantilla_ventora":
      return {
        sourceType: "copied",
        sourceReference: buildPlantillaVentoraSourceReference(
          options?.plantillaId?.trim() || "sin-id"
        ),
      };
    case "plantilla_verificada":
      return {
        sourceType: "copied",
        sourceReference: buildPlantillaVerificadaSourceReference(
          options?.plantillaId?.trim() || "sin-id"
        ),
      };
    case "receta_taller":
    default:
      return {
        sourceType: "manual",
        sourceReference: "blank-start",
      };
  }
}

export function resolveProcedenciaFromSource(input: {
  sourceType: FabricationRecipeSourceType;
  sourceReference?: string | null;
}): FabricacionProcedenciaResolved {
  const reference = input.sourceReference?.trim() || "";

  if (
    input.sourceType === "imported_ai" ||
    reference === "text-assistant"
  ) {
    return {
      procedencia: "borrador_ia",
      label: FABRICACION_RECETA_PROCEDENCIA_LABEL.borrador_ia,
      detail: "Propuesta asistida. El maestro revisa y valida.",
    };
  }

  if (reference.startsWith(PLANTILLA_VENTORA_PREFIX)) {
    const plantillaId = reference.slice(PLANTILLA_VENTORA_PREFIX.length) || null;
    return {
      procedencia: "plantilla_ventora",
      label: FABRICACION_RECETA_PROCEDENCIA_LABEL.plantilla_ventora,
      detail: plantillaId
        ? `Validada en taller · ${plantillaId}`
        : "Validada en taller",
      plantillaId,
    };
  }

  if (reference.startsWith(PLANTILLA_VERIFICADA_PREFIX)) {
    const plantillaId = reference.slice(PLANTILLA_VERIFICADA_PREFIX.length) || null;
    return {
      procedencia: "plantilla_verificada",
      label: FABRICACION_RECETA_PROCEDENCIA_LABEL.plantilla_verificada,
      detail: plantillaId,
      plantillaId,
    };
  }

  if (
    reference.startsWith(BASE_VENTORA_PREFIX) ||
    reference.startsWith(BASE_TIPOLOGICA_PREFIX)
  ) {
    const raw = reference.startsWith(BASE_VENTORA_PREFIX)
      ? reference.slice(BASE_VENTORA_PREFIX.length)
      : reference.slice(BASE_TIPOLOGICA_PREFIX.length);
    const [tipologicaRaw, hojasRaw] = raw.split(":");
    const tipologica = (tipologicaRaw || null) as FabricacionTipologia | null;
    const hojas = hojasRaw ? Number(hojasRaw) : null;
    return {
      procedencia: "base_ventora",
      label: FABRICACION_RECETA_PROCEDENCIA_LABEL.base_ventora,
      detail: tipologica
        ? [tipologica.replaceAll("_", " "), hojas ? `${hojas} hojas` : null]
            .filter(Boolean)
            .join(" · ")
        : null,
      tipologica,
      hojas: Number.isFinite(hojas) ? hojas : null,
    };
  }

  if (reference === "blank-start" || input.sourceType === "manual") {
    return {
      procedencia: "receta_taller",
      label: FABRICACION_RECETA_PROCEDENCIA_LABEL.receta_taller,
      detail: null,
    };
  }

  if (input.sourceType === "copied") {
    return {
      procedencia: "plantilla_verificada",
      label: FABRICACION_RECETA_PROCEDENCIA_LABEL.plantilla_verificada,
      detail: reference || null,
      plantillaId: reference || null,
    };
  }

  return {
    procedencia: "receta_taller",
    label: FABRICACION_RECETA_PROCEDENCIA_LABEL.receta_taller,
    detail: null,
  };
}

/**
 * Una base/plantilla precargada NUNCA cuenta como validada.
 * Solo el estado persistido `validated` tras Paso 3 (prueba real) lo permite.
 */
export function isRecetaTecnicamenteValidada(
  status: FabricationRecipeStatus
): boolean {
  return status === "validated";
}
