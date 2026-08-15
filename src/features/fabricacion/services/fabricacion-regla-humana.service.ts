/**
 * Capa de presentación humana para reglas de fabricación.
 * No altera el motor: solo traduce reglaMedida / reglaCantidad a lenguaje de taller.
 */

import type {
  FabricacionAccesorio,
  FabricacionBaseMedida,
  FabricacionComponentePerfil,
  FabricacionReceta,
  FabricacionReglaCantidad,
  FabricacionReglaCantidadTipo,
  FabricacionReglaMedida,
} from "@/features/fabricacion/types/fabricacion-domain";

/** Preset sugerido por Ventora en UI. Nunca es “largo de empresa” fijo. */
export const VENTORA_LARGO_COMERCIAL_PRESET_MM = 6000;

/** Reservado para default a nivel organización/taller (futuro). */
export type FabricacionOrganizationLargoDefaults = {
  largoComercialDefaultMm?: number | null;
};

function normalizeLargoComercialMm(
  value: number | null | undefined
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value);
}

/** Default de tira para la receta (sin override por perfil). */
export function resolveRecetaLargoComercialDefaultMm(
  receta: FabricacionReceta,
  organization?: FabricacionOrganizationLargoDefaults | null
): number {
  return (
    normalizeLargoComercialMm(receta.configuracionCorte?.largoComercialDefaultMm) ??
    normalizeLargoComercialMm(organization?.largoComercialDefaultMm) ??
    VENTORA_LARGO_COMERCIAL_PRESET_MM
  );
}

/** Fuente única de verdad del largo comercial efectivo por perfil. */
export function resolveLargoComercialMm(
  profile: FabricacionComponentePerfil,
  receta: FabricacionReceta,
  organization?: FabricacionOrganizationLargoDefaults | null
): number {
  return (
    normalizeLargoComercialMm(profile.largoComercialMm) ??
    resolveRecetaLargoComercialDefaultMm(receta, organization)
  );
}

export function profileTieneOverrideLargoComercial(
  profile: FabricacionComponentePerfil
): boolean {
  return normalizeLargoComercialMm(profile.largoComercialMm) != null;
}

/** Etiqueta humana para UI (resumen o excepción por perfil). */
export function resolveLargoComercialLabel(
  profile: FabricacionComponentePerfil,
  receta: FabricacionReceta,
  organization?: FabricacionOrganizationLargoDefaults | null
): { label: string; esPersonalizado: boolean; largoMm: number } {
  const largoMm = resolveLargoComercialMm(profile, receta, organization);
  const recetaDefault = resolveRecetaLargoComercialDefaultMm(receta, organization);

  if (profileTieneOverrideLargoComercial(profile)) {
    return {
      label: `${formatLargoComercialCorto(largoMm) ?? `${largoMm} mm`} · Personalizado`,
      esPersonalizado: true,
      largoMm,
    };
  }

  if (recetaDefault !== VENTORA_LARGO_COMERCIAL_PRESET_MM) {
    return {
      label: `${formatLargoComercialCorto(recetaDefault) ?? `${recetaDefault} mm`} · Tira del taller`,
      esPersonalizado: true,
      largoMm,
    };
  }

  return {
    label: `Tira estándar · ${formatLargoComercialCorto(VENTORA_LARGO_COMERCIAL_PRESET_MM) ?? "6,00 m"}`,
    esPersonalizado: false,
    largoMm,
  };
}

export function resolveTiraEstandarRecetaLabel(
  receta: FabricacionReceta,
  organization?: FabricacionOrganizationLargoDefaults | null
): { label: string; largoMm: number; esPersonalizado: boolean } {
  const largoMm = resolveRecetaLargoComercialDefaultMm(receta, organization);
  if (largoMm === VENTORA_LARGO_COMERCIAL_PRESET_MM) {
    return {
      label: `Tira estándar · ${formatLargoComercialCorto(largoMm) ?? "6,00 m"}`,
      largoMm,
      esPersonalizado: false,
    };
  }
  return {
    label: `${formatLargoComercialCorto(largoMm) ?? `${largoMm} mm`} · Tira del taller`,
    largoMm,
    esPersonalizado: true,
  };
}

