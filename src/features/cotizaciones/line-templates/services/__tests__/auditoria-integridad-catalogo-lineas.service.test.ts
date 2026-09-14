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

      codigos_referenciales_no_ambiguos: 15,

      codigos_referenciales_ambiguos: 1,

      sin_codigos_tecnicos_en_fixtures: 5,

      solo_comercial: 1,

    });



    expect(resumen.nomenclaturaAmbigua).toBe(1);

    expect(resumen.conCodigosReferencialesEnFixtures).toBe(19);

    expect(resumen.gateTecnico.listaParaProbar).toBe(12);

  });



  it("clasifica AL-32 y AL-42 como proyectantes con códigos técnicos", () => {

    const { lineas } = auditarIntegridadCatalogoLineasVentora();



    const al32 = lineas.find((line) => line.catalogKey === "ventora:l32");

    expect(al32?.tipologiaComercial).toContain("Proyectante");

    expect(al32?.clasificacionPrimaria).toBe("codigos_referenciales_no_ambiguos");

    expect(al32?.nomenclaturaAmbigua).toBe(false);

    expect(al32?.codigosReferenciales).toEqual(
      expect.arrayContaining(["3201", "3202", "3204", "3205", "3208"])
    );



    const al42 = lineas.find((line) => line.catalogKey === "ventora:l42");

    expect(al42?.tipologiaComercial).toContain("Proyectante");

    expect(al42?.clasificacionPrimaria).toBe("codigos_referenciales_no_ambiguos");

    expect(al42?.nomenclaturaAmbigua).toBe(false);

    expect(al42?.codigosReferenciales).toEqual(
      expect.arrayContaining(["4201", "4202", "4204", "4206", "4209", "4229", "4231", "4220", "4230", "4250"])
    );



    const puerta3200 = lineas.find(

      (line) => line.catalogKey === "ventora:serie-3200-puerta-abatible-1h"

    );

    expect(puerta3200?.clasificacionPrimaria).toBe("codigos_referenciales_ambiguos");

    expect(puerta3200?.nomenclaturaAmbigua).toBe(true);

    expect(puerta3200?.codigosReferenciales).toEqual(

      expect.arrayContaining(["3221", "3222", "3223", "3225", "3227"])

    );

  });



  it("marca AM-35 como solo comercial", () => {

    const am35 = auditarIntegridadCatalogoLineasVentora().lineas.find(

      (line) => line.catalogKey === "ventora:l35"

    );

    expect(am35?.clasificacionPrimaria).toBe("solo_comercial");

    expect(am35?.nomenclaturaAmbigua).toBe(false);

  });



  it("mantiene pendientes las líneas sin códigos técnicos exactos", () => {

    const { lineas } = auditarIntegridadCatalogoLineasVentora();

    const sinCodigos = lineas.filter(

      (line) => line.clasificacionPrimaria === "sin_codigos_tecnicos_en_fixtures"

    );



    expect(sinCodigos).toHaveLength(5);

    expect(sinCodigos.map((line) => line.catalogKey).sort()).toEqual(

      [

        "ventora:optima-s28-corredera-2h",

        "ventora:optima-s28-corredera-3h",


        "ventora:winhouse-andes-proyectante",

        "ventora:winhouse-new-s75-doble-riel",

        "ventora:winhouse-new-s75-triple-riel",

      ].sort()

    );

  });



  it("no reporta conflicto documentado entre variantes Serie 42 proyectante", () => {

    const { conflictosCodigo } = auditarIntegridadCatalogoLineasVentora();

    const conflicto4201 = conflictosCodigo.find((entry) => entry.codigo === "4201");

    expect(conflicto4201).toBeUndefined();

  });

  it("mantiene los códigos S-33 estándar y RPT sin usar nomenclatura antigua", () => {
    const { lineas } = auditarIntegridadCatalogoLineasVentora();
    const standard = lineas.find((line) => line.catalogKey === "ventora:s33-corredera-2h");
    const rpt = lineas.find((line) => line.catalogKey === "ventora:s33-rpt-corredera-2h");

    expect(standard?.codigosReferenciales).toEqual(
      expect.arrayContaining(["3301", "3302", "3303", "3304", "3308"])
    );
    expect(rpt?.codigosReferenciales).toEqual(
      expect.arrayContaining(["3324", "3308", "3303", "3304", "3470"])
    );
    expect(rpt?.codigosReferenciales).not.toEqual(
      expect.arrayContaining(["3324R", "3308R"])
    );
  });

});

