import {
  resolveFabricacionContextForLineAssignment,
  resolveFabricacionContextFromLineCatalog,
} from "@/features/fabricacion/services/fabricacion-linea-cotizacion-context.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function buildRecipe(input: {
  id: string;
  lineTemplateId: number;
  tipologia: string;
  hojas: number;
  status: "validated" | "draft";
}): FabricationRecipeRecord {
  return {
    id: input.id,
    organizationId: 1,
    lineTemplateId: input.lineTemplateId,
    scope: "organization",
    status: input.status,
    version: 1,
    eliminadoEn: null,
    definition: {
      identidad: {
        recetaId: `receta-${input.id}`,
        nombre: `Receta ${input.tipologia}`,
        tipologia: input.tipologia,
        hojas: input.hojas,
        modulos: input.hojas,
        apertura: "",
        herraje: "",
        variante: "",
      },
      perfiles: [],
      accesorios: [],
      vidrios: [],
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("fabricacion-linea-cotizacion-context.service", () => {
  it("resuelve AL-32 como proyectante aunque conserve metadata histórica", () => {
    const context = resolveFabricacionContextFromLineCatalog({
      catalogKey: "ventora:l32",
      catalogMetadata: {
        lineConfiguration: "Corredera 2 hojas",
      },
    });

    expect(context).toEqual({
      fabricacionTipologia: "proyectante",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricationRecipeId: "",
      fabricacionApertura: "",
      fabricacionHerraje: "",
      fabricacionVariante: "",
    });
  });

  it("prioriza la tipología proyectante canónica de AL-32", () => {
    const context = resolveFabricacionContextForLineAssignment({
      template: {
        id: 42,
        catalogKey: "ventora:l32",
        catalogMetadata: { lineConfiguration: "Corredera 2 hojas" },
      },
      recipes: [
        buildRecipe({
          id: "rec-proyectante",
          lineTemplateId: 42,
          tipologia: "proyectante",
          hojas: 1,
          status: "validated",
        }),
      ],
      organizationId: 1,
      form: {
        tipo: "Ventana",
        nombre: "Ventana corredera",
        descripcion: "",
        sistema: "Personalizado",
        configuracion: "Personalizado",
        fabricacionHojas: null,
        fabricacionTipologia: "",
      },
    });

    expect(context?.fabricacionTipologia).toBe("proyectante");
    expect(context?.fabricacionHojas).toBe(1);
    expect(context?.fabricationRecipeId).toBe("rec-proyectante");
  });

  it("descarta una receta histórica corredera para AL-32", () => {
    const context = resolveFabricacionContextForLineAssignment({
      template: {
        id: 42,
        catalogKey: "ventora:l32",
        catalogMetadata: { lineConfiguration: "Corredera 2 hojas" },
      },
      recipes: [
        buildRecipe({
          id: "rec-proyectante",
          lineTemplateId: 42,
          tipologia: "proyectante",
          hojas: 1,
          status: "validated",
        }),
        buildRecipe({
          id: "rec-corredera",
          lineTemplateId: 42,
          tipologia: "corredera",
          hojas: 2,
          status: "validated",
        }),
      ],
      organizationId: 1,
      form: {
        tipo: "Ventana",
        nombre: "Ventana corredera",
        descripcion: "",
        sistema: "Personalizado",
        configuracion: "Personalizado",
        fabricacionHojas: null,
        fabricacionTipologia: "",
      },
    });

    expect(context?.fabricacionTipologia).toBe("proyectante");
    expect(context?.fabricacionHojas).toBe(1);
    expect(context?.fabricationRecipeId).toBe("");
  });
});
