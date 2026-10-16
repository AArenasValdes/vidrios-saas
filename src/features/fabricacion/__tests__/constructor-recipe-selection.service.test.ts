import {
  dedupeConstructorRecipeCandidates,
  resolveConstructorRecipeCandidates,
  resolveConstructorRecipeSelection,
} from "@/features/fabricacion/services/constructor-recipe-selection.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const recipe = (id: string) =>
  ({
    id,
    scope: "organization",
    status: "validated",
    version: 1,
    definition: {
      identidad: {
        recetaId: id,
        nombre: id,
        codigo: id,
        tipologia: "corredera",
        hojas: 2,
        variante: id,
      },
      perfiles: [{ codigoPerfil: id }],
      vidrio: [],
      accesorios: [],
      barras: [],
    },
  }) as unknown as FabricationRecipeRecord;
const technicalRecipe = (input: {
  id: string;
  profileCode?: string;
  deduction?: number;
  variant?: string;
  recipeCode?: string;
}) =>
  ({
    id: input.id,
    scope: "organization",
    status: "validated",
    version: 1,
    definition: {
      identidad: {
        recetaId: input.id,
        nombre: `Normal ${input.id}`,
        codigo: input.recipeCode ?? "L32",
        tipologia: "proyectante",
        hojas: 1,
        variante: input.variant ?? "normal",
      },
      perfiles: [{ codigo: input.profileCode ?? "3201", descuento: input.deduction ?? -10 }],
      vidrio: [],
      accesorios: [],
      barras: [],
    },
  }) as unknown as FabricationRecipeRecord;

