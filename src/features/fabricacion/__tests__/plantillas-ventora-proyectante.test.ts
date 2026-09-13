import { resolveProcedenciaFromSource } from "@/features/fabricacion/types/fabricacion-receta-procedencia";
import {
  buildFabricationRecipeInputFromInicioRapido,
  listarPlantillasVerificadasVentoraParaCatalogo,
} from "@/features/cotizaciones/line-templates/services/catalogo-usar-base-ventora.service";
import {
  crearRecetaPlantillaVentoraProyectante,
  crearRecetaSerie42Proyectante,
  PLANTILLAS_VENTORA_PROYECTANTE,
} from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";

describe("plantillas Ventora L32 / L42", () => {
  it("L32 crea la receta normal de seis reglas y excluye variantes opcionales", () => {
    const receta = crearRecetaPlantillaVentoraProyectante("L32");

    expect(receta.estado).toBe("ejemplo_no_validado");
    expect(receta.identidad.tipologia).toBe("proyectante");
    expect(receta.perfiles.map((p) => [p.codigoPerfil, p.funcion, p.requerido])).toEqual([
      ["3201", "Marco", true],
      ["3201", "Marco", true],
      ["3202", "Hoja", true],
      ["3202", "Hoja", true],
      ["3208", "Junquillo", true],
      ["3208", "Junquillo", true],
    ]);
    expect(receta.perfiles.map((profile) => profile.reglaMedida.ajusteMm)).toEqual([
      0, 0, -23, -23, -85, -85,
    ]);
    expect(receta.perfiles.every((profile) => profile.reglaCantidad.cantidad === 2)).toBe(true);
    expect(receta.perfiles.some((profile) => ["3204", "3205"].includes(profile.codigoPerfil))).toBe(false);
    expect(receta.vidrios[0]).toMatchObject({
      reglaAncho: { base: "ancho_por_hoja", ajusteMm: -94 },
      reglaAlto: { base: "alto_por_hoja", ajusteMm: -94 },
      reglaCantidad: { cantidad: 1 },
    });
    expect(receta.perfiles.every((profile) =>
      !(profile.datosPendientes ?? []).some((detail) => /descuento/i.test(detail))
    )).toBe(true);
  });

  it("L42 crea perfiles, junquillos alternativos y accesorio 4230", () => {
    const receta = crearRecetaPlantillaVentoraProyectante("L42");

    expect(receta.perfiles.map((p) => [p.codigoPerfil, p.funcion, p.requerido])).toEqual([
      ["4209", "Marco fijo", true],
      ["4202", "Hoja proyectante", true],
      ["4229", "Junquillo monolítico", true],
      ["4206", "Junquillo termopanel", false],
      ["4204", "Palillo / Pilar T", false],
    ]);
    expect(receta.accesorios).toHaveLength(1);
    expect(receta.accesorios[0]).toMatchObject({
      codigo: "4230",
      nombre: "Cuña de armado NAT.",
    });
    expect(
      receta.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)
    ).toBe(true);
  });

  it("catálogo expone L32 y L42 como plantilla_verificada en draft", () => {
    const items = listarPlantillasVerificadasVentoraParaCatalogo();

    expect(items.map((entry) => entry.title)).toEqual([
      "L32 · Proyectante",
      "L42 · Proyectante",
    ]);

    const l32 = items.find((entry) => entry.plantillaVerificadaId === "L32");
    expect(l32).toBeTruthy();

    let nextId = 0;
    const recipeInput = buildFabricationRecipeInputFromInicioRapido({
      item: l32!,
      lineTemplateId: 99,
      lineName: "L32 · Proyectante",
      createId: () => `l32-${nextId++}`,
    });

    expect(recipeInput.status).toBe("draft");
    expect(recipeInput.sourceReference).toBe(
      `plantilla-verificada:${PLANTILLAS_VENTORA_PROYECTANTE.L32.sourceReferenceId}`
    );

    const procedencia = resolveProcedenciaFromSource({
      sourceType: recipeInput.sourceType ?? "copied",
      sourceReference: recipeInput.sourceReference,
    });
    expect(procedencia.procedencia).toBe("plantilla_verificada");
    expect(recipeInput.definition.perfiles[0]?.codigoPerfil).toBe("3201");
  });

  it("crea la nueva línea L42 normal con la receta proyectante de 6 reglas", () => {
    const recipe = crearRecetaSerie42Proyectante({
      variant: "normal",
      lineName: "Serie 42",
      createId: (() => {
        let next = 0;
        return () => `l42-${next++}`;
      })(),
    });

    expect(recipe.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      "4201", "4201", "4202", "4202", "4229", "4229",
    ]);
    expect(recipe.perfiles.map((profile) => profile.reglaMedida.ajusteMm)).toEqual([
      0, 0, -18, -18, -90, -90,
    ]);
    expect(recipe.vidrios).toHaveLength(1);
    expect(recipe.perfiles.some((profile) => ["4206", "4209", "4204"].includes(profile.codigoPerfil))).toBe(false);
    expect(recipe.perfiles.every((profile) =>
      !(profile.datosPendientes ?? []).some((detail) => /descuento/i.test(detail))
    )).toBe(true);
  });

  it("el flujo de usar plantilla L42 no vuelve a llamar la receta antigua", () => {
    const l42 = listarPlantillasVerificadasVentoraParaCatalogo().find(
      (entry) => entry.plantillaVerificadaId === "L42"
    );
    expect(l42).toBeTruthy();

    const recipeInput = buildFabricationRecipeInputFromInicioRapido({
      item: l42!,
      lineTemplateId: 317,
      lineName: "Serie 42",
      createId: (() => {
        let next = 0;
        return () => `l42-flow-${next++}`;
      })(),
    });

    expect(recipeInput.definition.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      "4201", "4201", "4202", "4202", "4229", "4229",
    ]);
    expect(recipeInput.definition.vidrios).toHaveLength(1);
  });
});
