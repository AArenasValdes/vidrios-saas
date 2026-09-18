export const GLAZING_TYPES = ["monolitico", "dvh"] as const;
export type GlazingType = (typeof GLAZING_TYPES)[number];

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

export type ProfileMeasureObservation = {
  recipeId: string;
  widthMm: number;
  heightMm: number;
  leaves: number;
  lengthMm: number;
  quantity: number;
  code: string;
  profileIndex: number;
};

export type GlassMeasureObservation = {
  recipeId: string;
  widthMm: number;
  heightMm: number;
  leaves: number;
  pieceWidthMm: number;
  pieceHeightMm: number;
  quantity: number;
  code: string;
  glassIndex: number;
};
