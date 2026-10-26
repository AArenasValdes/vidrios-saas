import { THERMOWIN_KOMPEN_PRECIOS_2026 } from "../thermowin-kompen-precios-2026";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { getLineTemplateWorkshopProfiles } from "@/features/cotizaciones/line-templates/types/line-profile-references";

describe("referencias de perfiles y precios Thermowin Kompen", () => {
  it("mantiene cada código con precio enlazado a las referencias de su familia", () => {
    const lineByFamily = new Map(
      VENTORA_DEFAULT_LINE_CATALOG.flatMap((line) => {
        const familyKey = line.catalogMetadata?.familyKey;
        return typeof familyKey === "string" && line.catalogKey
          ? [[familyKey, line] as const]
          : [];
      })
    );
    const pricedTechnicalKeys = new Set(
      THERMOWIN_KOMPEN_PRECIOS_2026.presentations.map((presentation) => presentation.technicalKey)
    );

    for (const technicalInput of THERMOWIN_KOMPEN_PRECIOS_2026.technicalInputs) {
      if (!pricedTechnicalKeys.has(technicalInput.technicalKey)) continue;

      for (const familyKey of technicalInput.familyKeys) {
        const line = lineByFamily.get(familyKey);
        expect(line).toBeDefined();
        const references = getLineTemplateWorkshopProfiles(line?.catalogMetadata)?.profiles ?? [];
        expect(references.map((reference) => reference.code?.trim().toLocaleUpperCase("en-US")))
          .toContain(technicalInput.sourceCode.trim().toLocaleUpperCase("en-US"));
      }
    }
  });
});
