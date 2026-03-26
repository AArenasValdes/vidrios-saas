export const PROVIDER_OPTIONS = [
  "Indalum",
  "Alumco",
  "TecnoPerfiles",
  "Otro",
] as const;

export type PreferredProvider = (typeof PROVIDER_OPTIONS)[number] | "";
export type SuggestedMaterial = "Aluminio" | "PVC";

export type ComponentSuggestion = {
  tipo: string;
  material: SuggestedMaterial;
  vidrio: string;
  margenPct: number;
  referencia: string;
  descripcion: string;
  colorHex: string;
};

const DEFAULT_PROVIDER_LINES: Record<
  Exclude<PreferredProvider, "">,
  Partial<Record<string, string>>
> = {
  Indalum: {
    Ventana: "Serie 25",
    Puerta: "Serie 35",
    "Paño Fijo": "Serie 25",
    "Shower door": "Línea templada",
    "Cierre (Logia/Balcón)": "Serie 25",
    Baranda: "Baranda estándar",
    Espejo: "Sin línea",
    "Tapa de mesa": "Sin línea",
    Otro: "Línea estándar",
  },
  Alumco: {
    Ventana: "Línea 20",
    Puerta: "Línea 40",
    "Paño Fijo": "Línea 20",
    "Shower door": "Línea baño",
    "Cierre (Logia/Balcón)": "Línea 25",
    Baranda: "Baranda estándar",
    Espejo: "Sin línea",
    "Tapa de mesa": "Sin línea",
    Otro: "Línea estándar",
  },
  TecnoPerfiles: {
    Ventana: "TP 4000",
    Puerta: "TP 5000",
    "Paño Fijo": "TP 4000",
    "Shower door": "TP Baño",
    "Cierre (Logia/Balcón)": "TP 4200",
    Baranda: "TP Baranda",
    Espejo: "Sin línea",
    "Tapa de mesa": "Sin línea",
    Otro: "Línea estándar",
  },
  Otro: {},
};

const DEFAULT_SUGGESTIONS: Record<string, Omit<ComponentSuggestion, "referencia">> = {
  Ventana: {
    tipo: "Ventana",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 5mm",
    margenPct: 80,
    descripcion: "Ventana de aluminio con vidrio incoloro.",
    colorHex: "#a8a8a8",
  },
  Puerta: {
    tipo: "Puerta",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 6mm",
    margenPct: 80,
    descripcion: "Puerta de aluminio con vidrio incoloro.",
    colorHex: "#a8a8a8",
  },
  "Paño Fijo": {
    tipo: "Paño Fijo",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 5mm",
    margenPct: 70,
    descripcion: "Paño fijo de aluminio con vidrio incoloro.",
    colorHex: "#a8a8a8",
  },
  "Shower door": {
    tipo: "Shower door",
    material: "Aluminio",
    vidrio: "Templado 8mm",
    margenPct: 100,
    descripcion: "Shower door con vidrio templado.",
    colorHex: "#2a2a2a",
  },
  "Cierre (Logia/Balcón)": {
    tipo: "Cierre (Logia/Balcón)",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 5mm",
    margenPct: 80,
    descripcion: "Cierre de aluminio para logia o balcón.",
    colorHex: "#a8a8a8",
  },
  Baranda: {
    tipo: "Baranda",
    material: "Aluminio",
    vidrio: "Templado 10mm",
    margenPct: 100,
    descripcion: "Baranda con vidrio templado.",
    colorHex: "#2a2a2a",
  },
  Espejo: {
    tipo: "Espejo",
    material: "PVC",
    vidrio: "Esmerilado / Satinado",
    margenPct: 60,
    descripcion: "Espejo a medida listo para instalación.",
    colorHex: "#f0eeeb",
  },
  "Tapa de mesa": {
    tipo: "Tapa de mesa",
    material: "PVC",
    vidrio: "Templado 10mm",
    margenPct: 60,
    descripcion: "Tapa de mesa de vidrio templado.",
    colorHex: "#f0eeeb",
  },
  Otro: {
    tipo: "Otro",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 5mm",
    margenPct: 70,
    descripcion: "Componente comercial listo para cotizar.",
    colorHex: "#a8a8a8",
  },
};

export function normalizePreferredProvider(
  value: string | null | undefined
): PreferredProvider {
  const normalized = value?.trim() ?? "";

  return PROVIDER_OPTIONS.includes(normalized as (typeof PROVIDER_OPTIONS)[number])
    ? (normalized as PreferredProvider)
    : "";
}

export function getSuggestedReferenceByProvider(
  tipo: string,
  provider: PreferredProvider
) {
  if (!provider) {
    return "";
  }

  return DEFAULT_PROVIDER_LINES[provider][tipo] ?? "";
}

export function getComponentSuggestion(input: {
  tipo: string;
  provider?: PreferredProvider | null;
}): ComponentSuggestion {
  const tipo = input.tipo.trim() || "Ventana";
  const provider = normalizePreferredProvider(input.provider);
  const base = DEFAULT_SUGGESTIONS[tipo] ?? DEFAULT_SUGGESTIONS.Otro;

  return {
    ...base,
    tipo,
    referencia: getSuggestedReferenceByProvider(tipo, provider),
  };
}