const MEASURE_LABELS: Record<FabricacionBaseMedida, string> = {
  ancho_total: "Ancho de la ventana",
  alto_total: "Alto de la ventana",
  ancho_modulo: "Ancho de módulo",
  alto_modulo: "Alto de módulo",
  ancho_por_hoja: "Ancho por hoja",
  alto_por_hoja: "Alto de la hoja",
  fijo_mm: "Medida fija",
};

const MEASURE_LABELS_TECHNICAL: Record<FabricacionBaseMedida, string> = {
  ancho_total: "Ancho total",
  alto_total: "Alto total",
  ancho_modulo: "Ancho de modulo",
  alto_modulo: "Alto de modulo",
  ancho_por_hoja: "Ancho dividido por hojas",
  alto_por_hoja: "Alto total por hoja",
  fijo_mm: "Medida fija",
};

const QUANTITY_SCOPE_LABELS: Record<FabricacionReglaCantidadTipo, string> = {
  fija: "por ventana",
  por_hoja: "por hoja",
  por_modulo: "por módulo",
};

const QUANTITY_LABELS_TECHNICAL: Record<FabricacionReglaCantidadTipo, string> = {
  fija: "Cantidad fija",
  por_hoja: "Por hoja",
  por_modulo: "Por modulo",
};

export function labelBaseMedida(
  base: FabricacionBaseMedida,
  variant: "human" | "technical" = "human"
) {
  return variant === "technical"
    ? MEASURE_LABELS_TECHNICAL[base]
    : MEASURE_LABELS[base];
}

export function labelReglaCantidadTipo(
  tipo: FabricacionReglaCantidadTipo,
  variant: "human" | "technical" = "human"
) {
  return variant === "technical"
    ? QUANTITY_LABELS_TECHNICAL[tipo]
    : QUANTITY_SCOPE_LABELS[tipo];
}

export function formatLargoComercialHumano(
  largoComercialMm: number | null | undefined
) {
  if (typeof largoComercialMm !== "number" || largoComercialMm <= 0) {
    return "tira por confirmar";
  }
  const meters = largoComercialMm / 1000;
  return `tira ${meters.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m`;
}

function describeMedidaBaseCompacta(regla: FabricacionReglaMedida) {
  if (regla.base === "fijo_mm") {
    const fixed = regla.valorFijoMm ?? 0;
    return `${fixed.toLocaleString("es-CL")} mm`;
  }
  if (regla.base === "ancho_por_hoja") return "Ancho por hoja";
  if (regla.base === "alto_por_hoja") return "Alto de la hoja";
  return labelBaseMedida(regla.base, "human");
}

function describeMedidaDeCorte(regla: FabricacionReglaMedida) {
  if (regla.base === "fijo_mm") {
    const fixed = regla.valorFijoMm ?? 0;
    return `${fixed.toLocaleString("es-CL")} mm fijos`;
  }

  const base = describeMedidaBaseCompacta(regla);
  const multiplier = regla.multiplicador ?? 1;
  const basePhrase =
    multiplier !== 1 && regla.base !== "ancho_por_hoja"
      ? `${base} × ${multiplier}`
      : base;
  const ajuste = regla.ajusteMm;

  if (ajuste == null) {
    return basePhrase;
  }
  if (ajuste === 0) {
    return basePhrase;
  }
  if (ajuste < 0) {
    return `${basePhrase} − ${Math.abs(ajuste).toLocaleString("es-CL")} mm`;
  }
  return `${basePhrase} + ${ajuste.toLocaleString("es-CL")} mm`;
}

