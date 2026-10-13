import { mergeCanonicalProfileApplicationGroups } from "@/features/cotizaciones/line-templates/types/line-profile-references";
import type { LineProfileReference } from "@/features/cotizaciones/line-templates/types/line-profile-references";

function reference(input: Partial<LineProfileReference> & Pick<LineProfileReference, "code" | "name">): LineProfileReference {
  return {
    code: input.code,
    name: input.name,
    role: input.role ?? "Perfil",
    description: input.description ?? null,
    provider: input.provider ?? null,
    source: input.source ?? null,
    codeStatus: input.codeStatus ?? "catalog_reference",
    ...(input.applicationGroup ? { applicationGroup: input.applicationGroup } : {}),
  };
}

describe("mergeCanonicalProfileApplicationGroups", () => {
  it("enriquece referencias antiguas por código y conserva grupos del taller", () => {
    const stored = [
      reference({ code: "KOM 804", name: "Hoja 804" }),
      reference({ code: "KOM 815", name: "Puerta propia", applicationGroup: "Puerta especial" }),
      reference({ code: "KOM 801", name: "Marco" }),
    ];
    const canonical = [
      reference({ code: "KOM 804", name: "Hoja ventana", applicationGroup: "Ventanas correderas" }),
      reference({ code: "KOM 815", name: "Hoja puerta", applicationGroup: "Puertas correderas" }),
    ];

    const merged = mergeCanonicalProfileApplicationGroups(stored, canonical);
    expect(merged[0]).toEqual(expect.objectContaining({ code: "KOM 804", applicationGroup: "Ventanas correderas" }));
    expect(merged[1]).toEqual(expect.objectContaining({ code: "KOM 815", applicationGroup: "Puerta especial" }));
    expect(merged[2]?.applicationGroup).toBeUndefined();
    expect(stored[0]?.applicationGroup).toBeUndefined();
  });
});
