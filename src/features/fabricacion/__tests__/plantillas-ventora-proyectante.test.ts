import { resolveProcedenciaFromSource } from "@/features/fabricacion/types/fabricacion-receta-procedencia";
import {
  buildFabricationRecipeInputFromInicioRapido,
  listarPlantillasVerificadasVentoraParaCatalogo,
} from "@/features/cotizaciones/line-templates/services/catalogo-usar-base-ventora.service";
import {
  crearRecetaPlantillaVentoraProyectante,
  PLANTILLAS_VENTORA_PROYECTANTE,
} from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";

describe("plantillas Ventora L32 / L42", () => {
  it("L32 crea perfiles base y opcionales con códigos persistidos", () => {
    const receta = crearRecetaPlantillaVentoraProyectante("L32");

    expect(receta.estado).toBe("ejemplo_no_validado");
    expect(receta.identidad.tipologia).toBe("proyectante");
    expect(receta.perfiles.map((p) => [p.codigoPerfil, p.funcion, p.requerido])).toEqual([
      ["3201", "Marco simple", true],
      ["3202", "Hoja proyectante", true],
      ["3208", "Junquillo", true],
      ["3204", "Palillo / Pilar T", false],
      ["3205", "Marco cámara de agua", false],
    ]);
    expect(
      receta.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)
    ).toBe(true);
    expect(receta.notasValidacion.join(" ")).toMatch(/-2,1/);
  });

  it("L42 crea perfiles, junquillos alternativos y accesorio 4212", () => {
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
      codigo: "4212",
      nombre: "Cuña de armado a presión",
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
});
