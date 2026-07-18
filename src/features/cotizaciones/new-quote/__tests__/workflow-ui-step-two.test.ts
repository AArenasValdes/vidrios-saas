import {
  applyLineTemplateToComponentForm,
  applyQuickEditDraftStatesToItems,
  buildFreeValueItemFromForm,
  buildItemFromForm,
  buildNextComponentCode,
  buildUpcomingComponentCodes,
  buildSuggestedComponentForm,
  createEmptyFreeValueItemForm,
  filterLineTemplatesForComponent,
  mapRecordToDraft,
  reconcileWorkflowItemsPricing,
  getSheetSchemeOptions,
  getSheetVariantOptions,
  getCompositionSectionLabel,
  GLASS_OPTIONS,
  buildQuickEditDraft,
  resolveWorkflowItemDisplayName,
  shouldRequireProfileMaterialForComponent,
  shouldAutoSelectFirstSheetScheme,
  shouldShowSystemSelectionForComponent,
  isDesktopPieceSystemStepComplete,
  isWorkflowItemEffectivelyComplete,
  shouldShowGuidedComposerEntry,
  syncTemplatePricingInComponentForm,
  validateComponentForm,
  validateFreeValueItemForm,
  type ComponentFormState,
} from "../workflow-ui";
import { getSystemOptionsForComponent } from "../../services/component-catalog.service";
import { calculateComponentItem } from "../../services/cotizaciones-workflow.service";
import type { CotizacionLineTemplate } from "../../line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "../../types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { createDefaultGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

function createLinePricingForm(
  overrides: Partial<ComponentFormState> = {}
): ComponentFormState {
  return {
    codigo: "V1",
    tipo: "Ventana",
    hojasBase: 2,
    material: "Aluminio",
    referencia: "L5000",
    sistema: "Corredera",
    configuracion: "",
    sheetScheme: "2 hojas",
    sheetVariant: "2 móviles",
    customSchemeDescription: "",
    isCustomScheme: false,
    lineTemplateId: "tpl-l5000",
    pricingMode: "precio_directo",
    vidrio: "Incoloro monolitico 5mm",
    nombre: "",
    descripcion: "",
    ancho: "1200",
    alto: "1000",
    cantidad: "1",
    costoProveedorUnitario: "78000",
    margenPct: "0",
    precioPorM2: "65000",
    minimoCobrable: "0",
    redondeoPrecio: "1000",
    precioPlantillaSugerido: "78000",
    precioAjustadoManual: false,
    origenPrecio: "plantilla",
    observaciones: "",
    colorHex: "#a8a8a8",
    loteCantidad: "1",
    mirrorFormat: "single",
    mirrorPaneCount: null,
    mirrorPaneDirection: "vertical",
    mirrorInteriorLine: "fine",
    mirrorCustomPaneCount: "",
    ...overrides,
  };
}

function createBaseItem() {
  return calculateComponentItem({
    id: "item-1",
    codigo: "V1",
    tipo: "Ventana",
    vidrio: "Incoloro monolitico 5mm",
    nombre: "Ventana living",
    descripcion: "Ventana corredera",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    costoProveedorUnitario: 100000,
    margenPct: 50,
    observaciones: "",
  });
}

describe("workflow-ui paso 2", () => {
  it("debe incluir DVH / Termopaneles en orden comercial", () => {
    const dvhGroup = GLASS_OPTIONS.find((group) => group.grupo === "DVH / Termopaneles");

    expect(dvhGroup).toBeDefined();
    expect(dvhGroup?.prefix).toBe("DVH");
    expect(dvhGroup?.items).toEqual([
      "4+9+4",
      "4 + 10 + 4",
      "4 + 10 + 5",
      "5 + 10 + 5",
      "4+12+4",
      "4 Low-E + 12 + 4",
      "4T + 12 + 4T",
      "6+12+4",
      "3+3+9+4",
      "3+3 / 12 / 3+3.",
    ]);
  });

  it("debe incluir catalogo de acrilicos con nombre comercial", () => {
    const acrylicGroup = GLASS_OPTIONS.find((group) => group.grupo === "Acrílicos");

    expect(acrylicGroup).toBeDefined();
    expect(acrylicGroup?.prefix).toBe("Acrílico");
    expect(acrylicGroup?.items).toEqual([
      "Amazonas",
      "Lluvia",
      "Niágara",
      "Semilla Plástico",
      "Liso Transparente",
    ]);
  });

  it("debe usar precio por línea como unitario final en precio directo con cantidad 1", () => {
    const item = buildItemFromForm(createLinePricingForm(), [], null);

    expect(item.areaM2).toBe(1.2);
    expect(item.precioPlantillaSugerido).toBe(78000);
    expect(item.costoProveedorUnitario).toBe(78000);
    expect(item.precioUnitario).toBe(78000);
    expect(item.precioTotal).toBe(78000);
    expect(item.precioAjustadoManual).toBe(false);
    expect(item.origenPrecio).toBe("plantilla");
  });

  it("debe regenerar el nombre comercial cuando cambia el tipo y queda un nombre viejo", () => {
    const item = buildItemFromForm(
      createLinePricingForm({
        codigo: "P1",
        tipo: "Puerta",
        sistema: "Abrir",
        configuracion: "",
        nombre: "Ventana corredera",
        referencia: "",
        vidrio: "",
        ancho: "1500",
        alto: "1946",
        costoProveedorUnitario: "234000",
        precioAjustadoManual: true,
      }),
      [],
      "item-v1"
    );

    expect(item.tipo).toBe("Puerta");
    expect(item.nombre).toContain("Puerta abrir");
    expect(
      resolveWorkflowItemDisplayName({
        tipo: item.tipo,
        nombre: "Ventana corredera",
        codigo: item.codigo,
      })
    ).toBe("Puerta");
  });

  it("debe mantener un nombre comercial personalizado cuando coincide con el tipo", () => {
    const item = buildItemFromForm(
      createLinePricingForm({
        nombre: "Ventana living premium",
      }),
      [],
      null
    );

    expect(item.nombre).toBe("Ventana living premium");
  });

  it("debe calcular el siguiente codigo por tipo de componente", () => {
    const base = createBaseItem();
    const items = [
      { ...base, id: "item-v1", codigo: "V1", tipo: "Ventana" },
      { ...base, id: "item-v2", codigo: "V2", tipo: "Ventana" },
      { ...base, id: "item-b1", codigo: "B1", tipo: "Baranda" },
      { ...base, id: "item-v3", codigo: "V3", tipo: "Ventana" },
      { ...base, id: "item-p1", codigo: "P1", tipo: "Puerta" },
      { ...base, id: "item-f1", codigo: "F1", tipo: "Pano fijo" },
    ];

    expect(buildNextComponentCode(items, "Ventana")).toBe("V4");
    expect(buildNextComponentCode(items, "Puerta")).toBe("P2");
    expect(buildNextComponentCode(items, "Baranda")).toBe("B2");
    expect(buildNextComponentCode(items, "Pano fijo")).toBe("F2");
  });

  it("debe sugerir codigos de lote desde el mayor codigo existente del mismo tipo", () => {
    const base = createBaseItem();
    const items = [
      { ...base, id: "item-v1", codigo: "V1", tipo: "Ventana" },
      { ...base, id: "item-v3", codigo: "V3", tipo: "Ventana" },
      { ...base, id: "item-p1", codigo: "P1", tipo: "Puerta" },
    ];

    expect(buildUpcomingComponentCodes(items, "Ventana", 2)).toEqual(["V4", "V5"]);
    expect(buildUpcomingComponentCodes(items, "Puerta", 2)).toEqual(["P2", "P3"]);
  });

  it("debe mantener unitario por línea y duplicar subtotal cuando cantidad es 2", () => {
    const item = buildItemFromForm(
      createLinePricingForm({
        cantidad: "2",
      }),
      [],
      null
    );

    expect(item.areaM2).toBe(1.2);
    expect(item.cantidad).toBe(2);
    expect(item.precioPlantillaSugerido).toBe(78000);
    expect(item.costoProveedorUnitario).toBe(78000);
    expect(item.precioUnitario).toBe(78000);
    expect(item.precioTotal).toBe(156000);
  });

  it("debe corregir costoProveedorUnitario stale cuando hay línea por m² sin override manual", () => {
    const item = buildItemFromForm(
      createLinePricingForm({
        cantidad: "2",
        costoProveedorUnitario: "39000",
        precioPlantillaSugerido: "39000",
        precioAjustadoManual: false,
      }),
      [],
      null
    );

    expect(item.ancho).toBe(1200);
    expect(item.alto).toBe(1000);
    expect(item.areaM2).toBe(1.2);
    expect(item.cantidad).toBe(2);
    expect(item.precioPorM2).toBe(65000);
    expect(item.minimoCobrable).toBe(0);
    expect(item.redondeoPrecio).toBe(1000);
    expect(item.precioPlantillaSugerido).toBe(78000);
    expect(item.costoProveedorUnitario).toBe(78000);
    expect(item.precioUnitario).toBe(78000);
    expect(item.precioTotal).toBe(156000);
    expect(item.precioAjustadoManual).toBe(false);
    expect(item.origenPrecio).toBe("plantilla");
  });

  it("debe respetar costoProveedorUnitario stale si fue override manual", () => {
    const item = buildItemFromForm(
      createLinePricingForm({
        cantidad: "2",
        costoProveedorUnitario: "39000",
        precioPlantillaSugerido: "78000",
        precioAjustadoManual: true,
        origenPrecio: "manual",
      }),
      [],
      null
    );

    expect(item.precioPlantillaSugerido).toBe(78000);
    expect(item.costoProveedorUnitario).toBe(39000);
    expect(item.precioUnitario).toBe(39000);
    expect(item.precioTotal).toBe(78000);
    expect(item.precioAjustadoManual).toBe(true);
    expect(item.origenPrecio).toBe("manual");
  });

  it("debe recalcular subtotal al cambiar cantidad sin cambiar el unitario por línea", () => {
    const unitario = buildItemFromForm(createLinePricingForm(), [], null);
    const duplicado = buildItemFromForm(
      createLinePricingForm({
        cantidad: "2",
        costoProveedorUnitario: String(unitario.costoProveedorUnitario),
      }),
      [],
      null
    );

    expect(unitario.precioUnitario).toBe(78000);
    expect(unitario.precioTotal).toBe(78000);
    expect(duplicado.precioUnitario).toBe(78000);
    expect(duplicado.precioTotal).toBe(156000);
  });

  it("debe mantener precio al cambiar esquema u hojas visuales", () => {
    const dosHojas = buildItemFromForm(createLinePricingForm(), [], null);
    const tresHojas = buildItemFromForm(
      createLinePricingForm({
        hojasBase: 2,
        sheetScheme: "3 hojas",
        sheetVariant: "2 móviles + 1 fija",
      }),
      [],
      null
    );

    expect(dosHojas.precioUnitario).toBe(78000);
    expect(dosHojas.precioTotal).toBe(78000);
    expect(tresHojas.precioUnitario).toBe(78000);
    expect(tresHojas.precioTotal).toBe(78000);
  });

  it("debe mantener comportamiento con margen sin forzar precio por m²", () => {
    const item = buildItemFromForm(
      createLinePricingForm({
        pricingMode: "margen",
        costoProveedorUnitario: "100000",
        margenPct: "50",
        precioAjustadoManual: false,
        origenPrecio: "margen",
      }),
      [],
      null
    );

    expect(item.precioPlantillaSugerido).toBe(78000);
    expect(item.costoProveedorUnitario).toBe(100000);
    expect(item.margenPct).toBe(50);
    expect(item.precioUnitario).toBe(150000);
    expect(item.precioTotal).toBe(150000);
  });

  it("debe calcular margen 100% con cantidad 2 sin usar precio por m²", () => {
    const item = buildItemFromForm(
      createLinePricingForm({
        pricingMode: "margen",
        costoProveedorUnitario: "50000",
        margenPct: "100",
        cantidad: "2",
        precioAjustadoManual: false,
        origenPrecio: "margen",
      }),
      [],
      null
    );

    expect(item.precioPlantillaSugerido).toBe(78000);
    expect(item.precioUnitario).toBe(100000);
    expect(item.precioTotal).toBe(200000);
  });

  it("debe reconciliar items stale al duplicar o hidratar desde record", () => {
    const staleItem = calculateComponentItem({
      id: "item-stale",
      codigo: "V1",
      tipo: "Ventana",
      lineaComercial: "L5000",
      vidrio: "Incoloro monolitico 5mm",
      nombre: "Ventana living",
      descripcion: "",
      ancho: 1200,
      alto: 1000,
      cantidad: 2,
      costoProveedorUnitario: 39000,
      margenPct: 0,
      precioPorM2: 65000,
      minimoCobrable: 0,
      redondeoPrecio: 1000,
      precioPlantillaSugerido: 39000,
      precioAjustadoManual: false,
      origenPrecio: "plantilla",
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#a8a8a8",
        referencia: "L5000",
        sistema: "Corredera",
        material: "Aluminio",
        pricingMode: "precio_directo",
        precioPorM2: 65000,
        minimoCobrable: 0,
        redondeoPrecio: 1000,
        precioPlantillaSugerido: 39000,
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
        raw: "",
      }),
    });

    const record = {
      id: "cot-1",
      codigo: "COT-1",
      clientId: null,
      projectId: null,
      clienteNombre: "Cliente",
      clienteTelefono: "",
      obra: "Obra",
      direccion: "",
      validez: "15 dias",
      descuentoPct: 0,
      observaciones: "",
      estado: "creada" as const,
      approvalToken: null,
      approvalTokenExpiresAt: null,
      clienteVioEn: null,
      clienteRespondioEn: null,
      clienteRespuestaCanal: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      items: [staleItem],
      subtotal: staleItem.precioTotal,
      descuentoValor: 0,
      neto: staleItem.precioTotal,
      iva: 0,
      flete: 0,
      total: staleItem.precioTotal,
      quotePricingMode: "por_item" as const,
      costoTotalFabricacion: 0,
      margenGlobalPct: 100,
      utilidadTotal: 0,
      totalClienteManual: null,
      mostrarIva: true,
    };

    const draft = mapRecordToDraft(record);
    const [reconciled] = draft.items;

    expect(reconciled.precioUnitario).toBe(78000);
    expect(reconciled.precioTotal).toBe(156000);
    expect(
      reconcileWorkflowItemsPricing([staleItem], "por_item")[0].precioTotal
    ).toBe(156000);
  });

  it("conserva precio manual al reconciliar items con precio ajustado", () => {
    const manualItem: CotizacionWorkflowItem = {
      ...createBaseItem(),
      id: "item-manual",
      precioUnitario: 1520000,
      precioTotal: 1520000,
      costoProveedorUnitario: 760000,
      costoProveedorTotal: 760000,
      margenPct: 50,
      precioAjustadoManual: true,
      origenPrecio: "manual",
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#a8a8a8",
        material: "Aluminio",
        referencia: "L5000",
        sistema: "Corredera",
        pricingMode: "precio_directo",
        precioPorM2: 65000,
        precioAjustadoManual: true,
        origenPrecio: "manual",
        raw: "",
      }),
    };

    const [reconciled] = reconcileWorkflowItemsPricing([manualItem], "por_item");

    expect(reconciled.precioUnitario).toBe(1520000);
    expect(reconciled.precioTotal).toBe(1520000);
    expect(reconciled.precioAjustadoManual).toBe(true);
  });

  it("conserva precio manual al aplicar borradores rapidos sincronizados", () => {
    const manualItem: CotizacionWorkflowItem = {
      ...createBaseItem(),
      id: "item-manual",
      precioUnitario: 171429,
      precioTotal: 171429,
      costoProveedorUnitario: 120000,
      costoProveedorTotal: 120000,
      margenPct: 30,
      precioAjustadoManual: true,
      origenPrecio: "manual",
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#a8a8a8",
        material: "Aluminio",
        referencia: "L5000",
        sistema: "Corredera",
        pricingMode: "precio_directo",
        precioPorM2: 65000,
        precioAjustadoManual: true,
        origenPrecio: "manual",
        raw: "",
      }),
    };

    const [actualizado] = applyQuickEditDraftStatesToItems(
      [manualItem],
      {
        [manualItem.id]: {
          ancho: "1222",
          alto: "1222",
          costoProveedorUnitario: "120000",
        },
      },
      "por_item"
    );

    expect(actualizado.precioUnitario).toBe(171429);
    expect(actualizado.precioTotal).toBe(171429);
  });

  it("debe aplicar borradores rapidos y recalcular el item editado", () => {
    const item = createBaseItem();

    const [actualizado] = applyQuickEditDraftStatesToItems([item], {
      [item.id]: {
        ancho: "1500",
        alto: "1300",
        costoProveedorUnitario: "250000",
      },
    });

    expect(actualizado.ancho).toBe(1500);
    expect(actualizado.alto).toBe(1300);
    expect(actualizado.costoProveedorUnitario).toBe(250000);
    expect(actualizado.precioUnitario).toBe(375000);
    expect(actualizado.precioTotal).toBe(375000);
    expect(actualizado.areaM2).toBe(1.95);
  });

  it("debe crear item libre con precio unitario y cantidad 1", () => {
    const item = buildFreeValueItemFromForm(
      {
        ...createEmptyFreeValueItemForm(),
        nombre: "Mantencion de ventanas",
        descripcion: "Ajuste de corredera y limpieza de rieles.",
        valor: "119000",
        cantidad: "1",
        ivaMode: "total_incluye_iva",
      },
      [],
      null
    );

    expect(item.tipoItem).toBe("item_libre_con_valor");
    expect(item.cantidad).toBe(1);
    expect(item.ancho).toBeNull();
    expect(item.alto).toBeNull();
    expect(item.precioUnitario).toBe(119000);
    expect(item.precioTotal).toBe(119000);
    expect(isWorkflowItemEffectivelyComplete(item)).toBe(true);
    expect(applyQuickEditDraftStatesToItems([item], { [item.id]: {
      ancho: "1000",
      alto: "1000",
      costoProveedorUnitario: "1",
    } })).toEqual([item]);
  });

  it("debe multiplicar precio unitario manual por cantidad en item libre", () => {
    const item = buildFreeValueItemFromForm(
      {
        ...createEmptyFreeValueItemForm(),
        nombre: "Cambio de vidrio",
        descripcion: "Vidrio templado 8mm",
        valor: "120000",
        cantidad: "2",
        ivaMode: "total_incluye_iva",
      },
      [],
      null
    );

    expect(item.precioUnitario).toBe(120000);
    expect(item.cantidad).toBe(2);
    expect(item.precioTotal).toBe(240000);
  });

  it("debe conservar modo de IVA de precios finales en item libre", () => {
    const item = buildFreeValueItemFromForm(
      {
        ...createEmptyFreeValueItemForm(),
        nombre: "Trabajo completo",
        descripcion: "Precio final para el cliente.",
        valor: "240000",
        cantidad: "1",
        ivaMode: "total_incluye_iva",
      },
      [],
      null
    );

    const meta = decodeCotizacionItemPresentationMeta(item.observaciones);

    expect(meta.ivaMode).toBe("total_incluye_iva");
    expect(meta.totalClienteVisible).toBe(240000);
    expect(meta.netoCalculado).toBe(201681);
    expect(meta.ivaCalculado).toBe(38319);
  });

  it("debe considerar completo un item libre descriptivo sin precio en total global", () => {
    const item = buildFreeValueItemFromForm(
      {
        ...createEmptyFreeValueItemForm(),
        nombre: "Mantencion de ventanas",
        descripcion: "",
        valor: "0",
        ivaMode: "total_incluye_iva",
      },
      [],
      null,
      { allowZeroValue: true }
    );

    expect(item.precioTotal).toBe(0);
    expect(isWorkflowItemEffectivelyComplete(item, undefined, "total_global")).toBe(true);
    expect(isWorkflowItemEffectivelyComplete(item, undefined, "por_item")).toBe(false);
  });

  it("debe validar nombre y valor del item libre", () => {
    expect(
      validateFreeValueItemForm({
        ...createEmptyFreeValueItemForm(),
        valor: "",
      })
    ).toEqual(
      expect.objectContaining({
        nombre: "Ingresa el nombre del item",
        costoProveedorUnitario: "Ingresa un valor mayor a cero",
      })
    );
  });

  it("debe conservar el item original si el borrador rapido es invalido", () => {
    const item = createBaseItem();

    const [resultado] = applyQuickEditDraftStatesToItems([item], {
      [item.id]: {
        ancho: "1500",
        alto: "1300",
        costoProveedorUnitario: "-10",
      },
    });

    expect(resultado).toEqual(item);
  });

  it("debe considerar completo un item incompleto si el borrador rapido ya lo completa", () => {
    const itemIncompleto = calculateComponentItem({
      id: "item-2",
      codigo: "V2",
      tipo: "Ventana",
      nombre: "Ventana cocina",
      cantidad: 1,
      costoProveedorUnitario: 0,
      margenPct: 50,
    });

    expect(isWorkflowItemEffectivelyComplete(itemIncompleto)).toBe(false);
    expect(buildQuickEditDraft(itemIncompleto)).toEqual({
      ancho: "",
      alto: "",
      costoProveedorUnitario: "",
    });

    expect(
      isWorkflowItemEffectivelyComplete(itemIncompleto, {
        ancho: "900",
        alto: "1100",
        costoProveedorUnitario: "120000",
      })
    ).toBe(true);
  });

  it("debe permitir componentes sin precio por item en modo total global", () => {
    const errors = validateComponentForm(
      {
        codigo: "V1",
        tipo: "Ventana",
        hojasBase: 2,
        material: "Aluminio",
        referencia: "L25",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        lineTemplateId: "",
        pricingMode: "precio_directo",
        vidrio: "Incoloro monolitico 5mm",
        nombre: "",
        descripcion: "",
        ancho: "1500",
        alto: "2000",
        cantidad: "1",
        costoProveedorUnitario: "",
        margenPct: "0",
        precioPorM2: "",
        minimoCobrable: "",
        redondeoPrecio: "",
        precioPlantillaSugerido: "",
        precioAjustadoManual: false,
        origenPrecio: "manual",
        observaciones: "",
        colorHex: "#a8a8a8",
        loteCantidad: "1",
      },
      [],
      null,
      { quotePricingMode: "total_global" }
    );

    expect(errors).toEqual({});
    expect(errors.costoProveedorUnitario).toBeUndefined();
  });

  it("debe marcar ajuste manual cuando una linea con precio automatico cambia el valor final", () => {
    const item = calculateComponentItem({
      id: "item-3",
      codigo: "V3",
      tipo: "Ventana",
      lineaComercial: "Serie 25",
      nombre: "Ventana taller",
      cantidad: 1,
      ancho: 1000,
      alto: 1000,
      costoProveedorUnitario: 145000,
      margenPct: 0,
      precioPorM2: 145000,
      minimoCobrable: 95000,
      redondeoPrecio: 1000,
      precioPlantillaSugerido: 145000,
      precioAjustadoManual: false,
      origenPrecio: "plantilla",
      observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#a8a8a8",
        material: "Aluminio",
        referencia: "Serie 25",
        pricingMode: "precio_directo",
        lineTemplateId: "tpl-25",
        precioPorM2: 145000,
        minimoCobrable: 95000,
        redondeoPrecio: 1000,
        precioPlantillaSugerido: 145000,
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
      }),
    });

    const [actualizado] = applyQuickEditDraftStatesToItems([item], {
      [item.id]: {
        ancho: "1000",
        alto: "1000",
        costoProveedorUnitario: "160000",
      },
    });

    const meta = decodeCotizacionItemPresentationMeta(actualizado.observaciones);

    expect(actualizado.costoProveedorUnitario).toBe(160000);
    expect(actualizado.precioAjustadoManual).toBe(true);
    expect(meta.precioAjustadoManual).toBe(true);
    expect(meta.origenPrecio).toBe("manual");
  });

  it("debe conservar precio manual al cambiar de linea y solo actualizar la sugerencia", () => {
    const actualizado = applyLineTemplateToComponentForm(
      {
        codigo: "V4",
        tipo: "Ventana",
        material: "Aluminio",
        referencia: "Serie manual",
        lineTemplateId: "tpl-old",
        pricingMode: "precio_directo",
        vidrio: "",
        nombre: "",
        descripcion: "",
        ancho: "1200",
        alto: "1000",
        cantidad: "1",
        costoProveedorUnitario: "160000",
        margenPct: "0",
        precioPorM2: "145000",
        minimoCobrable: "95000",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "145000",
        precioAjustadoManual: true,
        origenPrecio: "manual",
        observaciones: "",
        colorHex: "#a8a8a8",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        loteCantidad: "1",
      },
      {
        id: "tpl-new",
        nombre: "Serie 25",
        material: "Aluminio",
        vidrioPrincipalRecomendado: "Templado 8mm",
        precioM2Sugerido: 150000,
        minimoCobrable: 95000,
        redondeoPrecio: 5000,
      }
    );

    expect(actualizado.lineTemplateId).toBe("tpl-new");
    expect(actualizado.referencia).toBe("Serie 25");
    expect(actualizado.vidrio).toBe("Templado 8mm");
    expect(actualizado.costoProveedorUnitario).toBe("160000");
    expect(actualizado.precioAjustadoManual).toBe(true);
    expect(actualizado.origenPrecio).toBe("manual");
    expect(actualizado.precioPlantillaSugerido).toBe("180000");
  });

  it("debe generar nombre comercial con esquema de hojas sin cambiar precio", () => {
    const item = buildItemFromForm(
      {
        codigo: "V1",
        tipo: "Ventana",
        hojasBase: 2,
        material: "Aluminio",
        referencia: "L25",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "3 hojas",
        sheetVariant: "2 móviles + 1 fija",
        customSchemeDescription: "",
        isCustomScheme: false,
        lineTemplateId: "tpl-25",
        pricingMode: "precio_directo",
        vidrio: "Incoloro monolitico 5mm",
        nombre: "",
        descripcion: "",
        ancho: "2400",
        alto: "1200",
        cantidad: "1",
        costoProveedorUnitario: "432000",
        margenPct: "0",
        precioPorM2: "150000",
        minimoCobrable: "0",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "432000",
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
        observaciones: "",
        colorHex: "#a8a8a8",
        loteCantidad: "1",
      },
      [],
      null
    );

    expect(item.nombre).toBe("Ventana corredera 3 hojas, 2 móviles + 1 fija");
    expect(item.precioUnitario).toBe(432000);
    expect(decodeCotizacionItemPresentationMeta(item.observaciones)).toEqual(
      expect.objectContaining({
        sheetScheme: "3 hojas",
        sheetVariant: "2 móviles + 1 fija",
        isCustomScheme: false,
      })
    );
  });

  it("debe exponer composiciones comerciales segun sistema sin abrir variantes tecnicas", () => {
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Corredera" })).toEqual([
      "2 hojas",
      "3 hojas",
      "4 hojas",
      "Personalizado",
    ]);
    expect(getSheetVariantOptions("4 hojas", { tipo: "Ventana", sistema: "Corredera" })).toEqual([
      "2 móviles + 2 fijas",
      "4 móviles",
      "Otro",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Abatible" })).toEqual([
      "1 hoja",
      "2 hojas",
      "1 abatible + 1 fija",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Oscilobatiente" })).toEqual([
      "1 hoja",
      "2 hojas",
      "Oscilobatiente + fijo",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Proyectante" })).toEqual([
      "1 hoja",
      "Proyectante + fijo",
      "Proyectante arriba + fijo abajo",
      "Proyectante abajo + fijo arriba",
      "2 proyectantes",
      "Personalizado",
    ]);
    expect(getSystemOptionsForComponent("Ventana")).toEqual([
      "Corredera",
      "Proyectante",
      "Abatible",
      "Oscilobatiente",
      "Bow Window",
      "Guillotina",
      "Celosía",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Guillotina" })).toEqual([
      "Guillotina simple",
      "Guillotina doble",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Celosía" })).toEqual([
      "Celosía completa",
      "Celosía con paño fijo inferior",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Guillotina" })).not.toContain("2 hojas");
    expect(getSheetSchemeOptions({ tipo: "Ventana", sistema: "Celosía" })).not.toContain("3 hojas");
    expect(getCompositionSectionLabel({ tipo: "Ventana", sistema: "Guillotina" })).toBe(
      "Configuración de guillotina"
    );
    expect(getCompositionSectionLabel({ tipo: "Ventana", sistema: "Celosía" })).toBe(
      "Configuración de celosía"
    );
    expect(shouldAutoSelectFirstSheetScheme({ tipo: "Ventana", sistema: "Guillotina" })).toBe(true);
    expect(shouldAutoSelectFirstSheetScheme({ tipo: "Ventana", sistema: "Corredera" })).toBe(false);
    expect(
      getSheetSchemeOptions({
        tipo: "Ventana",
        sistema: "Bow Window",
        configuracion: "Corredera",
      })
    ).toEqual([
      "Fijos laterales + corredera central 2 hojas",
      "Fijos laterales + corredera central 3 hojas",
      "Corredera central + paños fijos",
      "Corredera + fijo derecho",
      "Corredera + fijo izquierdo",
      "Personalizado",
    ]);
    expect(
      getSheetSchemeOptions({
        tipo: "Ventana",
        sistema: "Bow Window",
        configuracion: "Proyectante",
      })
    ).toEqual([
      "Fijo central + proyectantes laterales",
      "Fijos laterales + proyectante central",
      "1 proyectante + fijos",
      "2 proyectantes + fijos",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Paño fijo", sistema: "Fijo" })).toEqual([
      "1 paño",
      "2 paños",
      "3 paños",
      "Personalizado",
    ]);
    expect(
      getSheetSchemeOptions({
        tipo: "Shower door",
        sistema: "Corredera",
        configuracion: "Frontal",
      })
    ).toEqual(["2 hojas correderas", "1 fija + 1 corredera", "1 fija + 2 correderas"]);
    expect(
      getSheetSchemeOptions({
        tipo: "Shower door",
        sistema: "Batiente",
        configuracion: "Esquinero",
      })
    ).toEqual(["1 puerta + 1 fijo lateral", "2 puertas al vértice"]);
    expect(
      getSheetSchemeOptions({
        tipo: "Shower door",
        sistema: "Fijo / Walk-in",
        configuracion: "En L",
      })
    ).toEqual(["2 paños fijos en L"]);
    expect(getSheetVariantOptions("2 hojas correderas", {
      tipo: "Shower door",
      sistema: "Corredera",
    })).toEqual([]);
    expect(getCompositionSectionLabel({ tipo: "Shower door", sistema: "Corredera" })).toBe(
      "Composición recomendada"
    );
    expect(
      isDesktopPieceSystemStepComplete({
        subtipo: "Shower door",
        sistema: "Corredera",
        configuracion: "Frontal",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        configurationOptionsCount: 3,
      })
    ).toBe(false);
    expect(
      isDesktopPieceSystemStepComplete({
        subtipo: "Shower door",
        sistema: "Corredera",
        configuracion: "Frontal",
        sheetScheme: "2 hojas correderas",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        configurationOptionsCount: 3,
      })
    ).toBe(true);
    expect(shouldShowSystemSelectionForComponent("Paño fijo")).toBe(false);
  });

  it("considera completa la composición cuando hay guidedVisualConfig aunque sheetScheme esté vacío", () => {
    const guided = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1000 });

    expect(
      isDesktopPieceSystemStepComplete({
        subtipo: "Ventana",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        configurationOptionsCount: 0,
        guidedVisualConfig: guided,
      })
    ).toBe(true);

    expect(
      isDesktopPieceSystemStepComplete({
        subtipo: "Ventana",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        configurationOptionsCount: 0,
        guidedVisualConfig: null,
      })
    ).toBe(false);
  });

  it("muestra el constructor solo tras Personalizado o si ya hay composición guiada", () => {
    expect(
      shouldShowGuidedComposerEntry({
        tipo: "Puerta",
        material: "Aluminio",
        configuracion: "1 hoja vaiven",
        sheetScheme: "",
        guidedVisualConfig: null,
      })
    ).toBe(false);

    expect(
      shouldShowGuidedComposerEntry({
        tipo: "Puerta",
        material: "Aluminio",
        configuracion: "Personalizado",
        sheetScheme: "",
        guidedVisualConfig: null,
      })
    ).toBe(true);

    expect(
      shouldShowGuidedComposerEntry({
        tipo: "Ventana",
        material: "Aluminio",
        sistema: "Personalizado",
        configuracion: "",
        sheetScheme: "",
        guidedVisualConfig: null,
      })
    ).toBe(true);

    expect(
      shouldShowGuidedComposerEntry({
        tipo: "Ventana",
        material: "Aluminio",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "Personalizado",
        guidedVisualConfig: null,
      })
    ).toBe(true);

    expect(
      shouldShowGuidedComposerEntry({
        tipo: "Espejo",
        material: "Cristal",
        catalogCategoria: "vidrio",
        configuracion: "Personalizado",
        sheetScheme: "",
        guidedVisualConfig: null,
      })
    ).toBe(false);
  });

  it("no completa el paso sistema con Personalizado sin composición ni descripción", () => {
    expect(
      isDesktopPieceSystemStepComplete({
        subtipo: "Ventana",
        sistema: "Personalizado",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: true,
        configurationOptionsCount: 0,
      })
    ).toBe(false);
  });

  it("completa Personalizado con descripción o con guidedVisualConfig", () => {
    expect(
      isDesktopPieceSystemStepComplete({
        subtipo: "Ventana",
        sistema: "Personalizado",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "2 fijas + 1 corredera",
        isCustomScheme: true,
        configurationOptionsCount: 0,
      })
    ).toBe(true);

    expect(
      isDesktopPieceSystemStepComplete({
        subtipo: "Ventana",
        sistema: "Corredera",
        configuracion: "",
        sheetScheme: "Personalizado",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: true,
        configurationOptionsCount: 0,
        guidedVisualConfig: createDefaultGuidedVisualConfig({
          widthMm: 1200,
          heightMm: 1000,
        }),
      })
    ).toBe(true);
  });

  it("no debe mostrar selector de sistema para vidrio o cristal", () => {
    expect(shouldShowSystemSelectionForComponent("Vidrio / Cristal")).toBe(false);
  });

  it("no debe exigir material de perfil para componentes solo vidrio", () => {
    expect(shouldRequireProfileMaterialForComponent("Espejo")).toBe(false);
    expect(shouldRequireProfileMaterialForComponent("Cubierta de mesa")).toBe(false);
    expect(shouldRequireProfileMaterialForComponent("Vidrio / Cristal")).toBe(false);
    expect(shouldRequireProfileMaterialForComponent("Ventana")).toBe(true);

    const errors = validateComponentForm(
      {
        ...createLinePricingForm(),
        tipo: "Espejo",
        material: "",
        sistema: "Muro",
        configuracion: "Pulido",
      },
      [],
      null
    );

    expect(errors.material).toBeUndefined();
  });

  it("predetermina catalogo de cristal y filtra productos de cristal para componentes solo vidrio", () => {
    const form = buildSuggestedComponentForm({ tipo: "Vidrio / Cristal" });

    expect(form.material).toBe("Cristal");
    expect(form.catalogCategoria).toBe("vidrio");

    const templates = [
      {
        id: "al-1",
        nombre: "Serie 5 mil",
        material: "Aluminio",
        categoria: "aluminio",
        precioM2Sugerido: 80000,
      },
      {
        id: "pvc-1",
        nombre: "Serie 26",
        material: "PVC",
        categoria: "pvc",
        precioM2Sugerido: 100000,
      },
      {
        id: "cr-1",
        nombre: "Cristal templado 10 mm",
        material: "Cristal",
        categoria: "vidrio",
        precioM2Sugerido: 150000,
      },
    ] as unknown as readonly CotizacionLineTemplate[];

    expect(
      filterLineTemplatesForComponent(templates, {
        tipo: "Vidrio / Cristal",
        material: form.material,
        catalogCategoria: form.catalogCategoria,
      }).map((template) => template.nombre)
    ).toEqual(["Cristal templado 10 mm"]);
  });

  it("debe ocultar lineas sin precio comercial en selectores de cotizacion", () => {
    const templates = [
      {
        id: "al-1",
        nombre: "Serie con precio",
        material: "Aluminio",
        categoria: "aluminio",
        precioM2Sugerido: 80000,
      },
      {
        id: "al-2",
        nombre: "Serie tecnica sin precio",
        material: "Aluminio",
        categoria: "aluminio",
        precioM2Sugerido: 0,
        catalogMetadata: { needsCommercialPrice: true },
      },
    ] as unknown as readonly CotizacionLineTemplate[];

    expect(
      filterLineTemplatesForComponent(templates, {
        tipo: "Ventana",
        material: "Aluminio",
      }).map((template) => template.nombre)
    ).toEqual(["Serie con precio"]);
  });

  it("debe generar nombres comerciales para composiciones no correderas sin cambiar precio", () => {
    const item = buildItemFromForm(
      {
        codigo: "V2",
        tipo: "Ventana",
        hojasBase: 2,
        material: "Aluminio",
        referencia: "L25",
        sistema: "Proyectante",
        configuracion: "",
        sheetScheme: "Proyectante + fijo",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        lineTemplateId: "tpl-25",
        pricingMode: "precio_directo",
        vidrio: "Incoloro monolitico 5mm",
        nombre: "",
        descripcion: "",
        ancho: "1200",
        alto: "1000",
        cantidad: "1",
        costoProveedorUnitario: "180000",
        margenPct: "0",
        precioPorM2: "150000",
        minimoCobrable: "0",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "180000",
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
        observaciones: "",
        colorHex: "#a8a8a8",
        loteCantidad: "1",
      },
      [],
      null
    );

    expect(item.nombre).toBe("Ventana proyectante + fijo");
    expect(item.precioUnitario).toBe(180000);
  });

  it("debe generar nombre comercial para Bow Window sin agregar calculo tecnico", () => {
    const item = buildItemFromForm(
      {
        codigo: "V3",
        tipo: "Ventana",
        hojasBase: 2,
        material: "Aluminio",
        referencia: "L25",
        sistema: "Bow Window",
        configuracion: "Batiente / abatible",
        sheetScheme: "2 fijos + 1 abatible",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        lineTemplateId: "tpl-25",
        pricingMode: "precio_directo",
        vidrio: "Incoloro monolitico 5mm",
        nombre: "",
        descripcion: "",
        ancho: "1800",
        alto: "1200",
        cantidad: "1",
        costoProveedorUnitario: "280000",
        margenPct: "0",
        precioPorM2: "150000",
        minimoCobrable: "0",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "280000",
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
        observaciones: "",
        colorHex: "#a8a8a8",
        loteCantidad: "1",
      },
      [],
      null
    );

    expect(item.nombre).toBe("Bow Window batiente/abatible - 2 fijos + 1 abatible");
    expect(item.precioUnitario).toBe(324000);
  });

  it("debe generar nombres comerciales para guillotina y celosia sin duplicar sistema", () => {
    const guillotina = buildItemFromForm(
      createLinePricingForm({
        sistema: "Guillotina",
        sheetScheme: "Guillotina doble",
        sheetVariant: "",
      }),
      [],
      null
    );
    const celosia = buildItemFromForm(
      createLinePricingForm({
        sistema: "Celosía",
        sheetScheme: "Celosía con paño fijo inferior",
        sheetVariant: "",
      }),
      [],
      null
    );

    expect(guillotina.nombre).toBe("Ventana guillotina doble");
    expect(celosia.nombre).toBe("Ventana celosía con paño fijo inferior");
    expect(guillotina.precioUnitario).toBe(78000);
    expect(celosia.precioUnitario).toBe(78000);
  });

  it("debe generar nombre comercial para paño fijo sin sistema de apertura visible", () => {
    const item = buildItemFromForm(
      {
        codigo: "PF1",
        tipo: "Paño fijo",
        hojasBase: 1,
        material: "Aluminio",
        referencia: "L25",
        sistema: "Fijo",
        configuracion: "",
        sheetScheme: "2 paños",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        lineTemplateId: "tpl-25",
        pricingMode: "precio_directo",
        vidrio: "Incoloro monolitico 5mm",
        nombre: "",
        descripcion: "",
        ancho: "1200",
        alto: "1000",
        cantidad: "1",
        costoProveedorUnitario: "180000",
        margenPct: "0",
        precioPorM2: "150000",
        minimoCobrable: "0",
        redondeoPrecio: "1000",
        precioPlantillaSugerido: "180000",
        precioAjustadoManual: false,
        origenPrecio: "plantilla",
        observaciones: "",
        colorHex: "#a8a8a8",
        loteCantidad: "1",
      },
      [],
      null
    );

    expect(item.nombre).toBe("Paño fijo 2 paños");
    expect(item.precioUnitario).toBe(180000);
  });

  it("debe asignar sistema y configuracion validos al cambiar tipo en edicion", () => {
    const ventanaForm = createLinePricingForm({
      tipo: "Ventana",
      codigo: "V1",
      sistema: "Corredera",
      configuracion: "",
      ancho: "1200",
      alto: "1000",
    });

    const puertaForm = buildSuggestedComponentForm({
      items: [],
      tipo: "Puerta",
      current: {
        ...ventanaForm,
        tipo: "Puerta",
        sistema: "",
        configuracion: "",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        nombre: "",
        descripcion: "",
      },
    });

    expect(puertaForm.codigo).toBe("V1");
    expect(puertaForm.tipo).toBe("Puerta");
    expect(getSystemOptionsForComponent("Puerta")).toContain(puertaForm.sistema);
    expect(puertaForm.sistema.trim()).not.toBe("");
    expect(shouldShowSystemSelectionForComponent("Puerta")).toBe(true);

    const savedItem = buildItemFromForm(puertaForm, [], "item-puerta-1");
    expect(savedItem.tipo).toBe("Puerta");
    expect(savedItem.nombre.toLowerCase()).toContain("puerta");
  });

  it("debe recalcular precio por linea al cambiar medidas en edicion", () => {
    const baseForm = createLinePricingForm({
      tipo: "Ventana",
      codigo: "V1",
      referencia: "L25",
      precioPorM2: "75000",
      minimoCobrable: "45000",
      redondeoPrecio: "1000",
      pricingMode: "precio_directo",
      ancho: "1200",
      alto: "1000",
      costoProveedorUnitario: "99000",
      precioAjustadoManual: false,
      origenPrecio: "plantilla",
    });

    const updatedForm = syncTemplatePricingInComponentForm({
      ...baseForm,
      ancho: "2000",
      alto: "1500",
    });

    expect(updatedForm.costoProveedorUnitario).toBe("225000");

    const savedItem = buildItemFromForm(updatedForm, [], "item-v1");
    expect(savedItem.ancho).toBe(2000);
    expect(savedItem.alto).toBe(1500);
    expect(savedItem.precioUnitario).toBe(225000);
  });

  it("debe guardar espejo dividido como un solo item con descripcion comercial y mismo precio total", () => {
    const item = buildItemFromForm(
      createLinePricingForm({
        codigo: "E1",
        tipo: "Espejo",
        sistema: "Muro",
        configuracion: "Pulido",
        sheetScheme: "",
        sheetVariant: "",
        referencia: "Muro - Pulido",
        vidrio: "Espejo 4mm",
        ancho: "3000",
        alto: "870",
        cantidad: "1",
        precioPorM2: "50000",
        costoProveedorUnitario: "131000",
        precioPlantillaSugerido: "131000",
        mirrorFormat: "divided",
        mirrorPaneCount: 6,
        mirrorPaneDirection: "vertical",
        mirrorInteriorLine: "fine",
      }),
      [],
      null
    );
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones);

    expect(item.nombre).toBe("Espejo mural dividido en 6 paños");
    expect(item.descripcion).toContain("Medida total: 3000 x 870 mm");
    expect(item.descripcion).toContain("Medida por paño: 500 x 870 mm aprox.");
    expect(item.cantidad).toBe(1);
    expect(item.precioTotal).toBe(131000);
    expect(meta).toEqual(
      expect.objectContaining({
        mirrorFormat: "divided",
        mirrorPaneCount: 6,
        mirrorPaneDirection: "vertical",
        mirrorInteriorLine: "fine",
      })
    );
  });
});