describe("resolveConstructorRecipeSelection", () => {
  it("conserva recetas guardadas y fallbacks universales como rutas seleccionables", () => {
    const storedRecipe = technicalRecipe({ id: "stored" });
    const universalRecipe = technicalRecipe({ id: "universal", profileCode: "3202" });

    expect(
      resolveConstructorRecipeCandidates({
        storedCandidates: [storedRecipe],
        universalFallbackCandidates: [universalRecipe],
      })
    ).toEqual([storedRecipe, universalRecipe]);
  });

  it("conserva copias de distintas procedencias hasta que exista equivalencia explícita", () => {
    const storedRecipe = technicalRecipe({ id: "stored" });
    const universalRecipe = {
      ...technicalRecipe({ id: "universal" }),
      scope: "ventora",
      status: "testing",
    } as FabricationRecipeRecord;

    expect(
      resolveConstructorRecipeCandidates({
        storedCandidates: [storedRecipe],
        universalFallbackCandidates: [universalRecipe],
      })
    ).toEqual([storedRecipe, universalRecipe]);
  });

  it("muestra solo la receta Ventora cuando una base estructural confirmada es técnicamente igual", () => {
    const storedRecipe = {
      ...technicalRecipe({ id: "stored-l5000" }),
      sourceReference: "base-ventora:l5000:estandar",
    } as FabricationRecipeRecord;
    const canonicalRecipe = {
      ...technicalRecipe({ id: "ventora:universal:l5000:normal" }),
      scope: "ventora",
      sourceReference: "ventora:taller-confirmado:universal:l5000:2026-10-07",
      definition: {
        ...technicalRecipe({ id: "ventora:universal:l5000:normal" }).definition,
        identidad: {
          ...technicalRecipe({ id: "ventora:universal:l5000:normal" }).definition.identidad,
          recetaId: "ventora:universal:l5000:normal",
          nombre: "L5000 universal confirmada",
        },
        perfiles: [{
          codigoPerfil: "3201",
          descuento: -10,
          observaciones: "Base y descuento confirmados por el taller.",
        }],
        notasValidacion: ["Despiece de perfiles validado por el taller."],
      },
    } as unknown as FabricationRecipeRecord;
    storedRecipe.definition.perfiles = [{
      codigoPerfil: "3201",
      descuento: -10,
      observaciones: "Función y medida base sugeridas por Ventora.",
    }] as never;

    expect(resolveConstructorRecipeCandidates({
      storedCandidates: [storedRecipe],
      universalFallbackCandidates: [canonicalRecipe],
    })).toEqual([canonicalRecipe]);
  });

  it("oculta una copia estructural en borrador solo cuando coincide técnicamente con Ventora", () => {
    const storedRecipe = {
      ...technicalRecipe({ id: "stored-l5000-draft" }),
      status: "draft",
      sourceReference: "base-ventora:l5000:estandar",
    } as FabricationRecipeRecord;
    const canonicalRecipe = {
      ...technicalRecipe({ id: "ventora:l5000-confirmed" }),
      scope: "ventora",
      sourceReference: "ventora:taller-confirmado:universal:l5000:2026-10-07",
    } as FabricationRecipeRecord;

    expect(resolveConstructorRecipeCandidates({
      storedCandidates: [storedRecipe],
      universalFallbackCandidates: [canonicalRecipe],
      catalogKey: "ventora:l5000",
    })).toEqual([canonicalRecipe]);
  });

  it("para una línea universal Ventora conserva su pauta y las variantes propias, no recetas de proveedor ajeno", () => {
    const external = {
      ...technicalRecipe({ id: "arquetipo-l5000" }),
      providerName: "Arquetipo",
      sourceReference: "arquetipo:l5000:normal",
    } as FabricationRecipeRecord;
    const ownVariant = {
      ...technicalRecipe({ id: "own-l5000" }),
      providerName: "Arquetipo",
      sourceReference: "taller:personalizada:l5000:normal",
    } as FabricationRecipeRecord;
    const ventora = {
      ...technicalRecipe({ id: "ventora-l5000" }),
      scope: "ventora",
      sourceReference: "ventora:taller-confirmado:universal:l5000:2026-10-07",
    } as FabricationRecipeRecord;

    expect(resolveConstructorRecipeCandidates({
      storedCandidates: [external, ownVariant],
      universalFallbackCandidates: [ventora],
      catalogKey: "ventora:l5000",
    })).toEqual([ownVariant, ventora]);
  });

  it("aplica la misma identidad canónica a los alias Arquetipo de aluminio universal", () => {
    const providerRecipe = {
      ...technicalRecipe({ id: "arquetipo-l15" }),
      providerName: "Arquetipo",
      sourceReference: "arquetipo:l15:normal",
    } as FabricationRecipeRecord;
    const ventoraRecipe = {
      ...technicalRecipe({ id: "ventora-l15" }),
      scope: "ventora",
      sourceReference: "ventora:taller-confirmado:universal:l15:2026-10-07",
    } as FabricationRecipeRecord;

    expect(resolveConstructorRecipeCandidates({
      storedCandidates: [providerRecipe, ventoraRecipe],
      universalFallbackCandidates: [],
      catalogKey: "ventora:arquetipo-l15-corredera-2h",
    })).toEqual([ventoraRecipe]);
  });

  it("conserva las 18 variantes SODAL documentadas al seleccionar L25", () => {
    const sodalVariant = {
      ...technicalRecipe({ id: "sodal-l25-pierna-abierta-2h" }),
      sourceReference: "zeta:confirmed:sodal/l25/monolitico_pierna_abierta_2h_1800x1500",
    } as FabricationRecipeRecord;
    const unrelatedProvider = {
      ...technicalRecipe({ id: "arquetipo-l25" }),
      providerName: "Arquetipo",
      sourceReference: "arquetipo:l25:normal",
    } as FabricationRecipeRecord;

    expect(resolveConstructorRecipeCandidates({
      storedCandidates: [sodalVariant, unrelatedProvider],
      universalFallbackCandidates: [],
      catalogKey: "ventora:l25",
    })).toEqual([sodalVariant]);
  });

  it("para una línea Ventora omite configuraciones genéricas del taller y conserva variantes creadas explícitamente", () => {
    const genericWorkshopConfiguration = {
      ...technicalRecipe({ id: "generic-workshop-l5000" }),
      sourceName: "Referencia universal de taller",
      sourceReference: "base-ventora:l5000:estandar",
    } as FabricationRecipeRecord;
    const workshopCreatedVariant = {
      ...technicalRecipe({ id: "custom-workshop-l5000", variant: "reforzada" }),
      sourceReference: "taller:personalizada:l5000:reforzada",
    } as FabricationRecipeRecord;
    const ventora = {
      ...technicalRecipe({ id: "ventora-l5000" }),
      scope: "ventora",
      providerName: "Ventora",
      sourceReference: "ventora:taller-confirmado:universal:l5000:2026-10-07",
    } as FabricationRecipeRecord;

    expect(resolveConstructorRecipeCandidates({
      storedCandidates: [genericWorkshopConfiguration, workshopCreatedVariant],
      universalFallbackCandidates: [ventora],
      catalogKey: "ventora:l5000",
    })).toEqual([workshopCreatedVariant, ventora]);
  });

  it("selecciona por defecto la única variante Ventora validada al elegir la línea", () => {
    const ventora = {
      ...technicalRecipe({ id: "ventora-l5000" }),
      scope: "ventora",
      providerName: "Ventora",
      status: "validated",
    } as FabricationRecipeRecord;
    const candidates = resolveConstructorRecipeCandidates({
      storedCandidates: [
        {
          ...technicalRecipe({ id: "generic-workshop-l5000" }),
          sourceName: "Referencia universal de taller",
        } as FabricationRecipeRecord,
      ],
      universalFallbackCandidates: [ventora],
      catalogKey: "ventora:l5000",
    });

    expect(resolveConstructorRecipeSelection({ selection: "", candidates })).toBe(ventora);
  });

  it("mantiene la base estructural si los cortes difieren de la receta Ventora confirmada", () => {
    const storedRecipe = {
      ...technicalRecipe({ id: "stored-l5000", deduction: -10 }),
      sourceReference: "base-ventora:l5000:estandar",
    } as FabricationRecipeRecord;
    const canonicalRecipe = {
      ...technicalRecipe({ id: "ventora:universal:l5000:normal", deduction: -12 }),
      scope: "ventora",
      sourceReference: "ventora:taller-confirmado:universal:l5000:2026-10-07",
    } as FabricationRecipeRecord;

    expect(resolveConstructorRecipeCandidates({
      storedCandidates: [storedRecipe],
      universalFallbackCandidates: [canonicalRecipe],
    })).toEqual([storedRecipe, canonicalRecipe]);
  });

  it("mantiene una variante propia aunque comparta cortes con la base Ventora", () => {
    const workshopVariant = {
      ...technicalRecipe({ id: "workshop-variant", variant: "normal" }),
      sourceReference: "taller:personalizada:l5000:normal",
    } as FabricationRecipeRecord;
    const canonicalRecipe = {
      ...technicalRecipe({ id: "ventora:universal:l5000:normal", variant: "normal" }),
      scope: "ventora",
      sourceReference: "ventora:taller-confirmado:universal:l5000:2026-10-07",
    } as FabricationRecipeRecord;

    expect(resolveConstructorRecipeCandidates({
      storedCandidates: [workshopVariant],
      universalFallbackCandidates: [canonicalRecipe],
    })).toEqual([workshopVariant, canonicalRecipe]);
  });

  it("conserva recetas de proveedores con diferencias de códigos de accesorios", () => {
    const storedRecipe = {
      ...technicalRecipe({ id: "structural" }),
      sourceReference: "base-ventora:l5000:normal",
      definition: {
        ...technicalRecipe({ id: "structural" }).definition,
        accesorios: [{ id: "lock-a", codigo: "C-1", nombre: "Cierre", reglaCantidad: { tipo: "fija", cantidad: 1 }, requerido: true }],
      },
    } as unknown as FabricationRecipeRecord;
    const canonicalRecipe = {
      ...technicalRecipe({ id: "canonical" }),
      scope: "ventora",
      sourceReference: "ventora:taller-confirmado:universal:l5000:2026-10-07",
      definition: {
        ...technicalRecipe({ id: "canonical" }).definition,
        accesorios: [{ id: "lock-b", codigo: "C-2", nombre: "Cierre", reglaCantidad: { tipo: "fija", cantidad: 1 }, requerido: true }],
      },
    } as unknown as FabricationRecipeRecord;

    expect(resolveConstructorRecipeCandidates({
      storedCandidates: [storedRecipe],
      universalFallbackCandidates: [canonicalRecipe],
    })).toEqual([storedRecipe, canonicalRecipe]);
  });

  it("mantiene la opción Arquetipo aunque comparta cortes con la receta SODAL", () => {
    const sodal = {
      ...technicalRecipe({ id: "sodal-l42", profileCode: "4202", variant: "sodal_sin_camara_monolitico" }),
      sourceReference: "alumetrica:sodal-serie-4200:proyectante-sin-camara:monolitico:v1",
    } as FabricationRecipeRecord;
    const arquetipo = {
      ...sodal,
      id: "arquetipo-l42",
      providerName: "Arquetipo",
      variant: "arquetipo_sin_camara_monolitico",
      sourceReference: "arquetipo:linea-42:legno:sodal-serie-4200-sin-camara-monolitico:v1",
      definition: {
        ...sodal.definition,
        identidad: {
          ...sodal.definition.identidad,
          recetaId: "arquetipo-l42",
          variante: "arquetipo_sin_camara_monolitico",
        },
      },
    } as FabricationRecipeRecord;

    expect(
      resolveConstructorRecipeCandidates({
        storedCandidates: [sodal],
        universalFallbackCandidates: [arquetipo],
      }),
    ).toEqual([sodal, arquetipo]);
  });

  it("usa recetas guardadas cuando la línea no tiene fallback universal", () => {
    const storedRecipe = technicalRecipe({ id: "stored" });

    expect(
      resolveConstructorRecipeCandidates({
        storedCandidates: [storedRecipe],
        universalFallbackCandidates: [],
      })
    ).toEqual([storedRecipe]);
  });

  it("conserva la única receta compatible aunque no haya elección explícita", () => {
    const onlyRecipe = recipe("l12-shower-2h");

    expect(
      resolveConstructorRecipeSelection({ selection: "", candidates: [onlyRecipe] })
    ).toBe(onlyRecipe);
  });

  it("no autoelige una única receta de borrador", () => {
    const draft = { ...recipe("draft"), status: "draft" } as FabricationRecipeRecord;
    expect(resolveConstructorRecipeSelection({ selection: "", candidates: [draft] })).toBeNull();
  });

  it("no elige por su cuenta cuando hay varias recetas compatibles", () => {
    expect(
      resolveConstructorRecipeSelection({
        selection: "",
        candidates: [recipe("alar"), recipe("sodal")],
      })
    ).toBeNull();
  });

  it("respeta la receta que el usuario eligió", () => {
    const selected = recipe("recipe-b");

    expect(
      resolveConstructorRecipeSelection({
        selection: "recipe:recipe-b",
        candidates: [recipe("recipe-a"), selected],
      })
    ).toBe(selected);
  });

  it("no fusiona recetas con IDs distintos por similitud de fórmula", () => {
    const first = technicalRecipe({ id: "copy-a", variant: "normal", recipeCode: "AL32-N" });
    const second = technicalRecipe({ id: "copy-b", variant: "estandar", recipeCode: "SODAL-32" });

    expect(dedupeConstructorRecipeCandidates([first, second])).toEqual([first, second]);
    expect(
      resolveConstructorRecipeSelection({ selection: "", candidates: [first, second] })
    ).toBeNull();
  });

  it("no fusiona perfiles/vidrios de recetas con IDs distintos", () => {
    const first = {
      ...technicalRecipe({ id: "bahar-copy-a", variant: "bahar_5200_ventana_exterior" }),
      definition: {
        ...technicalRecipe({ id: "bahar-copy-a", variant: "bahar_5200_ventana_exterior" }).definition,
        perfiles: [
          { id: "profile-a", codigoPerfil: "65201VER", reglaMedida: { base: "ancho_total", ajusteMm: 6 } },
        ],
        vidrios: [
          { id: "glass-a", nombre: "Vidrio · espesor por elegir", reglaAncho: { base: "ancho_total", ajusteMm: -186 } },
        ],
      },
    } as FabricationRecipeRecord;
    const second = {
      ...first,
      id: "bahar-copy-b",
      definition: {
        ...first.definition,
        identidad: { ...first.definition.identidad, recetaId: "bahar-copy-b", nombre: "Otra copia", codigo: "BAHAR-COPY-B" },
        perfiles: [{ ...first.definition.perfiles[0], id: "profile-b" }],
        vidrios: [{ ...first.definition.vidrios[0], id: "glass-b" }],
      },
    } as FabricationRecipeRecord;

    expect(dedupeConstructorRecipeCandidates([first, second])).toEqual([first, second]);
  });

  it("mantiene la receta elegida entre alternativas de fórmula idéntica", () => {
    const first = technicalRecipe({ id: "copy-a" });
    const selected = technicalRecipe({ id: "copy-b" });

    expect(dedupeConstructorRecipeCandidates([first, selected], selected.id)).toEqual([first, selected]);
    expect(
      resolveConstructorRecipeSelection({ selection: `recipe:${selected.id}`, candidates: [first, selected] })
    ).toBe(selected);
  });

  it("rechaza selección por variante cuando varias procedencias comparten el mismo slug", () => {
    const first = technicalRecipe({ id: "variant-a", variant: "normal" });
    const second = { ...technicalRecipe({ id: "variant-b", variant: "normal" }), sourceName: "Arquetipo" } as FabricationRecipeRecord;
    expect(
      resolveConstructorRecipeSelection({ selection: "variant:normal", candidates: [first, second] })
    ).toBeNull();
  });

  it("conserva opciones que cambian código de perfil o descuento", () => {
    const profileVariant = technicalRecipe({ id: "profile-variant", profileCode: "3202" });
    const deductionVariant = technicalRecipe({ id: "deduction-variant", deduction: -15 });

    expect(
      dedupeConstructorRecipeCandidates([
        technicalRecipe({ id: "base" }),
        profileVariant,
        deductionVariant,
      ])
    ).toHaveLength(3);
  });
});
