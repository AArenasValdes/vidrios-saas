import {
  auditarCatalogoLineasVentora,
  agruparAuditoriaCatalogoPorEstado,
} from "@/features/cotizaciones/line-templates/services/auditoria-catalogo-lineas-ventora.service";

describe("auditoria-catalogo-lineas-ventora.service", () => {
  it("audita las 29 líneas canónicas del catálogo Ventora", () => {
    const rows = auditarCatalogoLineasVentora();
    expect(rows).toHaveLength(29);
    expect(rows.every((row) => row.cotizacionComercial)).toBe(true);
  });

  it("representa AM-35 con variantes documentadas y sin validación de taller", () => {
    const am35 = auditarCatalogoLineasVentora().find(
      (row) => row.catalogKey === "ventora:l35"
    );

    expect(am35?.nombre).toBe("AM-35 · Puerta abatible y vaivén");
    expect(am35?.fabricacionEstado).toBe("fabricacion_pendiente");
    expect(am35?.listaParaProbar).toBe(false);
    expect(am35?.validationStatus).toBe("documented");
    expect(am35?.lineSourceModel).toBe("multiprovider");
  });

  it("no marca ninguna línea como validada en catálogo base", () => {
    const grupos = agruparAuditoriaCatalogoPorEstado();
    expect(grupos.fabricacionValidada).toHaveLength(0);
  });

  it("expone códigos documentados solo donde existen en fixtures", () => {
    const l5000 = auditarCatalogoLineasVentora().find(
      (row) => row.catalogKey === "ventora:l5000"
    );
    const am35 = auditarCatalogoLineasVentora().find(
      (row) => row.catalogKey === "ventora:l35"
    );

    expect(l5000?.codigosConfigurados).toEqual(
      expect.arrayContaining(["5001", "5007"])
    );
    expect(am35?.codigosConfigurados).toEqual(
      expect.arrayContaining(["3501", "3502", "3509"])
    );
  });

  it("mantiene las nuevas familias tradicionales como documentadas e incompletas", () => {
    const rows = auditarCatalogoLineasVentora();
    for (const catalogKey of [
      "ventora:serie-15-corredera-2h",
      "ventora:serie-4000-corredera-2h",
      "ventora:serie-45-puerta",
      "ventora:serie-12-shower-corredera",
    ]) {
      const row = rows.find((candidate) => candidate.catalogKey === catalogKey);
      expect(row?.lineFamilyType).toBe("traditional");
      expect(row?.lineSourceModel).toBe("multiprovider");
      expect(row?.validationStatus).toBe("documented");
      expect(row?.technicalStatus).toBe("incomplete");
      expect(row?.pricingStatus).toBe("missing");
      expect(row?.quotable).toBe(false);
    }
  });

  it("resume estados del catálogo base", () => {
    const rows = auditarCatalogoLineasVentora();
    const resumen = rows.map((row) => ({
      catalogKey: row.catalogKey,
      nombre: row.nombre,
      fabricacionEstado: row.fabricacionEstado,
      tipologia: row.tipologia,
      perfiles: `${row.perfilesConfigurados}/${row.perfilesTotales}`,
      codigos: row.codigosConfigurados.length,
      listaParaProbar: row.listaParaProbar,
    }));
    expect(resumen).toMatchSnapshot();
  });
});
