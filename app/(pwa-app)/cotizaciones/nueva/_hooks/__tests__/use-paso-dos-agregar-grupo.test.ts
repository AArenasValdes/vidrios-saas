import {
  buildPasoDosGrupoSelectionPatch,
  buildPasoDosGrupoComponentForm,
  buildPasoDosGrupoSummary,
  createInitialPasoDosGrupoDraft,
  getConfigurationOptionsForSubtype,
  getSystemOptionsForSubtype,
} from "../use-paso-dos-agregar-grupo";
import { buildItemFromForm } from "@/features/cotizaciones/new-quote/workflow-ui";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

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
      draft: {
        categoria: "Aberturas",
        subtipo: "Ventana",
        hojasBase: 2,
        cantidad: 4,
        usaCantidadPersonalizada: false,
        cantidadPersonalizada: "",
        pricingMode: "precio_directo",
        material: "Aluminio",
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
        margenPct: "0",
      },
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

  it("debe persistir sistema y configuracion como metadata compatible con Supabase", () => {
    const form = buildPasoDosGrupoComponentForm({
      items: [],
      pricingMode: "margen",
      provider: "",
      draft: {
        categoria: "Aberturas",
        subtipo: "Paño fijo",
        hojasBase: null,
        cantidad: 2,
        usaCantidadPersonalizada: false,
        cantidadPersonalizada: "",
        pricingMode: "margen",
        material: "Aluminio",
        colorHex: "#a8a8a8",
        sistema: "Fijo",
        configuracion: "Premium",
        sheetScheme: "",
        sheetVariant: "",
        customSchemeDescription: "",
        isCustomScheme: false,
        vidrio: "DVH 4+12+4",
        lineTemplateId: "",
        referencia: "",
        ancho: "1000",
        alto: "1200",
        precio: "90000",
        precioPorM2: "",
        minimoCobrable: "",
        redondeoPrecio: "1000",
        margenPct: "50",
      },
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

  it("debe resumir el grupo de forma directa para la confirmacion", () => {
    const summary = buildPasoDosGrupoSummary({
      categoria: "Aberturas",
      subtipo: "Ventana",
      hojasBase: 2,
      cantidad: 4,
      usaCantidadPersonalizada: false,
      cantidadPersonalizada: "",
      pricingMode: "margen",
      material: "Aluminio",
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
      margenPct: "60",
    });

    expect(summary).toContain("4 ventanas");
    expect(summary).toContain("corredera");
    expect(summary).toContain("aluminio");
    expect(summary).toContain("5mm");
  });

  it("debe ofrecer sistemas concretos por subtipo", () => {
    expect(getSystemOptionsForSubtype("Ventana")).toEqual([
      "Corredera",
      "Proyectante",
      "Abatible",
      "Oscilobatiente",
    ]);
    expect(getSystemOptionsForSubtype("Ventana 1 hoja")).toEqual([
      "Corredera",
      "Proyectante",
      "Abatible",
      "Oscilobatiente",
    ]);
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
