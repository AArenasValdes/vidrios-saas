/**
 * Snapshot técnico de cubicación por ítem de cotización (Fase 4).
 * Se persiste en `cotizacion_items.observaciones` vía bridge `[cub:]`.
 * Congela la pauta al momento del guardado para que cambios futuros
 * en la línea no alteren cotizaciones históricas.
 */

import {
  buildLineTemplateCuttingPreview,
  getLineTemplateCubicationConfig,
  getLineTemplateCuttingRules,
  type CotizacionLineTemplateCatalogMetadata,
  type CotizacionLineTemplateCubicationStatus,
  type CotizacionLineTemplateCubicationSystem,
  type CotizacionLineTemplateCuttingBar,
  type CotizacionLineTemplateCuttingPreview,
  type CotizacionLineTemplateCut,
  type CotizacionLineTemplateGlassPiece,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

export const COTIZACION_CUBICATION_SNAPSHOT_VERSION = 1 as const;

export type CotizacionItemCubicationSnapshotSource = "auto" | "manual";

export type CotizacionItemCubicationSnapshot = {
  v: typeof COTIZACION_CUBICATION_SNAPSHOT_VERSION;
  source: CotizacionItemCubicationSnapshotSource;
  lineTemplateId: string;
  system: CotizacionLineTemplateCubicationSystem;
  status: CotizacionLineTemplateCubicationStatus;
  widthMm: number;
  heightMm: number;
  quantity: number;
  capturedAt: string;
  cuts: CotizacionLineTemplateCut[];
  bars: CotizacionLineTemplateCuttingBar[];
  totalUsedMm: number;
  totalWasteMm: number;
  wastePct: number;
  totalProfilesLinealMm: number;
  glass: CotizacionLineTemplateGlassPiece | null;
  accessoryUnits: number;
};

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeUtf8ToBase64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return toBase64Url(Buffer.from(value, "utf8").toString("base64"));
  }

  return toBase64Url(btoa(unescape(encodeURIComponent(value))));
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(b64)));
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseCut(value: unknown): CotizacionLineTemplateCut | null {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const functionLabel =
    typeof value.functionLabel === "string" ? value.functionLabel.trim() : "";
  const quantity = normalizePositiveInteger(value.quantity, 0);
  const lengthMm = normalizePositiveInteger(value.lengthMm, 0);
  if (!label || !functionLabel || quantity <= 0 || lengthMm <= 0) return null;
  return {
    label,
    functionLabel,
    quantity,
    lengthMm,
    totalLinealMm: normalizePositiveInteger(value.totalLinealMm, lengthMm * quantity),
  };
}

function parseBar(value: unknown): CotizacionLineTemplateCuttingBar | null {
  if (!isRecord(value)) return null;
  const index = normalizePositiveInteger(value.index, 0);
  const usedMm = Math.max(0, Math.round(Number(value.usedMm) || 0));
  const wasteMm = Math.max(0, Math.round(Number(value.wasteMm) || 0));
  const cuts = Array.isArray(value.cuts)
    ? value.cuts.map(parseCut).filter((cut): cut is CotizacionLineTemplateCut => Boolean(cut))
    : [];
  if (index <= 0) return null;
  return { index, usedMm, wasteMm, cuts };
}

function parseGlass(value: unknown): CotizacionLineTemplateGlassPiece | null {
  if (!isRecord(value)) return null;
  const widthMm = normalizePositiveInteger(value.widthMm, 0);
  const heightMm = normalizePositiveInteger(value.heightMm, 0);
  const quantity = normalizePositiveInteger(value.quantity, 0);
  if (widthMm <= 0 || heightMm <= 0 || quantity <= 0) return null;
  const totalM2 = Number(value.totalM2);
  return {
    widthMm,
    heightMm,
    quantity,
    totalM2: Number.isFinite(totalM2) ? totalM2 : (widthMm * heightMm * quantity) / 1_000_000,
  };
}

function normalizeSystem(value: unknown): CotizacionLineTemplateCubicationSystem {
  if (
    value === "pano_fijo" ||
    value === "corredera_2_hojas" ||
    value === "puerta_abatible_1_hoja"
  ) {
    return value;
  }
  return "corredera_2_hojas";
}

