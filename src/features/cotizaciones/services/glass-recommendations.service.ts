import { MIRROR_GLASS_THICKNESS_OPTIONS } from "@/features/cotizaciones/new-quote/workflow-ui";
import { normalizeBrokenText } from "@/utils/repair-broken-text";

export type GlassRecommendationContext = {
  subtipo: string;
  sistema: string;
  lineTemplateRecommendedGlass?: string | null;
};

export type GlassRecommendationResult = {
  recommendedOptions: string[];
  reason: string;
  lineTemplateRecommendedOption: string | null;
};

type GlassRecommendationRule = {
  id: string;
  reason: string;
  matches: (context: NormalizedGlassRecommendationContext) => boolean;
  recommendations: readonly string[];
};

type NormalizedGlassRecommendationContext = {
  subtipo: string;
  sistema: string;
};

function normalizeText(value: string) {
  return normalizeBrokenText(value)
    .replace(/[^\w+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGlassKey(value: string) {
  return normalizeText(value).replace(/[^\w+]/g, "");
}

function includesAny(value: string, terms: readonly string[]) {
  return terms.some((term) => value.includes(term));
}

function resolveRecommendedOptions(
  availableOptions: readonly string[],
  recommendations: readonly string[]
) {
  const optionsByKey = new Map(
    availableOptions.map((option) => [normalizeGlassKey(option), option])
  );

  return recommendations
    .map((recommendation) => optionsByKey.get(normalizeGlassKey(recommendation)))
    .filter((option): option is string => Boolean(option));
}

const WINDOW_DVH_OPTIONS = ["DVH 4+12+4", "DVH 3+3 / 12 / 3+3."] as const;

const GLASS_RECOMMENDATION_RULES: readonly GlassRecommendationRule[] = [
  {
    id: "ventana-corredera",
    reason: "Mas usado para ventana corredera.",
    matches: ({ subtipo, sistema }) =>
      subtipo.includes("ventana") && sistema.includes("corredera"),
    recommendations: [
      ...WINDOW_DVH_OPTIONS,
      "Incoloro monolitico 5mm",
      "Incoloro monolitico 6mm",
    ],
  },
  {
    id: "ventana-proyectante",
    reason: "Buen equilibrio para ventana proyectante.",
    matches: ({ subtipo, sistema }) =>
      subtipo.includes("ventana") && sistema.includes("proyectante"),
    recommendations: [
      ...WINDOW_DVH_OPTIONS,
      "Incoloro monolitico 5mm",
      "Laminado 3+3",
    ],
  },
  {
    id: "ventana-abatible",
    reason: "Configuracion habitual para ventana abatible.",
    matches: ({ subtipo, sistema }) =>
      subtipo.includes("ventana") && sistema.includes("abatible"),
    recommendations: [
      ...WINDOW_DVH_OPTIONS,
      "Incoloro monolitico 5mm",
      "Laminado 3+3",
    ],
  },
  {
    id: "shower-door",
    reason: "Templado es lo habitual para mamparas y shower door.",
    matches: ({ subtipo }) => includesAny(subtipo, ["shower", "mampara"]),
    recommendations: ["Templado 8mm", "Templado 10mm"],
  },
  {
    id: "cierre-terraza",
    reason: "Opciones habituales para cierre exterior.",
    matches: ({ subtipo }) => includesAny(subtipo, ["cierre", "terraza", "logia", "balcon"]),
    recommendations: ["Templado 8mm", "Templado 10mm", "Laminado 4+4"],
  },
  {
    id: "baranda",
    reason: "Mas usado para seguridad en barandas.",
    matches: ({ subtipo }) => subtipo.includes("baranda"),
    recommendations: ["Laminado 4+4", "Laminado 5+5", "Templado 10mm", "Templado 12mm"],
  },
  {
    id: "puerta-vidrio",
    reason: "Mas usado para puertas de vidrio.",
    matches: ({ subtipo }) => subtipo.includes("puerta"),
    recommendations: ["Templado 10mm", "Laminado 5+5"],
  },
  {
    id: "tabique-division",
    reason: "Opciones practicas para divisiones interiores.",
    matches: ({ subtipo, sistema }) =>
      includesAny(`${subtipo} ${sistema}`, ["tabique", "division", "divisiones"]),
    recommendations: ["Incoloro monolitico 5mm", "Incoloro monolitico 6mm", "Templado 8mm"],
  },
  {
    id: "espejo",
    reason: "Espesores habituales para espejos a medida.",
    matches: ({ subtipo }) => subtipo.includes("espejo"),
    recommendations: MIRROR_GLASS_THICKNESS_OPTIONS,
  },
];

const FALLBACK_RECOMMENDATIONS = [
  "Incoloro monolitico 5mm",
  "Incoloro monolitico 6mm",
  "Templado 8mm",
] as const;

export function getGlassRecommendations(
  context: GlassRecommendationContext,
  availableOptions: readonly string[]
): GlassRecommendationResult {
  const normalizedContext: NormalizedGlassRecommendationContext = {
    subtipo: normalizeText(context.subtipo),
    sistema: normalizeText(context.sistema),
  };
  const matchingRule = GLASS_RECOMMENDATION_RULES.find((rule) =>
    rule.matches(normalizedContext)
  );
  const recommendedOptions = resolveRecommendedOptions(
    availableOptions,
    matchingRule?.recommendations ?? FALLBACK_RECOMMENDATIONS
  );
  const lineTemplateRecommendedOption = context.lineTemplateRecommendedGlass
    ? resolveRecommendedOptions(availableOptions, [context.lineTemplateRecommendedGlass])[0] ?? null
    : null;
  const mergedRecommendations = Array.from(
    new Set(
      [lineTemplateRecommendedOption, ...recommendedOptions].filter(
        (option): option is string => Boolean(option)
      )
    )
  );

  if (mergedRecommendations.length > 0) {
    return {
      recommendedOptions: mergedRecommendations,
      reason: lineTemplateRecommendedOption
        ? "Recomendado para esta linea. Igual puedes cambiarlo."
        : matchingRule?.reason ?? "Opciones frecuentes para partir rapido.",
      lineTemplateRecommendedOption,
    };
  }

  return {
    recommendedOptions: availableOptions.slice(0, 3),
    reason: "Opciones frecuentes para partir rapido.",
    lineTemplateRecommendedOption,
  };
}

export function isRecommendedGlass(
  option: string,
  recommendedOptions: readonly string[]
) {
  const optionKey = normalizeGlassKey(option);

  return recommendedOptions.some(
    (recommendedOption) => normalizeGlassKey(recommendedOption) === optionKey
  );
}
