"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import { mapRecordToDraft } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { ManualGlassPaneMeasurementsSnapshot } from "@/features/cotizaciones/types/manual-glass-pane-measurements";
import type { QuoteConstructorItemPatch } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { buildWorkMaterialsDocument } from "@/features/fabricacion/services/fabrication-work-materials.service";
import { buildFabricationWorkOrder } from "@/features/fabricacion/services/fabrication-work-order.service";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import { getDefaultLineCatalogMetadata } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { getLineTemplateWorkshopProfiles } from "@/features/cotizaciones/line-templates/types/line-profile-references";
import { resolveSupplierPresentationsForQuote, type SupplierPresentationResolutionResponse, type SupplierPresentationQuoteItemRequest } from "@/features/proveedor-catalogos/services/supplier-presentations.client";
import type { WorkProfilePriceReferenceRow } from "@/features/fabricacion/services/fabrication-work-materials.service";
import { normalizeQuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { DespieceReviewSurface } from "@/features/cotizaciones/visual-composer/components/despiece-review-surface";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";
import {
  encodeCotizacionItemCubicationOverride,
  decodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";
import { resolveComponentColorName } from "@/constants/component-colors";
import { loadVentoraPdfLogoDataUrl } from "@/features/fabricacion/services/ventora-pdf-assets.client";

import { FabricacionResumenMovil } from "./fabricacion-resumen-movil";
import { FabricacionResumenView } from "./fabricacion-resumen-view";
import { CostoTecnicoParcialPanel } from "./costo-tecnico-parcial-panel";
import s from "./page.module.css";

const EMPTY_QUOTE_ITEMS: CotizacionWorkflowItem[] = [];

/**
 * Print interno de fabricación / pauta.
 * Separado del PDF comercial del cliente.
 */
export default function CotizacionFabricacionPrintPage() {
  const params = useParams<{ id: string }>();
  const { getCotizacionById, loadCotizacionById, isReady, saveWorkflow, isSaving } = useCotizacionesStore({
    autoLoadSummary: false,
  });
  const cotizacion = getCotizacionById(params.id);
  const [editedItems, setEditedItems] = useState<CotizacionWorkflowItem[] | null>(null);
  const editedItemsRef = useRef<CotizacionWorkflowItem[] | null>(null);
  useEffect(() => {
    editedItemsRef.current = null;
    setEditedItems(null);
  }, [cotizacion?.id, cotizacion?.updatedAt]);
  const items = editedItems ?? cotizacion?.items ?? EMPTY_QUOTE_ITEMS;
  const { templates: lineTemplates } = useCotizacionLineTemplates({ activeOnly: true });
  const { profile: organizationProfile } = useOrganizationProfile();
  const { recipes, organizationId: fabricationOrganizationId } = useFabricationRecipes({ readOnly: true });
  const [loadError, setLoadError] = useState<string | null>(null);
  const refreshedQuoteIdRef = useRef<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [despieceOpen, setDespieceOpen] = useState(false);
  const [despieceItemId, setDespieceItemId] = useState<string | null>(null);
  const [despieceSession, setDespieceSession] = useState(0);
  const [technicalCostSnapshot, setTechnicalCostSnapshot] = useState<TechnicalCostSnapshot | null>(null);
  const [supplierReferenceResult, setSupplierReferenceResult] = useState<{
    requestKey: string;
    rows: WorkProfilePriceReferenceRow[];
    checkedAt: string | null;
    status: "loaded" | "unavailable";
  } | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean | null>(null);
  const documentRef = useRef<HTMLElement | null>(null);
  const printRootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const printRoot = printRootRef.current;
    if (!printRoot) return;

    printRoot.classList.toggle(
      s.iphonePrintRoot,
      /iPhone|iPod/i.test(window.navigator.userAgent)
    );
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 719px)");
    const syncViewport = () => setIsMobileViewport(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  useEffect(() => {
    if (!isReady || !params.id) return;
    if (refreshedQuoteIdRef.current === params.id && cotizacion) return;
    let cancelled = false;
    async function load() {
      try {
        const record = await loadCotizacionById(params.id, { forceRefresh: true });
        if (!cancelled && record) {
          refreshedQuoteIdRef.current = params.id;
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "No pudimos cargar la cotización."
          );
        }
      } finally {
        if (!cancelled) {
          setHasAttemptedLoad(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [cotizacion, isReady, loadCotizacionById, params.id]);

  const summary = useMemo(
    () =>
      buildFabricationQuoteSummary(items, {
        recipes,
        organizationId: fabricationOrganizationId,
        allowLiveFormal: false,
        trabajoSnapshot: cotizacion?.fabricacionTrabajoSnapshot ?? null,
      }),
    [items, cotizacion?.fabricacionTrabajoSnapshot, recipes, fabricationOrganizationId]
  );

  const supplierPriceRequests = useMemo(() => {
    const templatesById = new Map(lineTemplates.map((template) => [String(template.id), template]));
    return items.flatMap((item): SupplierPresentationQuoteItemRequest[] => {
      const metadata = decodeCotizacionItemPresentationMeta(item.observaciones);
      const template = templatesById.get(metadata.lineTemplateId);
      const catalogLineKey = metadata.catalogLineKey || template?.catalogKey || "";
      if (!catalogLineKey.startsWith("ventora:")) return [];
      const catalogMetadata = getDefaultLineCatalogMetadata(catalogLineKey);
      const familyKey = typeof catalogMetadata?.familyKey === "string" ? catalogMetadata.familyKey : "";
      if (!familyKey) return [];
      const profileMetadata = template?.catalogMetadata ?? catalogMetadata;
      const technicalCodes = (getLineTemplateWorkshopProfiles(profileMetadata)?.profiles ?? [])
        .filter((profile) => profile.codeStatus === "catalog_reference" && profile.code?.trim())
        .map((profile) => profile.code!.trim());
      return [{
        itemId: item.id,
        catalogLineKey,
        familyKey,
        finishName: resolveComponentColorName(metadata.colorHex),
        technicalCodes,
        providerKey: metadata.supplierProviderKey || null,
      }];
    });
  }, [items, lineTemplates]);
  const supplierPriceRequestKey = JSON.stringify(supplierPriceRequests);
  const currentSupplierReferenceResult = supplierReferenceResult?.requestKey === supplierPriceRequestKey
    ? supplierReferenceResult
    : null;
  const supplierReferenceStatus = supplierPriceRequests.length === 0
    ? "not_applicable" as const
    : currentSupplierReferenceResult?.status ?? "loading" as const;

  useEffect(() => {
    let cancelled = false;
    if (supplierPriceRequests.length === 0) return () => { cancelled = true; };

    void resolveSupplierPresentationsForQuote(supplierPriceRequests, { includeProviderOptions: true }).then((response: SupplierPresentationResolutionResponse | null) => {
      if (cancelled) return;
      if (!response) {
        setSupplierReferenceResult({ requestKey: supplierPriceRequestKey, rows: [], checkedAt: null, status: "unavailable" });
        return;
      }
      const itemsById = new Map(items.map((item) => [item.id, item]));
      const templatesById = new Map(lineTemplates.map((template) => [String(template.id), template]));
      const rows: WorkProfilePriceReferenceRow[] = [];
      for (const request of supplierPriceRequests) {
        const item = itemsById.get(request.itemId);
        if (!item) continue;
        const metadata = decodeCotizacionItemPresentationMeta(item.observaciones);
        const template = templatesById.get(metadata.lineTemplateId);
        for (const preview of response.profilePrices?.[request.itemId] ?? []) {
          rows.push({
            ...preview,
            key: `${item.id}:${preview.technicalCode}:${preview.providerKey}:${preview.presentationId}`,
            itemCode: item.codigo,
            line: template?.nombre ?? item.lineaComercial,
            lineNames: [template?.nombre ?? item.lineaComercial],
            familyKey: request.familyKey,
            finish: request.finishName || "Acabado sin definir",
          });
        }
      }
      const consolidatedRows = new Map<string, WorkProfilePriceReferenceRow>();
      for (const row of rows) {
        const key = `${row.familyKey}:${row.finish}:${row.technicalCode}:${row.profileName}:${row.providerKey}:${row.presentationId}`;
        const current = consolidatedRows.get(key);
        if (current) {
          current.itemCode = [...new Set([...current.itemCode.split(", "), row.itemCode])].join(", ");
          current.lineNames = [...new Set([...current.lineNames, ...row.lineNames])];
          current.line = current.lineNames.join(" · ");
        }
        else consolidatedRows.set(key, row);
      }
      setSupplierReferenceResult({ requestKey: supplierPriceRequestKey, rows: [...consolidatedRows.values()], checkedAt: new Date().toISOString(), status: "loaded" });
    });
    return () => { cancelled = true; };
  }, [supplierPriceRequests, supplierPriceRequestKey, items, lineTemplates]);

  const materialsDocument = useMemo(
    () => buildWorkMaterialsDocument({
      summary,
      items,
      lineTemplates,
      technicalCostSnapshot,
      profilePriceReferences: currentSupplierReferenceResult?.rows ?? [],
      profilePriceReferencesCheckedAt: currentSupplierReferenceResult?.checkedAt ?? null,
      profilePriceReferencesStatus: supplierReferenceStatus,
    }),
    [summary, items, lineTemplates, technicalCostSnapshot, currentSupplierReferenceResult, supplierReferenceStatus]
  );
  const workOrder = useMemo(
    () => buildFabricationWorkOrder({ summary, materials: materialsDocument, technicalCostSnapshot, quoteItems: items }),
    [summary, materialsDocument, technicalCostSnapshot, items]
  );
  const issueDate = (() => {
    if (!cotizacion?.createdAt) return "—";
    const date = new Date(cotizacion.createdAt);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(date);
  })();
  const technicalCostPanel: ReactNode = isMobileViewport === null ? null : (
    <CostoTecnicoParcialPanel
      quoteId={String(cotizacion?.id ?? params.id)}
      onSnapshotChange={setTechnicalCostSnapshot}
    />
  );

  const expandedInitializedForQuote = useRef<string | null>(null);

  useEffect(() => {
    if (expandedInitializedForQuote.current === params.id) return;
    const firstId = summary.items[0]?.itemId;
    if (!firstId) return;
    setExpandedItemId(firstId);
    expandedInitializedForQuote.current = params.id;
  }, [params.id, summary.items]);

  const handleToggleItem = useCallback((itemId: string) => {
    setExpandedItemId((current) => (current === itemId ? null : itemId));
  }, []);

  const handleOpenDespiece = useCallback((itemId: string) => {
    setDespieceItemId(itemId);
    setDespieceSession((value) => value + 1);
    setDespieceOpen(true);
  }, []);

  const handleCloseDespiece = useCallback(() => {
    setDespieceOpen(false);
  }, []);

  const handleUpdateFabricationItem = useCallback((itemId: string, patch: QuoteConstructorItemPatch) => {
    const currentItems = editedItemsRef.current ?? cotizacion?.items ?? [];
    const nextItems = currentItems.map((item) => {
      if (item.id !== itemId) return item;
      const observaciones = patch.cubicationSnapshot === undefined
        ? item.observaciones
        : encodeCotizacionItemCubicationOverride(item.observaciones, patch.cubicationSnapshot);
      return {
        ...item,
        observaciones,
        ...(patch.fabricacionSnapshot !== undefined
          ? { fabricacionSnapshot: patch.fabricacionSnapshot }
          : {}),
      };
    });
    editedItemsRef.current = nextItems;
    setEditedItems(nextItems);
  }, [cotizacion?.items]);

  const handleSaveFabricationItem = useCallback(async (
    itemId: string,
    snapshot: NonNullable<QuoteConstructorItemPatch["cubicationSnapshot"]>,
    fabricacionSnapshot?: NonNullable<QuoteConstructorItemPatch["fabricacionSnapshot"]>
  ) => {
    if (!cotizacion) return;
    const currentItems = editedItemsRef.current ?? cotizacion.items;
    const nextItems = currentItems.map((item) => item.id === itemId
      ? {
          ...item,
          observaciones: snapshot.source === "manual"
            ? encodeCotizacionItemCubicationOverride(item.observaciones, snapshot)
            : item.observaciones,
          ...(fabricacionSnapshot ? { fabricacionSnapshot } : {}),
        }
      : item);
    editedItemsRef.current = nextItems;
    setEditedItems(nextItems);
    const draft = mapRecordToDraft(cotizacion);
    // mapRecordToDraft reconciles commercial prices; replace those items with
    // the same saved quote items so an explicit manual cut override is retained.
    draft.items = nextItems;
    const record = await saveWorkflow({
      draft,
      estado: cotizacion.estado,
      existingId: cotizacion.id,
      existingCode: cotizacion.codigo,
      existingClientId: cotizacion.clientId,
      existingProjectId: cotizacion.projectId,
    });
    editedItemsRef.current = record.items;
    setEditedItems(record.items);
  }, [cotizacion, saveWorkflow]);

  const handleSaveManualGlassMeasurements = useCallback(async (
    itemId: string,
    manualGlassMeasurements: ManualGlassPaneMeasurementsSnapshot
  ) => {
    if (!cotizacion) throw new Error("No encontramos la cotización para guardar las medidas.");
    const currentItems = editedItemsRef.current ?? cotizacion.items;
    const nextItems = currentItems.map((item) => item.id === itemId
      ? { ...item, manualGlassMeasurements }
      : item);
    if (!nextItems.some((item) => item.id === itemId)) throw new Error("No encontramos el componente seleccionado.");

    editedItemsRef.current = nextItems;
    setEditedItems(nextItems);
    const draft = mapRecordToDraft(cotizacion);
    draft.items = nextItems;
    const record = await saveWorkflow({
      draft,
      estado: cotizacion.estado,
      existingId: cotizacion.id,
      existingCode: cotizacion.codigo,
      existingClientId: cotizacion.clientId,
      existingProjectId: cotizacion.projectId,
    });
    editedItemsRef.current = record.items;
    setEditedItems(record.items);
  }, [cotizacion, saveWorkflow]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const documentFileName = `orden-fabricacion-materiales-${sanitizeFileNamePart(cotizacion?.codigo || "cotizacion", 36)}.pdf`;
      const [{ createFabricationWorkOrderPdf }, { downloadPdfBlob }] = await Promise.all([
        import("@/features/fabricacion/services/fabrication-work-order-pdf.service"),
        import("@/utils/cotizacion-pdf"),
      ]);
      const logoDataUrl = await loadVentoraPdfLogoDataUrl();
      if (!logoDataUrl) throw new Error("No se pudo cargar el logotipo corporativo. Recarga la página e inténtalo otra vez.");
      const blob = createFabricationWorkOrderPdf(workOrder, {
        companyName: organizationProfile?.empresaNombre ?? "",
        quoteCode: cotizacion?.codigo ?? "",
        workName: cotizacion?.obra ?? "",
        issueDate,
      }, logoDataUrl).output("blob");
      const result = await downloadPdfBlob(blob, documentFileName);
      if (result === "failed") setExportError("No pudimos descargar la orden. Intenta nuevamente.");
    } catch (error) {
      const { formatCotizacionPdfError } = await import("@/utils/cotizacion-pdf");
      setExportError(formatCotizacionPdfError(error));
    } finally {
      setIsExporting(false);
    }
  }, [cotizacion, issueDate, organizationProfile, workOrder]);

  if ((!isReady || !hasAttemptedLoad) && !cotizacion && !loadError) {
    return <p className={s.loadingState}>Cargando resumen de fabricación…</p>;
  }

  if (loadError) {
    return (
      <main className={s.printRoot}>
        <p>{loadError}</p>
        <Link href={`/cotizaciones/${params.id}`}>Volver</Link>
      </main>
    );
  }

  if (!cotizacion) {
    return (
      <main className={s.printRoot}>
        <p>No encontramos esta cotización.</p>
        <Link href="/cotizaciones">Ir a cotizaciones</Link>
      </main>
    );
  }

  return (
    <main ref={printRootRef} className={s.printRoot} data-fabricacion-print="1">
      {!summary.trabajoSnapshot && summary.items.length === 0 ? (
        <p role="status" data-testid="fabricacion-historica-ausente">
          Esta cotización no conserva una pauta técnica histórica.
        </p>
      ) : null}
      <div className={s.workspace}>
        <div className={s.desktopFabricacion} data-testid="fabricacion-desktop">
          <FabricacionResumenView
            backHref={`/cotizaciones/${params.id}`}
            pdfHref={`/print/cotizaciones/${params.id}`}
            quoteId={String(cotizacion.id)}
            glassPlannerEnabled={isMobileViewport === false}
            codigo={cotizacion.codigo}
            clienteNombre={cotizacion.clienteNombre}
            obra={cotizacion.obra}
            summary={summary}
            items={items}
            lineTemplates={lineTemplates}
            onSaveManualGlassMeasurements={handleSaveManualGlassMeasurements}
            materialsDocument={materialsDocument}
            workOrder={workOrder}
            companyName={organizationProfile?.empresaNombre ?? ""}
            issueDate={issueDate}
            technicalCostPanel={isMobileViewport === false ? technicalCostPanel : null}
            expandedItemId={expandedItemId}
            onToggleItem={handleToggleItem}
            onOpenDespiece={handleOpenDespiece}
            isExporting={isExporting}
            exportError={exportError}
            documentRef={documentRef}
            onDownload={() => void handleDownload()}
            onPrint={handlePrint}
          />
        </div>
        <div className={s.mobileFabricacion}>
          <FabricacionResumenMovil
            backHref={`/cotizaciones/${params.id}`}
            pdfHref={`/print/cotizaciones/${params.id}`}
            quoteId={String(cotizacion.id)}
            codigo={cotizacion.codigo}
            clienteNombre={cotizacion.clienteNombre}
            obra={cotizacion.obra}
            summary={summary}
            items={items}
            lineTemplates={lineTemplates}
            onSaveManualGlassMeasurements={handleSaveManualGlassMeasurements}
            materialsDocument={materialsDocument}
            workOrder={workOrder}
            companyName={organizationProfile?.empresaNombre ?? ""}
            issueDate={issueDate}
            technicalCostPanel={isMobileViewport ? technicalCostPanel : null}
            isExporting={isExporting}
            exportError={exportError}
            onDownload={() => void handleDownload()}
            onPrint={handlePrint}
            onOpenDespiece={handleOpenDespiece}
          />
        </div>
      </div>
      <DespieceReviewSurface
        key={despieceSession}
        open={despieceOpen}
        items={items}
        persistedItems={cotizacion.items}
        lineTemplates={lineTemplates}
        quotePricingMode={normalizeQuotePricingMode(cotizacion.quotePricingMode)}
        activeItemId={despieceItemId}
        onActiveItemChange={setDespieceItemId}
        onUpdateItem={handleUpdateFabricationItem}
        onSaveQuoteItem={handleSaveFabricationItem}
        isSavingQuoteItem={isSaving}
        onClose={handleCloseDespiece}
        recipes={recipes}
        organizationId={fabricationOrganizationId}
      />
    </main>
  );
}
