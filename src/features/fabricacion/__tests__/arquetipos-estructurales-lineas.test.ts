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
    ).toBe("proyectante");

    expect(
      resolveArquetipoEstructuralId({
        catalogKey: "ventora:l42",
      })
    ).toBe("proyectante");

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
    expect(ARQUETIPOS_ESTRUCTURALES.pvc_s60.tipologia).toBe("abatible");
    expect(ARQUETIPOS_ESTRUCTURALES.pvc_s60.hojas).toBe(1);
  });

  it("crea receta estructural para línea comercial por catalog_key", () => {
    const recipe = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:serie-4600-puerta-vaiven",
      lineName: "Serie 4600",
    });

    expect(recipe?.identidad.tipologia).toBe("puerta_corredera");
    expect(recipe?.perfiles.length).toBeGreaterThan(0);
  });

  it("crea la base real de Serie 3200 con variantes, códigos y cortes de una hoja", () => {
    const recipe = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:serie-3200-puerta-abatible-1h",
      lineName: "Serie 3200",
      createId: (() => {
        let n = 0;
        return () => `3200-${++n}`;
      })(),
    });

    expect(recipe?.identidad).toMatchObject({
      tipologia: "puerta_abatible",
      hojas: 1,
      variante: "3200 ST",
    });
    expect(recipe?.perfiles.filter((profile) => profile.codigoPerfil === "3222")).toHaveLength(2);
    expect(recipe?.perfiles.filter((profile) => profile.codigoPerfil === "3221")).toHaveLength(2);
    expect(recipe?.perfiles.filter((profile) => profile.codigoPerfil === "3225")).toHaveLength(2);
    expect(recipe?.perfiles.filter((profile) => profile.codigoPerfil === "3227")).toHaveLength(2);
    expect(recipe?.perfiles.every((profile) => profile.largoComercialMm === 6000)).toBe(true);
    expect(recipe?.perfiles.find((profile) => profile.codigoPerfil === "3221")?.reglaMedida.ajusteMm).toBe(-136);
    expect(recipe?.perfiles.find((profile) => profile.codigoPerfil === "3225")?.reglaMedida.ajusteMm).toBe(-192);
    expect(recipe?.vidrios.map((glass) => glass.nombre)).toEqual([
      "Monolítico 4 mm",
      "Monolítico 5 mm",
      "Termopanel DVH 22 mm (4-12-4)",
      "Termopanel DVH 22 mm (5-12-5)",
    ]);
    expect(recipe?.accesorios.map((accessory) => accessory.nombre)).toEqual(
      expect.arrayContaining(["Bisagra Udinese 3200", "Cerradura ISEO (inox)"])
    );
  });

  it("crea AL-42 con identidad separada para normal, cámara y sin cámara", () => {
    const cases = [
      ["ventora:l42", "normal", "4201"],
      ["ventora:serie-42-proyectante-camara", "con_camara", "4231"],
      ["ventora:serie-42-proyectante-sin-camara", "sin_camara", "4201"],
    ] as const;

    for (const [catalogKey, variant, frameCode] of cases) {
      const recipe = crearRecetaEstructuralParaLineaComercial({
        catalogKey,
        lineName: "Serie 42",
        createId: (() => {
          let n = 0;
          return () => `${variant}-${++n}`;
        })(),
      });

      expect(recipe?.identidad).toMatchObject({
        tipologia: "proyectante",
        hojas: 1,
        variante: variant,
      });
      expect(recipe?.perfiles.filter((profile) => profile.codigoPerfil === frameCode)).toHaveLength(2);
      expect(recipe?.perfiles.filter((profile) => profile.codigoPerfil === "4202")).toHaveLength(2);
      expect(recipe?.perfiles.find((profile) => profile.codigoPerfil === "4202" && profile.reglaMedida.base === "ancho_por_hoja")?.reglaMedida.ajusteMm).toBe(-136);
      expect(recipe?.perfiles.find((profile) => profile.codigoPerfil === "4202" && profile.reglaMedida.base === "alto_por_hoja")?.reglaMedida.ajusteMm).toBe(-123);
      expect(recipe?.vidrios.map((glass) => glass.nombre)).toEqual([
        "Monolítico 3 mm",
        "Monolítico 4 mm",
        "Monolítico 5 mm",
        "Termopanel DVH 22 mm (4-12-4)",
        "Termopanel DVH 22 mm (5-12-5)",
      ]);
    }
  });

  it("crea la pauta S-33 2H con descuentos y variante RPT", () => {
    const standard = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:s33-corredera-2h",
      lineName: "S-33",
      createId: (() => {
        let n = 0;
        return () => `s33-${++n}`;
      })(),
    });
    const rpt = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:s33-rpt-corredera-2h",
      lineName: "S-33 RPT",
      createId: (() => {
        let n = 0;
        return () => `s33-rpt-${++n}`;
      })(),
    });

    expect(standard?.identidad).toMatchObject({ tipologia: "corredera", hojas: 2, variante: "S-33 Normal" });
    expect(standard?.perfiles.filter((profile) => profile.codigoPerfil === "3301")).toHaveLength(3);
    expect(standard?.perfiles.filter((profile) => profile.codigoPerfil === "3302")).toHaveLength(3);
    expect(standard?.perfiles.filter((profile) => profile.codigoPerfil === "3308")).toHaveLength(3);
    expect(standard?.perfiles.find((profile) => profile.nombrePerfil === "Pierna hoja")?.reglaMedida.ajusteMm).toBe(-60);
    expect(standard?.perfiles.find((profile) => profile.nombrePerfil === "Cabezal hoja")?.reglaMedida.multiplicador).toBe(0.5);
    expect(standard?.perfiles.find((profile) => profile.nombrePerfil === "Cabezal hoja")?.reglaMedida.ajusteMm).toBe(2);
    expect(rpt?.identidad).toMatchObject({ tipologia: "corredera", hojas: 2, variante: "S-33 RPT" });
    expect(rpt?.perfiles.every((profile) => ["3324", "3308", "3303", "3304"].includes(profile.codigoPerfil))).toBe(true);
    expect(rpt?.perfiles.filter((profile) => profile.codigoPerfil === "3324")).toHaveLength(3);
    expect(rpt?.accesorios.find((accessory) => accessory.codigo === "3470")?.requerido).toBe(true);
  });
});
