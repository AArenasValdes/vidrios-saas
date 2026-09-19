import {
  dedupeLineTemplatesForQuotePicker,
  formatLineTemplateQuotePickerLabel,
  formatSodalL25ContextualLineName,
  formatSodalL25FullRecipeName,
  formatSodalL25FullRecipeNameFromVariant,
  formatSodalL25ConstructionLabel,
  formatSodalL25GlazingLabel,
  formatSodalL25LegLabel,
  formatSodalL25ReinforcementLabel,
  resolveCotizacionItemSodalL25LineDisplayLabel,
  resolveEffectiveSodalL25CatalogKey,
  resolveSodalL25CommercialLineDisplayName,
  SODAL_L25_COMMERCIAL_BASE_NAME,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

describe("sodal-l25-presentation.service", () => {
  it("prioriza el nombre comercial L25 sobre un catalogKey ajeno", () => {
    expect(
      resolveEffectiveSodalL25CatalogKey({
        catalogKey: "ventora:custom",
        nombre: "Serie 25",
      })
    ).toBe("ventora:l25");
  });

  it("reconoce Serie 25 legacy sin catalogKey explícito", () => {
    expect(
      resolveEffectiveSodalL25CatalogKey({
        nombre: "Serie 25",
      })
    ).toBe("ventora:l25");
    expect(
      resolveSodalL25CommercialLineDisplayName({
        nombre: "Serie 25",
      })
    ).toBe("L25");
  });

  it("normaliza la línea comercial L25 en selectores", () => {
    expect(
      resolveSodalL25CommercialLineDisplayName({
        catalogKey: "ventora:l25",
        nombre: "L25 3",
      })
    ).toBe("L25");
    expect(
      formatLineTemplateQuotePickerLabel({
        catalogKey: "ventora:l25",
        nombre: "Serie 25",
      })
    ).toBe("L25");
  });

  it("presenta nombres contextuales por cantidad de hojas", () => {
    expect(formatSodalL25ContextualLineName(2)).toBe("L25 Corredera · 2 hojas");
    expect(formatSodalL25ContextualLineName(3)).toBe("L25 Corredera · 3 hojas");
    expect(formatSodalL25ContextualLineName(4)).toBe("L25 Corredera · 4 hojas");
  });

  it("presenta el nombre técnico completo de una receta", () => {
    expect(
      formatSodalL25FullRecipeName({
        leaves: 3,
        glazing: "dvh",
        leg: "open",
        reinforcement: "reinforced",
      })
    ).toBe("L25 Corredera 3 hojas · DVH · Pierna abierta · Reforzada");

    expect(
      formatSodalL25FullRecipeNameFromVariant({
        leaves: 4,
        variantSlug: "dvh_closed_normal",
      })
    ).toBe("L25 Corredera 4 hojas · DVH · Pierna cerrada · Normal");
  });

  it("traduce slugs internos a español sin exponer tokens", () => {
    expect(formatSodalL25GlazingLabel("monolithic")).toBe("Monolítico");
    expect(formatSodalL25GlazingLabel("dvh")).toBe("DVH");
    expect(formatSodalL25LegLabel("open")).toBe("Pierna abierta");
    expect(formatSodalL25LegLabel("closed")).toBe("Pierna cerrada");
    expect(formatSodalL25ReinforcementLabel("normal")).toBe("Normal");
    expect(formatSodalL25ReinforcementLabel("reinforced")).toBe("Reforzada");
    expect(formatSodalL25ConstructionLabel("dvh_open_reinforced")).toBe(
      "DVH · Pierna abierta · Reforzada"
    );
    expect(formatSodalL25ConstructionLabel("estandar")).toBeNull();
  });

  it("resuelve etiqueta de ítem con contexto o receta completa", () => {
    expect(
      resolveCotizacionItemSodalL25LineDisplayLabel({
        catalogLineKey: "ventora:l25",
        fabricacionHojas: 2,
      })
    ).toBe("L25 Corredera · 2 hojas");

    expect(
      resolveCotizacionItemSodalL25LineDisplayLabel({
        catalogLineKey: "ventora:l25",
        sheetScheme: "3 hojas",
        fabricacionGlazing: "dvh",
        fabricacionLeg: "open",
        fabricacionReinforcement: "reinforced",
      })
    ).toBe("L25 Corredera 3 hojas · DVH · Pierna abierta · Reforzada");
  });

  it("deduplica filas ventora:l25 en el selector de cotización", () => {
    const templates = [
      { id: 1, catalogKey: "ventora:l25", nombre: "L25 2", precioM2Sugerido: 0, isActive: true },
      { id: 2, catalogKey: "ventora:l25", nombre: "L25 3", precioM2Sugerido: 80000, isActive: true },
      { id: 3, catalogKey: "ventora:l20", nombre: "L20", precioM2Sugerido: 70000, isActive: true },
    ] as CotizacionLineTemplate[];

    const deduped = dedupeLineTemplatesForQuotePicker(templates);
    expect(deduped).toHaveLength(2);
    expect(deduped.filter((row) => row.catalogKey === "ventora:l25")).toHaveLength(1);
    expect(deduped.find((row) => row.catalogKey === "ventora:l25")?.id).toBe(2);
    expect(formatLineTemplateQuotePickerLabel(deduped[0]!)).toBe(SODAL_L25_COMMERCIAL_BASE_NAME);
  });
});
