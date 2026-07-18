import { createCotizacionLineTemplatesService } from "../cotizacion-line-templates.service";
import { buildTechnicalLineTemplateImportPreview } from "../line-template-technical-import.service";
import { buildTechnicalLineNombre } from "../line-template-pdf-technical.service";
import type {
  CotizacionLineTemplate,
  CreateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

function makeTemplate(
  overrides: Partial<CotizacionLineTemplate> = {}
): CotizacionLineTemplate {
  return {
    id: 1,
    organizationId: 10,
    nombre: "Linea existente",
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: null,
    costoBase: 40000,
    precioM2Sugerido: 120000,
    minimoCobrable: 50000,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {},
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
    ...overrides,
  };
}

describe("cotizacionLineTemplatesService.importTemplates", () => {
  it("debe persistir lineas tecnicas con precio 0 y needsCommercialPrice", async () => {
    const created: CreateCotizacionLineTemplateInput[] = [];
    const preview = buildTechnicalLineTemplateImportPreview({
      lines: [
        {
          lineCode: "15",
          nombre: buildTechnicalLineNombre("15", "Ventana corredera"),
          descripcion: "Ventana corredera",
          tipoComponente: "Ventana corredera",
          categoria: "aluminio",
          profiles: [{ code: "1501", label: "RIEL SUPERIOR" }],
          pageNumbers: [6],
          vidrioResumen: null,
          anchoMarco: "70 mm",
        },
        {
          lineCode: "90",
          nombre: buildTechnicalLineNombre("90", "Mampara de cristal"),
          descripcion: "Mampara de cristal",
          tipoComponente: "Mampara de cristal",
          categoria: "vidrio",
          profiles: [{ code: "9001", label: "PERFIL VIDRIO" }],
          pageNumbers: [12],
          vidrioResumen: "Templado 8 mm",
          anchoMarco: null,
        },
      ],
      existingTemplates: [],
      manufacturer: "Arquetipo",
      templateId: "arquetipo_aluminio",
    });

    const service = createCotizacionLineTemplatesService({
      repository: {
        listByOrganizationId: async () => [],
        getById: async () => null,
        create: async (input) => {
          created.push(input);
          return makeTemplate({
            id: created.length,
            nombre: input.nombre,
            categoria: input.categoria ?? "aluminio",
            material: input.material,
            precioM2Sugerido: input.precioM2Sugerido,
            catalogMetadata: input.catalogMetadata ?? {},
          });
        },
        update: async () => {
          throw new Error("no deberia actualizar");
        },
        softDelete: async () => undefined,
      },
    });

    const payloads = preview
      .map((row) => row.payload)
      .filter((payload): payload is NonNullable<typeof payload> => Boolean(payload));

    const result = await service.importTemplates(10, payloads, { duplicateMode: "skip" });

    expect(result.created).toBe(2);
    expect(result.failed).toBe(0);
    expect(created).toHaveLength(2);
    expect(created[0]?.precioM2Sugerido).toBe(0);
    expect(created[0]?.catalogMetadata.needsCommercialPrice).toBe(true);
    expect(created[1]?.categoria).toBe("vidrio");
    expect(created[1]?.precioM2Sugerido).toBe(0);
    expect(created[1]?.catalogMetadata.needsCommercialPrice).toBe(true);
  });

  it("debe preservar precio comercial al actualizar duplicado tecnico con precio 0", async () => {
    const existing = makeTemplate({
      id: 7,
      nombre: "Linea 15 - Ventana corredera",
      precioM2Sugerido: 150000,
      costoBase: 80000,
      minimoCobrable: 60000,
    });
    let updatedPayload: CreateCotizacionLineTemplateInput | null = null;

    const preview = buildTechnicalLineTemplateImportPreview({
      lines: [
        {
          lineCode: "15",
          nombre: existing.nombre,
          descripcion: "Ventana corredera",
          tipoComponente: "Ventana corredera",
          categoria: "aluminio",
          profiles: [{ code: "1501", label: "RIEL SUPERIOR" }],
          pageNumbers: [6],
          vidrioResumen: null,
          anchoMarco: "70 mm",
        },
      ],
      existingTemplates: [existing],
      manufacturer: "Arquetipo",
    });

    const service = createCotizacionLineTemplatesService({
      repository: {
        listByOrganizationId: async () => [existing],
        getById: async () => existing,
        create: async () => {
          throw new Error("no deberia crear");
        },
        update: async (_id, _organizationId, input) => {
          updatedPayload = input as CreateCotizacionLineTemplateInput;
          return makeTemplate({
            ...existing,
            ...input,
            catalogMetadata: input.catalogMetadata ?? existing.catalogMetadata,
          });
        },
        softDelete: async () => undefined,
      },
    });

    const payloads = preview
      .map((row) => row.payload)
      .filter((payload): payload is NonNullable<typeof payload> => Boolean(payload));

    const result = await service.importTemplates(10, payloads, { duplicateMode: "update" });

    expect(result.updated).toBe(1);
    expect(result.failed).toBe(0);
    expect(updatedPayload?.precioM2Sugerido).toBe(150000);
    expect(updatedPayload?.costoBase).toBe(80000);
    expect(updatedPayload?.minimoCobrable).toBe(60000);
    expect(updatedPayload?.catalogMetadata.needsCommercialPrice).toBeUndefined();
    expect(updatedPayload?.catalogMetadata.technicalProfileCount).toBe(1);
  });

  it("debe completar precio de linea tecnica al importar Excel aunque el modo sea skip", async () => {
    const existing = makeTemplate({
      id: 7,
      nombre: "Linea 15 - Ventana corredera",
      precioM2Sugerido: 0,
      catalogMetadata: {
        catalogSource: "pdf_technical",
        technicalLineCode: "15",
        needsCommercialPrice: true,
        technicalProfileCodes: "1501:RIEL",
      },
    });
    let updatedPayload: CreateCotizacionLineTemplateInput | null = null;

    const service = createCotizacionLineTemplatesService({
      repository: {
        listByOrganizationId: async () => [existing],
        getById: async () => existing,
        create: async () => {
          throw new Error("no deberia crear");
        },
        update: async (_id, _organizationId, input) => {
          updatedPayload = input as CreateCotizacionLineTemplateInput;
          return makeTemplate({
            ...existing,
            ...input,
            catalogMetadata: input.catalogMetadata ?? existing.catalogMetadata,
            precioM2Sugerido: input.precioM2Sugerido ?? existing.precioM2Sugerido,
          });
        },
        softDelete: async () => undefined,
      },
    });

    const result = await service.importTemplates(
      10,
      [
        {
          nombre: "15",
          material: "Aluminio",
          precioM2Sugerido: 145000,
          costoBase: 70000,
          catalogMetadata: {},
        },
      ],
      { duplicateMode: "skip" }
    );

    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(updatedPayload?.nombre).toBe("Linea 15 - Ventana corredera");
    expect(updatedPayload?.precioM2Sugerido).toBe(145000);
    expect(updatedPayload?.catalogMetadata.technicalLineCode).toBe("15");
    expect(updatedPayload?.catalogMetadata.technicalProfileCodes).toBe("1501:RIEL");
    expect(updatedPayload?.catalogMetadata.needsCommercialPrice).toBeUndefined();
  });

  it("debe rechazar cristal comercial sin precio", async () => {
    const service = createCotizacionLineTemplatesService({
      repository: {
        listByOrganizationId: async () => [],
        getById: async () => null,
        create: async () => {
          throw new Error("no deberia crear");
        },
        update: async () => {
          throw new Error("no deberia actualizar");
        },
        softDelete: async () => undefined,
      },
    });

    const result = await service.importTemplates(
      10,
      [
        {
          nombre: "Cristal 6 mm",
          categoria: "vidrio",
          material: "Cristal",
          precioM2Sugerido: 0,
        },
      ],
      { duplicateMode: "skip" }
    );

    expect(result.created).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toMatch(/precio por m2 del cristal/i);
  });
});
