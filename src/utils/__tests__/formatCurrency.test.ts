import { formatCurrency } from "../formatCurrency";

describe("formatCurrency", () => {
  it("debe formatear pesos chilenos por defecto", () => {
    expect(formatCurrency(125000)).toContain("$");
  });

  it("debe respetar locale y moneda configurados", () => {
    expect(formatCurrency(1000, "en-US", "USD")).toBe("$1,000.00");
  });

  it("debe manejar valores cero", () => {
    expect(formatCurrency(0)).toContain("0");
  });
});
