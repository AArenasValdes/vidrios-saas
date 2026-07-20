"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LuArrowLeft,
  LuCalendarDays,
  LuFileText,
  LuFolderKanban,
  LuMapPin,
  LuPencil,
  LuPhone,
} from "react-icons/lu";

import type { ClienteDetalleMobileViewModel } from "./cliente-detalle-mobile-view-model";

import s from "./cliente-detalle-desktop.module.css";

type Props = {
  model: ClienteDetalleMobileViewModel;
};

function toneClassName(tone: "green" | "orange" | "gray" | "blue") {
  return {
    green: s.toneGreen,
    orange: s.toneOrange,
    gray: s.toneGray,
    blue: s.toneBlue,
  }[tone];
}

export function ClienteDetalleDesktopView({ model }: Props) {
  const [activeTab, setActiveTab] = useState<"proyectos" | "cotizaciones">(
    model.defaultTab
  );

  return (
    <div className={s.root}>
      <header className={s.header}>
        <div className={s.headerLeft}>
          <Link href={model.backHref} className={s.backLink}>
            <LuArrowLeft aria-hidden />
            Clientes
          </Link>
          <div className={s.identity}>
            <h1 className={s.title}>{model.title}</h1>
            <span className={`${s.badge} ${toneClassName(model.estado.tone)}`}>
              {model.estado.label}
            </span>
          </div>
        </div>

        <div className={s.headerActions}>
          {model.telefonoHref ? (
            <a className={s.secondaryBtn} href={model.telefonoHref}>
              <LuPhone aria-hidden />
              Llamar
            </a>
          ) : (
            <button type="button" className={`${s.secondaryBtn} ${s.primaryBtnDisabled}`} disabled>
              <LuPhone aria-hidden />
              Llamar
            </button>
          )}
          <Link href={model.editHref} className={s.primaryBtn}>
            <LuPencil aria-hidden />
            Editar ficha
          </Link>
        </div>
      </header>

      <section className={s.metrics} aria-label="Resumen del cliente">
        <div className={s.metricCell}>
          <strong>{model.totalCotizado}</strong>
          <span>{model.totalCotizadoLabel}</span>
        </div>
        <div className={s.metricCell}>
          <strong>{model.totalCotizaciones}</strong>
          <span>{model.totalCotizacionesLabel}</span>
        </div>
        <div className={s.metricCell}>
          <strong>{model.totalProyectos}</strong>
          <span>{model.totalProyectosLabel}</span>
        </div>
      </section>

      <div className={s.workspace}>
        <div className={s.mainColumn}>
          <section className={s.card}>
            <div className={s.tabsRail} role="tablist" aria-label="Vista ficha cliente">
              {model.tabs.map((tab) => {
                const selected = tab.id === activeTab;
                const Icon = tab.id === "proyectos" ? LuFolderKanban : LuFileText;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`${s.tabButton} ${selected ? s.tabButtonActive : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon aria-hidden />
                    <span>{tab.label}</span>
                    <small>{tab.count}</small>
                  </button>
                );
              })}
            </div>

            {activeTab === "proyectos" ? (
              model.proyectos.length === 0 ? (
                <div className={s.emptyState}>Este cliente aún no tiene proyectos.</div>
              ) : (
                <div className={s.list}>
                  {model.proyectos.map((item) => (
                    <article key={item.id} className={s.rowItem}>
                      <div className={s.rowMain}>
                        <strong className={s.rowTitle}>{item.titulo}</strong>
                        <span className={s.rowMeta}>
                          {item.cotizacionesLabel} · {item.actividadLabel}
                        </span>
                      </div>
                      <span className={`${s.badge} ${toneClassName(item.estado.tone)}`}>
                        {item.estado.label}
                      </span>
                    </article>
                  ))}
                </div>
              )
            ) : model.cotizaciones.length === 0 ? (
              <div className={s.emptyState}>Este cliente aún no tiene cotizaciones.</div>
            ) : (
              <div className={s.list}>
                {model.cotizaciones.map((item) => (
                  <Link key={item.id} href={item.href} className={s.quoteRow}>
                    <div className={s.quoteCopy}>
                      <strong className={s.rowTitle}>{item.codigo}</strong>
                      <span className={s.rowMeta}>{item.fecha}</span>
                    </div>
                    <div className={s.quoteAside}>
                      <strong className={s.quotePrice}>{item.total}</strong>
                      <span className={`${s.badge} ${toneClassName(item.estado.tone)}`}>
                        {item.estado.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className={s.sideColumn}>
          <section className={s.card}>
            <div className={s.sectionLabel}>{model.label}</div>
            <div className={s.contactName}>{model.title}</div>
            <div className={s.contactList}>
              <div className={s.contactRow}>
                <LuPhone aria-hidden />
                <span>{model.telefono}</span>
              </div>
              <div className={s.contactRow}>
                <LuMapPin aria-hidden />
                <span>{model.direccion}</span>
              </div>
            </div>
            <div className={s.updatedLine}>
              <LuCalendarDays aria-hidden />
              <span>{model.updatedLine}</span>
            </div>
            <div className={s.sideActions}>
              {model.telefonoHref ? (
                <a className={s.secondaryBtn} href={model.telefonoHref}>
                  <LuPhone aria-hidden />
                  Llamar
                </a>
              ) : null}
              <Link href={model.editHref} className={s.primaryBtn}>
                <LuPencil aria-hidden />
                Editar ficha
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
