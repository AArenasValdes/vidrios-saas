import { auditarIntegridadCatalogoLineasVentora } from "@/features/cotizaciones/line-templates/services/auditoria-integridad-catalogo-lineas.service";



describe("auditoria integridad catalogo lineas", () => {

  it("clasifica las 25 líneas con categorías primarias mutuamente excluyentes", () => {

    const { lineas, resumen } = auditarIntegridadCatalogoLineasVentora();



    expect(lineas).toHaveLength(25);

    expect(resumen.totalLineas).toBe(25);



    const sumaPrimaria = Object.values(resumen.clasificacionPrimaria).reduce(

      (total, count) => total + count,

      0

    );

    expect(sumaPrimaria).toBe(25);



    expect(resumen.clasificacionPrimaria).toEqual({

      codigos_documentados_no_validados: 3,

      codigos_referenciales_no_ambiguos: 10,

      codigos_referenciales_ambiguos: 3,

      sin_codigos_tecnicos_en_fixtures: 8,

      solo_comercial: 1,

    });



    expect(resumen.nomenclaturaAmbigua).toBe(3);

    expect(resumen.conCodigosReferencialesEnFixtures).toBe(14);

    expect(resumen.gateTecnico.listaParaProbar).toBe(0);

  });



  it("no reutiliza códigos 32xx en Serie 32 corredera y separa ambigüedad", () => {

    const { lineas } = auditarIntegridadCatalogoLineasVentora();



    const serie32 = lineas.find((line) => line.catalogKey === "ventora:l32");

    expect(serie32?.clasificacionPrimaria).toBe("codigos_referenciales_ambiguos");

    expect(serie32?.nomenclaturaAmbigua).toBe(true);

    expect(serie32?.codigosReferenciales).toEqual([]);

    expect(serie32?.codigosDocumentadosReceta).toEqual([]);



    const serie42Corredera = lineas.find((line) => line.catalogKey === "ventora:l42");

    expect(serie42Corredera?.clasificacionPrimaria).toBe("codigos_referenciales_ambiguos");

    expect(serie42Corredera?.nomenclaturaAmbigua).toBe(true);

    expect(serie42Corredera?.codigosReferenciales).toEqual([]);



    const puerta3200 = lineas.find(

      (line) => line.catalogKey === "ventora:serie-3200-puerta-abatible-1h"

    );

    expect(puerta3200?.clasificacionPrimaria).toBe("codigos_referenciales_ambiguos");

    expect(puerta3200?.nomenclaturaAmbigua).toBe(true);

    expect(puerta3200?.codigosReferenciales).toEqual(

      expect.arrayContaining(["3221", "3228"])

    );

  });



  it("marca AM-35 como solo comercial", () => {

    const am35 = auditarIntegridadCatalogoLineasVentora().lineas.find(

      (line) => line.catalogKey === "ventora:l35"

    );

    expect(am35?.clasificacionPrimaria).toBe("solo_comercial");

    expect(am35?.nomenclaturaAmbigua).toBe(false);

  });



  it("agrupa sin códigos técnicos en fixtures las líneas PVC y Óptima S-28", () => {

    const { lineas } = auditarIntegridadCatalogoLineasVentora();

    const sinCodigos = lineas.filter(

      (line) => line.clasificacionPrimaria === "sin_codigos_tecnicos_en_fixtures"

    );



    expect(sinCodigos).toHaveLength(8);

    expect(sinCodigos.map((line) => line.catalogKey).sort()).toEqual(

      [

        "ventora:optima-s28-corredera-2h",

        "ventora:optima-s28-corredera-3h",

        "ventora:winhouse-andes-doble-riel",

        "ventora:winhouse-andes-monorriel",

        "ventora:winhouse-andes-proyectante",

        "ventora:winhouse-new-s75-doble-riel",

        "ventora:winhouse-new-s75-triple-riel",

        "ventora:winhouse-s60",

      ].sort()

    );

  });



  it("no reporta conflicto documentado entre variantes Serie 42 proyectante", () => {

    const { conflictosCodigo } = auditarIntegridadCatalogoLineasVentora();

    const conflicto4201 = conflictosCodigo.find((entry) => entry.codigo === "4201");

    expect(conflicto4201).toBeUndefined();

  });

});

