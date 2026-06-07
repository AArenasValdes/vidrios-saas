import {
  buildPasoDosGrupoSelectionPatch,
  buildPasoDosGrupoComponentForm,
  buildPasoDosGrupoSummary,
  buildStructuredAlcanceDetalleItem,
  createInitialPasoDosGrupoDraft,
  getConfigurationOptionsForSubtype,
  getSubtypeOptionsForCategory,
  getSystemOptionsForSubtype,
  shouldSkipCantidadForGrupoDraft,
  syncDraftTemplatePricing,
} from "../use-paso-dos-agregar-grupo";
import { buildItemFromForm } from "@/features/cotizaciones/new-quote/workflow-ui";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function createDraft(overrides: Record<string, unknown> = {}) {
  return {
    categoria: "Aberturas" as const,
    subtipo: "Ventana",
    hojasBase: 2 as const,
    cantidad: 1,
    usaCantidadPersonalizada: false,
    cantidadPersonalizada: "",
    nombre: "",
    descripcion: "",
    ivaMode: "total_incluye_iva" as const,
    cobraPrecioSeparado: false,
    alcanceDetalles: [],
    pricingMode: "precio_directo" as const,
    material: "Aluminio" as const,
    colorHex: "#a8a8a8",
    sistema: "Corredera",
    configuracion: "",
    sheetScheme: "",
    sheetVariant: "",
    customSchemeDescription: "",
    isCustomScheme: false,
    vidrio: "Incoloro monolitico 5mm",
    lineTemplateId: "",
    referencia: "",
    ancho: "1200",
    alto: "1500",
    precio: "120000",
    precioPorM2: "",
    minimoCobrable: "",
    redondeoPrecio: "1000",
    precioAjustadoManual: false,
    margenPct: "0",
    palilloEnabled: false,
    palilloType: "",
    costInputScope: "group_total" as const,
    ...overrides,
  };
}

