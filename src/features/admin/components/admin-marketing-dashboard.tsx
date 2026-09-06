"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  LuBeaker,
  LuFileText,
  LuFlag,
  LuMessageCircle,
  LuMonitor,
  LuRocket,
  LuTrophy,
  LuUsers,
} from "react-icons/lu";

import {
  buildAttentionLeads,
  buildSalesFunnel,
  buildSprintProgress,
  hasSalesFunnelSignal,
} from "@/features/admin/services/admin-marketing-command-center.logic";
import type { MarketingWorkspace } from "@/features/admin/types/admin-marketing";
import s from "./admin-marketing-dashboard.module.css";

const FUNNEL_ICONS = {
  grupo: LuUsers,
  demo_msg: LuFileText,
  conversaciones: LuMessageCircle,
  demos: LuMonitor,
  pilotos: LuBeaker,
  pagos: LuTrophy,
} as const;

type AdminMarketingDashboardProps = {
  workspace: MarketingWorkspace;
  children?: ReactNode;
};

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return `${parts[0]?.[0] ?? "V"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function AdminMarketingDashboard({ workspace, children }: AdminMarketingDashboardProps) {
  const funnel = buildSalesFunnel({
    groups: workspace.groupPerformance,
    acquisitionFunnel: workspace.acquisitionFunnel,
    prospects: workspace.prospects,
  });
  const showFunnel = hasSalesFunnelSignal(funnel);
  const leads = buildAttentionLeads(workspace.prospects);
  const groups = workspace.groupPerformance.slice(0, 6);
  const sprint = buildSprintProgress({
    nowActions: workspace.nowActions,
    nextActions: workspace.nextActions,
    groupPublications: workspace.groupPerformance.reduce((sum, group) => sum + group.publicaciones, 0),
  });

  return (
    <div className={s.dashboard}>
      <section className={s.section} aria-label="Embudo de marketing y ventas">
        <div className={s.sectionHead}>
          <div>
            <h2>Embudo de marketing y ventas</h2>
            <p>Alcance de grupos, mensajes DEMO y avance real de la lista comercial.</p>
          </div>
          <Link href="/admin/prospectos" className={s.textLink}>
            Ver embudo completo
          </Link>
        </div>
        {showFunnel ? (
          <ol className={s.funnel}>
            {funnel.map((stage) => {
              const Icon = FUNNEL_ICONS[stage.id];
              return (
                <li key={stage.id} className={`${s.funnelStage} ${stage.id === "pagos" && stage.count > 0 ? s.funnelPaid : ""}`}>
                  <span className={s.funnelIcon} aria-hidden>
                    <Icon />
                  </span>
                  <strong className={s.funnelValue}>{stage.count.toLocaleString("es-CL")}</strong>
                  <span className={s.funnelLabel}>{stage.label}</span>
                  <span className={s.funnelDetail}>{stage.detail}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className={s.emptyRow}>
            <p>Aún no hay avance medible en este período. Publica en grupos y registra DEMO, demos y pagos a mano.</p>
            <a href="#contenido" className={s.primaryLink}>
              Preparar publicación
            </a>
          </div>
        )}
      </section>

      <section className={s.split} aria-label="Atención comercial">
        <article className={s.section}>
          <div className={s.sectionHead}>
            <div>
              <h2>
                Leads que requieren atención
                {leads.length > 0 ? <span className={s.countBadge}>{leads.length}</span> : null}
              </h2>
              <p>Prospectos de la lista saliente que necesitan respuesta. No son leads captados de anuncios.</p>
            </div>
            <Link href="/admin/prospectos" className={s.textLink}>
              Ver todos los leads
            </Link>
          </div>
          {leads.length === 0 ? (
            <div className={s.emptyRow}>
              <p>No hay prospectos abiertos que requieran seguimiento ahora.</p>
              <Link href="/admin/prospectos" className={s.primaryLink}>
                Abrir prospectos
              </Link>
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Prospecto</th>
                    <th>Origen</th>
                    <th>Siguiente acción</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <div className={s.person}>
                          <span className={s.avatar} aria-hidden>
                            {initials(lead.name)}
                          </span>
                          <span>
                            <strong>{lead.name}</strong>
                            <small>{lead.company}</small>
                          </span>
                        </div>
                      </td>
                      <td>{lead.originLabel}</td>
                      <td className={lead.nextActionTone === "overdue" ? s.overdue : undefined}>{lead.nextAction}</td>
                      <td>
                        <Link href={lead.href} className={s.rowAction}>
                          {lead.ctaLabel}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className={s.section}>
          <div className={s.sectionHead}>
            <div>
              <h2>Grupos que generan oportunidades</h2>
              <p>Resultados manuales: DEMO, demos y pagos. El alcance queda fuera de esta tabla.</p>
            </div>
          </div>
          {groups.length === 0 ? (
            <div className={s.emptyRow}>
              <p>Crea una pieza con canal Grupos de Facebook para registrar resultados reales.</p>
              <a href="#contenido" className={s.primaryLink}>
                Agregar al plan
              </a>
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Grupo</th>
                    <th>DEMO</th>
                    <th>Demos</th>
                    <th>Pagos</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, index) => (
                    <tr key={group.grupoNombre}>
                      <td>
                        <span className={s.rank}>{index + 1}</span>
                      </td>
                      <td>
                        <strong>{group.grupoNombre}</strong>
                        <small className={s.muted}>{group.grupoSegmento ?? "Segmento no indicado"}</small>
                      </td>
                      <td>{group.mensajesDemo.toLocaleString("es-CL")}</td>
                      <td>{group.demos.toLocaleString("es-CL")}</td>
                      <td className={group.pagos > 0 ? s.positive : undefined}>
                        {group.pagos.toLocaleString("es-CL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      {children}

      <section className={s.sprint} aria-label="Chile Sales Sprint">
        <div className={s.sprintCopy}>
          <span className={s.sprintIcon} aria-hidden>
            <LuRocket />
          </span>
          <div>
            <strong>{sprint.title}</strong>
            <p>{sprint.detail}</p>
          </div>
        </div>
        <div className={s.sprintMeter}>
          <div className={s.sprintMeta}>
            <span>
              {sprint.completed} de {sprint.total} acciones
            </span>
            <span>{sprint.percent}%</span>
          </div>
          <div className={s.sprintTrack}>
            <div className={s.sprintFill} style={{ width: `${sprint.percent}%` }} />
          </div>
        </div>
        <p className={s.sprintNext}>
          <LuFlag aria-hidden />
          Siguiente hito: {sprint.nextMilestone}
        </p>
      </section>
    </div>
  );
}
