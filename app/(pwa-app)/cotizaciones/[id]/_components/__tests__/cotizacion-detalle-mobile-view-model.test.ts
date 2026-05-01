import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

import { buildCotizacionDetalleMobileViewModel } from "../cotizacion-detalle-mobile-view-model";

function createRecord(overrides: Partial<CotizacionWorkflowRecord> = {}): CotizacionWorkflowRecord {
  return {
    id: "q1",
    codigo: "COT-010526-001",
    clienteNombre: "Alejandro Flores",
    clienteTelefono: "+56 9 7733 8906",
    obra: "Viña del Mar 2722",
    direccion: "Viña del Mar 2722",
    validez: "15 días",
    descuentoPct: 0,
    observaciones: "",
    estado: "creada",
    approvalToken: null,
    approvalTokenExpiresAt: null,
    clienteVioEn: null,
    clienteRespondioEn: null,
    clienteRespuestaCanal: null,
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
  it("arma jerarquía principal y estado comercial", () => {
    const model = buildCotizacionDetalleMobileViewModel(createRecord());

    expect(model.code).toBe("COT-010526-001");
    expect(model.statusLabel).toBe("Pendiente");
    expect(model.total).toBe("$1.190.000");
    expect(model.heroSubtext).toBe("Alejandro Flores · Viña del Mar 2722 · 1 componente");
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
});
