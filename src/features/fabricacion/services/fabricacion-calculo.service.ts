import { validarRecetaFabricacion } from "@/features/fabricacion/services/fabricacion-validacion.service";
import {
  FABRICACION_ENGINE_VERSION,
  type FabricacionAccesorio,
  type FabricacionAdvertencia,
  type FabricacionCondicion,
  type FabricacionEntradaCalculo,
  type FabricacionReceta,
  type FabricacionReglaCantidad,
  type FabricacionReglaMedida,
  type FabricacionResultadoCubicacion,
  type FabricacionTrazabilidadRegla,
} from "@/features/fabricacion/types/fabricacion-domain";

function emptyResult(
  receta: FabricacionReceta,
  advertencias: FabricacionAdvertencia[],
  entradaNormalizada: FabricacionEntradaCalculo | null
): FabricacionResultadoCubicacion {
  return {
    engineVersion: FABRICACION_ENGINE_VERSION,
    recetaId: receta.identidad.recetaId,
    recetaVersion: receta.version,
    estadoReceta: receta.estado,
    entradaNormalizada,
    perfiles: [],
    vidrios: [],
    accesorios: [],
    advertencias,
    totalLinealMm: 0,
    totalVidrioM2: 0,
    calculable: false,
  };
}

function matchesNumberRule(
  value: number,
  rule: number | { min?: number; max?: number; igual?: number } | undefined
): boolean {
  if (rule == null) return true;
  if (typeof rule === "number") return value === rule;
  if (rule.igual != null) return value === rule.igual;
  if (rule.min != null && value < rule.min) return false;
  if (rule.max != null && value > rule.max) return false;
  return true;
}

function cumpleCondicion(
  condicion: FabricacionCondicion | undefined,
  entrada: FabricacionEntradaCalculo
): boolean {
  if (!condicion) return true;
  if (!matchesNumberRule(entrada.hojas, condicion.hojas)) return false;
  if (!matchesNumberRule(entrada.modulos, condicion.modulos)) return false;
  if (condicion.variante != null) {
    const variante = entrada.variante ?? "";
    return Array.isArray(condicion.variante)
      ? condicion.variante.includes(variante)
      : condicion.variante === variante;
  }
  return true;
}

function baseMedidaMm(regla: FabricacionReglaMedida, entrada: FabricacionEntradaCalculo): number {
  switch (regla.base) {
    case "ancho_total":
      return entrada.anchoTotalMm;
    case "alto_total":
      return entrada.altoTotalMm;
    case "ancho_modulo":
      return entrada.anchoTotalMm / entrada.modulos;
    case "alto_modulo":
      return entrada.altoTotalMm / entrada.modulos;
    case "ancho_por_hoja":
      return entrada.anchoTotalMm / entrada.hojas;
    case "alto_por_hoja":
      return entrada.altoTotalMm;
    case "fijo_mm":
      return regla.valorFijoMm ?? 0;
    default:
      return 0;
  }
}

function calcularMedida(
  componenteId: string,
  regla: FabricacionReglaMedida,
  entrada: FabricacionEntradaCalculo
): { valor: number | null; traza: FabricacionTrazabilidadRegla; advertencia: FabricacionAdvertencia | null } {
  const base = baseMedidaMm(regla, entrada);
  const multiplicador = regla.multiplicador ?? 1;
  const ajuste = regla.ajusteMm ?? 0;
  const valor = Math.round(base * multiplicador + ajuste);
  const traza: FabricacionTrazabilidadRegla = {
    reglaId: `${componenteId}:medida`,
    componenteId,
    base: regla.base,
    formula: `redondear((${regla.base} ${base}) x ${multiplicador} + ${ajuste} mm)`,
    entrada: {
      anchoTotalMm: entrada.anchoTotalMm,
      altoTotalMm: entrada.altoTotalMm,
      hojas: entrada.hojas,
      modulos: entrada.modulos,
      variante: entrada.variante ?? null,
    },
    resultado: valor,
  };

  if (!Number.isFinite(valor) || valor <= 0) {
    return {
      valor: null,
      traza,
      advertencia: {
        codigo: "MEDIDA_INVALIDA",
        nivel: "error",
        mensaje: `Medida inválida calculada para el componente ${componenteId}.`,
        componenteId,
      },
    };
  }

  return { valor, traza, advertencia: null };
}