function normalizeStatus(value: unknown): CotizacionLineTemplateCubicationStatus {
  return value === "lista_para_probar" ||
    value === "en_calibracion" ||
    value === "validada" ||
    value === "revisar_cambios"
    ? value
    : "sin_configurar";
}

export function serializeCubicationSnapshot(
  snapshot: CotizacionItemCubicationSnapshot
): string {
  const json = JSON.stringify(snapshot);
  return `${COTIZACION_CUBICATION_SNAPSHOT_VERSION}|${encodeUtf8ToBase64Url(json)}`;
}

export function parseCubicationSnapshot(
  value: string | null | undefined
): CotizacionItemCubicationSnapshot | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  try {
    const pipeIndex = raw.indexOf("|");
    if (pipeIndex <= 0) return null;
    const version = Number(raw.slice(0, pipeIndex));
    if (version !== COTIZACION_CUBICATION_SNAPSHOT_VERSION) return null;

    const parsed = JSON.parse(decodeBase64Url(raw.slice(pipeIndex + 1))) as unknown;
    if (!isRecord(parsed) || parsed.v !== COTIZACION_CUBICATION_SNAPSHOT_VERSION) {
      return null;
    }

    const lineTemplateId =
      typeof parsed.lineTemplateId === "string" ? parsed.lineTemplateId.trim() : "";
    const widthMm = normalizePositiveInteger(parsed.widthMm, 0);
    const heightMm = normalizePositiveInteger(parsed.heightMm, 0);
    const quantity = normalizePositiveInteger(parsed.quantity, 0);
    const cuts = Array.isArray(parsed.cuts)
      ? parsed.cuts.map(parseCut).filter((cut): cut is CotizacionLineTemplateCut => Boolean(cut))
      : [];

    if (!lineTemplateId || widthMm <= 0 || heightMm <= 0 || quantity <= 0 || cuts.length === 0) {
      return null;
    }

    const bars = Array.isArray(parsed.bars)
      ? parsed.bars.map(parseBar).filter((bar): bar is CotizacionLineTemplateCuttingBar => Boolean(bar))
      : [];

    return {
      v: COTIZACION_CUBICATION_SNAPSHOT_VERSION,
      source: parsed.source === "manual" ? "manual" : "auto",
      lineTemplateId,
      system: normalizeSystem(parsed.system),
      status: normalizeStatus(parsed.status),
      widthMm,
      heightMm,
      quantity,
      capturedAt:
        typeof parsed.capturedAt === "string" && parsed.capturedAt.trim()
          ? parsed.capturedAt.trim()
          : new Date(0).toISOString(),
      cuts,
      bars,
      totalUsedMm: Math.max(0, Math.round(Number(parsed.totalUsedMm) || 0)),
      totalWasteMm: Math.max(0, Math.round(Number(parsed.totalWasteMm) || 0)),
      wastePct: Number.isFinite(Number(parsed.wastePct)) ? Number(parsed.wastePct) : 0,
      totalProfilesLinealMm: Math.max(
        0,
        Math.round(Number(parsed.totalProfilesLinealMm) || 0)
      ),
      glass: parseGlass(parsed.glass),
      accessoryUnits: Math.max(0, Math.round(Number(parsed.accessoryUnits) || 0)),
    };
  } catch {
    return null;
  }
}

function normalizeEditableCut(cut: Partial<CotizacionLineTemplateCut>): CotizacionLineTemplateCut | null {
  const label = typeof cut.label === "string" ? cut.label.trim() : "";
  const functionLabel =
    typeof cut.functionLabel === "string" ? cut.functionLabel.trim() : "";
  const quantity = normalizePositiveInteger(cut.quantity, 0);
  const lengthMm = normalizePositiveInteger(cut.lengthMm, 0);
  if (!label || !functionLabel || quantity <= 0 || lengthMm <= 0) {
    return null;
  }
  return {
    label: label.slice(0, 80),
    functionLabel: functionLabel.slice(0, 80),
    quantity,
    lengthMm,
    totalLinealMm: lengthMm * quantity,
  };
}

