import {
  __resetCotizacionCodeCountersForTests,
  buildCotizacionCode,
  buildLegacyCotizacionCode,
  calculateComponentItem,
  calculateCotizacionWorkflowTotals,
  cloneCotizacionAsDraft,
  createCotizacionRecord,
} from "../cotizaciones-workflow.service";

describe("cotizaciones-workflow.service", () => {
  beforeEach(() => {
    __resetCotizacionCodeCountersForTests();
  });

  it("genera codigos legibles y secuenciales por dia", () => {
    const now = new Date("2026-03-21T10:15:00.000Z");

    expect(buildCotizacionCode(now)).toBe("COT-210326-001");
    expect(buildCotizacionCode(now)).toBe("COT-210326-002");
    expect(buildCotizacionCode(new Date("2026-03-22T09:00:00.000Z"))).toBe("COT-220326-001");
  });

  it("genera un codigo legacy estable a partir de la fecha y el id", () => {
    const code = buildLegacyCotizacionCode(new Date("2026-03-21T10:15:00.000Z"), 1452);

    expect(code).toBe("COT-210326-452");
  });

  it("calcula un componente a partir de costo proveedor y margen", () => {
    const item = calculateComponentItem({
      codigo: "V1",
      tipo: "Ventana",
      vidrio: "Incoloro monolitico 5mm",
      nombre: "Ventana living",
      descripcion: "Ventana corredera color negro",
      ancho: 1800,
      alto: 2200,
      cantidad: 2,
      costoProveedorUnitario: 300000,
      margenPct: 100,
    });

    expect(item.areaM2).toBe(3.96);
    expect(item.vidrio).toBe("Incoloro monolitico 5mm");
    expect(item.costoProveedorTotal).toBe(600000);
    expect(item.precioUnitario).toBe(600000);
    expect(item.precioTotal).toBe(1200000);
  });

  it("debe fallar si el margen es negativo", () => {
    expect(() =>
      calculateComponentItem({
        codigo: "V1",
        tipo: "Ventana",
        nombre: "Ventana living",
        costoProveedorUnitario: 100000,
        margenPct: -10,
      })
    ).toThrow("El margen no puede ser negativo");
  });

  it("crea una cotizacion preservando id y codigo existentes", () => {
    const item = calculateComponentItem({
      codigo: "P1",
      tipo: "Puerta",
      nombre: "Puerta terraza",
      descripcion: "Puerta de aluminio",
      cantidad: 1,
      costoProveedorUnitario: 250000,
      margenPct: 80,
    });

    const record = createCotizacionRecord({
      draft: {
        clienteNombre: "Maria Gonzalez",
        clienteTelefono: "+56 9 7123 4567",
        obra: "Oficina La Serena",
        direccion: "Amunategui 150",
        validez: "15 dias",
        descuentoPct: 10,
        flete: 25000,
        observaciones: "Revisar acceso",
        items: [item],
      },
      estado: "borrador",
      existingId: "cot-123",
      existingCode: "COT-123456",
      createdAt: "2026-03-10T10:00:00.000Z",
      now: new Date("2026-03-11T08:00:00.000Z"),
    });

    expect(record.id).toBe("cot-123");
    expect(record.codigo).toBe("COT-123456");
    expect(record.estado).toBe("borrador");
    expect(record.createdAt).toBe("2026-03-10T10:00:00.000Z");
    expect(record.updatedAt).toBe("2026-03-11T08:00:00.000Z");
    expect(record.flete).toBe(25000);
    expect(record.total).toBeGreaterThan(record.neto);
  });

  it("duplica una cotizacion final como nuevo borrador", () => {
    const item = calculateComponentItem({
      codigo: "C1",
      tipo: "Cierre",
      nombre: "Cierre terraza",
      descripcion: "Cierre plegable",
      cantidad: 1,
      costoProveedorUnitario: 420000,
      margenPct: 65,
    });

    const original = createCotizacionRecord({
      draft: {
        clienteNombre: "Pedro Soto",
        clienteTelefono: "+56 9 6543 2109",
        obra: "Depto. Los Aromos",
        direccion: "Av. Pacifico 670",
        validez: "15 dias",
        descuentoPct: 0,
        flete: 18000,
        observaciones: "",
        items: [item],
      },
      estado: "creada",
      existingId: "cot-original",
      existingCode: "COT-654321",
      createdAt: "2026-03-01T12:00:00.000Z",
      now: new Date("2026-03-01T12:00:00.000Z"),
    });

    const copia = cloneCotizacionAsDraft(original, new Date("2026-03-12T09:30:00.000Z"));
    const totals = calculateCotizacionWorkflowTotals(copia.items, copia.descuentoPct, copia.flete);

    expect(copia.id).not.toBe(original.id);
    expect(copia.codigo).not.toBe(original.codigo);
    expect(copia.estado).toBe("borrador");
    expect(copia.obra).toContain("copia");
    expect(copia.flete).toBe(18000);
    expect(copia.total).toBe(totals.total);
  });

  it("debe sumar el flete al total final", () => {
    const item = calculateComponentItem({
      codigo: "V3",
      tipo: "Ventana",
      nombre: "Ventana comedor",
      cantidad: 1,
      costoProveedorUnitario: 100000,
      margenPct: 100,
    });

    const totals = calculateCotizacionWorkflowTotals([item], 0, 15000);

    expect(totals.subtotal).toBe(200000);
    expect(totals.iva).toBe(38000);
    expect(totals.flete).toBe(15000);
    expect(totals.total).toBe(253000);
  });

  it("debe dejar vidrio vacio cuando no viene informado", () => {
    const item = calculateComponentItem({
      codigo: "V2",
      tipo: "Ventana",
      nombre: "Ventana cocina",
      costoProveedorUnitario: 180000,
    });

    expect(item.vidrio).toBe("");
  });
});
