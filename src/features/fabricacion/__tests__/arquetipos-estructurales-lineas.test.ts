import {
  ARQUETIPOS_ESTRUCTURALES,
  CATALOG_KEY_TO_ARQUETIPO,
  crearRecetaDesdeArquetipoEstructural,
  crearRecetaEstructuralParaLineaComercial,
  getPiezaNombreFromObservaciones,
  resolveArquetipoEstructuralId,
} from "../fixtures/arquetipos-estructurales-lineas";

describe("arquetipos estructurales de líneas comerciales", () => {
  it("mapea todas las líneas Ventora del catálogo fase 3", () => {
    expect(Object.keys(CATALOG_KEY_TO_ARQUETIPO)).toHaveLength(24);
    expect(CATALOG_KEY_TO_ARQUETIPO["ventora:l5000"]).toBe("corredera_2h");
    expect(CATALOG_KEY_TO_ARQUETIPO["ventora:optima-s28-corredera-3h"]).toBe(
      "corredera_3h"
    );
    expect(CATALOG_KEY_TO_ARQUETIPO["ventora:multislide-s83-8h"]).toBe(
      "multislide_8h"
    );
    expect(CATALOG_KEY_TO_ARQUETIPO["ventora:winhouse-andes-proyectante"]).toBe(
      "pvc_proyectante"
    );
  });

  it("crea corredera 2h sin códigos ni descuentos inventados", () => {
    const recipe = crearRecetaDesdeArquetipoEstructural({
      archetypeId: "corredera_2h",
      lineName: "Serie 4800",
      catalogKey: "ventora:serie-4800-corredera-2h",
      createId: (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    });

    expect(recipe.estado).toBe("ejemplo_no_validado");
    expect(recipe.perfiles).toHaveLength(7);
    expect(recipe.perfiles.every((profile) => !profile.codigoPerfil.trim())).toBe(
      true
    );
    expect(
      recipe.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)
    ).toBe(true);
    expect(recipe.perfiles[0]?.funcion).toBe("Perfil de marco");
    expect(getPiezaNombreFromObservaciones(recipe.perfiles[0]?.observaciones)).toBe(
      "Riel superior"
    );
  });

  it("diferencia cantidades entre corredera 2h y 3h", () => {
    const two = crearRecetaDesdeArquetipoEstructural({
      archetypeId: "corredera_2h",
      lineName: "Test 2h",
      createId: () => "a",
    });
    const three = crearRecetaDesdeArquetipoEstructural({
      archetypeId: "corredera_3h",
      lineName: "Test 3h",
      createId: () => "b",
    });

    const zocalo2h = two.perfiles.find((p) =>
      getPiezaNombreFromObservaciones(p.observaciones)?.includes("Zócalo")
    );
    const zocalo3h = three.perfiles.find((p) =>
      getPiezaNombreFromObservaciones(p.observaciones)?.includes("Zócalo")
    );

    expect(zocalo2h?.reglaCantidad.cantidad).toBe(2);
    expect(zocalo3h?.reglaCantidad.cantidad).toBe(3);
  });

  it("aplica ajustes documentados solo a L5000/L20/L25", () => {
    const l5000 = crearRecetaDesdeArquetipoEstructural({
      archetypeId: "corredera_2h",
      lineName: "Serie 5000",
      catalogKey: "ventora:l5000",
      createId: () => "x",
    });
    const generic = crearRecetaDesdeArquetipoEstructural({
      archetypeId: "corredera_2h",
      lineName: "Serie 4800",
      catalogKey: "ventora:serie-4800-corredera-2h",
      createId: () => "y",
    });

    expect(l5000.perfiles.some((p) => p.reglaMedida.ajusteMm != null)).toBe(true);
    expect(generic.perfiles.every((p) => p.reglaMedida.ajusteMm == null)).toBe(true);
  });

  it("resuelve arquetipo por catalog_key o metadata", () => {
    expect(
      resolveArquetipoEstructuralId({
        catalogKey: "ventora:l32",
      })
    ).toBe("corredera_2h");

    expect(
      resolveArquetipoEstructuralId({
        catalogKey: null,
        structuralArchetypeId: "puerta_vaiven",
      })
    ).toBe("puerta_vaiven");
  });

  it("expone arquetipos para multislide y PVC", () => {
    expect(ARQUETIPOS_ESTRUCTURALES.multislide_4h.hojas).toBe(4);
    const zocalo4h = ARQUETIPOS_ESTRUCTURALES.multislide_4h.perfiles.find((p) =>
      p.nombre.includes("Zócalo")
    );
    const zocalo8h = ARQUETIPOS_ESTRUCTURALES.multislide_8h.perfiles.find((p) =>
      p.nombre.includes("Zócalo")
    );
    expect(zocalo4h?.cantidad).toBe(4);
    expect(zocalo8h?.cantidad).toBe(8);
    expect(ARQUETIPOS_ESTRUCTURALES.pvc_corredera_2h.perfiles.some((p) =>
      p.nombre.includes("Refuerzo")
    )).toBe(true);
  });

  it("crea receta estructural para línea comercial por catalog_key", () => {
    const recipe = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:serie-4600-puerta-vaiven",
      lineName: "Serie 4600",
    });

    expect(recipe?.identidad.tipologia).toBe("puerta_corredera");
    expect(recipe?.perfiles.length).toBeGreaterThan(0);
  });
});