function packCutsIntoBars(
  cuts: CotizacionLineTemplateCut[],
  barLengthMm: number,
  sawKerfMm: number
): CotizacionLineTemplateCuttingBar[] {
  const expanded = cuts
    .flatMap((cut) =>
      Array.from({ length: cut.quantity }, () => ({
        ...cut,
        quantity: 1,
        totalLinealMm: cut.lengthMm,
      }))
    )
    .sort((a, b) => b.lengthMm - a.lengthMm);

  const bars: CotizacionLineTemplateCuttingBar[] = [];
  const safeBarLength = Math.max(normalizePositiveInteger(barLengthMm, 6000), 1000);
  const safeKerf = Math.max(0, Math.round(Number(sawKerfMm) || 0));

  expanded.forEach((cut) => {
    const existingBar = bars.find((bar) => {
      const kerf = bar.cuts.length > 0 ? safeKerf : 0;
      return bar.usedMm + kerf + cut.lengthMm <= safeBarLength;
    });
    const targetBar =
      existingBar ??
      ({
        index: bars.length + 1,
        usedMm: 0,
        wasteMm: safeBarLength,
        cuts: [],
      } satisfies CotizacionLineTemplateCuttingBar);

    if (!existingBar) bars.push(targetBar);

    const kerf = targetBar.cuts.length > 0 ? safeKerf : 0;
    targetBar.usedMm += kerf + cut.lengthMm;
    targetBar.wasteMm = Math.max(safeBarLength - targetBar.usedMm, 0);
    targetBar.cuts.push(cut);
  });

  return bars;
}

/** Reaplica cortes editados a un snapshot (solo esta cotización). */
export function rebuildCubicationSnapshotWithCuts(
  base: CotizacionItemCubicationSnapshot,
  cutsInput: Array<Partial<CotizacionLineTemplateCut>>,
  options?: {
    source?: CotizacionItemCubicationSnapshotSource;
    barLengthMm?: number;
    sawKerfMm?: number;
    capturedAt?: string;
  }
): CotizacionItemCubicationSnapshot | null {
  const cuts = cutsInput
    .map(normalizeEditableCut)
    .filter((cut): cut is CotizacionLineTemplateCut => Boolean(cut));

  if (cuts.length === 0) {
    return null;
  }

  const barLengthMm = options?.barLengthMm ?? 6000;
  const sawKerfMm = options?.sawKerfMm ?? 3;
  const bars = packCutsIntoBars(cuts, barLengthMm, sawKerfMm);
  const totalUsedMm = bars.reduce((sum, bar) => sum + bar.usedMm, 0);
  const totalWasteMm = bars.reduce((sum, bar) => sum + bar.wasteMm, 0);
  const totalAvailableMm = bars.length * Math.max(barLengthMm, 1000);
  const totalProfilesLinealMm = cuts.reduce((sum, cut) => sum + cut.totalLinealMm, 0);

  return {
    ...base,
    source: options?.source ?? "manual",
    capturedAt: options?.capturedAt ?? new Date().toISOString(),
    cuts,
    bars,
    totalUsedMm,
    totalWasteMm,
    wastePct: totalAvailableMm > 0 ? (totalWasteMm / totalAvailableMm) * 100 : 0,
    totalProfilesLinealMm,
  };
}

export function createEmptyCubicationCutDraft(): CotizacionLineTemplateCut {
  return {
    label: "Perfil",
    functionLabel: "Corte",
    quantity: 1,
    lengthMm: 1000,
    totalLinealMm: 1000,
  };
}

export function cubicationSnapshotMatchesDimensions(
  snapshot: CotizacionItemCubicationSnapshot | null | undefined,
  input: {
    lineTemplateId?: string | null;
    widthMm: number;
    heightMm: number;
    quantity: number;
  }
): boolean {
  if (!snapshot) return false;
  const lineTemplateId = (input.lineTemplateId ?? "").trim();
  return (
    snapshot.lineTemplateId === lineTemplateId &&
    snapshot.widthMm === input.widthMm &&
    snapshot.heightMm === input.heightMm &&
    snapshot.quantity === input.quantity
  );
}

