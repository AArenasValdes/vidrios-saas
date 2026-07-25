"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";
import { buildCotizacionWhatsappUrl } from "@/utils/whatsapp";

import { CotizacionDetalleDesktopView } from "./_components/cotizacion-detalle-desktop-view";
import { CotizacionDetalleMobileView } from "./_components/cotizacion-detalle-mobile-view";
import { buildCotizacionDetalleMobileViewModel } from "./_components/cotizacion-detalle-mobile-view-model";

import s from "./page.module.css";

function getRuntimeMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export default function CotizacionDetallePage() {
  const onboarding = useOnboardingChecklist();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    getCotizacionById,
    loadCotizacionById,
    markQuoteAsSent,
    updateManualResponseStatus,
    isReady,
    isSaving,
    deleteWorkflow,
  } = useCotizacionesStore({ autoLoadSummary: false });
  const cotizacion = getCotizacionById(params.id);
  const printUrl = `/print/cotizaciones/${params.id}`;
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(() => !cotizacion);
  const [hasResolvedInitialLoad, setHasResolvedInitialLoad] = useState(() => Boolean(cotizacion));
  const [isUpdatingResponse, setIsUpdatingResponse] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [optimisticResponse, setOptimisticResponse] = useState<{
    estado: "creada" | "aprobada" | "rechazada" | "terminada";
    clienteRespondioEn: string | null;
    clienteRespuestaCanal: string | null;
  } | null>(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const loadedItemsForIdRef = useRef<string | null>(
    cotizacion?.items.length ? params.id : null
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopViewport(media.matches);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    loadedItemsForIdRef.current = null;
    setHasResolvedInitialLoad(false);
    setIsLoadingItems(Boolean(params.id));
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;

    if (!params.id) {
      setLoadError(null);
      setIsLoadingItems(false);
      setHasResolvedInitialLoad(true);
      return;
    }

    if (cotizacion?.items.length) {
      loadedItemsForIdRef.current = params.id;
      setLoadError(null);
      setIsLoadingItems(false);
      setHasResolvedInitialLoad(true);
      return () => {
        cancelled = true;
      };
    }

    if (loadedItemsForIdRef.current === params.id) {
      setIsLoadingItems(false);
      setHasResolvedInitialLoad(true);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingItems(true);

    void loadCotizacionById(params.id)
      .then(() => {
        if (!cancelled) {
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(getRuntimeMessage(error, "No se pudo cargar la cotizacion."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          loadedItemsForIdRef.current = params.id;
          setIsLoadingItems(false);
          setHasResolvedInitialLoad(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cotizacion?.items.length, loadCotizacionById, params.id]);

  useEffect(() => {
    router.prefetch(printUrl);
  }, [printUrl, router]);

  const handleDelete = async () => {
    if (!cotizacion) {
      return;
    }

    const confirmed = window.confirm(
      `Vas a eliminar la cotizacion ${cotizacion.codigo}. Desaparecera del sistema operativo de la app.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteWorkflow(cotizacion.id);
      setActionError(null);
      router.push("/cotizaciones");
      router.refresh();
    } catch (error) {
      setActionError(getRuntimeMessage(error, "No se pudo eliminar la cotizacion."));
    }
  };

  const handleOpenPdf = async () => {
    if (!cotizacion) {
      return;
    }

    try {
      setIsPreparingPdf(true);
      setActionError(null);

      if (cotizacion.items.length === 0) {
        await loadCotizacionById(cotizacion.id);
      }

      await onboarding.markFirstShare({
        completionSource: "cotizacion_detalle_open_pdf",
        metadataJson: {
          route: `/cotizaciones/${cotizacion.id}`,
          quoteId: String(cotizacion.id),
          quoteCode: cotizacion.codigo,
        },
      });
      router.push(printUrl);
    } catch (error) {
      setActionError(
        getRuntimeMessage(error, "No se pudo abrir la vista final del PDF.")
      );
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleOpenWhatsappShare = async () => {
    if (!cotizacion) {
      return;
    }

    const approvalUrl = cotizacion.approvalToken
      ? buildCotizacionApprovalUrl(cotizacion.approvalToken)
      : null;
    const whatsappUrl = buildCotizacionWhatsappUrl(cotizacion, { approvalUrl });

    if (!whatsappUrl) {
      setActionError("El cliente no tiene un telefono valido para WhatsApp.");
      return;
    }

    setActionError(null);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    void markQuoteAsSent(String(cotizacion.id)).catch(() => {
      return;
    });
    void onboarding.markFirstShare({
      completionSource: "cotizacion_detalle_whatsapp_share",
      metadataJson: {
        route: `/cotizaciones/${cotizacion.id}`,
        quoteId: String(cotizacion.id),
        quoteCode: cotizacion.codigo,
      },
    });
  };

  const handleCopyApprovalLink = async () => {
    const latestCotizacion =
      cotizacion ?? (params.id ? await loadCotizacionById(params.id) : null);

    if (!latestCotizacion?.approvalToken) {
      setActionError("No se pudo preparar el link de seguimiento.");
      return;
    }

    const approvalUrl = buildCotizacionApprovalUrl(latestCotizacion.approvalToken);

    if (!approvalUrl) {
      setActionError("No se pudo preparar el link de seguimiento.");
      return;
    }

    try {
      await navigator.clipboard.writeText(approvalUrl);
      setActionError(null);
      setCopyFeedback("Link copiado. Puedes pegarlo donde lo necesites.");
      void markQuoteAsSent(String(latestCotizacion.id)).catch(() => {
        return;
      });
      void onboarding.markFirstShare({
        completionSource: "cotizacion_detalle_copy_public_link",
        metadataJson: {
          route: `/cotizaciones/${latestCotizacion.id}`,
          quoteId: String(latestCotizacion.id),
          quoteCode: latestCotizacion.codigo,
        },
      });
      window.setTimeout(() => setCopyFeedback(null), 2400);
    } catch {
      setActionError("No se pudo copiar el link en este telefono.");
    }
  };

  const handleManualResponseChange = async (
    nextStatus: "pendiente" | "aprobada" | "rechazada" | "terminada"
  ) => {
    if (!cotizacion) {
      return false;
    }

    const previousOptimistic = optimisticResponse;
    const respondedAt =
      nextStatus === "pendiente"
        ? null
        : cotizacion.clienteRespondioEn ?? new Date().toISOString();
    const estadoOptimista = nextStatus === "pendiente" ? "creada" : nextStatus;

    try {
      setOptimisticResponse({
        estado: estadoOptimista,
        clienteRespondioEn: respondedAt,
        clienteRespuestaCanal: nextStatus === "pendiente" ? null : "manual_app",
      });
      setActionError(null);
      setIsUpdatingResponse(true);
      await updateManualResponseStatus(String(cotizacion.id), nextStatus);
      setOptimisticResponse(null);
      return true;
    } catch (error) {
      setOptimisticResponse(previousOptimistic ?? null);
      setActionError(
        getRuntimeMessage(error, "No se pudo actualizar el estado del presupuesto.")
      );
      return false;
    } finally {
      setIsUpdatingResponse(false);
    }
  };

  if (isReady && hasResolvedInitialLoad && !cotizacion) {
    return (
      <div className={`${s.stateRoot}${isDesktopViewport ? ` ${s.stateRootDesktop}` : ""}`}>
        <div className={`${s.stateCard}${isDesktopViewport ? ` ${s.stateCardDesktop}` : ""}`}>
          <Link href="/cotizaciones" className={s.backLink}>
            <LuArrowLeft aria-hidden />
            Cotizaciones
          </Link>
          <h1 className={s.stateTitle}>Cotizacion no encontrada</h1>
          <p className={s.stateText}>
            {loadError || "No existe una cotizacion guardada con ese identificador."}
          </p>
        </div>
      </div>
    );
  }

  if (!cotizacion || !hasResolvedInitialLoad) {
    return (
      <div className={`${s.stateRoot}${isDesktopViewport ? ` ${s.stateRootDesktop}` : ""}`}>
        <section
          className={`${s.stateCard}${isDesktopViewport ? ` ${s.stateCardDesktop} ${s.loadingStateDesktop}` : ""}`}
        >
          <div className={s.loadingState}>
            <span className={s.loadingSpinner} aria-hidden />
            <div>
              <strong>Cargando cotizacion</strong>
              <p>Estamos trayendo el detalle completo del presupuesto.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const effectiveCotizacion = optimisticResponse
    ? {
        ...cotizacion,
        estado: optimisticResponse.estado,
        clienteRespondioEn: optimisticResponse.clienteRespondioEn,
        clienteRespuestaCanal: optimisticResponse.clienteRespuestaCanal,
      }
    : cotizacion;

  const isHydratingItems = isLoadingItems && cotizacion.items.length === 0;
  const model = buildCotizacionDetalleMobileViewModel(effectiveCotizacion, {
    isHydratingItems,
  });

  const viewProps = {
    model,
    isHydratingItems,
    isPreparingPdf,
    isSaving,
    isUpdatingResponse,
    whatsappDisabled: !cotizacion.clienteTelefono?.trim(),
    updatedLabel: formatCotizacionDate(cotizacion.updatedAt),
    editHref: `/cotizaciones/nueva?edit=${cotizacion.id}`,
    editComponentsHref: `/cotizaciones/nueva?edit=${cotizacion.id}&step=2`,
    fabricacionHref: `/print/cotizaciones/${cotizacion.id}/fabricacion`,
    copyFeedback,
    onDelete: handleDelete,
    onCopyApprovalLink: handleCopyApprovalLink,
    onManualResponseChange: handleManualResponseChange,
    onOpenPdf: handleOpenPdf,
    onOpenWhatsappShare: handleOpenWhatsappShare,
  };

  return (
    <>
      {actionError ? (
        <div className={`${s.stateRoot}${isDesktopViewport ? ` ${s.stateRootDesktop}` : ""}`}>
          <div className={`${s.stateCard}${isDesktopViewport ? ` ${s.stateCardDesktop}` : ""}`}>
            <p className={s.stateText}>{actionError}</p>
          </div>
        </div>
      ) : null}
      {isDesktopViewport ? (
        <CotizacionDetalleDesktopView {...viewProps} />
      ) : (
        <CotizacionDetalleMobileView {...viewProps} />
      )}
    </>
  );
}
