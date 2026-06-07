import { buildNuevaCotizacionSolicitudPrefillState } from "@/features/cotizaciones/new-quote/solicitud-prefill";

describe("solicitud prefill para nueva cotización", () => {
  it("arma un borrador limpio con datos de la solicitud", () => {
    const result = buildNuevaCotizacionSolicitudPrefillState({
      clienteNombre: "Pedro Araya",
      clienteTelefono: "+56977338906",
      obra: "Ventana corredera",
      observaciones: "Origen: Página pública.",
      pricingMode: "margen",
      defaultMargin: 35,
    });

    expect(result.version).toBe(5);
    expect(result.step).toBe(2);
    expect(result.draft.clienteNombre).toBe("Pedro Araya");
    expect(result.draft.clienteTelefono).toBe("+56 9 7733 8906");
    expect(result.draft.obra).toBe("Ventana corredera");
    expect(result.draft.observaciones).toBe("Origen: Página pública.");
    expect(result.draft.items).toEqual([]);
    expect(result.componentForm.pricingMode).toBe("margen");
    expect(result.showStep1MoreData).toBe(true);
  });

  it("usa fallback comercial cuando la obra viene vacía", () => {
    const result = buildNuevaCotizacionSolicitudPrefillState({
      clienteNombre: "Camila Soto",
      clienteTelefono: "",
      obra: "   ",
      observaciones: "",
    });

    expect(result.draft.obra).toBe("Solicitud comercial");
    expect(result.draft.clienteTelefono).toBe("");
    expect(result.showStep1MoreData).toBe(false);
  });
});
