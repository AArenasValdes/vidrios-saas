import { BIBLIOTECA_RECETAS_PRIORIZADAS } from "@/features/fabricacion/fixtures/biblioteca-recetas-sugeridas";
import { contarBloqueosCriticosReceta } from "@/features/fabricacion/services/fabricacion-receta-editor.service";

describe("biblioteca priorizada de fabricacion", () => {
  it("expone las tres plantillas ALAR solo como borradores bloqueados", () => {
    const alar = BIBLIOTECA_RECETAS_PRIORIZADAS.filter(
      (entry) => entry.proveedor === "ALAR"
    );

    expect(alar).toHaveLength(3);
    alar.forEach((entry) => {
      expect(entry.estado).toBe("sugerida");
      const definition = entry.crearDefinicion?.();
      expect(definition).toBeDefined();
      expect(definition?.estado).toBe("ejemplo_no_validado");
      // Códigos vienen sugeridos; siguen siendo borradores editables.
      expect(definition?.perfiles.every((profile) => profile.codigoPerfil.trim())).toBe(
        true
      );
      expect(
        definition?.perfiles.every(
          (profile) =>
            !(profile.datosPendientes ?? []).some((detail) => /codigo/i.test(detail))
        )
      ).toBe(true);
      expect(contarBloqueosCriticosReceta(definition!)).toBe(0);
    });
  });

  it("mantiene SODAL como catalogo reconocido sin formulas ejecutables", () => {
    const sodal = BIBLIOTECA_RECETAS_PRIORIZADAS.filter(
      (entry) => entry.proveedor === "SODAL"
    );

    expect(sodal).toHaveLength(5);
    sodal.forEach((entry) => {
      expect(entry.estado).toBe("reconocida");
      expect(entry.crearDefinicion).toBeNull();
      expect(entry.motivoPendiente).toContain("faltan formulas");
    });
  });
});
