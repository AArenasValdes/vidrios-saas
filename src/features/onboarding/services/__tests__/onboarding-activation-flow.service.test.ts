import {
  buildActivationDemoDraft,
  buildActivationPrintHref,
  buildActivationQuoteSummary,
  buildActivationRealComponentDraft,
  buildActivationRealDraft,
  buildActivationReturnHref,
  finalizeActivationDraftForSave,
  reconcileActivationDraftItems,
  verifyActivationComponentItemPersistence,
  resolveActivationFlowStatus,
  resolvePrintViewerBackNavigation,
  isActivationReplayMode,
  ACTIVATION_DEMO,
} from "@/features/onboarding/services/onboarding-activation-flow.service";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

describe("onboarding-activation-flow.service", () => {
  it("debe redirigir a activacion para admin sin cotizaciones ni cierre previo", () => {
    const status = resolveActivationFlowStatus({
      rol: "admin",
      quoteCount: 0,
      activationRecord: null,
    });

    expect(status.shouldRedirect).toBe(true);
  });

  it("no debe redirigir si la activacion ya se completo", () => {
    const status = resolveActivationFlowStatus({
      rol: "admin",
      quoteCount: 0,
      activationRecord: {
        id: "1",
        organizationId: 1,
        stepKey: "activation_complete",
        estado: "completado",
        completedAt: null,
        completedByUserId: null,
        completionSource: "activation_flow_completed",
        metadataJson: {},
        creadoEn: null,
        actualizadoEn: null,
        eliminadoEn: null,
      },
    });

    expect(status.shouldRedirect).toBe(false);
  });

  it("no debe redirigir si el usuario omitio la guia", () => {
    const status = resolveActivationFlowStatus({
      rol: "admin",
      quoteCount: 0,
      activationRecord: {
        id: "1",
        organizationId: 1,
        stepKey: "activation_complete",
        estado: "omitido",
        completedAt: null,
        completedByUserId: null,
        completionSource: "activation_flow_skipped",
        metadataJson: {},
        creadoEn: null,
        actualizadoEn: null,
        eliminadoEn: null,
      },
    });

    expect(status.shouldRedirect).toBe(false);
  });

  it("no debe redirigir si ya existen cotizaciones", () => {
    const status = resolveActivationFlowStatus({
      rol: "admin",
      quoteCount: 3,
      activationRecord: null,
    });

    expect(status.shouldRedirect).toBe(false);
  });

  it("debe armar borrador demo con componente y medidas", () => {
    const draft = buildActivationDemoDraft();

    expect(draft.clienteNombre).toBe(ACTIVATION_DEMO.clienteNombre);
    expect(draft.obra).toBe(ACTIVATION_DEMO.obra);
    expect(draft.quotePricingMode).toBe("por_item");
    expect(draft.items[0]?.nombre).toBe(ACTIVATION_DEMO.componenteNombre);
    expect(draft.items[0]?.ancho).toBe(ACTIVATION_DEMO.ancho);
    expect(draft.items[0]?.alto).toBe(ACTIVATION_DEMO.alto);
    expect(draft.items[0]?.precioTotal).toBe(ACTIVATION_DEMO.total);
  });

  it("debe armar borrador real por total sin componente tecnico ficticio", () => {
    const draft = buildActivationRealDraft({
      clienteNombre: "Juan",
      tipoTrabajo: "Puerta acceso",
      descripcion: "Puerta de aluminio blanco",
      total: 250000,
    });

    expect(draft.clienteNombre).toBe("Juan");
    expect(draft.obra).toBe("Puerta acceso");
    expect(draft.totalClienteManual).toBe(250000);
    expect(draft.quotePricingMode).toBe("total_global");
    expect(draft.observaciones).toBe("Puerta de aluminio blanco");
    expect(draft.items).toEqual([]);
    expect(draft.mostrarIva).toBe(false);
  });

  it("debe armar borrador real con componente", () => {
    const draft = buildActivationRealComponentDraft({
      clienteNombre: "Juan",
      tipoTrabajo: "Puerta acceso",
      componenteNombre: "Puerta de aluminio blanco",
      ancho: 900,
      alto: 2100,
      cantidad: 1,
      total: 250000,
    });

    expect(draft.quotePricingMode).toBe("por_item");
    expect(draft.items[0]?.precioTotal).toBe(250000);
    expect(draft.items[0]?.tipo).toBe("Puerta");
    expect(draft.items[0]?.ancho).toBe(900);
  });

  it("debe detectar modo replay desde query replay=1", () => {
    expect(isActivationReplayMode("replay=1")).toBe(true);
    expect(isActivationReplayMode("activacion_preview=1")).toBe(true);
    expect(isActivationReplayMode("replay=0")).toBe(false);
  });

  it("debe conservar el precio del borrador demo tras reconcileWorkflowItemsPricing", () => {
    const draft = buildActivationDemoDraft();
    const reconciled = reconcileActivationDraftItems(draft);

    expect(reconciled[0]?.precioUnitario).toBe(ACTIVATION_DEMO.total);
    expect(reconciled[0]?.precioTotal).toBe(ACTIVATION_DEMO.total);
  });

  it("debe conservar datos ingresados en borrador real con componente tras reconcile", () => {
    const draft = buildActivationRealComponentDraft({
      clienteNombre: "Marcos",
      tipoTrabajo: "Puerta",
      componenteNombre: "Puerta patio",
      ancho: 2000,
      alto: 1800,
      cantidad: 2,
      total: 600000,
    });
    const reconciled = reconcileActivationDraftItems(draft);

    expect(reconciled[0]?.nombre).toBe("Puerta patio");
    expect(reconciled[0]?.ancho).toBe(2000);
    expect(reconciled[0]?.alto).toBe(1800);
    expect(reconciled[0]?.cantidad).toBe(2);
    expect(reconciled[0]?.precioTotal).toBe(600000);
    expect(reconciled[0]?.tipo).toBe("Puerta");
  });

  it("debe conservar datos tras reconcile y recarga tipica del guardado", () => {
    const draft = buildActivationRealComponentDraft({
      clienteNombre: "Marcos",
      tipoTrabajo: "Puerta",
      componenteNombre: "Puerta patio",
      ancho: 2000,
      alto: 1800,
      cantidad: 2,
      total: 600000,
    });
    const finalized = finalizeActivationDraftForSave(draft);
    const persisted = verifyActivationComponentItemPersistence(finalized.items[0]!);

    expect(persisted.nombre).toBe("Puerta patio");
    expect(persisted.ancho).toBe(2000);
    expect(persisted.alto).toBe(1800);
    expect(persisted.cantidad).toBe(2);
    expect(persisted.precioTotal).toBe(600000);
    expect(persisted.tipo).toBe("Puerta");
  });

  it("debe armar urls de pdf y retorno para activacion", () => {
    expect(buildActivationPrintHref("cot-1")).toBe(
      "/print/cotizaciones/cot-1?from=activacion"
    );
    expect(buildActivationPrintHref("cot-1", { isReplayMode: true })).toBe(
      "/print/cotizaciones/cot-1?from=activacion&replay=1"
    );
    expect(buildActivationReturnHref("cot-1")).toBe(
      "/activacion?step=result&cotizacion=cot-1"
    );
    expect(
      resolvePrintViewerBackNavigation({
        from: "activacion",
        cotizacionId: "cot-1",
      })
    ).toEqual({
      href: "/activacion?step=result&cotizacion=cot-1",
      label: "Volver a la guia",
    });
  });

  it("debe armar resumen detallado con neto e iva para activacion", () => {
    const record = {
      id: "cot-1",
      codigo: "COT-1",
      clienteNombre: ACTIVATION_DEMO.clienteNombre,
      obra: ACTIVATION_DEMO.obra,
      clienteTelefono: "",
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
      pdfDescargadoEn: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      items: buildActivationDemoDraft().items,
      subtotal: 180000,
      descuentoValor: 0,
      neto: 180000,
      iva: 34200,
      flete: 0,
      total: 215000,
    } satisfies CotizacionWorkflowRecord;

    const summary = buildActivationQuoteSummary(record);

    expect(summary.items).toHaveLength(1);
    expect(summary.items[0]?.precioTotal).toBe(180000);
    expect(summary.items[0]?.detail).toContain("1200 x 1000 mm");
    expect(summary.items[0]?.detail).toContain("Linea Corredera");
    expect(summary.neto).toBe(180000);
    expect(summary.iva).toBe(34200);
    expect(summary.total).toBe(215000);
    expect(summary.includesIva).toBe(true);
    expect(summary.quotePricingMode).toBe("por_item");
  });

  it("debe armar resumen por total global con lo que ingreso el usuario", () => {
    const record = {
      id: "cot-2",
      codigo: "COT-2",
      clienteNombre: "Juan",
      obra: "Puerta acceso",
      clienteTelefono: "",
      direccion: "",
      validez: "15 dias",
      descuentoPct: 0,
      observaciones: "Puerta de aluminio blanco",
      estado: "creada" as const,
      approvalToken: null,
      approvalTokenExpiresAt: null,
      clienteVioEn: null,
      clienteRespondioEn: null,
      clienteRespuestaCanal: null,
      pdfDescargadoEn: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      items: [],
      subtotal: 250000,
      descuentoValor: 0,
      neto: 250000,
      iva: 0,
      flete: 0,
      total: 250000,
      quotePricingMode: "total_global" as const,
    } satisfies CotizacionWorkflowRecord;

    const summary = buildActivationQuoteSummary(record);

    expect(summary.items).toHaveLength(1);
    expect(summary.items[0]?.title).toBe("Puerta acceso");
    expect(summary.items[0]?.detail).toBe("Puerta de aluminio blanco");
    expect(summary.items[0]?.precioTotal).toBe(250000);
    expect(summary.total).toBe(250000);
    expect(summary.quotePricingMode).toBe("total_global");
  });
});
