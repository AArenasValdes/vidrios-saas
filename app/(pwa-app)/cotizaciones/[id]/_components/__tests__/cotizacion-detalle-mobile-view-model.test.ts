import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

import { buildCotizacionDetalleMobileViewModel } from "../cotizacion-detalle-mobile-view-model";

function createRecord(
  overrides: Partial<CotizacionWorkflowRecord> = {}
): CotizacionWorkflowRecord {
  return {
    id: "q1",
    codigo: "COT-010526-001",
    clienteNombre: "Alejandro Flores",
    clienteTelefono: "+56 9 7733 8906",
    obra: "Vina del Mar 2722",
    direccion: "Vina del Mar 2722",
    validez: "15 dias",
    descuentoPct: 0,
    observaciones: "",
    estado: "creada",
    approvalToken: null,
    approvalTokenExpiresAt: null,
    clienteVioEn: null,
    clienteRespondioEn: null,
    clienteRespuestaCanal: null,
    pdfDescargadoEn: null,
    createdAt: "2026-05-01T12:00:00.000Z",
    updatedAt: "2026-05-01T12:00:00.000Z",
    subtotal: 1000000,
    descuentoValor: 0,
    neto: 1000000,
    iva: 190000,
    flete: 0,
    total: 1190000,
    items: [
      {
        id: "i1",
        codigo: "V1",
        tipo: "ventana",
        vidrio: "Incoloro",
        nombre: "Ventana V1",
        descripcion: "",
        ancho: 800,
        alto: 1500,
        cantidad: 2,
        unidad: "ud",
        areaM2: null,
        costoProveedorUnitario: 100000,
        costoProveedorTotal: 200000,
        margenPct: 30,
        precioUnitario: 200000,
        precioTotal: 400000,
        observaciones: "",
      },
    ],
    ...overrides,
  };
}

describe("buildCotizacionDetalleMobileViewModel", () => {
  it("arma jerarquia principal y estado comercial", () => {
    const model = buildCotizacionDetalleMobileViewModel(createRecord());

    expect(model.code).toBe("COT-010526-001");
    expect(model.statusLabel).toBe("Creada");
    expect(model.responseStatus).toBe("pendiente");
    expect(model.responseStatusLabel).toBe("Sin cierre registrado");
    expect(model.responseChannelLabel).toBe("Sin seguimiento registrado");
    expect(model.total).toBe("$1.190.000");
    expect(model.heroSubtext).toBe("Alejandro Flores · Vina del Mar 2722 · 1 componente");
  });

  it("arma items compactos y usa fallbacks seguros", () => {
    const model = buildCotizacionDetalleMobileViewModel(
      createRecord({
        clienteTelefono: "",
        direccion: "",
        observaciones: "",
        items: [
          {
            id: "i2",
            codigo: "",
            tipo: "puerta",
            vidrio: "",
            nombre: "",
            descripcion: "",
            ancho: null,
            alto: null,
            cantidad: 1,
            unidad: "ud",
            areaM2: null,
            costoProveedorUnitario: 0,
            costoProveedorTotal: 0,
            margenPct: 0,
            precioUnitario: 0,
            precioTotal: 200000,
            observaciones: "",
          },
        ],
      })
    );

    expect(model.clientPhone).toBe("Sin teléfono");
    expect(model.clientAddress).toBe("Sin dirección");
    expect(model.notes).toBe("Sin observaciones ni cierre adicional.");
    expect(model.items[0]).toEqual({
      id: "i2",
      code: "I1",
      name: "puerta",
      meta: "Medidas por definir · 1 ud",
      price: "$200.000",
    });
  });

  it("traduce el canal de seguimiento para enlace publico y app", () => {
    const publicModel = buildCotizacionDetalleMobileViewModel(
      createRecord({
        estado: "aprobada",
        clienteRespondioEn: "2026-05-02T15:30:00.000Z",
        clienteRespuestaCanal: "link_publico",
      })
    );
    const manualModel = buildCotizacionDetalleMobileViewModel(
      createRecord({
        estado: "terminada",
        clienteRespondioEn: "2026-05-03T12:00:00.000Z",
        clienteRespuestaCanal: "manual_app",
      })
    );

    expect(publicModel.responseStatus).toBe("aprobada");
    expect(publicModel.responseChannelLabel).toBe("Respondio desde el enlace");
    expect(manualModel.responseStatus).toBe("terminada");
    expect(manualModel.responseChannelLabel).toBe("Marcado manualmente en la app");
  });
});
