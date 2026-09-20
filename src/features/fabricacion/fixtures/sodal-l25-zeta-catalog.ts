import type { ConfirmedRecipeId } from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import type { FabricacionContratoTecnico } from "@/features/fabricacion/types/fabricacion-domain";

export const SODAL_L25_CATALOG_KEY = "ventora:l25";

/** Identificador puro de procedencia; no carga evidencia ni filesystem. */
export function isZetaConfirmedSourceReference(
  sourceReference: string | null | undefined,
): boolean {
  return (sourceReference ?? "").startsWith("zeta:confirmed:sodal/l25/");
}

/** Contrato técnico de L25. El herraje queda fuera porque no discrimina la receta. */
export const SODAL_L25_CONTRATO_TECNICO: FabricacionContratoTecnico = {
  familia: "sodal:l25",
  discriminadoresObligatorios: [
    "lineTemplateId",
    "typology",
    "topology",
    "leaves",
    "glazing",
    "leg",
    "reinforcement",
  ],
  impactosAtributos: {
    lineTemplateId: ["profiles", "glass"],
    typology: ["geometry"],
    topology: ["geometry", "profiles", "glass"],
    leaves: ["geometry", "profiles", "glass", "accessories"],
    width: ["geometry", "profiles", "glass"],
    height: ["geometry", "profiles", "glass"],
    glazing: ["profiles", "glass"],
    leg: ["profiles"],
    reinforcement: ["profiles"],
    herraje: ["accessories"],
    quantity: ["commercial_only"],
  },
  topology: "corredera",
  hardwareMode: null,
};

export type SodalL25GlazingSlug = "monolithic" | "dvh";
export type SodalL25LegSlug = "open" | "closed";
export type SodalL25ReinforcementSlug = "normal" | "reinforced";

export type SodalL25Identity = {
  manufacturer: "SODAL";
  system: "L25";
  typology: "corredera";
  glazing: SodalL25GlazingSlug;
  leg: SodalL25LegSlug;
  reinforcement: SodalL25ReinforcementSlug;
  leaves: 2 | 3 | 4;
  variantSlug: string;
};

export type SodalL25FamilyConfig = {
  familyKey: string;
  zetaLine: string;
  glazing: SodalL25GlazingSlug;
  leg: SodalL25LegSlug;
  reinforcement: SodalL25ReinforcementSlug;
  canonicalByLeaves: Partial<Record<2 | 3 | 4, ConfirmedRecipeId>>;
  extraEvidenceByLeaves: Partial<Record<2 | 3 | 4, ConfirmedRecipeId[]>>;
  requiredDiscriminators: string[];
};

export const SODAL_L25_FAMILIES: SodalL25FamilyConfig[] = [
  {
    familyKey: "dvh_pierna_abierta",
    zetaLine: "L-25 DVH PIERNA ABIERTA",
    glazing: "dvh",
    leg: "open",
    reinforcement: "normal",
    canonicalByLeaves: {
      2: "dvh_pierna_abierta_2h_1800x1500",
      3: "dvh_pierna_abierta_3h_3000x1500",
      4: "dvh_pierna_abierta_4h_3000x1500",
    },
    extraEvidenceByLeaves: {},
    requiredDiscriminators: SODAL_L25_CONTRATO_TECNICO.discriminadoresObligatorios,
  },
  {
    familyKey: "dvh_pierna_abierta_reforzada",
    zetaLine: "L-25 DVH PIERNA ABIERTA REFORZADA",
    glazing: "dvh",
    leg: "open",
    reinforcement: "reinforced",
    canonicalByLeaves: {
      2: "dvh_pierna_abierta_reforzada_2h_1800x1500",
      3: "dvh_pierna_abierta_reforzada_3h_3000x1500",
      4: "dvh_pierna_abierta_reforzada_4h_3000x1500",
    },
    extraEvidenceByLeaves: {
      3: ["dvh_pierna_abierta_reforzada_3h_2400x1500"],
    },
    requiredDiscriminators: SODAL_L25_CONTRATO_TECNICO.discriminadoresObligatorios,
  },
  {
    familyKey: "dvh_pierna_cerrada",
    zetaLine: "L-25 DVH PIERNA CERRADA",
    glazing: "dvh",
    leg: "closed",
    reinforcement: "normal",
    canonicalByLeaves: {
      2: "dvh_pierna_cerrada_2h_1800x1500",
      3: "dvh_pierna_cerrada_3h_3000x1500",
      4: "dvh_pierna_cerrada_4h_3000x1500",
    },
    extraEvidenceByLeaves: {
      3: ["dvh_pierna_cerrada_3h_2400x1500"],
    },
    requiredDiscriminators: SODAL_L25_CONTRATO_TECNICO.discriminadoresObligatorios,
  },
  {
    familyKey: "monolitico_pierna_abierta",
    zetaLine: "L-25 MONOLITICO PIERNA ABIERTA",
    glazing: "monolithic",
    leg: "open",
    reinforcement: "normal",
    canonicalByLeaves: {
      2: "monolitico_pierna_abierta_2h_1800x1500",
      3: "monolitico_pierna_abierta_3h_3000x1500",
      4: "monolitico_pierna_abierta_4h_3000x1500",
    },
    extraEvidenceByLeaves: {
      3: ["monolitico_pierna_abierta_3h_2400x1500"],
    },
    requiredDiscriminators: SODAL_L25_CONTRATO_TECNICO.discriminadoresObligatorios,
  },
  {
    familyKey: "monolitico_pierna_abierta_reforzada",
    zetaLine: "L-25 MONOLITICO PIERNA ABIERTA REFORZADA",
    glazing: "monolithic",
    leg: "open",
    reinforcement: "reinforced",
    canonicalByLeaves: {
      2: "monolitico_pierna_abierta_reforzada_2h_1800x1500",
      3: "monolitico_pierna_abierta_reforzada_3h_3000x1500",
      4: "monolitico_pierna_abierta_reforzada_4h_3000x1500",
    },
    extraEvidenceByLeaves: {
      3: ["monolitico_pierna_abierta_reforzada_3h_2400x1500"],
    },
    requiredDiscriminators: SODAL_L25_CONTRATO_TECNICO.discriminadoresObligatorios,
  },
  {
    familyKey: "monolitico_pierna_cerrada",
    zetaLine: "L-25 MONOLITICO PIERNA CERRADA",
    glazing: "monolithic",
    leg: "closed",
    reinforcement: "normal",
    canonicalByLeaves: {
      2: "monolitico_pierna_cerrada_2h_1800x1500",
      3: "monolitico_pierna_cerrada_3h_3000x1500",
      4: "monolitico_pierna_cerrada_4h_3000x1500",
    },
    extraEvidenceByLeaves: {},
    requiredDiscriminators: SODAL_L25_CONTRATO_TECNICO.discriminadoresObligatorios,
  },
];

