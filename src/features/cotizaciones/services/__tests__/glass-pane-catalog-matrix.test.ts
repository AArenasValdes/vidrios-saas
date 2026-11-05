import { COMPONENT_CATALOG, getConfigurationOptionsForComponentSistema } from "@/features/cotizaciones/services/component-catalog.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { buildGlassPaneCatalogMatrix } from "../glass-pane-catalog-matrix.service";

describe("glass-pane-catalog-matrix.service", () => {
  const matrix = buildGlassPaneCatalogMatrix();

  it("enumera todas las combinaciones comerciales actuales y las configuraciones técnicas con ID", () => {
    const commercialExpected = COMPONENT_CATALOG.reduce((sum, group) => sum + group.items.reduce((groupSum, item) =>
      groupSum + item.sistemas.reduce((systemSum, system) => {
        const options = getConfigurationOptionsForComponentSistema(item.tipo, system);
        return systemSum + Math.max(1, options.length);
      }, 0), 0), 0);
    const technicalExpected = VENTORA_DEFAULT_LINE_CATALOG.reduce((sum, line) => {
      const metadata = line.catalogMetadata as Record<string, unknown>;
      const compatibility = metadata.compatibility as Record<string, unknown> | undefined;
      return sum + (Array.isArray(compatibility?.configurations) ? compatibility.configurations.length : 0);
    }, 0);

    expect(matrix.filter((entry) => entry.source === "Catálogo comercial")).toHaveLength(commercialExpected);
    expect(matrix.filter((entry) => entry.source === "Catálogo técnico de líneas")).toHaveLength(technicalExpected);
    expect(matrix.filter((entry) => entry.source === "Constructor")).toHaveLength(7);
    expect(matrix.filter((entry) => entry.positionStatus === "requiere_cantidad_manual").length).toBeGreaterThan(0);
    expect(matrix.every((entry) => entry.geometryStatus !== ("medidas_finales_confirmadas" as never))).toBe(true);
  });

  it("conserva identidad técnica exacta y el límite de evidencia de cada fila", () => {
    const line32 = matrix.find((entry) => entry.catalogKey === "ventora:l32" && entry.configurationId === "ventora:l32:proyectante");
    expect(line32).toMatchObject({
      source: "Catálogo técnico de líneas",
      catalogKey: "ventora:l32",
      configurationId: expect.any(String),
      positionStatus: "identificable_por_configuración",
      geometryStatus: "medidas_finales_pendientes",
    });
    expect(matrix.find((entry) => entry.configurationId === "constructor:modules:6:decorative-grids")).toMatchObject({
      positionCount: 6,
      positionEvidence: "módulos_constructor_explícitos",
      slotIds: ["módulo:1", "módulo:2", "módulo:3", "módulo:4", "módulo:5", "módulo:6"],
      geometryStatus: "medidas_finales_pendientes",
    });
    expect(matrix.find((entry) => entry.configurationId === "constructor:manual-count:v1")?.notes)
      .toContain("no crea dimensiones desde el vano");
    expect(matrix.find((entry) => entry.configurationId === "ventora:l32:proyectante")?.positionEvidence)
      .toBe("inferencia_de_tipología_o_texto");
  });
});