describe("use-paso-dos-agregar-grupo helpers", () => {
  it("debe sembrar el flujo desde el formulario actual cuando ya existe contexto", () => {
    const draft = createInitialPasoDosGrupoDraft({
      items: [],
      pricingMode: "margen",
      provider: "",
      seedForm: {
        codigo: "V4",
        tipo: "Puerta",
        material: "Aluminio",
        referencia: "Corredera premium",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        lineTemplateId: "",
        pricingMode: "margen",
        vidrio: "Templado 8mm",
        nombre: "",
        descripcion: "",
        ancho: "1200",
        alto: "2100",
        cantidad: "3",
        costoProveedorUnitario: "180000",
        margenPct: "80",
        precioPorM2: "",
        minimoCobrable: "",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "",
        precioAjustadoManual: false,
        origenPrecio: "margen",
        observaciones: "",
        colorHex: "#a8a8a8",
        loteCantidad: "1",
      },
    });

    expect(draft.categoria).toBe("Aberturas");
    expect(draft.subtipo).toBe("Puerta");
    expect(draft.hojasBase).toBeNull();
    expect(draft.cantidad).toBe(3);
    expect(draft.pricingMode).toBe("margen");
    expect(draft.material).toBe("Aluminio");
    expect(draft.colorHex).toBe("#a8a8a8");
    expect(draft.sistema).toBe("Corredera");
    expect(draft.configuracion).toBe("");
    expect(draft.vidrio).toBe("Templado 8mm");
    expect(draft.ancho).toBe("1200");
    expect(draft.alto).toBe("2100");
    expect(draft.precio).toBe("180000");
    expect(draft.margenPct).toBe("80");
  });

  it("debe construir un solo formulario compatible con la UI actual", () => {
    const form = buildPasoDosGrupoComponentForm({
      items: [],
      pricingMode: "margen",
      provider: "",
      draft: createDraft({
        cantidad: 4,
      }),
    });

    expect(form.tipo).toBe("Ventana");
    expect(form.hojasBase).toBe(2);
    expect(form.cantidad).toBe("4");
    expect(form.loteCantidad).toBe("1");
    expect(form.referencia).toBe("Corredera");
    expect(form.pricingMode).toBe("precio_directo");
    expect(form.colorHex).toBe("#a8a8a8");
    expect(form.margenPct).toBe("0");
    expect(form.vidrio.toLowerCase()).toContain("incoloro");
    expect(form.vidrio).toContain("5mm");
    expect(form.ancho).toBe("1200");
    expect(form.alto).toBe("1500");
    expect(form.costoProveedorUnitario).toBe("120000");
  });

  it("debe mostrar valor total sugerido por línea y guardar unitario correcto", () => {
    const draft = createDraft({
      cantidad: 3,
      ancho: "1500",
      alto: "2000",
      referencia: "L25",
      precioPorM2: "75000",
      minimoCobrable: "45000",
      redondeoPrecio: "1000",
      precio: "75000",
    });
    const syncedVisibleDraft = syncDraftTemplatePricing(draft);

    expect(syncedVisibleDraft.precio).toBe("675000");

    const form = buildPasoDosGrupoComponentForm({
      items: [],
      pricingMode: "precio_directo",
      provider: "",
      draft: syncedVisibleDraft,
    });
    const item = buildItemFromForm(form, [], null);

    expect(form.costoProveedorUnitario).toBe("225000");
    expect(item.precioUnitario).toBe(225000);
    expect(item.precioTotal).toBe(675000);
  });

  it("debe respetar precio manual sin línea como total del grupo", () => {
    const form = buildPasoDosGrupoComponentForm({
      items: [],
      pricingMode: "precio_directo",
      provider: "",
      draft: createDraft({
        cantidad: 3,
        referencia: "",
        precioPorM2: "",
        precio: "450000",
        precioAjustadoManual: true,
        origenPrecio: "manual",
        costInputScope: "group_total",
      }),
    });
    const item = buildItemFromForm(form, [], null);
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones);

    expect(form.pricingMode).toBe("precio_directo");
    expect(form.costoProveedorUnitario).toBe("450000");
    expect(item.cantidad).toBe(3);
    expect(item.costoProveedorUnitario).toBe(150000);
    expect(item.precioUnitario).toBe(150000);
    expect(item.precioTotal).toBe(450000);
    expect(item.precioAjustadoManual).toBe(true);
    expect(meta.encodedCostInputScope).toBe("group_total");
    expect(meta.origenPrecio).toBe("manual");
  });

  it("debe permitir usar una línea solo como referencia y calcular con margen propio", () => {
    const form = buildPasoDosGrupoComponentForm({
      items: [],
      pricingMode: "margen",
      provider: "",
      draft: createDraft({
        cantidad: 2,
        referencia: "L25",
        lineTemplateId: "tpl-l25",
        precioPorM2: "75000",
        minimoCobrable: "45000",
        redondeoPrecio: "1000",
        pricingMode: "margen",
        precio: "100000",
        margenPct: "80",
        precioAjustadoManual: false,
        costInputScope: "unit",
      }),
    });
    const item = buildItemFromForm(form, [], null);
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones);

    expect(form.referencia).toBe("L25");
    expect(form.pricingMode).toBe("margen");
    expect(form.costoProveedorUnitario).toBe("100000");
    expect(form.margenPct).toBe("80");
    expect(item.lineaComercial).toBe("L25");
    expect(item.precioPlantillaSugerido).toBe(135000);
    expect(item.costoProveedorUnitario).toBe(100000);
    expect(item.margenPct).toBe(80);
    expect(item.precioUnitario).toBe(180000);
    expect(item.precioTotal).toBe(360000);
    expect(meta.lineTemplateId).toBe("tpl-l25");
    expect(meta.pricingMode).toBe("margen");
    expect(meta.encodedMargenPct).toBe(80);
    expect(meta.origenPrecio).toBe("margen");
  });

  it("debe persistir sistema y configuracion como metadata compatible con Supabase", () => {
    const form = buildPasoDosGrupoComponentForm({
      items: [],
      pricingMode: "margen",
      provider: "",
      draft: createDraft({
        subtipo: "Paño fijo",
        hojasBase: null,
        cantidad: 2,
        pricingMode: "margen",
        sistema: "Fijo",
        configuracion: "Premium",
        vidrio: "DVH 4+12+4",
        ancho: "1000",
        alto: "1200",
        precio: "90000",
        margenPct: "50",
        costInputScope: "unit",
      }),
    });
    const item = buildItemFromForm(form, [], null);
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones);

    expect(item.tipo).toBe("Paño fijo");
    expect(form.referencia).toBe("Fijo - Premium");
    expect(meta.referencia).toBe("Fijo - Premium");
    expect(item.ancho).toBe(1000);
    expect(item.alto).toBe(1200);
    expect(item.costoProveedorUnitario).toBe(90000);
    expect(item.margenPct).toBe(50);
  });

  it("debe recalcular defaults al cambiar subtipo sin duplicar reglas entre hooks", () => {
    const current = createInitialPasoDosGrupoDraft({
      items: [],
      pricingMode: "margen",
      provider: "",
    });
    const patch = buildPasoDosGrupoSelectionPatch({
      current,
      items: [],
      pricingMode: "margen",
      provider: "",
      subtipo: "Shower door",
    });

    expect(patch.subtipo).toBe("Shower door");
    expect(patch.hojasBase).toBeNull();
    expect(patch.sistema).toBe("Corredera");
    expect(patch.configuracion).toBe("Frontal");
    expect(patch.material).toBe("Aluminio");
    expect(patch.vidrio).toContain("Templado");
  });

  it("debe convertir detalle estructurado en item reutilizable para PDF", () => {
    const item = buildStructuredAlcanceDetalleItem({
      detalle: {
        id: "detalle-1",
        tipo: "estructurado",
        subtipo: "Ventana",
        nombre: "3 ventanas correderas 1500 x 2000",
        cantidad: "3",
        ancho: "1500",
        alto: "2000",
        descripcion: "Con retiro de marco existente",
      },
      items: [],
      provider: "",
    });
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones);

    expect(item.tipo).toBe("Ventana");
    expect(item.nombre).toBe("3 ventanas correderas 1500 x 2000");
    expect(item.cantidad).toBe(3);
    expect(item.ancho).toBe(1500);
    expect(item.alto).toBe(2000);
    expect(item.precioUnitario).toBe(0);
    expect(meta.displayMode).toBe("componente");
  });

  it("debe precargar titulo y fijar cantidad 1 en items libres", () => {
    const current = {
      ...createInitialPasoDosGrupoDraft({
        items: [],
        pricingMode: "margen",
        provider: "",
      }),
      categoria: "Proyecto libre y Mantencion" as const,
      cantidad: 4,
    };
    const patch = buildPasoDosGrupoSelectionPatch({
      current,
      items: [],
      pricingMode: "margen",
      provider: "",
      subtipo: "Trabajo libre / Mantencion",
    });

    expect(patch.nombre).toBe("");
    expect(patch.cantidad).toBe(4);
    expect(shouldSkipCantidadForGrupoDraft({ ...current, subtipo: patch.subtipo })).toBe(false);
  });

  it("debe conservar cantidad en trabajo personalizado de especiales (flujo libre)", () => {
    const current = {
      ...createInitialPasoDosGrupoDraft({
        items: [],
        pricingMode: "margen",
        provider: "",
      }),
      categoria: "Especiales" as const,
      cantidad: 3,
    };
    const patch = buildPasoDosGrupoSelectionPatch({
      current,
      items: [],
      pricingMode: "margen",
      provider: "",
      subtipo: "Trabajo personalizado",
    });

    expect(patch.nombre).toBe("");
    expect(patch.cantidad).toBe(3);
    expect(shouldSkipCantidadForGrupoDraft({ ...current, subtipo: patch.subtipo })).toBe(false);
  });

  it("debe resumir el grupo de forma directa para la confirmacion", () => {
    const summary = buildPasoDosGrupoSummary(
      createDraft({
        cantidad: 4,
        pricingMode: "margen",
        margenPct: "60",
      })
    );

    expect(summary).toContain("4 ventanas");
    expect(summary).toContain("corredera");
    expect(summary).toContain("aluminio");
    expect(summary).toContain("5mm");
  });

  it("debe ofrecer sistemas concretos por subtipo", () => {
    expect(getSubtypeOptionsForCategory("Aberturas")).toEqual([
      "Ventana",
      "Puerta",
      "Paño fijo",
      "Shower door",
    ]);
    expect(getSystemOptionsForSubtype("Ventana")).toEqual([
      "Corredera",
      "Proyectante",
      "Abatible",
      "Oscilobatiente",
    ]);
    expect(getSystemOptionsForSubtype("Ventana 1 hoja")).toEqual(["Fijo"]);
  });

  it("debe separar sistema y configuracion para componentes con variantes", () => {
    expect(getSystemOptionsForSubtype("Paño fijo")).toEqual(["Fijo"]);
    expect(getConfigurationOptionsForSubtype("Paño fijo")).toEqual([
      "Con perfileria",
      "Sin perfileria",
      "Premium",
    ]);
    expect(getSystemOptionsForSubtype("Shower door")).toEqual([
      "Corredera",
      "Batiente",
    ]);
    expect(getConfigurationOptionsForSubtype("Shower door")).toContain("Frontal");
  });
});
