/** @jest-environment jsdom */

import { downloadCotizacionesListCsv } from "../pdf";

const records = [
  {
    id: "cot-1",
    codigo: "COT-123456",
    clientId: 1,
    projectId: 1,
    clienteNombre: "Roberto Fuentes",
    clienteTelefono: "+56 9 8234 5678",
    obra: "Casa Coquimbo",
    direccion: "Los Pescadores 221",
    validez: "15 dias",
    descuentoPct: 0,
    observaciones: "",
    estado: "creada" as const,
    createdAt: "2026-03-14T10:00:00.000Z",
    updatedAt: "2026-03-14T10:00:00.000Z",
    items: [],
    subtotal: 100000,
    descuentoValor: 0,
    neto: 100000,
    iva: 19000,
    flete: 0,
    total: 119000,
  },
];

describe("pdf utils", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("debe descargar un csv con el listado de cotizaciones", () => {
    const appendSpy = jest.spyOn(document.body, "appendChild");
    const removeSpy = jest.spyOn(document.body, "removeChild");
    const anchor = document.createElement("a");
    const click = jest.fn();
    anchor.click = click;
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: jest.fn().mockReturnValue("blob:cotizaciones"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: jest.fn(),
    });
    const createElementSpy = jest
      .spyOn(document, "createElement")
      .mockReturnValue(anchor);

    downloadCotizacionesListCsv(records, "Exportacion");

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:cotizaciones");
  });
});
