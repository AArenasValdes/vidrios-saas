import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionBaseMedida,
  type FabricacionReceta,
  type FabricacionReglaCantidadTipo,
} from "@/features/fabricacion/types/fabricacion-domain";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

/**
 * Plantillas Ventora documentadas · Proyectante (L32 / L42).
 * Perfiles y códigos habituales precargados. L32 usa su receta normal
 * documentada; L42 conserva su plantilla pendiente de calibración.
 */

export type PlantillaVentoraProyectanteId = "L32" | "L42";

export type PlantillaVentoraProyectanteCatalogEntry = {
  id: PlantillaVentoraProyectanteId;
  label: string;
  title: string;
  sourceReferenceId: string;
  pendingShopNote: string;
};

export const PLANTILLAS_VENTORA_PROYECTANTE: Record<
  PlantillaVentoraProyectanteId,
  PlantillaVentoraProyectanteCatalogEntry
> = {
  L32: {
    id: "L32",
    label: "L32",
    title: "L32 · Proyectante",
    sourceReferenceId: "l32:chile",
    pendingShopNote:
      "Descuentos técnicos cargados para la receta normal. Validar una fabricación real antes de activar.",
  },
  L42: {
    id: "L42",
    label: "L42",
    title: "L42 · Proyectante",
    sourceReferenceId: "l42:chile",
    pendingShopNote:
      "Pendiente validar medidas de taller. Referencia documentada hoja -1,7 sin implementar.",
  },
};

type PerfilPlantillaSeed = {
  codigo: string;
  funcion: string;
  nombre: string;
  grupo: "marco" | "hoja" | "vidrio" | "composicion";
  medida: FabricacionBaseMedida;
  cantidadTipo: FabricacionReglaCantidadTipo;
  cantidad: number;
  requerido: boolean;
  observacionesExtra?: string;
};

const PENDING_DISCOUNT_L42 =
  "Pendiente validar descuento hoja -1,7 (confirmar mm, dimensión y orden). No usar para calcular.";

const L42_PERFILES: PerfilPlantillaSeed[] = [
  {
    codigo: "4209",
    funcion: "Marco fijo",
    nombre: "Marco fijo",
    grupo: "marco",
    medida: "ancho_total",
    cantidadTipo: "fija",
    cantidad: 1,
    requerido: true,
    observacionesExtra:
      "Marco perimetral habitual L42. Ancho y alto sin descuento documentado pendiente de validar en taller.",
  },
  {
    codigo: "4202",
    funcion: "Hoja proyectante",
    nombre: "Hoja proyectante",
    grupo: "hoja",
    medida: "ancho_por_hoja",
    cantidadTipo: "por_hoja",
    cantidad: 1,
    requerido: true,
    observacionesExtra: PENDING_DISCOUNT_L42,
  },
  {
    codigo: "4229",
    funcion: "Junquillo monolítico",
    nombre: "Junquillo monolítico",
    grupo: "vidrio",
    medida: "ancho_por_hoja",
    cantidadTipo: "por_hoja",
    cantidad: 1,
    requerido: true,
    observacionesExtra:
      "Predeterminado para vidrio monolítico. Si usas termopanel, revisa 4206 y desactiva el que no aplique.",
  },
  {
    codigo: "4206",
    funcion: "Junquillo termopanel",
    nombre: "Junquillo termopanel",
    grupo: "vidrio",
    medida: "ancho_por_hoja",
    cantidadTipo: "por_hoja",
    cantidad: 1,
    requerido: false,
    observacionesExtra:
      "Usar si el vidrio es DVH/termopanel. No activar junquillo monolítico simultáneamente.",
  },
  {
    codigo: "4204",
    funcion: "Palillo / Pilar T",
    nombre: "Palillo / Pilar T",
    grupo: "composicion",
    medida: "alto_total",
    cantidadTipo: "fija",
    cantidad: 1,
    requerido: false,
    observacionesExtra: "Opcional según composición del vano.",
  },
];

