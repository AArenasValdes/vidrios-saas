import { createCotizacionesAppService } from "../cotizaciones.service";
import type { CotizacionesRepository } from "@/features/cotizaciones/repositories/cotizaciones-repository";
import type { Cotizacion } from "@/features/cotizaciones/types/cotizacion";
import type { CotizacionWorkflowDraft, CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { createQuoteRegionSnapshot } from "@/features/organization-region/services/quote-region-snapshot.service";
import {
  applyGlassSelectionToComponentForm,
  buildItemFromForm,
  mapItemToForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";

const glassCatalog: CotizacionLineTemplate[] = [
  {
    id: 3643,
    organizationId: "org-1",
    nombre: "Float Incoloro 5mm",
    categoria: "vidrio",
    unidadCobro: "m2",
    material: "Cristal",
    vidrioPrincipalRecomendado: null,
    costoBase: 0,
    precioM2Sugerido: 0,
    minimoCobrable: 0,
    redondeoPrecio: 0,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {
      espesorMm: 5,
      categoriaTecnica: "monolitico",
      corteManualEstado: "pending_validation",
      planchaAnchoMm: 2500,
      planchaAltoMm: 1800,
      orientacionCorte: "unknown",
    },
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
  },
];

function quoteItem(item: CotizacionWorkflowItem, physicalId = "row-1") {
  return {
    id: physicalId,
    cotizacionId: "quote-1",
    organizationId: "org-1",
    codigo: item.codigo,
    tipoComponente: item.tipo,
    orden: 0,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    subtotal: item.precioTotal,
    ancho: item.ancho,
    alto: item.alto,
    areaM2: item.areaM2,
    linea: item.lineaComercial,
    color: item.tipo,
    vidrio: item.vidrio,
    nombre: item.nombre,
    actualizadoEn: null,
    eliminadoEn: null,
    descripcion: item.descripcion,
    unidad: item.unidad,
    observaciones: item.observaciones,
    fabricacionSnapshot: item.fabricacionSnapshot ?? null,
    tipoItem: "componente",
    creadoEn: null,
    productTypeId: null,
    systemLineId: null,
    configurationId: null,
    costoUnitario: item.costoProveedorUnitario,
    costoTotal: item.costoProveedorTotal,
    margenPct: item.margenPct,
    utilidad: item.precioTotal - item.costoProveedorTotal,
    breakdown: [],
  };
}

function quoteRecord(item: CotizacionWorkflowItem): Cotizacion {
  return {
    id: "quote-1",
    solicitudId: null,
    proyectoId: null,
    organizationId: "org-1",
    numero: "COT-QA-1",
    estado: "creada",
    descuentoPct: 0,
    flete: 0,
    iva: 0,
    notas: null,
    validoHasta: null,
    subtotalNeto: item.precioTotal,
    costoTotal: item.costoProveedorTotal,
    margenPct: 0,
    utilidadTotal: item.precioTotal - item.costoProveedorTotal,
    pricingMode: "por_item",
    estadoComercial: null,
    approvalToken: "qa-token",
    approvalTokenExpiresAt: null,
    clienteVioEn: null,
    clienteRespondioEn: null,
    clienteRespuestaCanal: null,
    pdfDescargadoEn: null,
    regionalSnapshot: createQuoteRegionSnapshot({ region: { countryCode: "CL" } }),
    fabricacionTrabajoSnapshot: null,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
    items: [quoteItem(item)],
    total: item.precioTotal,
  };
}

function draft(items: CotizacionWorkflowItem[]): CotizacionWorkflowDraft {
  return {
    clienteNombre: "Cliente",
    clienteTelefono: "",
    obra: "",
    direccion: "",
    validez: "",
    descuentoPct: 0,
    flete: 0,
    observaciones: "",
    items,
    quotePricingMode: "por_item",
  };
}

describe("cotizaciones service glass persistence", () => {
  it("does not create a project when editing a projectless legacy quote with the fallback title", async () => {
    const item = {
      id: "row-1",
      codigo: "V1",
      tipo: "Ventana",
      lineaComercial: "",
      vidrio: "Vidrio pendiente",
      nombre: "Ventana QA",
      descripcion: "",
      ancho: 1200,
      alto: 1000,
      cantidad: 1,
      unidad: "unidad",
      areaM2: 1.2,
      costoProveedorUnitario: 100000,
      costoProveedorTotal: 100000,
      margenPct: 0,
      precioUnitario: 100000,
      precioTotal: 100000,
      precioPorM2: null,
      minimoCobrable: null,
      redondeoPrecio: null,
      precioPlantillaSugerido: null,
      precioAjustadoManual: false,
      origenPrecio: "manual",
      observaciones: encodeCotizacionItemPresentationMeta({}),
    } as CotizacionWorkflowItem;
    let persisted = quoteRecord(item);
    const client = { id: 10, nombre: "Cliente existente" };
    const cotizacionesRepository = {
      getById: jest.fn(async () => persisted),
      update: jest.fn(async (_id, input) => {
        persisted = { ...persisted, ...input } as Cotizacion;
        return persisted;
      }),
    } as unknown as CotizacionesRepository;
    const clientsRepository = {
      getById: jest.fn(async () => client),
      update: jest.fn(async () => client),
    };
    const projectsRepository = {
      create: jest.fn(),
      findByTitleAndClientId: jest.fn(),
    };
    const service = createCotizacionesAppService({
      cotizacionesRepository,
      clientesRepository: clientsRepository as never,
      projectsRepository: projectsRepository as never,
    });

    const saved = await service.saveWorkflow({
      organizationId: "org-1",
      existingId: "quote-1",
      existingCode: "COT-QA-1",
      existingClientId: 10,
      draft: {
        ...draft([item]),
        clienteNombre: client.nombre,
        obra: "Cotización",
        observaciones: "Nota editada",
      },
      estado: "creada",
    });

    expect(projectsRepository.create).not.toHaveBeenCalled();
    expect(projectsRepository.findByTitleAndClientId).not.toHaveBeenCalled();
    expect(persisted.proyectoId).toBeNull();
    expect(persisted.notas).toBe("Nota editada");
  });

  it("persists, reopens, edits, and changes the catalog glass without duplicate items", async () => {
    const originalItem = {
      id: "row-1",
      codigo: "V1",
      tipo: "Ventana",
      lineaComercial: "",
      vidrio: "Vidrio pendiente",
      nombre: "Ventana QA",
      descripcion: "",
      ancho: 1200,
      alto: 1000,
      cantidad: 3,
      unidad: "unidad",
      areaM2: 1.2,
      costoProveedorUnitario: 100000,
      costoProveedorTotal: 100000,
      margenPct: 0,
      precioUnitario: 100000,
      precioTotal: 100000,
      precioPorM2: null,
      minimoCobrable: null,
      redondeoPrecio: null,
      precioPlantillaSugerido: null,
      precioAjustadoManual: false,
      origenPrecio: "manual",
      observaciones: encodeCotizacionItemPresentationMeta({}),
    } as CotizacionWorkflowItem;
    const initial = quoteRecord(originalItem);

    let persisted = initial;
    const repository = {
      getById: jest.fn(async (id: string | number, organizationId: string | number) => {
        expect(String(id)).toBe("quote-1");
        expect(String(organizationId)).toBe("org-1");
        return persisted;
      }),
      update: jest.fn(async (_id: string | number, input: Parameters<CotizacionesRepository["update"]>[1]) => {
        persisted = {
          ...persisted,
          ...input,
          items: input.items.map((row, index) => quoteItem({
            ...persisted.items[index],
            id: String(index),
            codigo: row.codigo ?? "V1",
            tipo: row.tipoComponente ?? "Ventana",
            lineaComercial: row.linea ?? "",
            vidrio: row.vidrio ?? "",
            nombre: row.nombre ?? "Ventana QA",
            descripcion: row.descripcion ?? "",
            ancho: row.ancho ?? null,
            alto: row.alto ?? null,
            cantidad: row.cantidad,
            unidad: row.unidad ?? "unidad",
            areaM2: row.areaM2 ?? null,
            costoProveedorUnitario: row.costoUnitario ?? 0,
            costoProveedorTotal: row.costoTotal ?? 0,
            margenPct: row.margenPct ?? 0,
            precioUnitario: row.precioUnitario,
            precioTotal: row.subtotal,
            precioPorM2: null,
            minimoCobrable: null,
            redondeoPrecio: null,
            precioPlantillaSugerido: null,
            precioAjustadoManual: false,
            origenPrecio: "manual",
            observaciones: row.observaciones ?? "",
            fabricacionSnapshot: row.fabricacionSnapshot ?? null,
          } as CotizacionWorkflowItem, `physical-${index + 1}`)),
        };
        return persisted;
      }),
    } as unknown as CotizacionesRepository;
    const service = createCotizacionesAppService({ cotizacionesRepository: repository });

    const form = applyGlassSelectionToComponentForm(
      mapItemToForm(originalItem),
      { displayName: "Float Incoloro 5mm", productId: "3643" },
      glassCatalog
    );
    let item = buildItemFromForm(form, [], "row-1");
    const saved = await service.saveWorkflow({
      organizationId: "org-1",
      existingId: "quote-1",
      existingCode: "COT-QA-1",
      draft: draft([item]),
      estado: "creada",
    });

    expect(saved.items).toHaveLength(1);
    expect(saved.items[0]?.cantidad).toBe(3);
    let reopened = await service.getWorkflowById("quote-1", "org-1", { ensureApprovalToken: false });
    expect(reopened?.items).toHaveLength(1);
    expect(reopened?.items[0]?.cantidad).toBe(3);
    expect(mapItemToForm(reopened!.items[0]!).glassTechnicalSpec).toMatchObject({
      productId: "3643",
      thicknessMm: 5,
      manualCutStatus: "pending_validation",
      pieceOrientation: "unknown",
    });
    const logicalComponentId = decodeCotizacionItemPresentationMeta(reopened!.items[0]!.observaciones).logicalComponentId;
    expect(logicalComponentId).toMatch(/^[0-9a-f-]{36}$/i);

    item = buildItemFromForm({ ...mapItemToForm(reopened!.items[0]!), nombre: "Ventana QA editada" }, reopened!.items, reopened!.items[0]!.id);
    await service.saveWorkflow({
      organizationId: "org-1",
      existingId: "quote-1",
      existingCode: "COT-QA-1",
      draft: draft([item]),
      estado: "creada",
    });
    reopened = await service.getWorkflowById("quote-1", "org-1", { ensureApprovalToken: false });
    expect(reopened?.items).toHaveLength(1);
    expect(reopened?.items[0]?.cantidad).toBe(3);
    expect(mapItemToForm(reopened!.items[0]!).vidrioLineTemplateId).toBe("3643");

    const nextProduct = {
      ...glassCatalog[0]!,
      id: 3644,
      nombre: "Float Incoloro 6mm",
      catalogMetadata: { ...glassCatalog[0]!.catalogMetadata, espesorMm: 6 },
    };
    const changedProductForm = applyGlassSelectionToComponentForm(
      mapItemToForm(reopened!.items[0]!),
      { displayName: nextProduct.nombre, productId: "3644" },
      [nextProduct]
    );
    item = buildItemFromForm(changedProductForm, reopened!.items, reopened!.items[0]!.id);
    await service.saveWorkflow({
      organizationId: "org-1",
      existingId: "quote-1",
      existingCode: "COT-QA-1",
      draft: draft([item]),
      estado: "creada",
    });
    reopened = await service.getWorkflowById("quote-1", "org-1", { ensureApprovalToken: false });
    expect(reopened?.items).toHaveLength(1);
    expect(reopened?.items[0]?.cantidad).toBe(3);
    expect(mapItemToForm(reopened!.items[0]!)).toMatchObject({
      vidrio: "Float Incoloro 6mm",
      vidrioLineTemplateId: "3644",
      glassTechnicalSpec: expect.objectContaining({ productId: "3644", thicknessMm: 6 }),
    });
    expect(decodeCotizacionItemPresentationMeta(reopened!.items[0]!.observaciones).logicalComponentId).toBe(logicalComponentId);

    const changedForm = applyGlassSelectionToComponentForm(
      mapItemToForm(reopened!.items[0]!),
      { displayName: "Vidrio personalizado" },
      glassCatalog
    );
    item = buildItemFromForm(changedForm, reopened!.items, reopened!.items[0]!.id);
    await service.saveWorkflow({
      organizationId: "org-1",
      existingId: "quote-1",
      existingCode: "COT-QA-1",
      draft: draft([item]),
      estado: "creada",
    });
    reopened = await service.getWorkflowById("quote-1", "org-1", { ensureApprovalToken: false });
    expect(reopened?.items).toHaveLength(1);
    expect(mapItemToForm(reopened!.items[0]!)).toMatchObject({ vidrioLineTemplateId: "", glassTechnicalSpec: null });
    expect(decodeCotizacionItemPresentationMeta(reopened!.items[0]!.observaciones).logicalComponentId).toBe(logicalComponentId);
  });
});
