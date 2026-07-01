import {
  pickRecommendedTemplate,
  resolveTemplateVariables,
  getTemplatesForProspect,
} from "@/features/growth/services/prospect-whatsapp-templates";
import type { GrowthProspect } from "@/features/growth/types/growth-dashboard";

function baseProspect(overrides: Partial<GrowthProspect> = {}): GrowthProspect {
  return {
    id: "p1",
    nombre: "Juan",
    empresa: "Vidrios Sur",
    whatsapp: "+56912345678",
    ciudad: "Santiago",
    origen: "Excel importado",
    estado: "nuevo",
    proximoPaso: "Contactar",
    fechaProximoSeguimiento: "2026-07-01",
    notas: "",
    dataStatus: "real",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("prospect-whatsapp-templates", () => {
  it("recomienda plantilla de importado cuando el origen es importación", () => {
    const prospect = baseProspect({ origen: "Import Excel 2026" });
    const templates = getTemplatesForProspect(prospect);
    const recommended = pickRecommendedTemplate(prospect, templates);

    expect(recommended?.id).toBe("primer_contacto_importado");
  });

  it("omite líneas con variables sin resolver", () => {
    const text = "Hola {{contacto}}\nCiudad: {{ciudad}}\nGracias.";
    const resolved = resolveTemplateVariables(text, {
      empresa: "Vidrios Sur",
      contacto: "Juan",
      ciudad: "",
      rubro: "",
      origen: "",
      link_trial: "https://app.test/login",
      link_demo: "https://app.test/demo",
    });

    expect(resolved).toContain("Hola Juan");
    expect(resolved).not.toContain("{{ciudad}}");
    expect(resolved).not.toContain("Ciudad:");
  });

  it("resuelve links de trial y demo", () => {
    const text = "Prueba: {{link_trial}} Demo: {{link_demo}}";
    const resolved = resolveTemplateVariables(text, {
      empresa: "Vidrios Sur",
      contacto: "Juan",
      ciudad: "Santiago",
      rubro: "Vidriería",
      origen: "Manual",
      link_trial: "https://app.test/login",
      link_demo: "https://app.test/demo",
    });

    expect(resolved).toContain("https://app.test/login");
    expect(resolved).toContain("https://app.test/demo");
  });
});