function mapPerfilSeed(
  seed: PerfilPlantillaSeed,
  createId: () => string
): FabricacionReceta["perfiles"][number] {
  return {
    id: createId(),
    codigoPerfil: seed.codigo,
    nombrePerfil: seed.nombre,
    funcion: seed.funcion,
    largoComercialMm: null,
    reglaMedida: {
      base: seed.medida,
      multiplicador: 1,
    },
    reglaCantidad: {
      tipo: seed.cantidadTipo,
      cantidad: seed.cantidad,
      multiplicador: 1,
    },
    requerido: seed.requerido,
    observaciones: [
      `Grupo: ${seed.grupo}.`,
      "Perfil habitual documentado Ventora. Confirmar medidas de corte en taller.",
      seed.observacionesExtra,
    ]
      .filter(Boolean)
      .join(" "),
    datosPendientes: seed.requerido
      ? [
          "Confirmar ajuste o descuento en mm",
          "Validar regla con trabajo real",
          ...(seed.codigo ? [] : ["Confirmar codigo del perfil"]),
        ]
      : [
          "Confirmar si aplica en esta composición",
          "Confirmar ajuste o descuento en mm",
        ],
  };
}

export function crearRecetaPlantillaVentoraProyectante(
  plantillaId: PlantillaVentoraProyectanteId,
  input?: { createId?: () => string; lineName?: string }
): FabricacionReceta {
  if (plantillaId === "L32") {
    return crearRecetaSerie32ProyectanteNormal({
      createId: input?.createId,
      lineName: input?.lineName,
    });
  }

  const createId = input?.createId ?? (() => crypto.randomUUID());
  const meta = PLANTILLAS_VENTORA_PROYECTANTE[plantillaId];
  const seeds = L42_PERFILES;
  const lineName = input?.lineName?.trim() || meta.label;

  const accesorios: FabricacionReceta["accesorios"] =
    plantillaId === "L42"
      ? [
          {
            id: createId(),
            codigo: "4230",
            nombre: "Cuña de armado NAT.",
            reglaCantidad: { tipo: "por_hoja", cantidad: 1, multiplicador: 1 },
            requerido: false,
            observaciones:
              "Accesorio habitual L42. Confirmar modelo y cantidad real en taller.",
            datosPendientes: [
              "Confirmar accesorio usado por el taller",
              "Confirmar codigo y cantidad",
            ],
          },
        ]
      : [
          {
            id: createId(),
            codigo: "",
            nombre: "Brazos proyectantes",
            reglaCantidad: { tipo: "por_hoja", cantidad: 1, multiplicador: 1 },
            requerido: false,
            observaciones:
              "Accesorio estructural sugerido. Confirmar modelo y cantidad en el Paso 2.",
            datosPendientes: [
              "Confirmar accesorio usado por el taller",
              "Confirmar codigo y cantidad",
            ],
          },
        ];

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: createId(),
      codigo: `${plantillaId}-PROY-V1`,
      nombre: `${lineName} · proyectante`,
      tipologia: "proyectante",
      hojas: 1,
      modulos: 1,
      apertura: "proyectante",
      herraje: null,
      variante: "estandar",
    },
    perfiles: seeds.map((seed) => mapPerfilSeed(seed, createId)),
    vidrios: [
      {
        id: createId(),
        nombre: "Vidrio principal",
        reglaAncho: { base: "ancho_por_hoja", ajusteMm: 0, multiplicador: 1 },
        reglaAlto: { base: "alto_por_hoja", ajusteMm: 0, multiplicador: 1 },
        reglaCantidad: { tipo: "por_hoja", cantidad: 1, multiplicador: 1 },
        requerido: false,
        observaciones:
          "Vidrio opcional sugerido. Confirmar descuentos y composición en el Paso 2.",
        datosPendientes: [
          "Confirmar descuento de ancho y alto",
          "Confirmar cantidad con el taller",
          "Confirmar composicion del vidrio",
        ],
      },
    ],
    accesorios,
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: [
      `Plantilla ${meta.title}. Perfiles habituales precargados.`,
      meta.pendingShopNote,
      "Ventora prepara los perfiles habituales. Revisa las medidas de fabricación antes de activar.",
      "No está técnicamente validada. Probar medida real antes de activar en el Paso 3.",
    ],
  };
}

