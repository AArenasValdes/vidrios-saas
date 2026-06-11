import { COMPONENT_CATALOG } from "../../services/component-catalog.service";
import { buildCotizacionItemPrintSpecs } from "@/app/print/cotizaciones/[id]/_utils/item-print-specs";
import { shouldRequireProfileMaterialForComponent } from "../workflow-ui";

const ALL_COMPONENT_TYPES = COMPONENT_CATALOG.flatMap((group) =>
  group.items.map((item) => item.tipo)
);

const GLASS_ONLY_TYPES = ["Espejo", "Cubierta de mesa"] as const;

const PROFILE_TYPES = ALL_COMPONENT_TYPES.filter(
  (tipo) => !GLASS_ONLY_TYPES.includes(tipo as (typeof GLASS_ONLY_TYPES)[number])
);

const printSpecBase = {
  dimensionsLabel: "1200 x 1500 mm",
  surfaceLabel: "1.80 m2 aprox.",
  vidrio: "Incoloro monolitico 5mm",
  material: "Aluminio",
  colorName: "Gris",
  systemLabel: "Corredera",
  lineLabel: "Serie 25",
  configuracion: "2 hojas",
};

describe("regresion material de perfil", () => {
  it("solo Espejo y Cubierta de mesa omiten material de perfil", () => {
    for (const tipo of GLASS_ONLY_TYPES) {
      expect(shouldRequireProfileMaterialForComponent(tipo)).toBe(false);
    }

    for (const tipo of PROFILE_TYPES) {
      expect(shouldRequireProfileMaterialForComponent(tipo)).toBe(true);
    }
  });

  it("el PDF mantiene material y color para aberturas y cierres", () => {
    for (const tipo of ["Ventana", "Puerta", "Paño fijo", "Shower door", "Cierre terraza/logia", "Baranda"]) {
      const keys = buildCotizacionItemPrintSpecs({
        ...printSpecBase,
        tipo,
      }).map((spec) => spec.key);

      expect(keys).toContain("Material");
      expect(keys).toContain("Color");
    }
  });

  it("el PDF omite material y color solo para espejo y cubierta de mesa", () => {
    for (const tipo of GLASS_ONLY_TYPES) {
      const keys = buildCotizacionItemPrintSpecs({
        ...printSpecBase,
        tipo,
        vidrio: tipo === "Espejo" ? "Espejo 4mm" : "Templado 10mm",
      }).map((spec) => spec.key);

      expect(keys).not.toContain("Material");
      expect(keys).not.toContain("Color");
      expect(keys).toContain("Vidrio");
      expect(keys).toContain("Superficie");
    }
  });
});
