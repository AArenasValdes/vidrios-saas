import {
  RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
  calcularCubicacionYPauta,
  fabricacionRecetaSchema,
  validarRecetaFabricacion,
  type FabricacionEntradaCalculo,
  type FabricacionReceta,
} from "@/features/fabricacion";

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