/**
 * Fuente canónica de la receta normal AL-32 proyectante de una hoja.
 *
 * La referencia de catálogo también contiene 3204/3205 para otras
 * composiciones, pero no forman parte de esta receta base. Las reglas de
 * medida quedan completas para que el editor no solicite descuentos aislados.
 */
export function crearRecetaSerie32ProyectanteNormal(input?: {
  createId?: () => string;
  lineName?: string;
}): FabricacionReceta {
  const createId = input?.createId ?? (() => crypto.randomUUID());
  const lineName = input?.lineName?.trim() || "Serie 32";
  const profile = (config: {
    code: string;
    name: string;
    functionName: string;
    measure: FabricacionBaseMedida;
    adjustmentMm: number;
    cut: string;
  }): FabricacionReceta["perfiles"][number] => ({
    id: createId(),
    codigoPerfil: config.code,
    nombrePerfil: config.name,
    funcion: config.functionName,
    largoComercialMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    reglaMedida: {
      base: config.measure,
      multiplicador: 1,
      ajusteMm: config.adjustmentMm,
    },
    reglaCantidad: {
      tipo: "fija",
      cantidad: 2,
      multiplicador: 1,
    },
    requerido: true,
    observaciones: [
      `Pieza: ${config.name}.`,
      `Serie 32 proyectante normal. Código ${config.code}.`,
      `Pauta una hoja: ${config.measure.includes("ancho") ? "ancho" : "alto"} ${config.cut}.`,
      "Descuento documentado para la receta normal; validar una fabricación real antes de activar.",
    ].join(" "),
    datosPendientes: ["Validar la receta con una fabricación real"],
  });

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: createId(),
      codigo: "L32-PROY-NORMAL-1H",
      nombre: `${lineName} · Proyectante normal 1H`,
      tipologia: "proyectante",
      hojas: 1,
      modulos: 1,
      apertura: "proyectante",
      herraje: null,
      variante: "normal",
    },
    perfiles: [
      profile({
        code: "3201",
        name: "Marco horizontal",
        functionName: "Marco",
        measure: "ancho_total",
        adjustmentMm: 0,
        cut: "W",
      }),
      profile({
        code: "3201",
        name: "Marco vertical",
        functionName: "Marco",
        measure: "alto_total",
        adjustmentMm: 0,
        cut: "H",
      }),
      profile({
        code: "3202",
        name: "Hoja horizontal",
        functionName: "Hoja",
        measure: "ancho_por_hoja",
        adjustmentMm: -23,
        cut: "W/hoja − 23",
      }),
      profile({
        code: "3202",
        name: "Hoja vertical",
        functionName: "Hoja",
        measure: "alto_por_hoja",
        adjustmentMm: -23,
        cut: "H/hoja − 23",
      }),
      profile({
        code: "3208",
        name: "Junquillo horizontal",
        functionName: "Junquillo",
        measure: "ancho_por_hoja",
        adjustmentMm: -85,
        cut: "W/hoja − 85",
      }),
      profile({
        code: "3208",
        name: "Junquillo vertical",
        functionName: "Junquillo",
        measure: "alto_por_hoja",
        adjustmentMm: -85,
        cut: "H/hoja − 85",
      }),
    ],
    vidrios: [
      {
        id: createId(),
        nombre: "Vidrio monolítico 4 mm",
        reglaAncho: { base: "ancho_por_hoja", ajusteMm: -94, multiplicador: 1 },
        reglaAlto: { base: "alto_por_hoja", ajusteMm: -94, multiplicador: 1 },
        reglaCantidad: { tipo: "fija", cantidad: 1, multiplicador: 1 },
        requerido: false,
        observaciones: "Vidrio simple para AL-32 normal. La línea no admite termopanel.",
        datosPendientes: ["Validar la composición de vidrio con el taller"],
      },
    ],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: [
      "Receta canónica AL-32 proyectante normal de una hoja.",
      "Perfiles obligatorios: 2 × 3201, 2 × 3202 y 2 × 3208; no incluye 3204 ni 3205.",
      "Marco 3201: 2 × W y 2 × H. Hoja 3202: W/hoja − 23 y H/hoja − 23.",
      "Junquillo 3208: W/hoja − 85 y H/hoja − 85.",
      "Vidrio monolítico: W/hoja − 94 y H/hoja − 94. No admite termopanel.",
      "La tira comercial solo modifica barras, sobrantes y pauta; no modifica estas medidas.",
    ],
  };
}

