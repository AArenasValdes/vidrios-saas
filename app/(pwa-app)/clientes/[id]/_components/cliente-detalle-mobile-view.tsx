"use client";

import Link from "next/link";
import { useState } from "react";
import { LuFileText, LuFolderKanban, LuMapPin, LuPhone } from "react-icons/lu";

import { MobilePageHeader } from "../../../_components/mobile-page-header";
import type { ClienteDetalleMobileViewModel } from "./cliente-detalle-mobile-view-model";

import s from "./cliente-detalle-mobile.module.css";

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

export function ClienteDetalleMobileView({ model }: Props) {
  const [activeTab, setActiveTab] = useState<"proyectos" | "cotizaciones">(model.defaultTab);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={s.root}>
      <MobilePageHeader
        backHref={model.backHref}
        backLabel="Clientes"
        menuLabel="Abrir menu"
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((current) => !current)}
        menuPanel={
          <Link href={model.editHref} className={s.menuItem} onClick={() => setMenuOpen(false)}>
            Editar ficha
          </Link>
        }
      />

      <section className={s.heroCard}>
        <div className={s.heroTop}>
          <div className={s.heroCopy}>
            <span className={s.label}>{model.label}</span>
            <h1 className={s.title}>{model.title}</h1>
            <span className={`${s.badge} ${toneClassName(model.estado.tone)}`}>
              {model.estado.label}
            </span>
          </div>

          <a
            className={`${s.callButton} ${!model.telefonoHref ? s.callButtonDisabled : ""}`}
            href={model.telefonoHref ?? undefined}
            aria-disabled={!model.telefonoHref}
          >
            <LuPhone aria-hidden />
          </a>
        </div>

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

        <p className={s.updatedLine}>{model.updatedLine}</p>

        <div className={s.metrics}>
          <div className={s.metricCell}>
            <strong>{model.totalCotizado}</strong>
            <span>{model.totalCotizadoLabel}</span>
          </div>
          <div className={s.metricDivider} />
          <div className={s.metricCell}>
            <strong>{model.totalCotizaciones}</strong>
            <span>{model.totalCotizacionesLabel}</span>
          </div>
          <div className={s.metricDivider} />
          <div className={s.metricCell}>
            <strong>{model.totalProyectos}</strong>
            <span>{model.totalProyectosLabel}</span>
          </div>
        </div>
      </section>

      <section className={s.tabsCard}>
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
      </section>

      <section className={s.listCard}>
        {activeTab === "proyectos"
          ? model.proyectos.map((item, index) => (
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
                {index < model.proyectos.length - 1 ? <div className={s.rowDivider} /> : null}
              </article>
            ))
          : model.cotizaciones.map((item, index) => (
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
                {index < model.cotizaciones.length - 1 ? (
                  <div className={s.rowDivider} />
                ) : null}
              </Link>
            ))}
      </section>
    </div>
  );
}
