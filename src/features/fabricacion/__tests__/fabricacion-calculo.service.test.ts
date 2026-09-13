import {
  RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
  calcularCubicacionYPauta,
  fabricacionRecetaSchema,
  validarRecetaFabricacion,
  type FabricacionEntradaCalculo,
  type FabricacionReceta,
} from "@/features/fabricacion";
import { crearRecetaEstructuralParaLineaComercial } from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";

const entradaBase: FabricacionEntradaCalculo = {
  anchoTotalMm: 1200,
  altoTotalMm: 1000,
  cantidad: 1,
  hojas: 2,
  modulos: 2,
  variante: "estandar",
};

function cloneRecipe(): FabricacionReceta {
  return structuredClone(RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO);
}

function findPerfil(resultado: ReturnType<typeof calcularCubicacionYPauta>, funcion: string) {
  return resultado.perfiles.find((perfil) => perfil.funcion === funcion);
}

describe("motor determinístico de fabricación", () => {
  it("calcula AL-32 proyectante normal 1H con seis reglas y vidrio monolítico", () => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:l32",
      lineName: "Serie 32",
      createId: (() => {
        let id = 0;
        return () => `al32-${++id}`;
      })(),
    })!;
    const resultado = calcularCubicacionYPauta(receta, {
      anchoTotalMm: 1000,
      altoTotalMm: 1200,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });

    expect(resultado.calculable).toBe(true);
    expect(resultado.perfiles).toHaveLength(6);
    expect(resultado.perfiles.map((profile) => [profile.codigoPerfil, profile.medidaMm, profile.cantidadPiezas])).toEqual([
      ["3201", 1000, 2],
      ["3201", 1200, 2],
      ["3202", 977, 2],
      ["3202", 1177, 2],
      ["3208", 915, 2],
      ["3208", 1115, 2],
    ]);
    expect(resultado.vidrios).toEqual([
      expect.objectContaining({ anchoMm: 906, altoMm: 1106, cantidadPiezas: 1 }),
    ]);
    expect(resultado.perfiles.map((profile) => profile.codigoPerfil)).not.toEqual(
      expect.arrayContaining(["3204", "3205"])
    );
  });

  it("cambiar la tira de AL-32 no cambia las medidas técnicas", () => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:l32",
      lineName: "Serie 32",
    })!;
    const entrada = {
      anchoTotalMm: 1000,
      altoTotalMm: 1200,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    } satisfies FabricacionEntradaCalculo;
    const resultado6000 = calcularCubicacionYPauta(receta, entrada);
    const resultado5950 = calcularCubicacionYPauta({
      ...receta,
      perfiles: receta.perfiles.map((profile) => ({ ...profile, largoComercialMm: 5950 })),
    }, entrada);
    const resultado5900 = calcularCubicacionYPauta({
      ...receta,
      perfiles: receta.perfiles.map((profile) => ({ ...profile, largoComercialMm: 5900 })),
    }, entrada);

    expect(resultado5950.perfiles).toEqual(resultado6000.perfiles);
    expect(resultado5900.perfiles).toEqual(resultado6000.perfiles);
    expect(construirPautaBarrasFabricacion({ receta, resultado: resultado6000 }).barras.every((bar) => bar.largoComercialMm === 6000)).toBe(true);
    expect(construirPautaBarrasFabricacion({ receta: { ...receta, perfiles: receta.perfiles.map((profile) => ({ ...profile, largoComercialMm: 5950 })) }, resultado: resultado5950 }).barras.every((bar) => bar.largoComercialMm === 5950)).toBe(true);
    expect(construirPautaBarrasFabricacion({ receta: { ...receta, perfiles: receta.perfiles.map((profile) => ({ ...profile, largoComercialMm: 5900 })) }, resultado: resultado5900 }).barras.every((bar) => bar.largoComercialMm === 5900)).toBe(true);
  });

  it("rechaza largos no positivos de AL-32 sin generar piezas inválidas", () => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:l32",
      lineName: "Serie 32",
    })!;
    const resultado = calcularCubicacionYPauta(receta, {
      anchoTotalMm: 90,
      altoTotalMm: 90,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });

    expect(resultado.calculable).toBe(false);
    expect(resultado.advertencias.some((warning) => warning.codigo === "MEDIDA_INVALIDA")).toBe(true);
    expect(resultado.perfiles.some((profile) => profile.medidaMm <= 0)).toBe(false);
  });

  it("calcula la receta estándar AL-42 1H con las cantidades y descuentos aportados", () => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:l42",
      lineName: "Serie 42",
      createId: (() => {
        let n = 0;
        return () => `al42-${++n}`;
      })(),
    })!;
    const resultado = calcularCubicacionYPauta(receta, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });
    const totalPorCodigo = (codigo: string) =>
      resultado.perfiles
        .filter((profile) => profile.codigoPerfil === codigo)
        .reduce((total, profile) => total + profile.cantidadPiezas, 0);

    expect(totalPorCodigo("4201")).toBe(4);
    expect(totalPorCodigo("4202")).toBe(4);
    expect(totalPorCodigo("4229")).toBe(4);
    expect(resultado.perfiles.map((profile) => profile.codigoPerfil)).not.toEqual(
      expect.arrayContaining(["4209", "4204", "4206"])
    );
    expect(resultado.perfiles.find((profile) => profile.codigoPerfil === "4202" && profile.medidaMm === 1182)).toBeTruthy();
    expect(resultado.perfiles.find((profile) => profile.codigoPerfil === "4202" && profile.medidaMm === 982)).toBeTruthy();
    expect(resultado.perfiles.find((profile) => profile.codigoPerfil === "4229" && profile.medidaMm === 1110)).toBeTruthy();
    expect(resultado.perfiles.find((profile) => profile.codigoPerfil === "4229" && profile.medidaMm === 910)).toBeTruthy();
    expect(resultado.vidrios).toHaveLength(1);
    expect(resultado.vidrios[0]).toMatchObject({
      anchoMm: 1107,
      altoMm: 907,
      cantidadPiezas: 1,
    });
  });

  it("cambia barras al cambiar la tira sin cambiar las medidas de las piezas AL-42", () => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:l42",
      lineName: "Serie 42",
      createId: (() => {
        let n = 0;
        return () => `al42-tira-${++n}`;
      })(),
    })!;
    const entrada = {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    } satisfies FabricacionEntradaCalculo;
    const resultado6000 = calcularCubicacionYPauta(receta, entrada);
    const receta5950 = {
      ...receta,
      perfiles: receta.perfiles.map((profile) => ({
        ...profile,
        largoComercialMm: 5950,
      })),
    };
    const resultado5950 = calcularCubicacionYPauta(receta5950, entrada);
    const pauta6000 = construirPautaBarrasFabricacion({ receta, resultado: resultado6000 });
    const pauta5950 = construirPautaBarrasFabricacion({ receta: receta5950, resultado: resultado5950 });

    expect(resultado5950.perfiles).toEqual(resultado6000.perfiles);
    expect(pauta6000.barras.every((bar) => bar.largoComercialMm === 6000)).toBe(true);
    expect(pauta5950.barras.every((bar) => bar.largoComercialMm === 5950)).toBe(true);
    expect(pauta5950.totalSobranteMm).not.toBe(pauta6000.totalSobranteMm);
  });

  it.each([
    [
      "3200 1H · Bastidor 3221",
      "3221",
      759,
      1972,
    ],
    [
      "3200 1H · Bastidor 3225",
      "3225",
      710,
      1923,
    ],
  ] as const)("calcula Serie 3200 1H con %s", (variante, bastidor, vidrioAncho, vidrioAlto) => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:serie-3200-puerta-abatible-1h",
      lineName: "Serie 3200",
      createId: (() => {
        let id = 0;
        return () => `serie-3200-${id++}`;
      })(),
    })!;
    const resultado = calcularCubicacionYPauta(receta, {
      anchoTotalMm: 900,
      altoTotalMm: 2100,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
      variante,
    });
    const totalPorCodigo = (codigo: string) =>
      resultado.perfiles
        .filter((profile) => profile.codigoPerfil === codigo)
        .reduce((total, profile) => total + profile.cantidadPiezas, 0);

    expect(resultado.calculable).toBe(true);
    expect(totalPorCodigo("3222")).toBe(3);
    expect(totalPorCodigo(bastidor)).toBe(4);
    expect(resultado.perfiles).toHaveLength(4);
    expect(resultado.perfiles.map((profile) => profile.codigoPerfil)).not.toContain("3223");
    expect(resultado.perfiles.find((profile) => profile.codigoPerfil === "3222" && profile.medidaMm === 900)).toMatchObject({
      cantidadPiezas: 1,
    });
    expect(resultado.perfiles.find((profile) => profile.codigoPerfil === "3222" && profile.medidaMm === 2100)).toMatchObject({
      cantidadPiezas: 2,
    });
    expect(resultado.perfiles.find((profile) => profile.codigoPerfil === bastidor && profile.medidaMm === 858)).toMatchObject({
      cantidadPiezas: 2,
    });
    expect(resultado.perfiles.find((profile) => profile.codigoPerfil === bastidor && profile.medidaMm === 2071)).toMatchObject({
      cantidadPiezas: 2,
    });
    expect(resultado.vidrios).toHaveLength(1);
    expect(resultado.vidrios[0]).toMatchObject({
      anchoMm: vidrioAncho,
      altoMm: vidrioAlto,
      cantidadPiezas: 1,
    });
  });

  it("mantiene siete piezas de perfilería y no mezcla bastidores en Serie 3200", () => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:serie-3200-puerta-abatible-1h",
      lineName: "Serie 3200",
    })!;

    expect(receta.perfiles).toHaveLength(6);
    expect(receta.perfiles.some((profile) => /cierre|travesaño|travesano/i.test(`${profile.nombrePerfil} ${profile.funcion}`))).toBe(false);
    for (const variante of ["3200 1H · Bastidor 3221", "3200 1H · Bastidor 3225"] as const) {
      const resultado = calcularCubicacionYPauta(receta, {
        anchoTotalMm: 900,
        altoTotalMm: 2100,
        cantidad: 1,
        hojas: 1,
        modulos: 1,
        variante,
      });
      expect(resultado.perfiles.reduce((total, profile) => total + profile.cantidadPiezas, 0)).toBe(7);
    }
  });

  it("cambiar la tira de Serie 3200 solo cambia la pauta de barras", () => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:serie-3200-puerta-abatible-1h",
      lineName: "Serie 3200",
    })!;
    const entrada = {
      anchoTotalMm: 900,
      altoTotalMm: 2100,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
      variante: "3200 1H · Bastidor 3221",
    } satisfies FabricacionEntradaCalculo;
    const receta5950 = {
      ...receta,
      perfiles: receta.perfiles.map((profile) => ({ ...profile, largoComercialMm: 5950 })),
    };
    const receta5900 = {
      ...receta,
      perfiles: receta.perfiles.map((profile) => ({ ...profile, largoComercialMm: 5900 })),
    };
    const resultado6000 = calcularCubicacionYPauta(receta, entrada);
    const resultado5950 = calcularCubicacionYPauta(receta5950, entrada);
    const resultado5900 = calcularCubicacionYPauta(receta5900, entrada);
    const pauta6000 = construirPautaBarrasFabricacion({ receta, resultado: resultado6000 });
    const pauta5950 = construirPautaBarrasFabricacion({ receta: receta5950, resultado: resultado5950 });
    const pauta5900 = construirPautaBarrasFabricacion({ receta: receta5900, resultado: resultado5900 });

    expect(resultado5950.perfiles).toEqual(resultado6000.perfiles);
    expect(resultado5900.perfiles).toEqual(resultado6000.perfiles);
    expect(pauta6000.barras.every((bar) => bar.largoComercialMm === 6000)).toBe(true);
    expect(pauta5950.barras.every((bar) => bar.largoComercialMm === 5950)).toBe(true);
    expect(pauta5900.barras.every((bar) => bar.largoComercialMm === 5900)).toBe(true);
    expect(pauta5950.totalSobranteMm).not.toBe(pauta6000.totalSobranteMm);
  });

  it("rechaza medidas de puerta 3200 que producirían largos no positivos", () => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:serie-3200-puerta-abatible-1h",
      lineName: "Serie 3200",
    })!;
    const resultado = calcularCubicacionYPauta(receta, {
      anchoTotalMm: 100,
      altoTotalMm: 100,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
      variante: "3200 1H · Bastidor 3225",
    });

    expect(resultado.calculable).toBe(false);
    expect(resultado.advertencias.some((warning) => warning.codigo === "MEDIDA_INVALIDA")).toBe(true);
    expect(resultado.perfiles.some((profile) => profile.medidaMm <= 0)).toBe(false);
  });

  it("no bloquea una receta 3200 base con descuentos documentados", () => {
    const receta = crearRecetaEstructuralParaLineaComercial({
      catalogKey: "ventora:serie-3200-puerta-abatible-1h",
      lineName: "Serie 3200",
    })!;

    expect(evaluarRecetaListaParaProbar(receta)).toMatchObject({
      listaParaProbar: true,
      bloqueos: [],
    });
  });

  it("valida el schema Zod del fixture de corredera 2 hojas", () => {
    const parsed = fabricacionRecetaSchema.safeParse(
      RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO
    );
    expect(parsed.success).toBe(true);
    expect(RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.estado).toBe(
      "ejemplo_no_validado"
    );
  });

  it("calcula perfiles, vidrio, accesorios y trazabilidad para 1200 x 1000", () => {
    const resultado = calcularCubicacionYPauta(cloneRecipe(), entradaBase);

    expect(resultado.calculable).toBe(true);
    expect(findPerfil(resultado, "Riel superior")).toMatchObject({
      medidaMm: 1200,
      cantidadPiezas: 1,
      totalLinealMm: 1200,
    });
    expect(findPerfil(resultado, "Jamba")).toMatchObject({
      medidaMm: 997,
      cantidadPiezas: 2,
      totalLinealMm: 1994,
    });
    expect(findPerfil(resultado, "Cabezal")).toMatchObject({
      medidaMm: 598,
      cantidadPiezas: 2,
    });
    expect(findPerfil(resultado, "Pierna")).toMatchObject({
      medidaMm: 982,
      cantidadPiezas: 2,
    });
    expect(resultado.vidrios[0]).toMatchObject({
      anchoMm: 580,
      altoMm: 930,
      cantidadPiezas: 2,
    });
    expect(resultado.vidrios[0]?.totalM2).toBeCloseTo(1.0788, 5);
    expect(resultado.accesorios.find((entry) => entry.nombre.includes("Caracol"))).toMatchObject({
      cantidadUnidades: 2,
    });
    expect(resultado.perfiles[0]?.trazabilidad[0]?.formula).toContain("ancho_total");
    expect(resultado.advertencias.some((entry) => entry.codigo === "RECETA_NO_VALIDADA")).toBe(
      true
    );
  });

  it("responde a diferentes anchos y altos sin mezclar resultados", () => {
    const resultado = calcularCubicacionYPauta(cloneRecipe(), {
      ...entradaBase,
      anchoTotalMm: 1500,
      altoTotalMm: 1200,
    });

    expect(findPerfil(resultado, "Riel superior")?.medidaMm).toBe(1500);
    expect(findPerfil(resultado, "Jamba")?.medidaMm).toBe(1197);
    expect(findPerfil(resultado, "Cabezal")?.medidaMm).toBe(748);
    expect(resultado.vidrios[0]).toMatchObject({
      anchoMm: 730,
      altoMm: 1130,
    });
  });

  it("multiplica por varias unidades", () => {
    const resultado = calcularCubicacionYPauta(cloneRecipe(), {
      ...entradaBase,
      cantidad: 3,
    });

    expect(findPerfil(resultado, "Riel superior")?.cantidadPiezas).toBe(3);
    expect(findPerfil(resultado, "Jamba")?.cantidadPiezas).toBe(6);
    expect(resultado.vidrios[0]?.cantidadPiezas).toBe(6);
    expect(resultado.accesorios.find((entry) => entry.accesorioId === "caracol")?.cantidadUnidades).toBe(
      6
    );
  });

  it("aplica ajustes positivos y negativos", () => {
    const resultado = calcularCubicacionYPauta(cloneRecipe(), {
      ...entradaBase,
      variante: "termopanel",
    });

    expect(findPerfil(resultado, "Jamba")?.medidaMm).toBe(997);
    expect(findPerfil(resultado, "Refuerzo")?.medidaMm).toBe(1012);
    expect(resultado.accesorios.find((entry) => entry.accesorioId === "rueda-termopanel")).toMatchObject({
      cantidadUnidades: 4,
    });
  });

  it("calcula cantidades según hojas", () => {
    const receta = cloneRecipe();
    const resultado = calcularCubicacionYPauta(receta, {
      ...entradaBase,
      anchoTotalMm: 1800,
      hojas: 3,
      modulos: 3,
    });

    expect(findPerfil(resultado, "Cabezal")?.cantidadPiezas).toBe(3);
    expect(findPerfil(resultado, "Cabezal")?.medidaMm).toBe(598);
    expect(resultado.vidrios[0]?.cantidadPiezas).toBe(3);
  });

  it("omite componentes con condición de variante que no corresponde", () => {
    const resultado = calcularCubicacionYPauta(cloneRecipe(), entradaBase);

    expect(findPerfil(resultado, "Refuerzo")).toBeUndefined();
    expect(resultado.accesorios.some((entry) => entry.accesorioId === "rueda-termopanel")).toBe(
      false
    );
  });

  it("reporta datos incompletos de receta sin lanzar excepción", () => {
    const receta: FabricacionReceta = {
      ...cloneRecipe(),
      estado: "validada",
      perfiles: [
        {
          ...cloneRecipe().perfiles[0]!,
          funcion: "",
          codigoPerfil: "",
          nombrePerfil: "",
        },
      ],
    };
    const validacion = validarRecetaFabricacion(receta);
    const resultado = calcularCubicacionYPauta(receta, entradaBase);

    expect(validacion.ok).toBe(false);
    expect(resultado.calculable).toBe(false);
    expect(resultado.advertencias.some((entry) => entry.codigo === "PERFIL_SIN_IDENTIFICACION")).toBe(
      true
    );
  });

  it("código comercial vacío no bloquea cálculo si hay función", () => {
    const receta: FabricacionReceta = {
      ...cloneRecipe(),
      estado: "validada",
      perfiles: cloneRecipe().perfiles.map((profile) => ({
        ...profile,
        codigoPerfil: "",
      })),
    };
    const validacion = validarRecetaFabricacion(receta);
    const resultado = calcularCubicacionYPauta(receta, entradaBase);

    expect(validacion.ok).toBe(true);
    expect(resultado.calculable).toBe(true);
    expect(resultado.totalLinealMm).toBeGreaterThan(0);
  });

  it("reporta medidas inválidas sin usar valores negativos", () => {
    const receta = cloneRecipe();
    receta.perfiles = [
      {
        ...receta.perfiles[0]!,
        reglaMedida: { base: "ancho_total", ajusteMm: -2000 },
      },
    ];
    const resultado = calcularCubicacionYPauta(receta, entradaBase);

    expect(resultado.calculable).toBe(false);
    expect(resultado.perfiles).toHaveLength(0);
    expect(resultado.advertencias.some((entry) => entry.codigo === "MEDIDA_INVALIDA")).toBe(
      true
    );
  });

  it("rechaza entrada inválida sin mutar la receta", () => {
    const receta = cloneRecipe();
    const antes = JSON.stringify(receta);
    const resultado = calcularCubicacionYPauta(receta, {
      ...entradaBase,
      anchoTotalMm: 0,
    });

    expect(resultado.calculable).toBe(false);
    expect(resultado.entradaNormalizada).toBeNull();
    expect(resultado.advertencias.some((entry) => entry.codigo === "ENTRADA_INVALIDA")).toBe(
      true
    );
    expect(JSON.stringify(receta)).toBe(antes);
  });

  it("no muta receta ni entrada", () => {
    const receta = cloneRecipe();
    const entrada = { ...entradaBase };
    const recetaAntes = JSON.stringify(receta);
    const entradaAntes = JSON.stringify(entrada);

    calcularCubicacionYPauta(receta, entrada);

    expect(JSON.stringify(receta)).toBe(recetaAntes);
    expect(JSON.stringify(entrada)).toBe(entradaAntes);
  });

  it("produce resultados estables para los mismos datos", () => {
    const receta = cloneRecipe();
    const uno = calcularCubicacionYPauta(receta, entradaBase);
    const dos = calcularCubicacionYPauta(receta, entradaBase);

    expect(dos).toEqual(uno);
    expect(JSON.stringify(dos)).toBe(JSON.stringify(uno));
  });
});
