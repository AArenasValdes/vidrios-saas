export const FABRICACION_RECIPE_SCHEMA_VERSION = 1 as const;
export const FABRICACION_ENGINE_VERSION = 1 as const;

export const FABRICACION_EVIDENCIA_ORIGENES = [
  "observado",
  "derivado",
  "asumido",
] as const;

export const FABRICACION_FUENTES_EVIDENCIA = [
  "sistema_zeta",
  "alumetrica",
  "haciendoventanas",
] as const;

export const FABRICACION_NIVELES_CONFIANZA = ["alta", "media", "baja"] as const;

export type FabricacionFuenteEvidencia =
  (typeof FABRICACION_FUENTES_EVIDENCIA)[number];

export type FabricacionNivelConfianza =
  (typeof FABRICACION_NIVELES_CONFIANZA)[number];

export type FabricacionEvidenciaOrigen =
  (typeof FABRICACION_EVIDENCIA_ORIGENES)[number];

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
  "puerta_vaiven",
  "puerta_corredera",
  "pvc_monorriel",
  "shower",
  "personalizada",
] as const;

export type FabricacionTipologia = (typeof FABRICACION_TIPOLOGIAS)[number];

export const FABRICACION_ATRIBUTO_IMPACTOS = [
  "commercial_only",
  "geometry",
  "profiles",
  "glass",
  "accessories",
  "machining",
] as const;

export type FabricacionAtributoImpacto =
  (typeof FABRICACION_ATRIBUTO_IMPACTOS)[number];

export type FabricacionContratoTecnico = {
  /** Identidad estable de la familia, no el texto comercial visible. */
  familia: string;
  /** Campos que el resolver debe conocer para elegir una sola receta. */
  discriminadoresObligatorios: string[];
  /** Un input puede impactar más de una capa técnica. */
  impactosAtributos: Record<string, FabricacionAtributoImpacto[]>;
  topology?: string | null;
  hardwareMode?: string | null;
};

export const FABRICACION_ROLES_ACCESORIO = [
  "hardware",
  "consumable",
  "seal",
  "fastener",
  "installation",
  "machining",
  "other",
] as const;

export type FabricacionRolAccesorio =
  (typeof FABRICACION_ROLES_ACCESORIO)[number];

export type FabricacionClasificacionAccesorio = {
  rol: FabricacionRolAccesorio;
  impactos: FabricacionAtributoImpacto[];
};

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
  topology?: string | null;
  hardwareMode?: string | null;
};

export type FabricacionCondicion = {
  hojas?: number | { min?: number; max?: number; igual?: number };
  modulos?: number | { min?: number; max?: number; igual?: number };
  variante?: string | string[];
  topology?: string | string[];
  hardwareMode?: string | string[];
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
  /** Identidad interna del perfil real del taller (compartible entre funciones). */
  tallerPerfilId?: string | null;
  codigoPerfil: string;
  nombrePerfil: string;
  funcion: string;
  largoComercialMm?: number | null;
  reglaMedida: FabricacionReglaMedida;
  reglaCantidad: FabricacionReglaCantidad;
  requerido: boolean;
  /** Corte indicado por la fuente primaria, cuando la ficha lo publica. */
  corte?: string;
  observaciones?: string;
  datosPendientes?: string[];
};

export type FabricacionVidrio = {
  id: string;
  nombre: string;
  reglaAncho: FabricacionReglaMedida;
  reglaAlto: FabricacionReglaMedida;
  reglaCantidad: FabricacionReglaCantidad;
  requerido: boolean;
  condicion?: FabricacionCondicion;
  observaciones?: string;
  datosPendientes?: string[];
};

export type FabricacionAccesorio = {
  id: string;
  codigo: string;
  nombre: string;
  reglaCantidad: FabricacionReglaCantidad;
  requerido: boolean;
  condicion?: FabricacionCondicion;
  /** Fórmula textual de consumo cuando la fuente expresa metros/tramos. */
  formulaCantidad?: string;
  unidad?: string;
  clasificacion?: FabricacionClasificacionAccesorio;
  observaciones?: string;
  datosPendientes?: string[];
};

export type FabricacionConfiguracionCorte = {
  perdidaCorteMm: number | null;
  despunteInicialMm: number | null;
  sobranteMinimoAprovechableMm: number | null;
  /** Largo comercial habitual de la receta (tira estándar del taller). */
  largoComercialDefaultMm?: number | null;
};

export type FabricacionFuenteFragmento = {
  id: string;
  tipo: "perfil" | "vidrio" | "accesorio" | "identidad" | "advertencia";
  locator: string;
  texto: string;
};

export type FabricacionTrazabilidadValor = {
  fieldPath: string;
  origen: FabricacionEvidenciaOrigen;
  sourceFragmentId?: string | null;
};

export type FabricacionEvidencia = {
  fuente: "sistema_zeta";
  runId: string;
  projectId: string;
  planId: string;
  rawPath: string;
  htmlPath: string;
  textPath: string;
  screenshotPaths: string[];
  fecha: string;
  extractorVersion: string;
  hashes: {
    html: string;
    text: string;
    screenshots: Record<string, string>;
  };
  sourceFragments: FabricacionFuenteFragmento[];
  medidasObservadas: FabricacionEntradaMedidaObservada[];
  valores: FabricacionTrazabilidadValor[];
};

export type FabricacionEvidenciaExterna = {
  fuente: Exclude<FabricacionFuenteEvidencia, "sistema_zeta">;
  nombreFuente: string;
  url?: string | null;
  archivo?: string | null;
  htmlPath?: string | null;
  screenshotPaths?: string[];
  pdfPath?: string | null;
  fecha: string;
  sourceFragments: FabricacionFuenteFragmento[];
  medidasObservadas: FabricacionEntradaMedidaObservada[];
  valores: FabricacionTrazabilidadValor[];
  confianza: FabricacionNivelConfianza;
  conflictos?: string[];
};

export type FabricacionEntradaMedidaObservada = {
  anchoMm: number;
  altoMm: number;
  hojas?: number;
  modulos?: number;
  variante?: string | null;
};

export type FabricacionAlcanceCalculo =
  | {
      modo: "formula_general";
    }
  | {
      modo: "observed_fixture_only";
      medidasObservadas: FabricacionEntradaMedidaObservada[];
      calculableFueraDeMedidas: boolean;
    };

export type FabricacionReceta = {
  schemaVersion: typeof FABRICACION_RECIPE_SCHEMA_VERSION;
  version: number;
  estado: FabricacionEstadoValidacion;
  identidad: FabricacionIdentidadReceta;
  perfiles: FabricacionComponentePerfil[];
  vidrios: FabricacionVidrio[];
  accesorios: FabricacionAccesorio[];
  contratoTecnico?: FabricacionContratoTecnico;
  configuracionCorte?: FabricacionConfiguracionCorte;
  evidencia?: FabricacionEvidencia;
  evidenciasExternas?: FabricacionEvidenciaExterna[];
  alcanceCalculo?: FabricacionAlcanceCalculo;
  /** Datos que impiden tratar la receta como pauta completa calculable. */
  datosPendientes?: string[];
  notasValidacion: string[];
};

export type FabricacionEntradaCalculo = {
  anchoTotalMm: number;
  altoTotalMm: number;
  cantidad: number;
  hojas: number;
  modulos: number;
  variante?: string | null;
  topology?: string | null;
  hardwareMode?: string | null;
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
