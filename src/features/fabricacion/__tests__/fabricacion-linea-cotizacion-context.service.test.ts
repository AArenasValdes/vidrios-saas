import {
  resolveFabricacionContextForLineAssignment,
  resolveFabricacionContextFromLineCatalog,
} from "@/features/fabricacion/services/fabricacion-linea-cotizacion-context.service";
import { WINHOUSE_S60_VARIANTS } from "@/features/fabricacion/fixtures/winhouse-s60-recipes";
import { crearRecetaPlantillaVentoraCorredera2H } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { resolveWinHouseS60QuoteTypology } from "@/features/fabricacion/services/winhouse-s60-quote-config.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function buildRecipe(input: {
  id: string;
  lineTemplateId: number;
  tipologia: string;
  hojas: number;
  status: "validated" | "draft";
  variante?: string;
  configurationId?: string;
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
        variante: input.variante ?? "",
        ...(input.configurationId ? { configurationId: input.configurationId } : {}),
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
  it("usa la variante Normal confirmada al asignar L42 sin selección explícita", () => {
    const catalogMetadata = { lineConfiguration: "Proyectante 1 hoja" };
    const catalog = resolveFabricacionContextFromLineCatalog({
      catalogKey: "ventora:l42",
      catalogMetadata,
    });
    expect(catalog?.fabricacionVariante).toBe("normal");
    const customDraft = {
      ...buildRecipe({ id: "alar-personalizada", lineTemplateId: 210, tipologia: "proyectante", hojas: 1, status: "draft" }),
      variant: "alar_marco_4201",
      sourceReference: "taller:personalizada:user-provided%3Aalar-linea42%3Aproyectante-4201%3A2026-09-21",
      definition: {
        ...buildRecipe({ id: "alar-personalizada", lineTemplateId: 210, tipologia: "proyectante", hojas: 1, status: "draft" }).definition,
        identidad: {
          ...buildRecipe({ id: "alar-personalizada", lineTemplateId: 210, tipologia: "proyectante", hojas: 1, status: "draft" }).definition.identidad,
          variante: "alar_marco_4201",
        },
      },
    };
    const template = { id: 210, catalogKey: "ventora:l42", catalogMetadata };
    const form = {
      tipo: "Ventana", nombre: "Ventana proyectante", descripcion: "", sistema: "Proyectante",
      configuracion: "", fabricacionHojas: 1, fabricacionTipologia: "proyectante",
      fabricationRecipeId: "", fabricacionVariante: "",
    };
    const defaultContext = resolveFabricacionContextForLineAssignment({ template, recipes: [customDraft], organizationId: 1, form });
    expect(defaultContext?.fabricacionVariante).toBe("normal");
    expect(defaultContext?.fabricationRecipeId).toBe("");
    const explicitContext = resolveFabricacionContextForLineAssignment({
      template, recipes: [customDraft], organizationId: 1,
      form: { ...form, fabricationRecipeId: customDraft.id, fabricacionVariante: "alar_marco_4201" },
    });
    expect(explicitContext?.fabricacionVariante).toBe("alar_marco_4201");
    expect(explicitContext?.fabricationRecipeId).toBe("");
  });
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
          variante: "normal",
          configurationId: "ventora:l32:proyectante",
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

  it("resuelve L20 universal como corredera sin heredar la variante Alumétrica fija", () => {
    const definition = crearRecetaPlantillaVentoraCorredera2H("L20");
    const context = resolveFabricacionContextForLineAssignment({
      template: {
        id: 20,
        catalogKey: "ventora:l20",
        catalogMetadata: { lineConfiguration: "Corredera 2 hojas" },
      },
      recipes: [{
        ...buildRecipe({
          id: "l20-universal",
          lineTemplateId: 20,
          tipologia: "corredera",
          hojas: 2,
          status: "validated",
        }),
        variant: definition.identidad.variante,
        definition,
      }],
      organizationId: 1,
      form: {
        tipo: "Ventana",
        nombre: "Ventana corredera",
        descripcion: "",
        sistema: "Corredera",
        configuracion: "Corredera 2 hojas",
        fabricacionHojas: 2,
        fabricacionTipologia: "corredera",
        fabricacionVariante: "estandar",
      },
    });

    expect(context?.fabricacionTipologia).toBe("corredera");
    expect(context?.fabricacionApertura).toBe("corredera");
    expect(context?.fabricationRecipeId).toBe("l20-universal");
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
          variante: "normal",
          configurationId: "ventora:l32:proyectante",
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
    expect(context?.fabricationRecipeId).toBe("rec-proyectante");
  });

  it("no conserva la tipología anterior al cambiar a WinHouse S60", () => {
    const context = resolveFabricacionContextForLineAssignment({
      template: {
        id: 60,
        catalogKey: "ventora:winhouse-s60",
        catalogMetadata: { lineConfiguration: "Abatible / doble contacto" },
      },
      recipes: [],
      organizationId: 1,
      form: {
        tipo: "Ventana",
        nombre: "Ventana corredera",
        descripcion: "",
        sistema: "Corredera",
        configuracion: "",
        fabricacionHojas: 2,
        fabricacionTipologia: "corredera",
      },
    });

    expect(context?.fabricacionTipologia).toBe("abatible");
    expect(context?.fabricacionHojas).toBe(1);
  });

  it("mantiene paño fijo S60 aunque la configuración comercial diga abatible", () => {
    expect(
      resolveWinHouseS60QuoteTypology({
        selectedTypology: "abatible",
        componentType: "Paño fijo",
        componentName: "Paño fijo con perfilería",
      })
    ).toBe("pano_fijo");
    const context = resolveFabricacionContextForLineAssignment({
      template: {
        id: 60,
        catalogKey: "ventora:winhouse-s60",
        catalogMetadata: { lineConfiguration: "Abatible / doble contacto" },
      },
      recipes: [],
      organizationId: 1,
      form: {
        tipo: "Paño fijo",
        nombre: "Paño fijo con perfilería",
        descripcion: "",
        sistema: "Abatible / doble contacto",
        configuracion: "Con perfilería",
        fabricacionHojas: 2,
        fabricacionTipologia: "abatible",
        vidrio: "Incoloro monolítico 4mm",
      },
    });

    expect(context).toMatchObject({
      fabricacionTipologia: "pano_fijo",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricacionVariante: WINHOUSE_S60_VARIANTS.fijoMonolitico,
    });
  });

  it("impone la geometría base de New S75 aunque la pieza previa fuera proyectante", () => {
    const context = resolveFabricacionContextForLineAssignment({
      template: {
        id: 75,
        catalogKey: "ventora:winhouse-new-s75-triple-riel",
        catalogMetadata: { lineConfiguration: "Triple riel" },
      },
      recipes: [],
      organizationId: 1,
      form: {
        tipo: "Ventana",
        nombre: "Ventana proyectante",
        descripcion: "",
        sistema: "Proyectante",
        configuracion: "",
        fabricacionHojas: 1,
        fabricacionTipologia: "proyectante",
      },
    });

    expect(context?.fabricacionTipologia).toBe("corredera");
    expect(context?.fabricacionHojas).toBe(3);
  });
});
