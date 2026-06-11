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
    "Paño fijo": "Serie 25",
    "Shower door": "Linea templada",
    "Cierre terraza/logia": "Serie 25",
    Baranda: "Baranda estandar",
    Espejo: "Sin linea",
    "Cubierta de mesa": "Sin linea",
    "Trabajo personalizado": "Linea estandar",
  },
  Alumco: {
    Ventana: "Linea 20",
    Puerta: "Linea 40",
    "Paño fijo": "Linea 20",
    "Shower door": "Linea baño",
    "Cierre terraza/logia": "Linea 25",
    Baranda: "Baranda estandar",
    Espejo: "Sin linea",
    "Cubierta de mesa": "Sin linea",
    "Trabajo personalizado": "Linea estandar",
  },
  TecnoPerfiles: {
    Ventana: "TP 4000",
    Puerta: "TP 5000",
    "Paño fijo": "TP 4000",
    "Shower door": "TP Baño",
    "Cierre terraza/logia": "TP 4200",
    Baranda: "TP Baranda",
    Espejo: "Sin linea",
    "Cubierta de mesa": "Sin linea",
    "Trabajo personalizado": "Linea estandar",
  },
  Otro: {},
};

const DEFAULT_SUGGESTIONS: Record<string, Omit<ComponentSuggestion, "referencia">> = {
  Ventana: {
    tipo: "Ventana",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 5mm",
    margenPct: 100,
    descripcion: "Ventana de aluminio con vidrio incoloro.",
    colorHex: "#a8a8a8",
  },
  Puerta: {
    tipo: "Puerta",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 6mm",
    margenPct: 100,
    descripcion: "Puerta de aluminio con vidrio incoloro.",
    colorHex: "#a8a8a8",
  },
  "Paño fijo": {
    tipo: "Paño fijo",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 5mm",
    margenPct: 100,
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
  "Cierre terraza/logia": {
    tipo: "Cierre terraza/logia",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 5mm",
    margenPct: 100,
    descripcion: "Cierre de aluminio para logia o balcon.",
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
    margenPct: 100,
    descripcion: "Espejo a medida listo para instalacion.",
    colorHex: "#f0eeeb",
  },
  "Cubierta de mesa": {
    tipo: "Cubierta de mesa",
    material: "PVC",
    vidrio: "Templado 10mm",
    margenPct: 100,
    descripcion: "Cubierta de mesa de vidrio templado.",
    colorHex: "#f0eeeb",
  },
  "Trabajo personalizado": {
    tipo: "Trabajo personalizado",
    material: "Aluminio",
    vidrio: "Incoloro monolítico 5mm",
    margenPct: 100,
    descripcion: "Trabajo personalizado para describir al cliente.",
    colorHex: "#a8a8a8",
  },
};

const LEGACY_COMPONENT_SUGGESTION_ALIASES: Record<string, keyof typeof DEFAULT_SUGGESTIONS> = {
  ["Pa\u00c3\u00b1o Fijo"]: "Paño fijo",
  ["Cierre (Logia/Balc\u00c3\u00b3n)"]: "Cierre terraza/logia",
  "Ventana 1 hoja": "Paño fijo",
  "Ventana fija": "Paño fijo",
  "Componente manual": "Trabajo personalizado",
  "Proyecto a medida": "Trabajo personalizado",
  "Otro trabajo especial": "Trabajo personalizado",
  Otro: "Trabajo personalizado",
  "Tapa de mesa": "Cubierta de mesa",
};

export function normalizePreferredProvider(
  value: string | null | undefined
): PreferredProvider {
  const normalized = value?.trim() ?? "";

  return PROVIDER_OPTIONS.includes(normalized as (typeof PROVIDER_OPTIONS)[number])
    ? (normalized as PreferredProvider)
    : "";
}

function resolveSuggestionType(tipo: string) {
  return LEGACY_COMPONENT_SUGGESTION_ALIASES[tipo] ?? tipo;
}

export function getSuggestedReferenceByProvider(
  tipo: string,
  provider: PreferredProvider
) {
  if (!provider) {
    return "";
  }

  return DEFAULT_PROVIDER_LINES[provider][resolveSuggestionType(tipo)] ?? "";
}

export function getComponentSuggestion(input: {
  tipo: string;
  provider?: PreferredProvider | null;
}): ComponentSuggestion {
  const tipo = input.tipo.trim() || "Ventana";
  const resolvedTipo = resolveSuggestionType(tipo);
  const provider = normalizePreferredProvider(input.provider);
  const base = DEFAULT_SUGGESTIONS[resolvedTipo] ?? DEFAULT_SUGGESTIONS["Trabajo personalizado"];

  return {
    ...base,
    tipo,
    referencia: getSuggestedReferenceByProvider(tipo, provider),
  };
}