export function cubicationSnapshotToPreview(
  snapshot: CotizacionItemCubicationSnapshot
): CotizacionLineTemplateCuttingPreview {
  return {
    cuts: snapshot.cuts,
    bars: snapshot.bars,
    totalUsedMm: snapshot.totalUsedMm,
    totalWasteMm: snapshot.totalWasteMm,
    wastePct: snapshot.wastePct,
    totalProfilesLinealMm: snapshot.totalProfilesLinealMm,
    glass: snapshot.glass,
    accessoryUnits: snapshot.accessoryUnits,
  };
}

/**
 * Borrador manual para composiciones Personalizado.
 * No usa la plantilla automática de la línea (evitar pauta falsa).
 * Solo ofrece filas editables + vidrio del vano como punto de partida.
 */
export function buildPersonalizadoManualCubicationDraft(input: {
  lineTemplateId: string;
  catalogMetadata?: CotizacionLineTemplateCatalogMetadata | null;
  widthMm: number;
  heightMm: number;
  quantity?: number;
  capturedAt?: string;
}): CotizacionItemCubicationSnapshot | null {
  const lineTemplateId = input.lineTemplateId.trim();
  const widthMm = normalizePositiveInteger(input.widthMm, 0);
  const heightMm = normalizePositiveInteger(input.heightMm, 0);
  const quantity = normalizePositiveInteger(input.quantity, 1);

  if (!lineTemplateId || widthMm <= 0 || heightMm <= 0) {
    return null;
  }

  const rules = getLineTemplateCuttingRules(input.catalogMetadata);
  const cubicationConfig = getLineTemplateCubicationConfig(input.catalogMetadata);
  const starterCuts: CotizacionLineTemplateCut[] = [
    {
      label: "Marco",
      functionLabel: "Horizontal",
      quantity: 2,
      lengthMm: widthMm,
      totalLinealMm: widthMm * 2,
    },
    {
      label: "Marco",
      functionLabel: "Vertical",
      quantity: 2,
      lengthMm: heightMm,
      totalLinealMm: heightMm * 2,
    },
    {
      label: "División / hoja",
      functionLabel: "Por definir",
      quantity: 1,
      lengthMm: heightMm,
      totalLinealMm: heightMm,
    },
  ];

  const base: CotizacionItemCubicationSnapshot = {
    v: COTIZACION_CUBICATION_SNAPSHOT_VERSION,
    source: "manual",
    lineTemplateId,
    system: cubicationConfig.system,
    status: "en_calibracion",
    widthMm,
    heightMm,
    quantity,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    cuts: starterCuts,
    bars: [],
    totalUsedMm: 0,
    totalWasteMm: 0,
    wastePct: 0,
    totalProfilesLinealMm: 0,
    glass: {
      widthMm,
      heightMm,
      quantity,
      totalM2: (widthMm * heightMm * quantity) / 1_000_000,
    },
    accessoryUnits: 0,
  };

  const rebuilt = rebuildCubicationSnapshotWithCuts(base, starterCuts, {
    source: "manual",
    barLengthMm: rules.barLengthMm,
    sawKerfMm: rules.sawKerfMm,
    capturedAt: base.capturedAt,
  });

  if (!rebuilt) {
    return null;
  }

  return {
    ...rebuilt,
    status: "en_calibracion",
    glass: base.glass,
    accessoryUnits: 0,
  };
}

