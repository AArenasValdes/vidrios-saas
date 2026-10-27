import {
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
  VERATEC_7400_SOURCE_REVISION,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";

export const VERATEC_7400_2H_IDENTITY = {
  provider: "VERATEC",
  lineTemplateId: 1396,
  catalogKey: VERATEC_7400_CATALOG_KEY,
  typology: "corredera",
  leaves: 2,
  variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
  sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
  sourceRevision: VERATEC_7400_SOURCE_REVISION,
} as const;

export const VERATEC_7400_UNSUPPORTED_3MM_CASE = {
  identity: VERATEC_7400_2H_IDENTITY,
  thicknessMm: 3,
  dimensionsMm: { width: 1200, height: 1500, quantity: 1 },
  expectedStatus: "composicion_sin_receta",
} as const;

export const VERATEC_7400_PRELIMINARY_GLASS_CASES = [
  ...[5, 6, 8, 10, 12].map((thicknessMm) => ({
    identity: VERATEC_7400_2H_IDENTITY,
    thicknessMm,
    dimensionsMm: { width: 1200, height: 1500, quantity: 1 },
    expectedStatus: "receta_incompleta",
    expectedStructuralCuts: [
      { profileCode: "7401", lengthMm: 1206, quantity: 2 },
      { profileCode: "7401", lengthMm: 1506, quantity: 2 },
      { profileCode: "AB01016-E", lengthMm: 1088, quantity: 2 },
    ],
    pendingMaterials: ["glass", "glass_bead", "price"],
    expectedCommercialPrice: 259200,
  })),
] as const;

// Independent oracle transcribed from the Veratec pauta workbook, 2H
// monolithic 4 mm, for 1200 × 1000 mm. See the source and revision above.
export const VERATEC_7400_4MM_SOURCE_ORACLE = {
  identity: VERATEC_7400_2H_IDENTITY,
  thicknessMm: 4,
  dimensionsMm: { width: 1200, height: 1000, quantity: 1 },
  expectedStatus: "calculado",
  expectedProfileCuts: [
    ["7401", 1206, 2], ["7401", 1006, 2], ["AB01016-E", 1088, 2],
    ["7414", 604, 4], ["7414", 912, 4], ["7418", 906, 2],
    ["6306", 452, 4], ["6306", 833, 4], ["69014STL001", 530, 4],
    ["69014STL001", 930, 4], ["69069STL000", 520, 4], ["69069STL000", 920, 4],
  ],
  expectedGlass: { widthMm: 442, heightMm: 823, quantity: 2 },
} as const;