/** Fila de hoja técnica: cantidad + medida o "Medida por configurar". */
function describeCantidadPiezas(regla: FabricacionReglaCantidad): string {
  const n = Math.max(1, Math.round(regla.cantidad));
  const pieceWord = n === 1 ? "pieza" : "piezas";
  if (regla.tipo === "por_hoja") {
    return `${n} ${pieceWord} por hoja`;
  }
  if (regla.tipo === "por_modulo") {
    return `${n} ${pieceWord} por módulo`;
  }
  return `${n} ${pieceWord}`;
}

export function describePerfilSheetMeasure(
  profile: FabricacionComponentePerfil
): { measure: string; pending: boolean } {
  // Solo pendientes de medida/ajuste — no "Confirmar código" ni "Confirmar largo".
  const adjustmentPending = (profile.datosPendientes ?? []).some((detail) =>
    /ajuste|descuento/i.test(detail)
  );
  const fixedMissing =
    profile.reglaMedida.base === "fijo_mm" &&
    (profile.reglaMedida.valorFijoMm == null || profile.reglaMedida.valorFijoMm <= 0);
  const measureUnset =
    profile.reglaMedida.base !== "fijo_mm" && profile.reglaMedida.ajusteMm == null;

  const cantidadLabel = describeCantidadPiezas(profile.reglaCantidad);

  if (adjustmentPending || fixedMissing || measureUnset) {
    return {
      measure: `${cantidadLabel} · Medida por configurar`,
      pending: true,
    };
  }

  const n = Math.max(1, Math.round(profile.reglaCantidad.cantidad));
  return {
    measure: `${n} × ${describeMedidaDeCorte(profile.reglaMedida)}`,
    pending: false,
  };
}

/** Resumen corto para el maestro: cortes, origen de medida y descuento. */
export function describePerfilTallerResumen(
  profile: FabricacionComponentePerfil
): {
  cortes: string;
  medida: string;
  cortesMedida: string;
  descuento: string | null;
  descuentoCorto: string;
  descuentoLabel: string;
  pendingDiscount: boolean;
  line: string;
} {
  const n = Math.max(1, Math.round(profile.reglaCantidad.cantidad));
  const cortes = `${n} ${n === 1 ? "corte" : "cortes"}`;
  const medida =
    profile.reglaMedida.base === "fijo_mm"
      ? `${(profile.reglaMedida.valorFijoMm ?? 0).toLocaleString("es-CL")} mm`
      : labelBaseMedida(profile.reglaMedida.base, "human");
  const pendingDiscount = describePerfilSheetMeasure(profile).pending;
  const ajuste = profile.reglaMedida.ajusteMm;
  const descuento =
    ajuste != null && ajuste !== 0
      ? `descuento ${Math.abs(ajuste).toLocaleString("es-CL")} mm`
      : null;
  const descuentoCorto = pendingDiscount
    ? "Falta descuento"
    : `${ajuste?.toLocaleString("es-CL") ?? "0"} mm`;
  const descuentoLabel = pendingDiscount
    ? "Falta descuento para corte"
    : `Descuento: ${ajuste?.toLocaleString("es-CL") ?? "0"} mm`;
  const cortesMedida = `${cortes} · ${medida}`;
  return {
    cortes,
    medida,
    cortesMedida,
    descuento,
    descuentoCorto,
    descuentoLabel,
    pendingDiscount,
    line: [cortes, medida, descuento].filter(Boolean).join(" · "),
  };
}

export function describeTiraUsadaPieza(
  profile: FabricacionComponentePerfil,
  receta: FabricacionReceta
): string {
  const defaultMm = resolveRecetaLargoComercialDefaultMm(receta);
  const defaultLabel = formatLargoComercialCorto(defaultMm) ?? "6,00 m";
  if (profileTieneOverrideLargoComercial(profile)) {
    const custom =
      formatLargoComercialCorto(profile.largoComercialMm) ?? defaultLabel;
    return `Tira usada: ${custom}`;
  }
  return `Tira usada: estándar ${defaultLabel}`;
}

