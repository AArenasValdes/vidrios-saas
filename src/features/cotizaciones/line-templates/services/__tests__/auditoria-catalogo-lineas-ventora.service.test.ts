import {
  auditarCatalogoLineasVentora,
  agruparAuditoriaCatalogoPorEstado,
} from "@/features/cotizaciones/line-templates/services/auditoria-catalogo-lineas-ventora.service";

describe("auditoria-catalogo-lineas-ventora.service", () => {
  it("audita las 25 líneas canónicas del catálogo Ventora", () => {
    const rows = auditarCatalogoLineasVentora();
    expect(rows).toHaveLength(25);
    expect(rows.every((row) => row.cotizacionComercial)).toBe(true);
  });

  it("deja AM-35 solo en cotización comercial sin arquetipo técnico", () => {
    const am35 = auditarCatalogoLineasVentora().find(
      (row) => row.catalogKey === "ventora:l35"
    );

    expect(am35?.nombre).toBe("AM-35 · Puerta abatible y vaivén");
    expect(am35?.fabricacionEstado).toBe("cotizacion_comercial");
    expect(am35?.listaParaProbar).toBe(false);
    expect(am35?.notas).toEqual(
      expect.arrayContaining([
        "Sin arquetipo técnico precargado: solo cotización comercial por m².",
      ])
    );
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
    expect(am35?.codigosConfigurados).toEqual([]);
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
