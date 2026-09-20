/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";

import { FabricacionLineMobileDetail } from "@/features/fabricacion/components/mobile/fabricacion-line-mobile-detail";
import { crearBaseTipologicaVentora } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

const template = {
  id: 12,
  nombre: "Línea 20",
  catalogKey: "ventora:l20",
  proveedor: "Sodal",
  isActive: true,
  unidadCobro: "m2",
  precioM2Sugerido: 45000,
  minimoCobrable: 0,
} as CotizacionLineTemplate;

function recipe(status: FabricationRecipeRecord["status"]): FabricationRecipeRecord {
  const definition = crearBaseTipologicaVentora({
    tipologia: "corredera",
    hojas: 2,
    modulos: 2,
    lineName: "Línea 20",
  });
  return {
    id: "r1",
    organizationId: 1,
    scope: "organization",
    lineTemplateId: 12,
    providerName: "Sodal",
    lineName: "Línea 20",
    typology: "corredera",
    leavesCount: 2,
    variant: "estandar",
    version: 1,
    status,
    definition,
    sourceType: "manual",
    sourceReference: null,
    sourceName: null,
    sourceRevision: null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("FabricacionLineMobileDetail", () => {
  it("pide configurar cuando no hay receta y no ofrece probar", () => {
    render(
      <FabricacionLineMobileDetail
        template={template}
        currentRecipe={null}
        olderRecipes={[]}
        error={null}
        feedback={null}
        isSaving={false}
        onConfigure={() => undefined}
        onEdit={() => undefined}
        onTest={() => undefined}
      />
    );
    expect(screen.getByRole("button", { name: "Configurar fabricación" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Probar con medidas" })).not.toBeInTheDocument();
    expect(screen.getByText("Sin configurar")).toBeInTheDocument();
  });

  it("presenta L25 como línea completa y no como una sola variante", () => {
    const l25Template = {
      ...template,
      id: 207,
      nombre: "Serie 25",
      catalogKey: "ventora:l25",
    } as CotizacionLineTemplate;
    const l25Recipe = {
      ...recipe("validated"),
      lineName: "L25",
      leavesCount: 3,
      variant: "dvh_open_reinforced",
      sourceReference: "zeta:confirmed:sodal/l25/dvh_pierna_abierta_reforzada_3h",
      definition: {
        ...recipe("validated").definition,
        identidad: {
          ...recipe("validated").definition.identidad,
          hojas: 3,
          variante: "dvh_open_reinforced",
        },
      },
    };

    render(
      <FabricacionLineMobileDetail
        template={l25Template}
        currentRecipe={l25Recipe}
        lineRecipes={[l25Recipe]}
        olderRecipes={[]}
        error={null}
        feedback={null}
        isSaving={false}
        onConfigure={() => undefined}
        onEdit={() => undefined}
        onTest={() => undefined}
      />
    );

    expect(screen.getByText("Corredera L25 lista para cotizar")).toBeInTheDocument();
    expect(
      screen.getByText(/No es solo una variante: eliges construcción en el primer paso/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Descuentos editables por variante")).toBeInTheDocument();
    expect(
      screen.queryByText(/L25 Corredera 3 hojas · DVH · Pierna abierta · Reforzada/i)
    ).not.toBeInTheDocument();
  });

  it("ofrece revisar y probar cuando existe receta guardada", () => {
    render(
      <FabricacionLineMobileDetail
        template={template}
        currentRecipe={recipe("draft")}
        olderRecipes={[]}
        error={null}
        feedback={null}
        isSaving={false}
        onConfigure={() => undefined}
        onEdit={() => undefined}
        onTest={() => undefined}
      />
    );
    expect(screen.getByRole("button", { name: "Revisar fabricación" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Probar con medidas" })).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });
});