export const SODAL_L25_CANONICAL_RECIPE_IDS = SODAL_L25_FAMILIES.flatMap((family) =>
  Object.values(family.canonicalByLeaves).filter(Boolean)
) as ConfirmedRecipeId[];

export const SODAL_L25_EXTRA_GEOMETRY_TEST_IDS: ConfirmedRecipeId[] = [
  "dvh_pierna_abierta_reforzada_3h_2400x1500",
  "dvh_pierna_cerrada_3h_2400x1500",
  "monolitico_pierna_abierta_3h_2400x1500",
  "monolitico_pierna_abierta_reforzada_3h_2400x1500",
];

export const SODAL_L25_GATE_TEST_IDS: ConfirmedRecipeId[] = [
  ...SODAL_L25_CANONICAL_RECIPE_IDS,
  ...SODAL_L25_EXTRA_GEOMETRY_TEST_IDS,
];

export function buildSodalL25VariantSlug(input: {
  glazing: SodalL25GlazingSlug;
  leg: SodalL25LegSlug;
  reinforcement: SodalL25ReinforcementSlug;
}): string {
  return `${input.glazing}_${input.leg}_${input.reinforcement}`;
}

export function parseSodalL25VariantSlug(
  slug: string | null | undefined
): Pick<SodalL25Identity, "glazing" | "leg" | "reinforcement" | "variantSlug"> | null {
  const normalized = (slug ?? "").trim().toLowerCase();
  if (!normalized) return null;
  const match = normalized.match(/^(monolithic|dvh)_(open|closed)_(normal|reinforced)$/);
  if (!match) return null;
  return {
    glazing: match[1] as SodalL25GlazingSlug,
    leg: match[2] as SodalL25LegSlug,
    reinforcement: match[3] as SodalL25ReinforcementSlug,
    variantSlug: normalized,
  };
}

export function resolveSodalL25IdentityFromRecipeId(
  recipeId: ConfirmedRecipeId
): SodalL25Identity | null {
  for (const family of SODAL_L25_FAMILIES) {
    for (const [leavesRaw, canonicalId] of Object.entries(family.canonicalByLeaves)) {
      if (canonicalId !== recipeId) continue;
      const leaves = Number(leavesRaw) as 2 | 3 | 4;
      const variantSlug = buildSodalL25VariantSlug(family);
      return {
        manufacturer: "SODAL",
        system: "L25",
        typology: "corredera",
        glazing: family.glazing,
        leg: family.leg,
        reinforcement: family.reinforcement,
        leaves,
        variantSlug,
      };
    }
  }
  return null;
}

export function resolveCanonicalRecipeIdForIdentity(input: {
  glazing: SodalL25GlazingSlug;
  leg: SodalL25LegSlug;
  reinforcement: SodalL25ReinforcementSlug;
  leaves: number;
}): ConfirmedRecipeId | null {
  const variantSlug = buildSodalL25VariantSlug(input);
  const family = SODAL_L25_FAMILIES.find(
    (entry) => buildSodalL25VariantSlug(entry) === variantSlug
  );
  if (!family) return null;
  return family.canonicalByLeaves[input.leaves as 2 | 3 | 4] ?? null;
}

export function isValidSodalL25Combination(input: {
  glazing: SodalL25GlazingSlug;
  leg: SodalL25LegSlug;
  reinforcement: SodalL25ReinforcementSlug;
}): boolean {
  return Boolean(resolveCanonicalRecipeIdForIdentity({ ...input, leaves: 2 }));
}