function calcularCantidad(
  componenteId: string,
  regla: FabricacionReglaCantidad,
  entrada: FabricacionEntradaCalculo
): { valor: number; traza: FabricacionTrazabilidadRegla } {
  const base =
    regla.tipo === "por_hoja"
      ? entrada.hojas * regla.cantidad
      : regla.tipo === "por_modulo"
        ? entrada.modulos * regla.cantidad
        : regla.cantidad;
  const multiplicador = regla.multiplicador ?? 1;
  const valor = Math.max(1, Math.round(base * multiplicador * entrada.cantidad));
  return {
    valor,
    traza: {
      reglaId: `${componenteId}:cantidad`,
      componenteId,
      base: regla.tipo,
      formula: `redondear(${regla.tipo} ${base} x ${multiplicador} x cantidad ${entrada.cantidad})`,
      entrada: {
        cantidad: entrada.cantidad,
        hojas: entrada.hojas,
        modulos: entrada.modulos,
        variante: entrada.variante ?? null,
      },
      resultado: valor,
    },
  };
}

function accesorioCumpleCondicion(
  accesorio: FabricacionAccesorio,
  entrada: FabricacionEntradaCalculo
): boolean {
  return (
    cumpleCondicion(accesorio.condicion, entrada) &&
    cumpleCondicion(accesorio.reglaCantidad.condicion, entrada)
  );
}

function validarEntradaCalculo(
  entrada: FabricacionEntradaCalculo
):
  | { ok: true; data: FabricacionEntradaCalculo }
  | { ok: false; advertencias: FabricacionAdvertencia[] } {
  const fields: Array<
    keyof Pick<
      FabricacionEntradaCalculo,
      "anchoTotalMm" | "altoTotalMm" | "cantidad" | "hojas" | "modulos"
    >
  > = ["anchoTotalMm", "altoTotalMm", "cantidad", "hojas", "modulos"];
  const invalid = fields.filter((field) => {
    const value = entrada[field];
    return !Number.isInteger(value) || value <= 0;
  });

  if (invalid.length > 0) {
    return {
      ok: false,
      advertencias: invalid.map((field) => ({
        codigo: "ENTRADA_INVALIDA",
        nivel: "error" as const,
        mensaje: `Entrada invalida: ${field} debe ser un entero positivo.`,
      })),
    };
  }

  return {
    ok: true,
    data: {
      anchoTotalMm: entrada.anchoTotalMm,
      altoTotalMm: entrada.altoTotalMm,
      cantidad: entrada.cantidad,
      hojas: entrada.hojas,
      modulos: entrada.modulos,
      variante: entrada.variante ?? null,
    },
  };
}

