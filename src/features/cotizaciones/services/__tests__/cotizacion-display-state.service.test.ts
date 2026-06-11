import {
  resolveCotizacionClosureState,
  resolveCotizacionWorkflowState,
} from "../cotizacion-display-state.service";

describe("cotizacion-display-state.service", () => {
  it("debe mostrar PDF generado cuando hay descarga registrada sin cierre comercial", () => {
    expect(
      resolveCotizacionWorkflowState({
        estado: "creada",
        pdfDescargadoEn: "2026-06-11T12:00:00.000Z",
      })
    ).toEqual({ cls: "stPdfGenerado", label: "PDF generado" });
  });

  it("debe priorizar estados comerciales cerrados sobre PDF generado", () => {
    expect(
      resolveCotizacionWorkflowState({
        estado: "aprobada",
        pdfDescargadoEn: "2026-06-11T12:00:00.000Z",
      })
    ).toEqual({ cls: "stAprobada", label: "Aprobada" });
  });

  it("debe reemplazar pendiente por sin cierre registrado", () => {
    expect(
      resolveCotizacionClosureState({
        estado: "creada",
        pdfDescargadoEn: null,
      })
    ).toEqual({ cls: "stSinCierre", label: "Sin cierre registrado" });
  });
});
