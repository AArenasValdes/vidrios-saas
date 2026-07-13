import {
  calculateLineTemplatePricing,
  roundToPriceIncrement,
} from "../cotizacion-line-pricing.service";

describe("cotizacion-line-pricing.service", () => {
  it("debe calcular area y precio sugerido redondeado hacia arriba por m²", () => {
    const summary = calculateLineTemplatePricing({
      ancho: 1700,
      alto: 2800,
      cantidad: 2,
      precioM2Sugerido: 145000,
      minimoCobrable: 0,
      redondeoPrecio: 1000,
    });

    expect(summary.areaM2).toBe(4.76);
    expect(summary.areaTotalM2).toBe(9.52);
    expect(summary.precioBaseUnitario).toBe(690200);
    expect(summary.minimoAplicado).toBeNull();
    expect(summary.redondeoAplicado).toBe(800);
    expect(summary.precioUnitarioSugerido).toBe(691000);
    expect(summary.totalSugerido).toBe(1382000);
  });

  it("debe aplicar minimo cobrable cuando supera el valor por area", () => {
    const summary = calculateLineTemplatePricing({
      ancho: 900,
      alto: 800,
      cantidad: 1,
      precioM2Sugerido: 60000,
      minimoCobrable: 95000,
      redondeoPrecio: 1000,
    });

    expect(summary.areaM2).toBe(0.72);
    expect(summary.precioBaseUnitario).toBe(43200);
    expect(summary.minimoAplicado).toBe(95000);
    expect(summary.precioUnitarioSugerido).toBe(95000);
    expect(summary.totalSugerido).toBe(95000);
  });

  it("debe calcular area aunque no exista precio por m2", () => {
    const summary = calculateLineTemplatePricing({
      ancho: 1222,
      alto: 1222,
      cantidad: 1,
      precioM2Sugerido: null,
      minimoCobrable: 0,
      redondeoPrecio: 1000,
    });

    expect(summary.areaM2).toBe(1.49);
    expect(summary.areaTotalM2).toBe(1.49);
    expect(summary.precioUnitarioSugerido).toBeNull();
    expect(summary.motivoNoCalculado).toBe("La línea no tiene un precio por m² válido.");
  });

  it("debe redondear siempre hacia arriba y respetar sin redondeo", () => {
    expect(roundToPriceIncrement(261240, 1000)).toBe(262000);
    expect(roundToPriceIncrement(261760, 1000)).toBe(262000);
    expect(roundToPriceIncrement(261760, 0)).toBe(261760);
    expect(roundToPriceIncrement(152300, 5000)).toBe(155000);
  });
});