export type Serie42ProyectanteVariantId =
  | "normal"
  | "con_camara"
  | "sin_camara";

const SERIE_42_VARIANTS: Record<
  Serie42ProyectanteVariantId,
  { label: string; frameCode: string; frameName: string; note: string }
> = {
  normal: {
    label: "AL-42 normal",
    frameCode: "4201",
    frameName: "Marco 4201",
    note: "Marco exterior normal de 42 mm.",
  },
  con_camara: {
    label: "AL-42 con cámara",
    frameCode: "4231",
    frameName: "Marco cámara de agua 4231",
    note: "Marco con canal de condensación.",
  },
  sin_camara: {
    label: "AL-42 sin cámara",
    frameCode: "4201",
    frameName: "Marco 4201",
    note:
      "La fuente entregada no diferencia otro código de marco sin cámara; confirmar con proveedor si corresponde 4201 u otra variante.",
  },
};

function serie42Profile(input: {
  createId: () => string;
  code: string;
  name: string;
  functionName: string;
  measure: FabricacionBaseMedida;
  adjustmentMm?: number;
  quantity?: number;
  required: boolean;
  configurationReady?: boolean;
  note: string;
}): FabricacionReceta["perfiles"][number] {
  return {
    id: input.createId(),
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.functionName,
    largoComercialMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    reglaMedida: {
      base: input.measure,
      ...(input.adjustmentMm !== undefined
        ? { ajusteMm: input.adjustmentMm }
        : {}),
      multiplicador: 1,
    },
    reglaCantidad: {
      tipo: "fija",
      cantidad: input.quantity ?? 1,
      multiplicador: 1,
    },
    requerido: input.required,
    observaciones: [
      `Serie AL-42. Código ${input.code}.`,
      input.note,
      "Corte indicado por la pauta VPE42NM-1HJN; confirmar con el taller antes de validar.",
    ].join(" "),
    datosPendientes: input.configurationReady
      ? ["Validar la receta con el taller"]
      : [
          "Confirmar cantidad y descuento con una fabricación real",
          "Validar la receta con el taller",
        ],
  };
}

function serie42StandardProfiles(
  createId: () => string
): FabricacionReceta["perfiles"] {
  const note =
    "Serie 42 proyectante estándar de una hoja. Regla aportada para esta configuración; validar con una fabricación real antes de activar.";
  return [
    serie42Profile({
      createId,
      code: "4201",
      name: "Marco 4201 horizontal",
      functionName: "Marco",
      measure: "ancho_total",
      adjustmentMm: 0,
      quantity: 2,
      required: true,
      configurationReady: true,
      note: `${note} Largo W, corte 45°/45°.`,
    }),
    serie42Profile({
      createId,
      code: "4201",
      name: "Marco 4201 vertical",
      functionName: "Marco",
      measure: "alto_total",
      adjustmentMm: 0,
      quantity: 2,
      required: true,
      configurationReady: true,
      note: `${note} Largo H, corte 45°/45°.`,
    }),
    serie42Profile({
      createId,
      code: "4202",
      name: "Hoja 4202 horizontal",
      functionName: "Hoja",
      measure: "ancho_por_hoja",
      adjustmentMm: -18,
      quantity: 2,
      required: true,
      configurationReady: true,
      note: `${note} Largo W − 18 mm, corte 45°/45°.`,
    }),
    serie42Profile({
      createId,
      code: "4202",
      name: "Hoja 4202 vertical",
      functionName: "Hoja",
      measure: "alto_por_hoja",
      adjustmentMm: -18,
      quantity: 2,
      required: true,
      configurationReady: true,
      note: `${note} Largo H − 18 mm, corte 45°/45°.`,
    }),
    serie42Profile({
      createId,
      code: "4229",
      name: "Junquillo 4229 horizontal",
      functionName: "Junquillo",
      measure: "ancho_por_hoja",
      adjustmentMm: -90,
      quantity: 2,
      required: true,
      configurationReady: true,
      note: `${note} Largo W − 90 mm, corte 45°/45°.`,
    }),
    serie42Profile({
      createId,
      code: "4229",
      name: "Junquillo 4229 vertical",
      functionName: "Junquillo",
      measure: "alto_por_hoja",
      adjustmentMm: -90,
      quantity: 2,
      required: true,
      configurationReady: true,
      note: `${note} Largo H − 90 mm, corte 45°/45°.`,
    }),
  ];
}