/** Accesorio en hoja técnica: cantidad humana o "Cantidad por configurar". */
export function describeAccesorioSheetLabel(
  accessory: FabricacionAccesorio
): { label: string; pending: boolean } {
  const nombre = accessory.nombre.trim() || accessory.codigo.trim() || "Accesorio";
  const cantidadPending = (accessory.datosPendientes ?? []).some((detail) =>
    /cantidad/i.test(detail)
  );
  if (cantidadPending) {
    return { label: "Cantidad por configurar", pending: true };
  }
  return {
    label: describeAccesorioReglaHumana(accessory),
    pending: false,
  };
}

export function formatLargoComercialCorto(
  largoComercialMm: number | null | undefined
) {
  if (typeof largoComercialMm !== "number" || largoComercialMm <= 0) {
    return null;
  }
  return `${(largoComercialMm / 1000).toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m`;
}

const MARCO_FUNCIONES = [
  "riel superior",
  "riel inferior",
  "jamba",
  "marco superior",
  "marco inferior",
  "marco lateral",
  "marco horizontal",
  "marco vertical",
  "guía superior",
  "guia superior",
  "guía inferior",
  "guia inferior",
  "perfil lateral",
] as const;

const HOJA_FUNCIONES = [
  "zócalo",
  "zocalo",
  "cabezal",
  "pierna",
  "traslapo",
  "hoja superior",
  "hoja inferior",
  "hoja lateral",
  "hoja horizontal",
  "hoja vertical",
  "travesaño",
  "travesano",
  "perfil de hoja",
] as const;

export type FabricacionSheetGroupId = "marco" | "hojas" | "otros";

export function groupProfilesForSheet(
  profiles: FabricacionComponentePerfil[]
): Array<{ id: FabricacionSheetGroupId; label: string; profiles: FabricacionComponentePerfil[] }> {
  const marco: FabricacionComponentePerfil[] = [];
  const hojas: FabricacionComponentePerfil[] = [];
  const otros: FabricacionComponentePerfil[] = [];

  for (const profile of profiles) {
    const key = profile.funcion.trim().toLocaleLowerCase("es");
    if (MARCO_FUNCIONES.some((entry) => key.includes(entry))) {
      marco.push(profile);
      continue;
    }
    if (HOJA_FUNCIONES.some((entry) => key.includes(entry))) {
      hojas.push(profile);
      continue;
    }
    otros.push(profile);
  }

  const orderKey = (value: string) => {
    const normalized = value.trim().toLocaleLowerCase("es");
    const order = [
      "riel superior",
      "marco superior",
      "guía superior",
      "guia superior",
      "riel inferior",
      "marco inferior",
      "guía inferior",
      "guia inferior",
      "jamba",
      "marco lateral",
      "marco horizontal",
      "marco vertical",
      "perfil lateral",
      "zócalo",
      "zocalo",
      "hoja inferior",
      "cabezal",
      "hoja superior",
      "pierna",
      "hoja lateral",
      "hoja horizontal",
      "hoja vertical",
      "traslapo",
      "travesaño",
      "travesano",
      "perfil de hoja",
    ];
    const index = order.findIndex((entry) => normalized.includes(entry));
    return index === -1 ? 99 : index;
  };

  const sortGroup = (list: FabricacionComponentePerfil[]) =>
    [...list].sort(
      (left, right) =>
        orderKey(left.funcion) - orderKey(right.funcion) ||
        left.funcion.localeCompare(right.funcion, "es")
    );

  return [
    { id: "marco" as const, label: "Marco", profiles: sortGroup(marco) },
    { id: "hojas" as const, label: "Hojas", profiles: sortGroup(hojas) },
    { id: "otros" as const, label: "Otros", profiles: sortGroup(otros) },
  ].filter((group) => group.profiles.length > 0);
}