export function calcularCubicacionYPauta(
  receta: FabricacionReceta,
  entrada: FabricacionEntradaCalculo
): FabricacionResultadoCubicacion {
  const validacionReceta = validarRecetaFabricacion(receta);
  const entradaParse = validarEntradaCalculo(entrada);
  const advertencias: FabricacionAdvertencia[] = [...validacionReceta.advertencias];

  if (!entradaParse.ok) {
    advertencias.push(...entradaParse.advertencias);
    return emptyResult(receta, advertencias, null);
  }

  const entradaNormalizada: FabricacionEntradaCalculo = {
    ...entradaParse.data,
    variante: entradaParse.data.variante ?? receta.identidad.variante,
  };

  if (!validacionReceta.ok) {
    return emptyResult(receta, advertencias, entradaNormalizada);
  }

  const perfiles = receta.perfiles.flatMap((perfil) => {
    if (
      !cumpleCondicion(perfil.reglaMedida.condicion, entradaNormalizada) ||
      !cumpleCondicion(perfil.reglaCantidad.condicion, entradaNormalizada)
    ) {
      return [];
    }
    const medida = calcularMedida(perfil.id, perfil.reglaMedida, entradaNormalizada);
    if (medida.advertencia) {
      advertencias.push(medida.advertencia);
      return [];
    }
    const cantidad = calcularCantidad(perfil.id, perfil.reglaCantidad, entradaNormalizada);
    const medidaMm = medida.valor ?? 0;
    return [
      {
        componenteId: perfil.id,
        codigoPerfil: perfil.codigoPerfil,
        nombrePerfil: perfil.nombrePerfil,
        funcion: perfil.funcion,
        medidaMm,
        cantidadPiezas: cantidad.valor,
        totalLinealMm: medidaMm * cantidad.valor,
        trazabilidad: [medida.traza, cantidad.traza],
      },
    ];
  });

  const vidrios = receta.vidrios.flatMap((vidrio) => {
    if (
      !cumpleCondicion(vidrio.condicion, entradaNormalizada) ||
      !cumpleCondicion(vidrio.reglaAncho.condicion, entradaNormalizada) ||
      !cumpleCondicion(vidrio.reglaAlto.condicion, entradaNormalizada) ||
      !cumpleCondicion(vidrio.reglaCantidad.condicion, entradaNormalizada)
    ) {
      return [];
    }
    const ancho = calcularMedida(`${vidrio.id}:ancho`, vidrio.reglaAncho, entradaNormalizada);
    const alto = calcularMedida(`${vidrio.id}:alto`, vidrio.reglaAlto, entradaNormalizada);
    if (ancho.advertencia) advertencias.push(ancho.advertencia);
    if (alto.advertencia) advertencias.push(alto.advertencia);
    if (ancho.valor == null || alto.valor == null) return [];
    const cantidad = calcularCantidad(vidrio.id, vidrio.reglaCantidad, entradaNormalizada);
    return [
      {
        vidrioId: vidrio.id,
        nombre: vidrio.nombre,
        anchoMm: ancho.valor,
        altoMm: alto.valor,
        cantidadPiezas: cantidad.valor,
        totalM2: (ancho.valor * alto.valor * cantidad.valor) / 1_000_000,
        trazabilidad: [ancho.traza, alto.traza, cantidad.traza],
      },
    ];
  });

  const accesorios = receta.accesorios.flatMap((accesorio) => {
    if (!accesorioCumpleCondicion(accesorio, entradaNormalizada)) return [];
    const cantidad = calcularCantidad(accesorio.id, accesorio.reglaCantidad, entradaNormalizada);
    return [
      {
        accesorioId: accesorio.id,
        codigo: accesorio.codigo,
        nombre: accesorio.nombre,
        cantidadUnidades: cantidad.valor,
        trazabilidad: [cantidad.traza],
      },
    ];
  });

  if (receta.estado !== "validada") {
    advertencias.push({
      codigo: "RECETA_NO_VALIDADA",
      nivel: "advertencia",
      mensaje: "La receta no está validada por taller; usar solo como ejemplo o revisión interna.",
    });
  }

  const totalLinealMm = perfiles.reduce((sum, perfil) => sum + perfil.totalLinealMm, 0);
  const totalVidrioM2 = vidrios.reduce((sum, vidrio) => sum + vidrio.totalM2, 0);

  return {
    engineVersion: FABRICACION_ENGINE_VERSION,
    recetaId: receta.identidad.recetaId,
    recetaVersion: receta.version,
    estadoReceta: receta.estado,
    entradaNormalizada,
    perfiles,
    vidrios,
    accesorios,
    advertencias,
    totalLinealMm,
    totalVidrioM2,
    calculable:
      !advertencias.some((entry) => entry.nivel === "error") &&
      (perfiles.length > 0 || vidrios.length > 0 || accesorios.length > 0),
  };
}