export function buildCubicationSnapshotFromCatalogMetadata(input: {
  lineTemplateId: string;
  catalogMetadata: CotizacionLineTemplateCatalogMetadata | null | undefined;
  widthMm: number;
  heightMm: number;
  quantity?: number;
  capturedAt?: string;
}): CotizacionItemCubicationSnapshot | null {
  const lineTemplateId = input.lineTemplateId.trim();
  const widthMm = normalizePositiveInteger(input.widthMm, 0);
  const heightMm = normalizePositiveInteger(input.heightMm, 0);
  const quantity = normalizePositiveInteger(input.quantity, 1);

  if (!lineTemplateId || widthMm <= 0 || heightMm <= 0) {
    return null;
  }

  const rules = getLineTemplateCuttingRules(input.catalogMetadata);
  if (!rules.enabled || rules.mode === "sin_corte") {
    return null;
  }

  const cubicationConfig = getLineTemplateCubicationConfig(input.catalogMetadata);
  const preview = buildLineTemplateCuttingPreview(
    rules,
    { widthMm, heightMm, quantity },
    cubicationConfig
  );

  if (preview.cuts.length === 0) {
    return null;
  }

  return {
    v: COTIZACION_CUBICATION_SNAPSHOT_VERSION,
    source: "auto",
    lineTemplateId,
    system: cubicationConfig.system,
    status: cubicationConfig.status,
    widthMm,
    heightMm,
    quantity,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    cuts: preview.cuts,
    bars: preview.bars,
    totalUsedMm: preview.totalUsedMm,
    totalWasteMm: preview.totalWasteMm,
    wastePct: preview.wastePct,
    totalProfilesLinealMm: preview.totalProfilesLinealMm,
    glass: preview.glass,
    accessoryUnits: preview.accessoryUnits,
  };
}

export function resolveCubicationSnapshotForSave(input: {
  lineTemplateId: string;
  widthMm: number | null | undefined;
  heightMm: number | null | undefined;
  quantity: number;
  catalogMetadata?: CotizacionLineTemplateCatalogMetadata | null;
  draftSnapshot?: CotizacionItemCubicationSnapshot | null;
  previousSnapshot?: CotizacionItemCubicationSnapshot | null;
  /** Composición Personalizado: nunca caer a pauta automática de línea. */
  personalizadoAssistMode?: boolean;
}): CotizacionItemCubicationSnapshot | null {
  const lineTemplateId = input.lineTemplateId.trim();
  const widthMm = normalizePositiveInteger(input.widthMm, 0);
  const heightMm = normalizePositiveInteger(input.heightMm, 0);
  const quantity = normalizePositiveInteger(input.quantity, 1);
  const dims = { lineTemplateId, widthMm, heightMm, quantity };

  if (!lineTemplateId || widthMm <= 0 || heightMm <= 0) {
    return null;
  }

  if (input.personalizadoAssistMode) {
    if (
      cubicationSnapshotMatchesDimensions(input.draftSnapshot, dims) &&
      input.draftSnapshot?.source === "manual"
    ) {
      return rebuildCubicationSnapshotWithCuts(
        input.draftSnapshot,
        input.draftSnapshot.cuts,
        {
          source: "manual",
          capturedAt: input.draftSnapshot.capturedAt,
        }
      );
    }

    if (
      cubicationSnapshotMatchesDimensions(input.previousSnapshot, dims) &&
      input.previousSnapshot?.source === "manual"
    ) {
      return input.previousSnapshot;
    }

    return buildPersonalizadoManualCubicationDraft({
      lineTemplateId,
      catalogMetadata: input.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
  }

  if (
    cubicationSnapshotMatchesDimensions(input.draftSnapshot, dims) &&
    input.draftSnapshot
  ) {
    if (input.draftSnapshot.source === "manual") {
      return rebuildCubicationSnapshotWithCuts(input.draftSnapshot, input.draftSnapshot.cuts, {
        source: "manual",
        capturedAt: input.draftSnapshot.capturedAt,
      });
    }

    if (input.catalogMetadata) {
      return buildCubicationSnapshotFromCatalogMetadata({
        lineTemplateId,
        catalogMetadata: input.catalogMetadata,
        widthMm,
        heightMm,
        quantity,
      });
    }

    return input.draftSnapshot;
  }

  if (
    cubicationSnapshotMatchesDimensions(input.previousSnapshot, dims) &&
    input.previousSnapshot?.source === "manual"
  ) {
    return input.previousSnapshot;
  }

  if (input.catalogMetadata) {
    return buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId,
      catalogMetadata: input.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
  }

  if (cubicationSnapshotMatchesDimensions(input.previousSnapshot, dims)) {
    return input.previousSnapshot ?? null;
  }

  return null;
}
