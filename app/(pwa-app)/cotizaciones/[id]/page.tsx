"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";
import { buildCotizacionWhatsappUrl } from "@/utils/whatsapp";

import { CotizacionDetalleMobileView } from "./_components/cotizacion-detalle-mobile-view";
import { buildCotizacionDetalleMobileViewModel } from "./_components/cotizacion-detalle-mobile-view-model";

import s from "./page.module.css";

export default function CotizacionDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    getCotizacionById,
    loadCotizacionById,
    markQuoteAsSent,
    isReady,
    isSaving,
    deleteWorkflow,
  } = useCotizacionesStore();
  const cotizacion = getCotizacionById(params.id);
  const printUrl = `/print/cotizaciones/${params.id}`;
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(() => !cotizacion);
  const [hasResolvedInitialLoad, setHasResolvedInitialLoad] = useState(() => Boolean(cotizacion));

  useEffect(() => {
    let cancelled = false;

    if (!params.id) {
      setIsLoadingItems(false);
      setHasResolvedInitialLoad(true);
      return;
    }

    if (cotizacion && cotizacion.items.length > 0) {
      setIsLoadingItems(false);
      setHasResolvedInitialLoad(true);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingItems(true);

    void loadCotizacionById(params.id).finally(() => {
      if (!cancelled) {
        setIsLoadingItems(false);
        setHasResolvedInitialLoad(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cotizacion, loadCotizacionById, params.id]);

  useEffect(() => {
    router.prefetch(printUrl);
  }, [printUrl, router]);

  const handleDelete = async () => {
    if (!cotizacion) {
      return;
    }

    const confirmed = window.confirm(
      `Vas a eliminar la cotización ${cotizacion.codigo}. Desaparecerá del sistema operativo de la app.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteWorkflow(cotizacion.id);
      router.push("/cotizaciones");
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "No se pudo eliminar la cotización"
      );
    }
  };

  const handleOpenPdf = async () => {
    if (!cotizacion) {
      return;
    }

    try {
      setIsPreparingPdf(true);

      if (cotizacion.items.length === 0) {
        await loadCotizacionById(cotizacion.id);
      }

      router.push(printUrl);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "No se pudo abrir la vista final del PDF"
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
      window.alert("El cliente no tiene un telefono valido para WhatsApp.");
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    void markQuoteAsSent(String(cotizacion.id)).catch(() => {
      return;
    });
  };

  if (isReady && hasResolvedInitialLoad && !cotizacion) {
    return (
      <div className={s.stateRoot}>
        <div className={s.stateCard}>
          <Link href="/cotizaciones" className={s.backLink}>
            <LuArrowLeft aria-hidden />
            Cotizaciones
          </Link>
          <h1 className={s.stateTitle}>Cotización no encontrada</h1>
          <p className={s.stateText}>No existe una cotización guardada con ese identificador.</p>
        </div>
      </div>
    );
  }

  if (!cotizacion || !hasResolvedInitialLoad) {
    return (
      <div className={s.stateRoot}>
        <section className={s.stateCard}>
          <div className={s.loadingState}>
            <span className={s.loadingSpinner} aria-hidden />
            <div>
              <strong>Cargando cotización</strong>
              <p>Estamos trayendo el detalle completo del presupuesto.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const model = buildCotizacionDetalleMobileViewModel(cotizacion, {
    isHydratingItems: isLoadingItems && cotizacion.items.length === 0,
  });

  return (
    <CotizacionDetalleMobileView
      model={model}
      isHydratingItems={isLoadingItems && cotizacion.items.length === 0}
      isPreparingPdf={isPreparingPdf}
      isSaving={isSaving}
      whatsappDisabled={!cotizacion.clienteTelefono?.trim()}
      updatedLabel={formatCotizacionDate(cotizacion.updatedAt)}
      editHref={`/cotizaciones/nueva?edit=${cotizacion.id}`}
      editComponentsHref={`/cotizaciones/nueva?edit=${cotizacion.id}&step=2`}
      onDelete={handleDelete}
      onOpenPdf={handleOpenPdf}
      onOpenWhatsappShare={handleOpenWhatsappShare}
    />
  );
}
