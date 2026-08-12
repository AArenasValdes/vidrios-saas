import type {
  FabricacionAdvertencia,
  FabricacionConfiguracionCorte,
  FabricacionReceta,
  FabricacionResultadoCubicacion,
} from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricacionBarraPauta,
  FabricacionPautaBarras,
} from "@/features/fabricacion/types/fabricacion-snapshot";
import { resolvePerfilMaterialKey } from "@/features/fabricacion/services/taller-perfiles.service";

type CorteExpandido = {
  componenteId: string;
  codigoPerfil: string;
  nombrePerfil: string;
  funcion: string;
  largoMm: number;
  largoComercialMm: number;
};

/** Sin valores explícitos: el ajuste mm de cada perfil ya descuenta la sierra. */
export const FABRICACION_CORTE_POR_DEFECTO: FabricacionConfiguracionCorte = {
  perdidaCorteMm: 0,
  despunteInicialMm: 0,
  sobranteMinimoAprovechableMm: 0,
};

export function resolveConfiguracionCorteParaPauta(
  configuracion?: FabricacionConfiguracionCorte | null
): {
  perdidaCorteMm: number;
  despunteInicialMm: number;
  sobranteMinimoAprovechableMm: number;
} {
  return {
    perdidaCorteMm:
      configuracion?.perdidaCorteMm ?? FABRICACION_CORTE_POR_DEFECTO.perdidaCorteMm ?? 0,
    despunteInicialMm:
      configuracion?.despunteInicialMm ??
      FABRICACION_CORTE_POR_DEFECTO.despunteInicialMm ??
      0,
    sobranteMinimoAprovechableMm:
      configuracion?.sobranteMinimoAprovechableMm ??
      FABRICACION_CORTE_POR_DEFECTO.sobranteMinimoAprovechableMm ??
      0,
  };
}

export function construirPautaBarrasFabricacion(input: {
  receta: FabricacionReceta;
  resultado: FabricacionResultadoCubicacion;
}): FabricacionPautaBarras {
  const configuracion = resolveConfiguracionCorteParaPauta(
    input.receta.configuracionCorte
  );

  const advertencias: FabricacionAdvertencia[] = [];
  const cortes: CorteExpandido[] = [];

  input.resultado.perfiles.forEach((fila) => {
    const perfil = input.receta.perfiles.find(
      (componente) => componente.id === fila.componenteId
    );
    if (!perfil?.largoComercialMm) {
      advertencias.push({
        codigo: "PERFIL_SIN_DATOS_DE_BARRA",
        nivel: "advertencia",
        mensaje: `${fila.funcion}: agrega el largo comercial para calcular barras.`,
        componenteId: fila.componenteId,
      });
      return;
    }

    // Misma identidad de perfil de taller = mismo material de barra.
    const barraKey = resolvePerfilMaterialKey(perfil);

    for (let index = 0; index < fila.cantidadPiezas; index += 1) {
      cortes.push({
        componenteId: fila.componenteId,
        codigoPerfil: barraKey,
        nombrePerfil: perfil.nombrePerfil.trim() || fila.nombrePerfil || fila.funcion,
        funcion: fila.funcion,
        largoMm: fila.medidaMm,
        largoComercialMm: perfil.largoComercialMm,
      });
    }
  });

  const barras: FabricacionBarraPauta[] = [];
  const ordenados = cortes.sort((left, right) => right.largoMm - left.largoMm);

  ordenados.forEach((corte) => {
    const consumo = corte.largoMm + configuracion.perdidaCorteMm;
    const capacidadUtil = corte.largoComercialMm - configuracion.despunteInicialMm;

    if (consumo > capacidadUtil) {
      advertencias.push({
        codigo: "CORTE_SUPERA_BARRA_COMERCIAL",
        nivel: "error",
        mensaje: `${corte.funcion}: ${corte.largoMm} mm supera la barra comercial de ${corte.largoComercialMm} mm.`,
        componenteId: corte.componenteId,
      });
      return;
    }

    const existente = barras.find(
      (barra) =>
        barra.codigoPerfil === corte.codigoPerfil &&
        barra.largoComercialMm === corte.largoComercialMm &&
        barra.usadoMm + consumo <= barra.largoComercialMm
    );
    const barra =
      existente ??
      ({
        codigoPerfil: corte.codigoPerfil,
        nombrePerfil: corte.nombrePerfil,
        indice:
          barras.filter((entry) => entry.codigoPerfil === corte.codigoPerfil)
            .length + 1,
        largoComercialMm: corte.largoComercialMm,
        despunteInicialMm: configuracion.despunteInicialMm,
        usadoMm: configuracion.despunteInicialMm,
        perdidaCortesMm: 0,
        sobranteMm: capacidadUtil,
        sobranteAprovechable:
          capacidadUtil >= configuracion.sobranteMinimoAprovechableMm,
        cortes: [],
      } satisfies FabricacionBarraPauta);

    if (!existente) barras.push(barra);
    barra.usadoMm += consumo;
    barra.perdidaCortesMm += configuracion.perdidaCorteMm;
    barra.sobranteMm = Math.max(barra.largoComercialMm - barra.usadoMm, 0);
    barra.sobranteAprovechable =
      barra.sobranteMm >= configuracion.sobranteMinimoAprovechableMm;
    barra.cortes.push({
      componenteId: corte.componenteId,
      codigoPerfil: corte.codigoPerfil,
      funcion: corte.funcion,
      largoMm: corte.largoMm,
    });
  });

  return {
    calculable:
      barras.length > 0 && !advertencias.some((entry) => entry.nivel === "error"),
    barras,
    advertencias,
    totalUsadoMm: barras.reduce((sum, barra) => sum + barra.usadoMm, 0),
    totalPerdidaCortesMm: barras.reduce(
      (sum, barra) => sum + barra.perdidaCortesMm,
      0
    ),
    totalSobranteMm: barras.reduce((sum, barra) => sum + barra.sobranteMm, 0),
  };
}