function serie42Accessory(
  createId: () => string,
  name: string,
  code: string,
  note: string
): FabricacionReceta["accesorios"][number] {
  return {
    id: createId(),
    codigo: code,
    nombre: name,
    reglaCantidad: { tipo: "fija", cantidad: 1, multiplicador: 1 },
    requerido: false,
    observaciones: `${note} Cantidad a confirmar con el taller.`,
    datosPendientes: [
      "Confirmar si aplica a esta composición",
      "Confirmar cantidad y modelo con el taller",
    ],
  };
}

/** Base AL-42 proyectante con identidad separada para normal, cámara y sin cámara. */
export function crearRecetaSerie42Proyectante(input: {
  variant: Serie42ProyectanteVariantId;
  lineName: string;
  createId?: () => string;
}): FabricacionReceta {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const variant = SERIE_42_VARIANTS[input.variant];
  const frameNote = `${variant.note} Para paño fijo también existe el código 4209 como alternativa de composición.`;
  const profiles: FabricacionReceta["perfiles"] = input.variant === "normal"
    ? serie42StandardProfiles(createId)
    : ([
    serie42Profile({
      createId,
      code: variant.frameCode,
      name: `${variant.frameName} horizontal`,
      functionName: "Marco",
      measure: "ancho_total",
      required: true,
      note: `${frameNote} Largo X, corte 45°/45°.`,
    }),
    serie42Profile({
      createId,
      code: variant.frameCode,
      name: `${variant.frameName} vertical`,
      functionName: "Marco",
      measure: "alto_total",
      required: true,
      note: `${frameNote} Largo Y, corte 45°/90°.`,
    }),
    serie42Profile({
      createId,
      code: "4202",
      name: "Hoja proyectante horizontal",
      functionName: "Hoja",
      measure: "ancho_por_hoja",
      adjustmentMm: -136,
      required: true,
      note: "Largo X − 136 mm, corte 45°/45°.",
    }),
    serie42Profile({
      createId,
      code: "4202",
      name: "Hoja proyectante vertical",
      functionName: "Hoja",
      measure: "alto_por_hoja",
      adjustmentMm: -123,
      required: true,
      note: "Largo Y − 123 mm, corte 45°/90°.",
    }),
    serie42Profile({
      createId,
      code: "4209",
      name: "Marco / paño fijo horizontal",
      functionName: "Marco paño fijo",
      measure: "ancho_total",
      required: false,
      note: "Alternativa de estructura exterior para paño fijo; no activa en la hoja móvil base.",
    }),
    serie42Profile({
      createId,
      code: "4209",
      name: "Marco / paño fijo vertical",
      functionName: "Marco paño fijo",
      measure: "alto_total",
      required: false,
      note: "Alternativa de estructura exterior para paño fijo; no activa en la hoja móvil base.",
    }),
    serie42Profile({
      createId,
      code: "4204",
      name: "Palillo / pilar",
      functionName: "Palillo",
      measure: "alto_total",
      required: false,
      note: "Se suma cuando la composición tiene dos hojas móviles o separación entre vanos.",
    }),
    ...(["4229", "4206"] as const).flatMap((code) => {
      const isThermopane = code === "4206";
      const name = isThermopane ? "Junquillo termopanel" : "Junquillo monolítico";
      return [
        serie42Profile({
          createId,
          code,
          name: `${name} horizontal`,
          functionName: "Junquillo",
          measure: "ancho_por_hoja",
          adjustmentMm: -94,
          required: false,
          note: `Largo X − 94 mm; usar con ${isThermopane ? "DVH 22 mm" : "vidrio monolítico 3, 4 o 5 mm"}.`,
        }),
        serie42Profile({
          createId,
          code,
          name: `${name} vertical`,
          functionName: "Junquillo",
          measure: "alto_por_hoja",
          adjustmentMm: -94,
          required: false,
          note: `Largo Y − 94 mm; corte 45°/45° o 90°/90°.`,
        }),
      ];
    }),
      ]);

  const vidrios: FabricacionReceta["vidrios"] = input.variant === "normal"
    ? [{
        id: createId(),
        nombre: "Monolítico 4 mm",
        reglaAncho: { base: "ancho_total", ajusteMm: -93, multiplicador: 1 },
        reglaAlto: { base: "alto_total", ajusteMm: -93, multiplicador: 1 },
        reglaCantidad: { tipo: "fija", cantidad: 1, multiplicador: 1 },
        requerido: false,
        observaciones: "Vidrio estándar de una hoja; ancho W − 93 mm y alto H − 93 mm.",
        datosPendientes: ["Confirmar composición elegida con el taller"],
      }]
    : ([
        ["Monolítico 3 mm", "Vidrio monolítico 3 mm"],
        ["Monolítico 4 mm", "Vidrio monolítico 4 mm"],
        ["Monolítico 5 mm", "Vidrio monolítico 5 mm"],
        ["Termopanel DVH 22 mm (4-12-4)", "Termopanel 22 mm"],
        ["Termopanel DVH 22 mm (5-12-5)", "Termopanel 22 mm"],
      ] as const).map(([name, composition]) => ({
      id: createId(),
      nombre: name,
      reglaAncho: { base: "ancho_total", ajusteMm: -94, multiplicador: 1 },
      reglaAlto: { base: "alto_total", ajusteMm: -94, multiplicador: 1 },
      reglaCantidad: { tipo: "fija", cantidad: 1, multiplicador: 1 },
      requerido: false,
      observaciones: `Vidrio ${composition}. Seleccionar un solo tipo; la pauta entregada indica X − 94 mm y Y − 94 mm.`,
      datosPendientes: [
        "Confirmar composición elegida",
        "Confirmar descuento con el taller",
      ],
    }));

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: createId(),
      codigo: `AL-42-PROY-${input.variant.toUpperCase()}-V1`,
      nombre: `${input.lineName} — ${variant.label}`,
      tipologia: "proyectante",
      hojas: 1,
      modulos: 1,
      apertura: "proyectante",
      herraje: null,
      variante: input.variant,
    },
    perfiles: profiles,
    vidrios,
    accesorios: [
      serie42Accessory(createId, "Cierre manilla", "735/36 o 1735/36", "Negro, titanio o mate."),
      serie42Accessory(createId, "Bisagra", "S-32-42", "Blanco, bronce, mate o titanio."),
      serie42Accessory(createId, "Brazo de proyección", "", "Acero simple o reforzado, 8–24 pulgadas."),
      serie42Accessory(createId, "Escuadra armado", "S-42", "Unión de armado."),
      serie42Accessory(createId, "Escuadra anudal", "S-42 / 4220", "Unión de esquina."),
      serie42Accessory(createId, "Cuña armado", "S-42 / 4230", "Cuña de fijación."),
      serie42Accessory(createId, "Burlete doble contacto", "DC-142 / DC-425", "Negro."),
      serie42Accessory(createId, "Burlete cuña 4 mm", "C-424", "Negro; vidrio monolítico 4 mm."),
      serie42Accessory(createId, "Burlete cuña 5 mm", "C-425", "Negro; vidrio monolítico 5 mm."),
      serie42Accessory(createId, "Base 42", "C-425", "Confirmar aplicación según vidrio."),
      serie42Accessory(createId, "Manilla de parche", "", "Aplicación especial; confirmar compatibilidad."),
    ],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: [
      `${variant.label}. Modelo base VPE42NM-1HJN, una hoja móvil.`,
      "Códigos y descuentos cargados desde los datos técnicos aportados.",
      "4209 queda como alternativa de paño fijo; 4204 se usa cuando la composición agrega separación entre vanos.",
      "La receta sigue siendo borrador técnico: probar una medida real y validar con el proveedor/taller.",
    ],
  };
}
