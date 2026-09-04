import {
  describePerfilSheetMeasure,
  describePerfilTallerResumen,
  resolveLargoComercialMm,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type {
  FabricacionAccesorio,
  FabricacionReceta,
  FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";

export type RecetaListaParaProbarEvaluacion = {
  listaParaProbar: boolean;
  bloqueos: string[];
};

function profileLabel(
  profile: Pick<
    import("@/features/fabricacion/types/fabricacion-domain").FabricacionComponentePerfil,
    "codigoPerfil" | "nombrePerfil" | "funcion"
  >
) {
  return (
    profile.codigoPerfil?.trim() ||
    profile.nombrePerfil?.trim() ||
    profile.funcion?.trim() ||
    "perfil"
  );
}

function glassMeasurePending(glass: FabricacionVidrio): boolean {
  const pendingDiscount = (glass.datosPendientes ?? []).some((detail) =>
    /descuento|ajuste/i.test(detail)
  );
  const widthUnset = glass.reglaAncho.ajusteMm == null && glass.reglaAncho.base !== "fijo_mm";
  const heightUnset = glass.reglaAlto.ajusteMm == null && glass.reglaAlto.base !== "fijo_mm";
  const fixedWidthMissing =
    glass.reglaAncho.base === "fijo_mm" &&
    (glass.reglaAncho.valorFijoMm == null || glass.reglaAncho.valorFijoMm <= 0);
  const fixedHeightMissing =
    glass.reglaAlto.base === "fijo_mm" &&
    (glass.reglaAlto.valorFijoMm == null || glass.reglaAlto.valorFijoMm <= 0);

  return (
    pendingDiscount ||
    widthUnset ||
    heightUnset ||
    fixedWidthMissing ||
    fixedHeightMissing
  );
}

function evaluateRequiredAccessory(accessory: FabricacionAccesorio, bloqueos: string[]) {
  if (!accessory.nombre?.trim()) {
    bloqueos.push("Accesorio requerido sin nombre");
    return;
  }
  if (!accessory.codigo?.trim()) {
    bloqueos.push(`Accesorio requerido sin código: ${accessory.nombre}`);
  }
  if (!accessory.reglaCantidad?.cantidad || accessory.reglaCantidad.cantidad <= 0) {
    bloqueos.push(`Accesorio requerido sin cantidad: ${accessory.nombre}`);
  }
}

/**
 * Criterio estricto para habilitar "Probar fabricación" / pauta confiable.
 * No inventa datos: exige código, componente, fórmula, descuento, cantidad,
 * largo comercial, accesorios requeridos y vidrio requerido completos.
 */
export function evaluarRecetaListaParaProbar(
  receta: FabricacionReceta
): RecetaListaParaProbarEvaluacion {
  const bloqueos: string[] = [];

  if (receta.perfiles.length === 0) {
    bloqueos.push("Sin perfiles definidos");
  }

  receta.perfiles
    .filter((profile) => profile.requerido)
    .forEach((profile) => {
      const label = profileLabel(profile);

      if (!profile.codigoPerfil?.trim()) {
        bloqueos.push(`Falta código de perfil: ${label}`);
      }
      if (!profile.funcion?.trim() && !profile.nombrePerfil?.trim()) {
        bloqueos.push(`Falta componente identificado: ${label}`);
      }
      if (describePerfilSheetMeasure(profile).pending) {
        bloqueos.push(`Falta fórmula de medida: ${label}`);
      }
      if (describePerfilTallerResumen(profile).pendingDiscount) {
        bloqueos.push(`Falta descuento confirmado: ${label}`);
      }
      if (!profile.reglaCantidad?.cantidad || profile.reglaCantidad.cantidad <= 0) {
        bloqueos.push(`Falta cantidad: ${label}`);
      }
      if (resolveLargoComercialMm(profile, receta) <= 0) {
        bloqueos.push(`Falta largo comercial: ${label}`);
      }
    });

  const requiredGlass = receta.vidrios.filter((glass) => glass.requerido);
  if (requiredGlass.length === 0) {
    bloqueos.push("Falta vidrio definido");
  } else {
    requiredGlass.forEach((glass) => {
      if (!glass.nombre?.trim()) {
        bloqueos.push("Vidrio requerido sin nombre");
      }
      if (glassMeasurePending(glass)) {
        bloqueos.push(`Vidrio requerido sin fórmula completa: ${glass.nombre || "vidrio"}`);
      }
      if (!glass.reglaCantidad?.cantidad || glass.reglaCantidad.cantidad <= 0) {
        bloqueos.push(`Vidrio requerido sin cantidad: ${glass.nombre || "vidrio"}`);
      }
    });
  }

  receta.accesorios
    .filter((accessory) => accessory.requerido)
    .forEach((accessory) => evaluateRequiredAccessory(accessory, bloqueos));

  return {
    listaParaProbar: bloqueos.length === 0,
    bloqueos,
  };
}
