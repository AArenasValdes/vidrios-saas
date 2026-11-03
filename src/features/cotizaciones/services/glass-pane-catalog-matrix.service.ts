import { COMPONENT_CATALOG, getConfigurationOptionsForComponentSistema } from "@/features/cotizaciones/services/component-catalog.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { resolveManualGlassPaneSlots } from "@/features/cotizaciones/services/manual-glass-pane-slots.service";
import {
  applyPalilloPresetToModule,
  createDefaultGuidedVisualConfig,
  listLeafModules,
  splitModule,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

export type GlassPaneCatalogMatrixRow = {
  source: "Catálogo comercial" | "Catálogo técnico de líneas" | "Constructor";
  group: string;
  componentType: string;
  system: string;
  configuration: string;
  catalogKey: string;
  configurationId: string;
  variant: string;
  positionStatus: "identificable_por_configuración" | "requiere_cantidad_manual";
  positionEvidence: "módulos_constructor_explícitos" | "cantidad_manual_explícita" | "inferencia_de_tipología_o_texto" | "sin_evidencia_de_posición";
  positionCount: number | null;
  slotIds: string[];
  geometryStatus: "medidas_finales_pendientes" | "geometría_no_rectangular";
  notes: string;
};

type TechnicalConfiguration = {
  id: string;
  componentType: string;
  openingType: string;
  label: string;
  variant: string;
  compositionPending?: boolean;
};

function technicalConfigurations(line: (typeof VENTORA_DEFAULT_LINE_CATALOG)[number]): TechnicalConfiguration[] {
  const metadata = line.catalogMetadata as Record<string, unknown> | undefined;
  const compatibility = metadata?.compatibility;
  if (!compatibility || typeof compatibility !== "object" || Array.isArray(compatibility)) return [];
  const configurations = (compatibility as Record<string, unknown>).configurations;
  if (!Array.isArray(configurations)) return [];
  return configurations.filter((entry): entry is TechnicalConfiguration => Boolean(
    entry && typeof entry === "object" && !Array.isArray(entry)
    && typeof (entry as Record<string, unknown>).id === "string"
    && typeof (entry as Record<string, unknown>).componentType === "string"
    && typeof (entry as Record<string, unknown>).openingType === "string"
    && typeof (entry as Record<string, unknown>).label === "string"
    && typeof (entry as Record<string, unknown>).variant === "string"
  ));
}

function row(input: {
  source: GlassPaneCatalogMatrixRow["source"];
  group: string;
  componentType: string;
  system?: string | null;
  configuration?: string | null;
  catalogKey?: string | null;
  configurationId?: string | null;
  variant?: string | null;
  manualPaneCount?: number;
  guidedVisualConfig?: GuidedVisualConfig;
  notes?: string;
}): GlassPaneCatalogMatrixRow {
  const resolution = resolveManualGlassPaneSlots({
    componentType: input.componentType,
    system: input.system,
    configuration: input.configuration,
    manualPaneCount: input.manualPaneCount,
    guidedVisualConfig: input.guidedVisualConfig,
  });
  const rectangular = resolution.slots.every((slot) => slot.rectangular);
  return {
    source: input.source,
    group: input.group,
    componentType: input.componentType,
    system: input.system ?? "",
    configuration: input.configuration ?? "",
    catalogKey: input.catalogKey ?? "",
    configurationId: input.configurationId ?? "",
    variant: input.variant ?? "",
    positionStatus: resolution.countIsKnown ? "identificable_por_configuración" : "requiere_cantidad_manual",
    positionEvidence: input.guidedVisualConfig
      ? "módulos_constructor_explícitos"
      : input.manualPaneCount
        ? "cantidad_manual_explícita"
        : resolution.countIsKnown
          ? "inferencia_de_tipología_o_texto"
          : "sin_evidencia_de_posición",
    positionCount: resolution.countIsKnown ? resolution.slots.length : null,
    slotIds: input.source === "Constructor"
      ? resolution.slots.map((_, index) => `módulo:${index + 1}`)
      : resolution.slots.map((slot) => slot.id),
    geometryStatus: rectangular ? "medidas_finales_pendientes" : "geometría_no_rectangular",
    notes: [input.notes, resolution.reason].filter(Boolean).join(" "),
  };
}

/** Enumerates the real commercial and technical catalogs; positions do not imply final glass dimensions. */
export function buildGlassPaneCatalogMatrix(): GlassPaneCatalogMatrixRow[] {
  const commercialRows = COMPONENT_CATALOG.flatMap((group) => group.items.flatMap((item) =>
    item.sistemas.flatMap((system) => {
      const configurations = getConfigurationOptionsForComponentSistema(item.tipo, system);
      return (configurations.length > 0 ? configurations : [""]).map((configuration) => row({
        source: "Catálogo comercial",
        group: group.title,
        componentType: item.tipo,
        system,
        configuration,
        catalogKey: `commercial:${item.tipo}:${system}:${configuration || "sin-configuración"}`,
        configurationId: "",
        variant: "",
        notes: "La selección comercial identifica tipo/configuración; requiere medidas finales o una geometría congelada apta.",
      }));
    })
  ));

  const technicalRows = VENTORA_DEFAULT_LINE_CATALOG.flatMap((line) =>
    technicalConfigurations(line).map((configuration) => row({
      source: "Catálogo técnico de líneas",
      group: typeof line.catalogMetadata?.familyLabel === "string"
        ? line.catalogMetadata.familyLabel
        : line.nombre,
      componentType: configuration.componentType,
      system: configuration.openingType,
      configuration: configuration.label,
      catalogKey: line.catalogKey,
      configurationId: configuration.id,
      variant: configuration.variant,
      notes: configuration.compositionPending
        ? "La distribución de hojas/composición queda pendiente; no se deduce desde el croquis."
        : "La identidad técnica no aporta dimensiones finales de vidrio por sí sola.",
    }))
  );

  const constructorRows = [1, 2, 3, 4, 5, 6].map((count) => {
    let visual = createDefaultGuidedVisualConfig({ widthMm: 1800, heightMm: 1400 });
    while (listLeafModules(visual.root).length < count) {
      visual = splitModule(visual, listLeafModules(visual.root)[0]!.id, "vertical", 0.5);
    }
    for (const visualModule of listLeafModules(visual.root)) visual = applyPalilloPresetToModule(visual, visualModule.id, "v1");
    return row({
      source: "Constructor",
      group: "Módulos explícitos",
      componentType: "Composición visual",
      system: "Constructor",
      configuration: `${count} módulo${count === 1 ? "" : "s"} explícito${count === 1 ? "" : "s"}`,
      catalogKey: "constructor:explicit-modules",
      configurationId: `constructor:modules:${count}:decorative-grids`,
      variant: "Palillos decorativos",
      guidedVisualConfig: visual,
      notes: "Las posiciones son módulos guardados; los IDs de la tabla son ordinales de lectura. Se requieren medidas finales rectangulares.",
    });
  });

  const unknownComposition = row({
    source: "Constructor",
    group: "Composición personalizada",
    componentType: "Composición personalizada",
    system: "Constructor",
    configuration: "Posiciones rectangulares indicadas por el usuario",
    catalogKey: "constructor:manual-rectangular-slots",
    configurationId: "constructor:manual-count:v1",
    variant: "Cantidad explícita requerida",
    notes: "Ingreso manual permite 1–2.000 posiciones. El sistema no crea dimensiones desde el vano ni desde el croquis.",
  });

  return [...commercialRows, ...technicalRows, ...constructorRows, unknownComposition];
}

export function serializeGlassPaneCatalogMatrix(rows = buildGlassPaneCatalogMatrix()): string {
  const columns: Array<keyof GlassPaneCatalogMatrixRow> = [
    "source", "group", "componentType", "system", "configuration", "catalogKey", "configurationId", "variant",
    "positionStatus", "positionEvidence", "positionCount", "slotIds", "geometryStatus", "notes",
  ];
  const quote = (value: unknown) => `"${String(Array.isArray(value) ? value.join("|") : value ?? "").replace(/"/g, '""')}"`;
  return [columns.map(quote).join(","), ...rows.map((entry) => columns.map((column) => quote(entry[column])).join(","))].join("\n") + "\n";
}