function describeCantidadConMedida(
  reglaCantidad: FabricacionReglaCantidad,
  medidaPhrase: string
) {
  const n = Math.max(1, Math.round(reglaCantidad.cantidad));
  const pieceWord = n === 1 ? "pieza" : "piezas";
  const scope = labelReglaCantidadTipo(reglaCantidad.tipo, "human");
  return `${n} ${pieceWord} de ${medidaPhrase} ${scope}`;
}

/** Frase principal de un perfil para cards de maestro. */
export function describePerfilReglaHumana(
  profile: FabricacionComponentePerfil
): string {
  const funcion = profile.funcion.trim() || profile.nombrePerfil.trim() || "Perfil";
  const medida = describeMedidaDeCorte(profile.reglaMedida);
  const cantidad = describeCantidadConMedida(profile.reglaCantidad, medida);
  const tira = formatLargoComercialHumano(profile.largoComercialMm);
  return `${funcion} — ${cantidad} — ${tira}`;
}

/** Resumen corto sin título de función (para subtítulos). */
export function describePerfilReglaHumanaDetalle(
  profile: FabricacionComponentePerfil
): string {
  const medida = describeMedidaDeCorte(profile.reglaMedida);
  const cantidad = describeCantidadConMedida(profile.reglaCantidad, medida);
  const tira = formatLargoComercialHumano(profile.largoComercialMm);
  return `${cantidad} — ${tira}`;
}

/** Accesorio en lenguaje humano: "2 cierres por ventana". */
export function describeAccesorioReglaHumana(
  accessory: FabricacionAccesorio
): string {
  const nombre = accessory.nombre.trim() || accessory.codigo.trim() || "Accesorio";
  const n = Math.max(1, Math.round(accessory.reglaCantidad.cantidad));
  const scope = labelReglaCantidadTipo(accessory.reglaCantidad.tipo, "human");
  return `${n} ${nombre.toLocaleLowerCase("es")} ${scope}`;
}

/** Compat: frase técnica usada en vistas legacy. */
export function describeProfileRuleLegacy(
  profile: FabricacionComponentePerfil
): string {
  const base = labelBaseMedida(profile.reglaMedida.base, "technical").toLocaleLowerCase(
    "es"
  );
  const multiplier = profile.reglaMedida.multiplicador ?? 1;
  const adjustment = profile.reglaMedida.ajusteMm ?? 0;
  const measure = [
    multiplier !== 1 ? `${base} por ${multiplier}` : base,
    adjustment < 0
      ? `menos ${Math.abs(adjustment)} mm`
      : adjustment > 0
        ? `mas ${adjustment} mm`
        : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `Genera ${profile.reglaCantidad.cantidad} pieza(s) ${labelReglaCantidadTipo(
    profile.reglaCantidad.tipo,
    "technical"
  ).toLocaleLowerCase("es")} de ${measure}.`;
}

export function formatMetersFromMm(totalMm: number) {
  return `${(totalMm / 1000).toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m`;
}

/** Agrupa barras FFD por perfil+largo para el héroe de tiras. */
export function summarizeTirasPorPerfil(
  barras: Array<{
    codigoPerfil: string;
    nombrePerfil: string;
    largoComercialMm: number;
    usadoMm: number;
    sobranteMm: number;
  }>
) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      largoComercialMm: number;
      tiras: number;
      usadoMm: number;
      sobranteMm: number;
    }
  >();

  for (const bar of barras) {
    const key = `${bar.codigoPerfil}::${bar.largoComercialMm}`;
    const current = groups.get(key);
    if (current) {
      current.tiras += 1;
      current.usadoMm += bar.usadoMm;
      current.sobranteMm += bar.sobranteMm;
      continue;
    }
    groups.set(key, {
      key,
      label: bar.nombrePerfil.trim() || bar.codigoPerfil,
      largoComercialMm: bar.largoComercialMm,
      tiras: 1,
      usadoMm: bar.usadoMm,
      sobranteMm: bar.sobranteMm,
    });
  }

  return Array.from(groups.values());
}
