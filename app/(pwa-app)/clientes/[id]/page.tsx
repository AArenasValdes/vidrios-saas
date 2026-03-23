"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LuArrowLeft,
  LuBuilding2,
  LuFileText,
  LuFolderOpen,
  LuMail,
  LuMapPin,
  LuPencil,
  LuPhone,
  LuReceiptText,
  LuUsers,
} from "react-icons/lu";

import { useClientes } from "@/hooks/useClientes";

import s from "./page.module.css";

const ESTADO_META: Record<string, { cls: string; label: string }> = {
  activo: { cls: "stActivo", label: "Activo" },
  seguimiento: { cls: "stSeguimiento", label: "Seguimiento" },
  prospecto: { cls: "stProspecto", label: "Prospecto" },
  inactivo: { cls: "stInactivo", label: "Inactivo" },
};

const COTIZACION_ESTADO_META: Record<string, { cls: string; label: string }> = {
  borrador: { cls: "stBorrador", label: "Borrador" },
  creada: { cls: "stCreada", label: "Creada" },
  enviada: { cls: "stEnviada", label: "Enviada" },
  aprobada: { cls: "stAprobada", label: "Aprobada" },
  rechazada: { cls: "stRechazada", label: "Rechazada" },
  terminada: { cls: "stTerminada", label: "Terminada" },
};

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const CLP = (value: number) => clpFormatter.format(value);

function formatDate(value: string | null) {
  if (!value) {
    return "Sin actividad";
  }

  return dateFormatter.format(new Date(value));
}

function getClienteEstadoMeta(estado: string) {
  return ESTADO_META[estado] ?? { cls: "stInactivo", label: estado || "Sin estado" };
}

