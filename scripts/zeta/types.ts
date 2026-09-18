export const RECIPE_STATUSES = [
  "confirmed",
  "pending",
  "conflict",
  "unsupported",
  "error",
] as const;

export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export const EXTRACT_OUTCOMES = [
  "CONFIRMED",
  "PENDING",
  "SKIPPED",
  "CONFIGURATION_ERROR",
  "ZETA_UI_ERROR",
  "AUTOMATION_ERROR",
  "SOURCE_CONFLICT",
  "UNSUPPORTED_CONFIRMED",
] as const;

export type ExtractOutcome = (typeof EXTRACT_OUTCOMES)[number];

export const GLAZING_TYPES = ["monolitico", "dvh"] as const;
export type GlazingType = (typeof GLAZING_TYPES)[number];

export const TARGET_PURPOSES = ["canonical", "formula_geometry"] as const;
export type TargetPurpose = (typeof TARGET_PURPOSES)[number];

export const DERIVED_STATUSES = [
  "candidate",
  "cross_checked",
  "ready_for_workshop_validation",
] as const;

export type DerivedStatus = (typeof DERIVED_STATUSES)[number];

export type TestDimensions = {
  widthMm: number;
  heightMm: number;
};

export type ProfileCut = {
  code: string;
  name: string;
  position: string | null;
  quantity: number;
  lengthMm: number;
  cut1Deg: number | null;
  cut2Deg: number | null;
};

export type GlassPiece = {
  code: string;
  name: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
};

export type HardwareItem = {
  code: string;
  name: string;
  quantity: number;
  unit: string;
};

export type SourceEvidence = {
  projectId: string | null;
  planId: string | null;
  screenshotPaths: string[];
  rawPath: string | null;
  sourceDocument?: string | null;
};

export type ConfirmedRecipe = {
  id: string;
  manufacturer: string;
  system: string;
  line: string;
  variant: string;
  glazing: GlazingType;
  leaves: number;
  topology: string | null;
  source: "sistema_zeta";
  evidenceType: "plan_de_armado";
  status: "confirmed";
  extractedAt: string | null;
  testDimensions: TestDimensions;
  profiles: ProfileCut[];
  glass: GlassPiece[];
  hardware: HardwareItem[];
  sourceEvidence: SourceEvidence;
};

export type ExtractTarget = {
  id: string;
  manufacturer: string;
  system: string;
  line: string;
  variant: string;
  glazing: GlazingType;
  glassCode: string;
  leaves: number;
  widthMm: number;
  heightMm: number;
  status: RecipeStatus;
  purpose: TargetPurpose;
  reason?: string;
  colorHint?: string;
  topologyHint?: string;
  confirmedRecipeId?: string;
};

export type TargetsFile = {
  generatedAt: string;
  source: string[];
  targets: ExtractTarget[];
};

export type CoverageLeafState = {
  status: RecipeStatus;
  recipeId: string | null;
  widthMm: number | null;
  heightMm: number | null;
  lastCheckedAt: string | null;
  reason?: string;
};

export type CoverageFamily = {
  manufacturer: string;
  system: string;
  line: string;
  variant: string;
  glazing: GlazingType;
  leaves: Record<string, CoverageLeafState>;
  extraTests: Array<{
    id: string;
    leaves: number;
    widthMm: number;
    heightMm: number;
    status: RecipeStatus;
    purpose: TargetPurpose;
    reason?: string;
  }>;
};

export type CoverageFile = {
  generatedAt: string;
  summary: {
    confirmed: number;
    pending: number;
    conflicts: number;
    errors: number;
    unsupported: number;
    totalKnown: number;
  };
  families: CoverageFamily[];
};

export type ExtractedPlan = {
  lineName: string | null;
  leaves: number | null;
  widthMm: number | null;
  heightMm: number | null;
  glazing: GlazingType | null;
  glassCode: string | null;
  profiles: ProfileCut[];
  glass: GlassPiece[];
  hardware: HardwareItem[];
  planText: string;
  planHtml: string;
  warnings: string[];
};

export type RecipeDiff = {
  path: string;
  expected: string;
  actual: string;
  severity: "error" | "warning";
};

export type CompareResult = {
  recipeId: string;
  ok: boolean;
  errors: RecipeDiff[];
  warnings: RecipeDiff[];
};

export type DerivedFormula = {
  id: string;
  manufacturer: string;
  system: string;
  line: string;
  variant: string;
  profileCode: string;
  profileName: string;
  formula: string;
  inputs: string[];
  evidenceIds: string[];
  observations: Array<{
    recipeId: string;
    leaves: number;
    widthMm: number;
    heightMm: number;
    lengthMm: number;
    quantity: number;
  }>;
  confidence: "low" | "medium" | "high";
  status: DerivedStatus;
  notes: string[];
};

export type RunLog = {
  startedAt: string;
  finishedAt: string;
  command: string;
  mode: "dry-run" | "live" | "self-check" | "validate" | "coverage" | "derive" | "login" | "ingest";
  targetsRequested: string[];
  processed: string[];
  confirmed: string[];
  skipped: string[];
  failed: string[];
  pending: string[];
  errors: Array<{ targetId?: string; outcome: ExtractOutcome | "VALIDATION_ERROR"; message: string }>;
  notes: string[];
};

export type CliFlags = {
  dryRun: boolean;
  live: boolean;
  selfCheck: boolean;
  login: boolean;
  limit: number;
  manufacturer?: string;
  system?: string;
  line?: string;
  leaves?: number;
  status?: RecipeStatus;
  compareConfirmed?: string;
  includeGeometry: boolean;
  writeConfirmed: boolean;
};

export type InventoryRecipe = {
  filePath: string;
  recipe: ConfirmedRecipe;
  raw: unknown;
};
