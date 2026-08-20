import { resolveProcedenciaFromSource } from "@/features/fabricacion/types/fabricacion-receta-procedencia";
import {
  buildFabricationRecipeInputFromInicioRapido,
  buildLineTemplatePayloadFromInicioRapido,
  buildUniqueCatalogLineName,
  listarBasesVentoraParaCatalogo,
  listarInicioRapidoCatalogo,
  listarPlantillasVentoraParaCatalogo,
  listarPlantillasVerificadasVentoraParaCatalogo,
} from "@/features/cotizaciones/line-templates/services/catalogo-usar-base-ventora.service";

describe("catalogo inicio rápido Ventora", () => {
  it("lista plantillas con ajustes antes que la base estructural", () => {
    const items = listarInicioRapidoCatalogo();

    expect(items.map((entry) => entry.title)).toEqual([
      "L5000",
      "L20",
      "L25",
      "L32 · Proyectante",
      "L42 · Proyectante",
      "Corredera · 2 hojas",
    ]);
    expect(listarPlantillasVentoraParaCatalogo()).toHaveLength(3);
    expect(listarPlantillasVerificadasVentoraParaCatalogo()).toHaveLength(2);
    expect(listarBasesVentoraParaCatalogo()).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "plantilla_ventora",
      badge: "Plantilla Ventora",
      meta: "Ajustes incluidos",
      actionLabel: "Usar plantilla",
      subtitle: "Corredera · 2 hojas",
    });
    expect(items[3]).toMatchObject({
      kind: "plantilla_verificada",
      title: "L32 · Proyectante",
      badge: "Base estructural",
      meta: "Pendiente validar medidas de taller",
      actionLabel: "Usar plantilla",
    });
    expect(items[5]).toMatchObject({
      kind: "base_estructural",
      badge: "Base estructural",
      meta: "Ajustes por confirmar",
      actionLabel: "Usar base",
    });
  });

  it("crea línea privada L5000 con procedencia plantilla_ventora y ajustes sugeridos", () => {
    const l5000 = listarPlantillasVentoraParaCatalogo().find(
      (entry) => entry.plantillaId === "L5000"
    );
    expect(l5000).toBeTruthy();

    const linePayload = buildLineTemplatePayloadFromInicioRapido({
      item: l5000!,
      existingNames: [],
    });
    expect(linePayload.nombre).toBe("L5000");
    expect(linePayload.proveedor).toBeNull();
    expect(linePayload.catalogMetadata?.lineSystem).toBe("L5000");

    let nextId = 0;
    const recipeInput = buildFabricationRecipeInputFromInicioRapido({
      item: l5000!,
      lineTemplateId: 42,
      lineName: "L5000",
      createId: () => `plantilla-${nextId++}`,
    });

    expect(recipeInput.status).toBe("draft");
    expect(recipeInput.sourceReference).toBe("plantilla-ventora:L5000");
    expect(recipeInput.definition.perfiles.map((p) => p.reglaMedida.ajusteMm)).toEqual([
      0, 0, -3, -2, -2, -18, -18,
    ]);
    expect(
      recipeInput.definition.perfiles.every((profile) =>
        /Ajuste documentado en Ventora \(referencia L5000\)/i.test(
          profile.observaciones ?? ""
        )
      )
    ).toBe(true);

    const procedencia = resolveProcedenciaFromSource({
      sourceType: recipeInput.sourceType ?? "copied",
      sourceReference: recipeInput.sourceReference,
    });
    expect(procedencia).toMatchObject({
      procedencia: "plantilla_ventora",
      label: "Plantilla Ventora",
      detail: "Validada en taller · L5000",
      plantillaId: "L5000",
    });
  });

  it("la base estructural conserva procedencia base_ventora sin ajustes", () => {
    const [base] = listarBasesVentoraParaCatalogo();
    expect(base).toBeTruthy();

    let nextId = 0;
    const recipeInput = buildFabricationRecipeInputFromInicioRapido({
      item: base!,
      lineTemplateId: 7,
      lineName: "Corredera · 2 hojas",
      createId: () => `base-${nextId++}`,
    });

    expect(recipeInput.sourceReference).toBe("base-ventora:corredera:2");
    expect(
      recipeInput.definition.perfiles.every(
        (profile) => profile.reglaMedida.ajusteMm == null
      )
    ).toBe(true);
  });

  it("genera nombres únicos para el catálogo privado", () => {
    expect(buildUniqueCatalogLineName("L5000", ["L5000"])).toBe("L5000 2");
  });
});
