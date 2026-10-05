import type { FabricacionResultadoCubicacion } from "@/features/fabricacion/types/fabricacion-domain";

/**
 * Feedback del cálculo exploratorio del taller. Una receta incompleta puede
 * mostrar los resultados calculados, pero esto no habilita activación,
 * pruebas formales ni snapshots.
 */
export function obtenerFeedbackPruebaFabricacion(
  resultado: FabricacionResultadoCubicacion
): string | null {
  const error = resultado.advertencias.find(
    (advertencia) => advertencia.nivel === "error"
  );
  if (error) return `Hay un problema en la configuración: ${error.mensaje}`;

  const tieneResultados =
    resultado.perfiles.length > 0 ||
    resultado.vidrios.length > 0 ||
    resultado.accesorios.length > 0;
  if (tieneResultados) return null;

  return "No se pudo calcular con estas medidas. Revisa la configuración.";
}

/** Quita el aviso antiguo preservado por HMR si el resultado actual sí existe. */
export function resolverFeedbackVisiblePruebaFabricacion(
  feedback: string | null,
  resultado: FabricacionResultadoCubicacion | null
): string | null {
  if (!feedback?.startsWith("No se pudo calcular con estas medidas.")) {
    return feedback;
  }
  return resultado ? obtenerFeedbackPruebaFabricacion(resultado) : feedback;
}
