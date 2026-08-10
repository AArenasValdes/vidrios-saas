import type {
  FabricacionAdvertencia,
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

function emptyResult(advertencias: FabricacionAdvertencia[]): FabricacionPautaBarras {
  return {
    calculable: false,
    barras: [],
    advertencias,
    totalUsadoMm: 0,
    totalPerdidaCortesMm: 0,
    totalSobranteMm: 0,
  };
}

export function construirPautaBarrasFabricacion(input: {
  receta: FabricacionReceta;
  resultado: FabricacionResultadoCubicacion;
}): FabricacionPautaBarras {
  const configuracion = input.receta.configuracionCorte;
  if (
    configuracion?.perdidaCorteMm == null ||
    configuracion.despunteInicialMm == null ||
    configuracion.sobranteMinimoAprovechableMm == null
  ) {
    return emptyResult([
      {
        codigo: "PAUTA_BARRAS_INCOMPLETA",
        nivel: "advertencia",
        mensaje:
          "Configura perdida por corte, despunte inicial y sobrante minimo para distribuir barras.",
      },
    ]);
  }

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
    const consumo = corte.largoMm + configuracion.perdidaCorteMm!;
    const capacidadUtil =
      corte.largoComercialMm - configuracion.despunteInicialMm!;

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
        despunteInicialMm: configuracion.despunteInicialMm!,
        usadoMm: configuracion.despunteInicialMm!,
        perdidaCortesMm: 0,
        sobranteMm: capacidadUtil,
        sobranteAprovechable:
          capacidadUtil >= configuracion.sobranteMinimoAprovechableMm!,
        cortes: [],
      } satisfies FabricacionBarraPauta);

    if (!existente) barras.push(barra);
    barra.usadoMm += consumo;
    barra.perdidaCortesMm += configuracion.perdidaCorteMm!;
    barra.sobranteMm = Math.max(barra.largoComercialMm - barra.usadoMm, 0);
    barra.sobranteAprovechable =
      barra.sobranteMm >= configuracion.sobranteMinimoAprovechableMm!;
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
