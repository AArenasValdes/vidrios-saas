export const FABRICACION_RECIPE_SCHEMA_VERSION = 1 as const;
export const FABRICACION_ENGINE_VERSION = 1 as const;

export const FABRICACION_ESTADOS_VALIDACION = [
  "borrador",
  "ejemplo_no_validado",
  "lista_para_validar",
  "validada",
  "requiere_revision",
] as const;

export type FabricacionEstadoValidacion =
  (typeof FABRICACION_ESTADOS_VALIDACION)[number];

export const FABRICACION_TIPOLOGIAS = [
  "pano_fijo",
  "corredera",
  "abatible",
  "proyectante",
  "puerta_abatible",
  "puerta_corredera",
  "shower",
  "personalizada",
] as const;

export type FabricacionTipologia = (typeof FABRICACION_TIPOLOGIAS)[number];

export type FabricacionIdentidadReceta = {
  recetaId: string;
  codigo: string;
  nombre: string;
  tipologia: FabricacionTipologia;
  hojas: number;
  modulos: number;
  apertura?: string | null;
  herraje: string | null;
  variante: string;
};

export type FabricacionCondicion = {
  hojas?: number | { min?: number; max?: number; igual?: number };
  modulos?: number | { min?: number; max?: number; igual?: number };
  variante?: string | string[];
};

export const FABRICACION_BASES_MEDIDA = [
  "ancho_total",
  "alto_total",
  "ancho_modulo",
  "alto_modulo",
  "ancho_por_hoja",
  "alto_por_hoja",
  "fijo_mm",
] as const;

export type FabricacionBaseMedida = (typeof FABRICACION_BASES_MEDIDA)[number];

export type FabricacionReglaMedida = {
  base: FabricacionBaseMedida;
  valorFijoMm?: number;
  ajusteMm?: number;
  multiplicador?: number;
  condicion?: FabricacionCondicion;
};

export const FABRICACION_REGLAS_CANTIDAD = [
  "fija",
  "por_hoja",
  "por_modulo",
] as const;

export type FabricacionReglaCantidadTipo =
  (typeof FABRICACION_REGLAS_CANTIDAD)[number];

export type FabricacionReglaCantidad = {
  tipo: FabricacionReglaCantidadTipo;
  cantidad: number;
  multiplicador?: number;
  condicion?: FabricacionCondicion;
};

export type FabricacionComponentePerfil = {
  id: string;
  codigoPerfil: string;
  nombrePerfil: string;
  funcion: string;
  largoComercialMm?: number | null;
  reglaMedida: FabricacionReglaMedida;
  reglaCantidad: FabricacionReglaCantidad;
  requerido: boolean;
};

export type FabricacionVidrio = {
  id: string;
  nombre: string;
  reglaAncho: FabricacionReglaMedida;
  reglaAlto: FabricacionReglaMedida;
  reglaCantidad: FabricacionReglaCantidad;
  requerido: boolean;
  condicion?: FabricacionCondicion;
};

export type FabricacionAccesorio = {
  id: string;
  codigo: string;
  nombre: string;
  reglaCantidad: FabricacionReglaCantidad;
  requerido: boolean;
  condicion?: FabricacionCondicion;
};

export type FabricacionReceta = {
  schemaVersion: typeof FABRICACION_RECIPE_SCHEMA_VERSION;
  version: number;
  estado: FabricacionEstadoValidacion;
  identidad: FabricacionIdentidadReceta;
  perfiles: FabricacionComponentePerfil[];
  vidrios: FabricacionVidrio[];
  accesorios: FabricacionAccesorio[];
  notasValidacion: string[];
};

export type FabricacionEntradaCalculo = {
  anchoTotalMm: number;
  altoTotalMm: number;
  cantidad: number;
  hojas: number;
  modulos: number;
  variante?: string | null;
};

export type FabricacionTrazabilidadRegla = {
  reglaId: string;
  componenteId: string;
  base: FabricacionBaseMedida | FabricacionReglaCantidadTipo;
  formula: string;
  entrada: Record<string, number | string | null>;
  resultado: number;
};

export type FabricacionFilaPauta = {
  componenteId: string;
  codigoPerfil: string;
  nombrePerfil: string;
  funcion: string;
  medidaMm: number;
  cantidadPiezas: number;
  totalLinealMm: number;
  trazabilidad: FabricacionTrazabilidadRegla[];
};

export type FabricacionVidrioResultado = {
  vidrioId: string;
  nombre: string;
  anchoMm: number;
  altoMm: number;
  cantidadPiezas: number;
  totalM2: number;
  trazabilidad: FabricacionTrazabilidadRegla[];
};

export type FabricacionAccesorioResultado = {
  accesorioId: string;
  codigo: string;
  nombre: string;
  cantidadUnidades: number;
  trazabilidad: FabricacionTrazabilidadRegla[];
};

export const FABRICACION_ADVERTENCIA_NIVELES = [
  "info",
  "advertencia",
  "error",
] as const;

export type FabricacionAdvertenciaNivel =
  (typeof FABRICACION_ADVERTENCIA_NIVELES)[number];

export type FabricacionAdvertencia = {
  codigo: string;
  nivel: FabricacionAdvertenciaNivel;
  mensaje: string;
  componenteId?: string;
};

export type FabricacionResultadoCubicacion = {
  engineVersion: typeof FABRICACION_ENGINE_VERSION;
  recetaId: string;
  recetaVersion: number;
  estadoReceta: FabricacionEstadoValidacion;
  entradaNormalizada: FabricacionEntradaCalculo | null;
  perfiles: FabricacionFilaPauta[];
  vidrios: FabricacionVidrioResultado[];
  accesorios: FabricacionAccesorioResultado[];
  advertencias: FabricacionAdvertencia[];
  totalLinealMm: number;
  totalVidrioM2: number;
  calculable: boolean;
};
