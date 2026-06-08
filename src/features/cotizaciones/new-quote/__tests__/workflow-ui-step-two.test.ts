import {
  applyLineTemplateToComponentForm,
  applyQuickEditDraftStatesToItems,
  buildFreeValueItemFromForm,
  buildItemFromForm,
  buildSuggestedComponentForm,
  createEmptyFreeValueItemForm,
  mapRecordToDraft,
  reconcileWorkflowItemsPricing,
  getSheetSchemeOptions,
  getSheetVariantOptions,
  GLASS_OPTIONS,
  buildQuickEditDraft,
  resolveWorkflowItemDisplayName,
  shouldShowSystemSelectionForComponent,
  isWorkflowItemEffectivelyComplete,
  syncTemplatePricingInComponentForm,
  validateComponentForm,
  validateFreeValueItemForm,
  type ComponentFormState,
} from "../workflow-ui";
import { getSystemOptionsForComponent } from "../../services/component-catalog.service";
import { calculateComponentItem } from "../../services/cotizaciones-workflow.service";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

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
        sheetVariant: "Fija central",
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
        sheetVariant: "Fija central",
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

    expect(item.nombre).toBe("Ventana corredera 3 hojas, fija central");
    expect(item.precioUnitario).toBe(432000);
    expect(decodeCotizacionItemPresentationMeta(item.observaciones)).toEqual(
      expect.objectContaining({
        sheetScheme: "3 hojas",
        sheetVariant: "Fija central",
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
      "2 fijas + 2 móviles",
      "Todas móviles",
      "Laterales fijas + centrales móviles",
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
      "2 proyectantes",
      "Personalizado",
    ]);
    expect(getSheetSchemeOptions({ tipo: "Paño fijo", sistema: "Fijo" })).toEqual([
      "1 paño",
      "2 paños",
      "3 paños",
      "Personalizado",
    ]);
    expect(shouldShowSystemSelectionForComponent("Paño fijo")).toBe(false);
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
});