function getCotizacionEstadoMeta(estado: string) {
  return COTIZACION_ESTADO_META[estado] ?? {
    cls: "stNeutro",
    label: estado || "Sin estado",
  };
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getClienteDetalleById, loadClienteDetalleById, isReady } = useClientes();
  const detalle = getClienteDetalleById(params.id);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    if (!params.id) {
      setLoadingDetail(false);
      return;
    }

    if (detalle) {
      setLoadingDetail(false);
      return;
    }

    let active = true;

    void loadClienteDetalleById(params.id).finally(() => {
      if (active) {
        setLoadingDetail(false);
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

  const { estado, totalCotizado, projectCards, quoteCards, phoneHref, editHref } =
    useMemo(() => {
      if (!detalle) {
        return {
          estado: { cls: "stInactivo", label: "Sin estado" },
          totalCotizado: CLP(0),
          projectCards: [] as Array<{
            id: string | number;
            titulo: string;
            estado: { cls: string; label: string };
            cotizaciones: string;
            ultimaActividad: string;
          }>,
          quoteCards: [] as Array<{
            id: string | number;
            href: string;
            codigo: string;
            estado: { cls: string; label: string };
            obra: string;
            fecha: string;
            total: string;
          }>,
          phoneHref: null as string | null,
          editHref: params.id ? `/clientes/${params.id}/editar` : "/clientes",
        };
      }

      return {
        estado: getClienteEstadoMeta(detalle.resumen.estado),
        totalCotizado: CLP(
          detalle.cotizaciones.reduce((accumulator, item) => accumulator + item.total, 0)
        ),
        projectCards: detalle.proyectos.map((project) => ({
          id: project.id,
          titulo: project.titulo,
          estado: getClienteEstadoMeta(String(project.estado ?? "").toLowerCase()),
          cotizaciones: `${project.cotizaciones} cotizacion(es)`,
          ultimaActividad: `Ultima actividad: ${formatDate(project.ultimaActividadAt)}`,
        })),
        quoteCards: detalle.cotizaciones.map((cotizacion) => ({
          id: cotizacion.id,
          href: `/cotizaciones/${cotizacion.id}`,
          codigo: cotizacion.codigo,
          estado: getCotizacionEstadoMeta(String(cotizacion.estado ?? "").toLowerCase()),
          obra: cotizacion.obra,
          fecha: formatDate(cotizacion.updatedAt),
          total: CLP(cotizacion.total),
        })),
        phoneHref: detalle.cliente.telefono ? `tel:${detalle.cliente.telefono}` : null,
        editHref: `/clientes/${detalle.cliente.id}/editar`,
      };
    }, [detalle, params.id]);

  if (!loadingDetail && isReady && !detalle) {
    return (
      <div className={s.root}>
        <div className={s.header}>
          <div>
            <Link href="/clientes" className={s.backLink}>
              <LuArrowLeft aria-hidden />
              Volver a clientes
            </Link>
            <h1 className={s.title}>Cliente no encontrado</h1>
            <p className={s.subtitle}>No existe una ficha activa para este cliente.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!detalle) {
    return null;
  }

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div>
          <Link href="/clientes" className={s.backLink}>
            <LuArrowLeft aria-hidden />
            Volver a clientes
          </Link>
          <h1 className={s.title}>{detalle.cliente.nombre}</h1>
          <p className={s.subtitle}>
            Ficha comercial y operativa del cliente para revisar contacto, obras y cotizaciones recientes.
          </p>
        </div>

        <div className={s.headerActions}>
          {phoneHref ? (
            <a className={s.btnGhost} href={phoneHref}>
              <LuPhone aria-hidden />
              Llamar
            </a>
          ) : null}
          <Link className={s.btnPrimary} href={editHref}>
            <LuPencil aria-hidden />
            Editar ficha
          </Link>
        </div>
      </div>

      <div className={s.topGrid}>
        <section className={s.heroCard}>
          <div className={s.heroHeader}>
            <div>
              <span className={s.eyebrow}>Estado del cliente</span>
              <h2>{detalle.resumen.referencia}</h2>
              <p className={s.heroStateNote}>
                Este estado se actualiza solo segun cotizaciones y actividad reciente.
              </p>
            </div>
            <span className={`${s.badge} ${s[estado.cls]}`}>{estado.label}</span>
          </div>

          <div className={s.metaGrid}>
            <div className={s.metaCard}>
              <LuPhone aria-hidden />
              <div>
                <span>Telefono</span>
                <strong>{detalle.cliente.telefono || "Sin telefono"}</strong>
              </div>
            </div>
            <div className={s.metaCard}>
              <LuMail aria-hidden />
              <div>
                <span>Correo</span>
                <strong>{detalle.cliente.correo || "Sin correo"}</strong>
              </div>
            </div>
            <div className={s.metaCard}>
              <LuMapPin aria-hidden />
              <div>
                <span>Direccion</span>
                <strong>{detalle.cliente.direccion || "Sin direccion"}</strong>
              </div>
            </div>
          </div>
        </section>

        <aside className={s.sideCard}>
          <div className={s.sideTitle}>Resumen</div>
          <div className={s.sideRow}>
            <span>Obras</span>
            <strong>{detalle.proyectos.length}</strong>
          </div>
          <div className={s.sideRow}>
            <span>Cotizaciones</span>
            <strong>{detalle.cotizaciones.length}</strong>
          </div>
          <div className={s.sideRow}>
            <span>Ultima gestion</span>
            <strong>{detalle.resumen.ultimaGestion}</strong>
          </div>
          <div className={s.sideRow}>
            <span>Direccion</span>
            <strong>{detalle.resumen.direccion}</strong>
          </div>
        </aside>
      </div>

      <div className={s.kpiRow}>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Cliente</span>
          <strong className={s.kpiValue}>{detalle.cliente.nombre}</strong>
          <span className={s.kpiSub}>ficha activa</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Obras</span>
          <strong className={s.kpiValue}>{detalle.proyectos.length}</strong>
          <span className={s.kpiSub}>proyectos asociados</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Cotizado</span>
          <strong className={s.kpiValue}>{totalCotizado}</strong>
          <span className={s.kpiSub}>monto acumulado visible</span>
        </div>
      </div>

      <div className={s.layout}>
        <section className={s.mainCard}>
          <div className={s.sectionHeader}>
            <div>
              <span className={s.eyebrow}>Obras</span>
              <h3>Proyectos del cliente</h3>
            </div>
            <div className={s.inlineMeta}>
              <LuFolderOpen aria-hidden />
              {detalle.proyectos.length} proyecto(s)
            </div>
          </div>

          {detalle.proyectos.length === 0 ? (
            <div className={s.emptyState}>
              <LuBuilding2 aria-hidden />
              <p>Aun no hay proyectos asociados a este cliente.</p>
            </div>
          ) : (
            <div className={s.itemList}>
              {projectCards.map((project) => (
                <article key={project.id} className={s.itemCard}>
                  <div className={s.itemTop}>
                    <strong>{project.titulo}</strong>
                    <span className={`${s.miniBadge} ${s[project.estado.cls]}`}>
                      {project.estado.label}
                    </span>
                  </div>
                  <p>{project.cotizaciones}</p>
                  <small>{project.ultimaActividad}</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className={s.mainCard}>
          <div className={s.sectionHeader}>
            <div>
              <span className={s.eyebrow}>Cotizaciones</span>
              <h3>Historial comercial</h3>
            </div>
            <div className={s.inlineMeta}>
              <LuReceiptText aria-hidden />
              {detalle.cotizaciones.length} registro(s)
            </div>
          </div>

          {detalle.cotizaciones.length === 0 ? (
            <div className={s.emptyState}>
              <LuFileText aria-hidden />
              <p>Este cliente todavia no tiene cotizaciones guardadas.</p>
            </div>
          ) : (
            <div className={s.quoteList}>
              {quoteCards.map((cotizacion) => (
                <Link key={cotizacion.id} className={s.quoteCard} href={cotizacion.href}>
                  <div className={s.itemTop}>
                    <strong>{cotizacion.codigo}</strong>
                    <span className={`${s.miniBadge} ${s[cotizacion.estado.cls]}`}>
                      {cotizacion.estado.label}
                    </span>
                  </div>
                  <p>{cotizacion.obra}</p>
                  <div className={s.quoteBottom}>
                    <small>{cotizacion.fecha}</small>
                    <strong>{cotizacion.total}</strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      <div className={s.footerNote}>
        <LuUsers aria-hidden />
        <span>
          La ficha usa datos multi-tenant reales de clientes, proyectos y cotizaciones.
        </span>
      </div>
    </div>
  );
}
