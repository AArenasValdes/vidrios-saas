"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuArrowLeft } from "react-icons/lu";

import { useClientes } from "@/features/clientes/hooks/useClientes";

import { ClienteDetalleMobileView } from "./_components/cliente-detalle-mobile-view";
import { buildClienteDetalleMobileViewModel } from "./_components/cliente-detalle-mobile-view-model";

import s from "./page.module.css";

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getClienteDetalleById, loadClienteDetalleById, isReady } = useClientes();
  const detalle = getClienteDetalleById(params.id);
  const [loadAttempted, setLoadAttempted] = useState(false);

  useEffect(() => {
    if (!params.id || detalle) {
      return;
    }

    let active = true;

    void loadClienteDetalleById(params.id).finally(() => {
      if (active) {
        setLoadAttempted(true);
      }
    });

    return () => {
      active = false;
    };
  }, [detalle, loadClienteDetalleById, params.id]);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    router.prefetch(`/clientes/${params.id}/editar`);
  }, [params.id, router]);

  if (!detalle) {
    return (
      <div className={s.stateRoot}>
        <div className={s.stateCard}>
          {isReady && loadAttempted ? (
            <>
              <Link href="/clientes" className={s.backLink}>
                <LuArrowLeft aria-hidden />
                Clientes
              </Link>
              <h1 className={s.stateTitle}>Cliente no encontrado</h1>
              <p className={s.stateText}>No existe una ficha activa para este cliente.</p>
            </>
          ) : (
            <div className={s.loadingState}>
              <div className={s.loadingSpinner} aria-hidden />
              <div>
                <h1 className={s.stateTitle}>Cargando ficha</h1>
                <p className={s.stateText}>Traemos cliente, proyectos y cotizaciones.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const model = buildClienteDetalleMobileViewModel(detalle);

  return <ClienteDetalleMobileView model={model} />;
}
