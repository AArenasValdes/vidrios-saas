import { readFileSync } from "node:fs";
import path from "node:path";

import { parsePlanFromText } from "../../../../scripts/zeta/parse-plan";
import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";

type Expected = {
  widthMm: number;
  heightMm: number;
  leaves: number;
  profiles: Array<{
    code: string;
    name: string;
    function: string;
    quantity: number;
    lengthMm: number;
    unit: string;
  }>;
  glass: Array<{
    code: string;
    name: string;
    quantity: number;
    widthMm: number;
    heightMm: number;
    unit: string;
  }>;
  hardware: Array<{
    code: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  warnings: string[];
};

const fixtureId = "monolitico_pierna_abierta_2h_1800x1500";
const planPath = path.join(
  process.cwd(),
  "scripts",
  "zeta",
  "fixtures",
  `${fixtureId}.plan.txt`,
);
const expectedPath = path.join(
  process.cwd(),
  "scripts",
  "zeta",
  "fixtures",
  `${fixtureId}.zeta-expected.json`,
);

function readIndependentExpected(): Expected {
  return JSON.parse(readFileSync(expectedPath, "utf8")) as Expected;
}

function profileKey(value: { code: string; quantity: number; lengthMm: number }) {
  return `${value.code}|${value.quantity}|${value.lengthMm}`;
}

describe("smoke independiente Zeta → Ventora", () => {
  it("compara la captura Zeta independiente conservando orden, unidades y advertencias", () => {
    const expected = readIndependentExpected();
    const plan = parsePlanFromText(readFileSync(planPath, "utf8"));

    expect(plan.widthMm).toBe(expected.widthMm);
    expect(plan.heightMm).toBe(expected.heightMm);
    expect(plan.leaves).toBe(expected.leaves);
    expect(plan.warnings).toEqual(expected.warnings);
    expect(plan.profiles.map((item) => ({
      code: item.code,
      name: item.name,
      quantity: item.quantity,
      lengthMm: item.lengthMm,
      unit: "MM",
    }))).toEqual(expected.profiles.map(({ code, name, quantity, lengthMm, unit }) => ({
      code,
      name,
      quantity,
      lengthMm,
      unit,
    })));
    expect(plan.glass.map((item) => ({ ...item, unit: "MM" }))).toEqual(expected.glass);
    expect(plan.hardware).toEqual(expected.hardware);
  });

  it("repite tres veces el cálculo y compara cubicación/despiece contra la lista Zeta", () => {
    const expected = readIndependentExpected();
    const bundle = buildAllSodalL25Recipes().find(
      (entry) => entry.recipeId === fixtureId,
    );
    expect(bundle).toBeDefined();

    const outputs = [1, 2, 3].map(() =>
      calcularCubicacionYPauta(bundle!.definition, {
        anchoTotalMm: expected.widthMm,
        altoTotalMm: expected.heightMm,
        cantidad: 1,
        hojas: expected.leaves,
        modulos: 1,
        variante: bundle!.identity.variantSlug,
      }),
    );

    expect(outputs[0]).toEqual(outputs[1]);
    expect(outputs[1]).toEqual(outputs[2]);
    expect(outputs[0].calculable).toBe(true);
    expect(outputs[0].perfiles.map((item) => profileKey({
      code: item.codigoPerfil,
      quantity: item.cantidadPiezas,
      lengthMm: item.medidaMm,
    }))).toEqual(expected.profiles.map(profileKey));
    expect(outputs[0].perfiles.map((item) => ({
      code: item.codigoPerfil,
      name: item.nombrePerfil,
      function: item.funcion,
    }))).toEqual(expected.profiles.map((item) => ({
      code: item.code,
      name: item.name,
      function: item.function,
    })));
    expect(outputs[0].vidrios).toHaveLength(expected.glass.length);
    expect(outputs[0].vidrios[0]).toMatchObject({
      cantidadPiezas: expected.glass[0]!.quantity,
      anchoMm: expected.glass[0]!.widthMm,
      altoMm: expected.glass[0]!.heightMm,
    });
    expect(outputs[0].accesorios.map((item) => ({
      code: item.codigo,
      name: item.nombre,
      quantity: item.cantidadUnidades,
    }))).toEqual(expected.hardware.map((item) => ({
      code: item.code,
      name: item.name,
      quantity: item.quantity,
    })));
    expect(bundle!.definition.accesorios.map((item) => ({
      code: item.codigo,
      unit: item.unidad,
    }))).toEqual(expected.hardware.map((item) => ({
      code: item.code,
      unit: item.unit === "PZA" ? "Pz" : item.unit === "M" ? "Mt" : "Tubo",
    })));
    const pauta = construirPautaBarrasFabricacion({
      receta: bundle!.definition,
      resultado: outputs[0],
    });
    const expectedCuts = expected.profiles
      .flatMap((item) => Array.from({ length: item.quantity }, () => ({
        code: item.code,
        lengthMm: item.lengthMm,
      })))
      .sort((left, right) => right.lengthMm - left.lengthMm);
    const actualCuts = pauta.barras
      .flatMap((bar) => bar.cortes)
      .map((cut) => ({ code: cut.codigoPerfil, lengthMm: cut.largoMm }));
    expect(actualCuts).toEqual(expectedCuts);
  });
});
