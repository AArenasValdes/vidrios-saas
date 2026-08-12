/**
 * Multi-medida: despiece por fila → consolidar cortes → una sola pauta FFD.
 * No suma tiras por fila; permite compartir tira comercial entre medidas distintas.
 */

import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import type {
  FabricacionAccesorioResultado,
  FabricacionEntradaCalculo,
  FabricacionFilaPauta,
  FabricacionReceta,
  FabricacionResultadoCubicacion,
  FabricacionVidrioResultado,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricacionPautaBarras } from "@/features/fabricacion/types/fabricacion-snapshot";

export type FabricacionMedidaPrueba = {
  id: string;
  anchoTotalMm: number;
  altoTotalMm: number;
  cantidad: number;
  nombre?: string;
};

function mergeProfileRows(rows: FabricacionFilaPauta[]): FabricacionFilaPauta[] {
  const map = new Map<string, FabricacionFilaPauta>();
  for (const row of rows) {
    const key = `${row.componenteId}::${row.medidaMm}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row, trazabilidad: [...row.trazabilidad] });
      continue;
    }
    existing.cantidadPiezas += row.cantidadPiezas;
    existing.totalLinealMm += row.totalLinealMm;
    existing.trazabilidad = [...existing.trazabilidad, ...row.trazabilidad];
  }
  return Array.from(map.values());
}

function mergeGlassRows(
  rows: FabricacionVidrioResultado[]
): FabricacionVidrioResultado[] {
  const map = new Map<string, FabricacionVidrioResultado>();
  for (const row of rows) {
    const key = `${row.vidrioId}::${row.anchoMm}::${row.altoMm}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row, trazabilidad: [...row.trazabilidad] });
      continue;
    }
    existing.cantidadPiezas += row.cantidadPiezas;
    existing.totalM2 += row.totalM2;
    existing.trazabilidad = [...existing.trazabilidad, ...row.trazabilidad];
  }
  return Array.from(map.values());
}

function mergeAccessoryRows(
  rows: FabricacionAccesorioResultado[]
): FabricacionAccesorioResultado[] {
  const map = new Map<string, FabricacionAccesorioResultado>();
  for (const row of rows) {
    const key = row.accesorioId;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row, trazabilidad: [...row.trazabilidad] });
      continue;
    }
    existing.cantidadUnidades += row.cantidadUnidades;
    existing.trazabilidad = [...existing.trazabilidad, ...row.trazabilidad];
  }
  return Array.from(map.values());
}

/** Fusiona N resultados de despiece en uno listo para pautar barras. */
export function consolidarResultadosParaPautaBarras(
  resultados: FabricacionResultadoCubicacion[]
): FabricacionResultadoCubicacion {
  if (resultados.length === 0) {
    throw new Error("Se requiere al menos un resultado para consolidar la pauta.");
  }

  const first = resultados[0];
  const perfiles = mergeProfileRows(resultados.flatMap((entry) => entry.perfiles));
  const vidrios = mergeGlassRows(resultados.flatMap((entry) => entry.vidrios));
  const accesorios = mergeAccessoryRows(
    resultados.flatMap((entry) => entry.accesorios)
  );
  const advertencias = resultados.flatMap((entry) => entry.advertencias);

  return {
    engineVersion: first.engineVersion,
    recetaId: first.recetaId,
    recetaVersion: first.recetaVersion,
    estadoReceta: first.estadoReceta,
    entradaNormalizada: null,
    perfiles,
    vidrios,
    accesorios,
    totalLinealMm: perfiles.reduce((sum, row) => sum + row.totalLinealMm, 0),
    totalVidrioM2: vidrios.reduce((sum, row) => sum + row.totalM2, 0),
    advertencias,
    calculable: resultados.every((entry) => entry.calculable),
  };
}

export function calcularPautaBarrasMultiMedida(input: {
  receta: FabricacionReceta;
  medidas: Array<Pick<FabricacionEntradaCalculo, "anchoTotalMm" | "altoTotalMm" | "cantidad">>;
  identidad?: Pick<FabricacionEntradaCalculo, "hojas" | "modulos" | "variante">;
}): {
  resultadosPorFila: FabricacionResultadoCubicacion[];
  consolidado: FabricacionResultadoCubicacion;
  pautaBarras: FabricacionPautaBarras;
} {
  const hojas = input.identidad?.hojas ?? input.receta.identidad.hojas;
  const modulos = input.identidad?.modulos ?? input.receta.identidad.modulos;
  const variante =
    input.identidad?.variante ?? input.receta.identidad.variante ?? null;

  const resultadosPorFila = input.medidas.map((medida) =>
    calcularCubicacionYPauta(input.receta, {
      anchoTotalMm: medida.anchoTotalMm,
      altoTotalMm: medida.altoTotalMm,
      cantidad: medida.cantidad,
      hojas,
      modulos,
      variante,
    })
  );

  const consolidado = consolidarResultadosParaPautaBarras(resultadosPorFila);
  const pautaBarras = construirPautaBarrasFabricacion({
    receta: input.receta,
    resultado: consolidado,
  });

  return { resultadosPorFila, consolidado, pautaBarras };
}
