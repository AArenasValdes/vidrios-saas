import { fabricacionRecetaSchema } from "../schemas/fabricacion-schemas";
import {
  crearRecetaSodalP2A,
  crearRecetasSodalP2A,
  SODAL_P2A_RECIPE_FACTORIES,
  SODAL_P2A_SOURCE_NAME,
  SODAL_P2A_SOURCE_TYPE,
} from "../fixtures/sodal-p2a-recipes";
import { calcularCubicacionYPauta } from "../services/fabricacion-calculo.service";

const lineName = "P2A";

describe("recetas P2A documentadas por SODAL", () => {
  it("expone siete lineas, valida el contrato y conserva procedencia no taller", () => {
    expect(Object.keys(SODAL_P2A_RECIPE_FACTORIES)).toHaveLength(7);
    expect(SODAL_P2A_SOURCE_TYPE).toBe("manufacturer");
    expect(SODAL_P2A_SOURCE_NAME).toBe("SODAL");

    for (const [catalogKey, factory] of Object.entries(SODAL_P2A_RECIPE_FACTORIES)) {
      const recipes = factory({ lineName });
      expect(recipes.length).toBeGreaterThan(0);
      for (const recipe of recipes) {
        expect(() => fabricacionRecetaSchema.parse(recipe)).not.toThrow();
        expect(recipe.estado).toBe("ejemplo_no_validado");
        expect(recipe.notasValidacion.join(" ")).toMatch(/SODAL|sodal/i);
        expect(recipe.notasValidacion.join(" ")).not.toMatch(/validada por taller|workshop_validated/i);
      }
      expect(catalogKey).toMatch(/^ventora:/);
    }
  });

  it("mantiene variantes independientes y no mezcla codigos", () => {
    const s83 = crearRecetasSodalP2A({ catalogKey: "ventora:multislide-s83-4h", lineName });
    const s83Eight = crearRecetasSodalP2A({ catalogKey: "ventora:multislide-s83-8h", lineName });
    expect(s83[0]?.identidad.hojas).toBe(4);
    expect(s83Eight[0]?.identidad.hojas).toBe(8);
    expect(s83[0]?.perfiles.find((profile) => profile.codigoPerfil === "S834")?.reglaMedida.ajusteMm).toBe(-11);
    expect(s83Eight[0]?.perfiles.find((profile) => profile.codigoPerfil === "S834")?.reglaMedida.ajusteMm).toBe(-7);

    const s33 = crearRecetaSodalP2A({ catalogKey: "ventora:s33-corredera-2h", lineName });
    const s33Rpt = crearRecetaSodalP2A({ catalogKey: "ventora:s33-rpt-corredera-2h", lineName });
    expect(s33.perfiles.map((profile) => profile.codigoPerfil)).toEqual(["3324", "3324", "3308", "3308", "3303"]);
    expect(s33Rpt.perfiles.map((profile) => profile.codigoPerfil)).toEqual(["3324R", "3324R", "3308R", "3308R", "3303"]);

    const mechanical = crearRecetasSodalP2A({ catalogKey: "ventora:serie-4600-puerta-vaiven", lineName })[0];
    const hydraulic = crearRecetasSodalP2A({ catalogKey: "ventora:serie-4600-puerta-vaiven", lineName })[1];
    expect(mechanical?.identidad.tipologia).toBe("puerta_vaiven");
    expect(mechanical?.perfiles.map((profile) => profile.codigoPerfil)).toEqual(["4601", "4603"]);
    expect(hydraulic?.perfiles.map((profile) => profile.codigoPerfil)).toEqual(["4604", "4602"]);

    const serie3200 = crearRecetasSodalP2A({ catalogKey: "ventora:serie-3200-puerta-abatible-1h", lineName });
    expect(serie3200).toHaveLength(2);
    expect(serie3200[0]?.perfiles.map((profile) => profile.codigoPerfil)).not.toContain("3225");
    expect(serie3200[1]?.perfiles.map((profile) => profile.codigoPerfil)).not.toContain("3221");
  });

  it("calcula medidas publicadas y deja formulas lineales como advertencia", () => {
    const recipe = crearRecetaSodalP2A({ catalogKey: "ventora:serie-4800-corredera-2h", lineName });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 2000,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
      variante: recipe.identidad.variante,
    });

    expect(result.perfiles.find((profile) => profile.codigoPerfil === "4804")?.medidaMm).toBe(585);
    expect(result.vidrios[0]).toMatchObject({ anchoMm: 558, altoMm: 1907, cantidadPiezas: 2 });
    expect(result.accesorios.some((accessory) => /Felpa|Burlete/i.test(accessory.nombre))).toBe(false);
    expect(result.advertencias.filter((warning) => warning.codigo === "FORMULA_ACCESORIO_PENDIENTE")).toHaveLength(2);
  });
});
