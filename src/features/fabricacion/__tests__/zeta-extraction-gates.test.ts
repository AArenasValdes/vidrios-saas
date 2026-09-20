import { extractionBlockingIssues } from "../../../../scripts/zeta/extraction-gates";

describe("gates de confirmación de extracción Zeta", () => {
  it("bloquea warnings, errores de consola y errores de UI", () => {
    const issues = extractionBlockingIssues({
      plan: {
        lineName: "L-25",
        leaves: 2,
        widthMm: 1800,
        heightMm: 1500,
        glazing: "monolitico",
        glassCode: "CTI5",
        profiles: [],
        glass: [],
        hardware: [],
        planText: "Plan",
        planHtml: "<main>Plan</main>",
        warnings: ["La configuración usa una salida parcial."],
      },
      consoleLines: ["[warning] Vue warning", "[pageerror] TypeError"],
      errorText: "No se ha encontrado el producto",
    });

    expect(issues).toEqual([
      "Error bloqueante de Zeta: No se ha encontrado el producto",
      "Advertencia del Plan: La configuración usa una salida parcial.",
      "Consola de Zeta: [warning] Vue warning",
      "Consola de Zeta: [pageerror] TypeError",
    ]);
  });
});
