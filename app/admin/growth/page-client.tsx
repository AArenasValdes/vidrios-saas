"use client";

import { useRef, useState } from "react";
import { LuCalendarDays, LuCircleDollarSign, LuFilter, LuPlus, LuSettings2, LuTarget, LuTrash2, LuX } from "react-icons/lu";

import { PremiumPageReveal, PremiumPageSection } from "@/components/motion/premium-page-reveal";
import { useGrowthDashboard } from "@/features/growth/hooks/useGrowthDashboard";
import { growthDashboardService } from "@/features/growth/services/growth-dashboard.service";
import type { CreateGrowthProspectInput, GrowthChannel, GrowthExperiment, GrowthFocusFilter, GrowthPriority, GrowthProspectStatus, UpdateGrowthManualMetricsInput, UpdateGrowthSettingsInput } from "@/features/growth/types/growth-dashboard";
import s from "./page.module.css";

const CHANNELS: GrowthChannel[] = ["Facebook", "Instagram", "Google Maps", "WhatsApp", "TikTok", "Referidos"];
const STATUSES: GrowthProspectStatus[] = ["Nuevo", "Contactado", "Respondio", "Demo agendada", "Demo realizada", "Piloto", "Pagado", "Perdido", "Pausado"];
const PRIORITIES: GrowthPriority[] = ["A1", "A2", "B1", "B2"];

function buildEmptyProspect(): CreateGrowthProspectInput {
  return {
    empresa: "",
    rubro: "",
    canal: "Google Maps",
    contactoPublico: "",
    regionComuna: "",
    score: "8/10",
    estado: "Nuevo",
    prioridad: "A1",
    porQueCalza: "",
    anguloPrimerMensaje: "",
    fuenteUrl: "",
    proximoPaso: "Primer contacto",
    fechaProximoContacto: new Date().toISOString().slice(0, 10),
  };
}

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function sourceClass(status: "real" | "manual" | "mock") {
  if (status === "real") return `${s.sourceText} ${s.sourceTextReal}`;
  if (status === "manual") return `${s.sourceText} ${s.sourceTextManual}`;
  return `${s.sourceText} ${s.sourceTextMock}`;
}

function sourceLabel(status: "real" | "manual" | "mock") {
  return growthDashboardService.getDataStatusLabel(status);
}

function priorityClass(priority: GrowthPriority) {
  if (priority === "A1") return `${s.priorityPill} ${s.priorityPillHigh}`;
  if (priority === "A2") return `${s.priorityPill} ${s.priorityPillMedium}`;
  return `${s.priorityPill} ${s.priorityPillLow}`;
}

function focusLabel(filter: GrowthFocusFilter) {
  return filter === "followups" ? "Follow-ups" : filter === "contactar" ? "Por contactar" : filter === "demos" ? "Demos" : filter === "pilotos" ? "Pilotos" : "Todos";
}

export function GrowthPageClient() {
  const growth = useGrowthDashboard();
  const { viewModel } = growth;
  const prospectSectionRef = useRef<HTMLElement | null>(null);
  const [prospectForm, setProspectForm] = useState<CreateGrowthProspectInput>(() => buildEmptyProspect());
  const [configForm, setConfigForm] = useState<UpdateGrowthSettingsInput>({});
  const [manualForm, setManualForm] = useState<UpdateGrowthManualMetricsInput>({});
  const [experimentsDraft, setExperimentsDraft] = useState<GrowthExperiment[]>([]);

  if (growth.error) return <div className={s.errorBanner}><strong>No pudimos cargar el tablero.</strong><p>{growth.error}</p></div>;
  if (growth.isLoading || !viewModel) return <div className={s.page}><div className={s.loadingHeader} /><div className={s.loadingBlock} /><div className={s.loadingTable} /></div>;

  const jumpToFilter = (filter: GrowthFocusFilter) => {
    growth.setCurrentTab("resumen");
    growth.setFocusFilter(filter);
    prospectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openConfig = () => {
    setConfigForm({ ...viewModel.settings });
    growth.openConfig();
  };

  const openAddProspect = () => {
    setProspectForm(buildEmptyProspect());
    growth.openAddProspect();
  };

  const changeTab = (nextTab: typeof growth.currentTab) => {
    if (nextTab === "manuales") setManualForm({ ...viewModel.manualMetrics });
    if (nextTab === "experimentos") setExperimentsDraft(viewModel.experiments);
    growth.setCurrentTab(nextTab);
  };

  const saveConfig = async () => {
    await growth.updateSettings(configForm);
    growth.closeConfig();
  };

  const saveManual = async () => {
    await growth.updateManualMetrics(manualForm);
  };

  const saveExperiments = async () => {
    await growth.updateExperiments(experimentsDraft);
  };

  return (
    <PremiumPageReveal className={s.page}>
      <PremiumPageSection className={s.header}>
        <div className={s.headerMain}>
          <div>
            <h1 className={s.title}>Crecimiento Ventora</h1>
            <div className={s.headerMeta}>
              <span className={s.metaItem}><LuCalendarDays aria-hidden />{viewModel.periodLabel}</span>
              <span className={s.metaItem}><LuTarget aria-hidden />Meta mensual: {viewModel.metaMensualLabel}</span>
              <span className={s.metaItem}><LuCircleDollarSign aria-hidden />MRR actual: {viewModel.mrrActualLabel}</span>
            </div>
          </div>
          <div className={s.headerActions}>
            <button type="button" className={s.primaryButton} onClick={openAddProspect}><LuPlus aria-hidden />Agregar prospecto</button>
            <button type="button" className={s.secondaryButton} onClick={openConfig}><LuSettings2 aria-hidden />Configurar metas</button>
          </div>
        </div>
        <div className={s.headerFooter}>Guardado local en este navegador · ultima actualizacion {viewModel.updatedAtLabel}</div>
      </PremiumPageSection>

      <PremiumPageSection className={s.tabRow}>
        {viewModel.tabs.map((tab) => (
          <button key={tab.id} type="button" className={`${s.tabButton}${growth.currentTab === tab.id ? ` ${s.tabButtonActive}` : ""}`} onClick={() => changeTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </PremiumPageSection>

      <PremiumPageSection className={s.sectionCard}>
        <div className={s.sectionHeader}>
          <div>
            <h2 className={s.sectionTitle}>Trabajo de hoy</h2>
            <p className={s.sectionDescription}>Este es el centro del panel. Lo primero que deberia ayudarte a decidir es a quien contactar y que mover hoy.</p>
          </div>
        </div>
        <div className={s.workGrid}>
          {viewModel.workToday.map((item) => (
            <div key={item.id} className={s.workCard}>
              <div className={s.workTop}>
                <strong>{item.title}</strong>
                <span className={s.priorityText}>{item.priorityLabel}</span>
              </div>
              <div className={s.workCount}>{item.count} {item.count === 1 ? "caso" : "casos"}</div>
              <p className={s.workPreview}>{item.names.length > 0 ? item.names.join(", ") : "Sin prospectos en esta cola."}</p>
              <p className={s.workNext}>{item.nextStep}</p>
              <button type="button" className={s.workButton} onClick={() => jumpToFilter(item.id)}>{item.actionLabel}</button>
            </div>
          ))}
        </div>
      </PremiumPageSection>

      <section ref={prospectSectionRef} className={s.sectionCard}>
        <div className={s.sectionHeader}>
          <div>
            <h2 className={s.sectionTitle}>Prospectos prioritarios</h2>
            <p className={s.sectionDescription}>Filtro actual: {focusLabel(growth.focusFilter)}. Puedes editar la tabla directo y queda guardada en localStorage.</p>
          </div>
          <div className={s.inlineTools}>
            <span className={s.filterLabel}><LuFilter aria-hidden />Filtrar</span>
            {(["todos", "contactar", "followups", "demos", "pilotos"] as const).map((filter) => (
              <button key={filter} type="button" className={`${s.filterButton}${growth.focusFilter === filter ? ` ${s.filterButtonActive}` : ""}`} onClick={() => growth.setFocusFilter(filter)}>
                {focusLabel(filter)}
              </button>
            ))}
          </div>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Rubro</th>
                <th>Canal</th>
                <th>Contacto</th>
                <th>Region/comuna</th>
                <th>Score</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Proximo paso</th>
                <th>Mensaje inicial</th>
                <th>Fecha proximo contacto</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {viewModel.visibleProspects.map((prospect) => (
                <tr key={prospect.id}>
                  <td><input className={s.cellInput} value={prospect.empresa} onChange={(event) => void growth.updateProspect(prospect.id, { empresa: event.target.value })} /></td>
                  <td><input className={s.cellInput} value={prospect.rubro} onChange={(event) => void growth.updateProspect(prospect.id, { rubro: event.target.value })} /></td>
                  <td><select className={s.cellSelect} value={prospect.canal} onChange={(event) => void growth.updateProspect(prospect.id, { canal: event.target.value as GrowthChannel })}>{CHANNELS.map((channel) => <option key={channel} value={channel}>{channel}</option>)}</select></td>
                  <td><input className={s.cellInput} value={prospect.contactoPublico} onChange={(event) => void growth.updateProspect(prospect.id, { contactoPublico: event.target.value })} /></td>
                  <td><input className={s.cellInput} value={prospect.regionComuna} onChange={(event) => void growth.updateProspect(prospect.id, { regionComuna: event.target.value })} /></td>
                  <td><input className={s.cellInput} value={prospect.score} onChange={(event) => void growth.updateProspect(prospect.id, { score: event.target.value })} /></td>
                  <td><select className={s.cellSelect} value={prospect.estado} onChange={(event) => void growth.updateProspect(prospect.id, { estado: event.target.value as GrowthProspectStatus })}>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></td>
                  <td><select className={`${s.cellSelect} ${priorityClass(prospect.prioridad)}`} value={prospect.prioridad} onChange={(event) => void growth.updateProspect(prospect.id, { prioridad: event.target.value as GrowthPriority })}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></td>
                  <td><input className={s.cellInput} value={prospect.proximoPaso} onChange={(event) => void growth.updateProspect(prospect.id, { proximoPaso: event.target.value })} /></td>
                  <td><input className={s.cellInput} value={prospect.anguloPrimerMensaje} onChange={(event) => void growth.updateProspect(prospect.id, { anguloPrimerMensaje: event.target.value })} /></td>
                  <td><input type="date" className={s.cellInput} value={prospect.fechaProximoContacto} onChange={(event) => void growth.updateProspect(prospect.id, { fechaProximoContacto: event.target.value })} /></td>
                  <td><button type="button" className={s.rowActionButton} onClick={() => void growth.advanceProspect(prospect.id)}>{growthDashboardService.getStatusActionLabel(prospect.estado)}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {growth.currentTab === "resumen" ? (
        <>
          <PremiumPageSection className={s.sectionCard}>
            <div className={s.sectionHeader}>
              <div>
                <h2 className={s.sectionTitle}>Metricas simples</h2>
                <p className={s.sectionDescription}>Lectura rapida del dinero y del embudo. Sin banners gigantes ni BI decorativo.</p>
              </div>
            </div>
            <div className={s.kpiGrid}>
              {viewModel.kpis.map((kpi) => (
                <div key={kpi.id} className={s.kpiCard}>
                  <div className={s.kpiTop}><span className={s.kpiLabel}>{kpi.label}</span><span className={sourceClass(kpi.source)}>{sourceLabel(kpi.source)}</span></div>
                  <strong className={s.kpiValue}>{kpi.value}</strong>
                </div>
              ))}
            </div>
          </PremiumPageSection>

          <section className={s.summaryGrid}>
            <PremiumPageSection className={s.sectionCard}>
              <h2 className={s.sectionTitle}>Embudo compacto</h2>
              <div className={s.miniFunnel}>{Object.entries(viewModel.funnel).map(([key, value]) => <div key={key} className={s.miniFunnelItem}><strong>{value}</strong><span>{key}</span></div>)}</div>
            </PremiumPageSection>
            <PremiumPageSection className={s.sectionCard}>
              <h2 className={s.sectionTitle}>Canales</h2>
              <p className={s.sectionDescription}>{viewModel.topChannel ? `Mejor senal hoy: ${viewModel.topChannel.channel}` : "Sin canal dominante todavia."}</p>
              <div className={s.channelList}>{viewModel.channels.map((channel) => <div key={channel.channel} className={s.channelRow}><div><strong>{channel.channel}</strong><p>{channel.avanzados}/{channel.total} avanzaron</p></div><span>{Math.round(channel.effectivenessPct * 100)}%</span></div>)}</div>
            </PremiumPageSection>
            <PremiumPageSection className={s.sectionCard}>
              <h2 className={s.sectionTitle}>Proyeccion simple</h2>
              <p className={s.sectionDescription}>Si cumples la meta mensual actual de pagos.</p>
              <div className={s.projectionList}>{viewModel.projections.map((projection) => <div key={projection.months} className={s.projectionCard}><strong>{projection.months} meses</strong><span>{projection.paidClients} clientes pagados</span><span>{formatClp(projection.mrrClp)} MRR</span></div>)}</div>
            </PremiumPageSection>
          </section>
        </>
      ) : null}

      {growth.currentTab === "manuales" ? (
        <PremiumPageSection className={s.sectionCard}>
          <h2 className={s.sectionTitle}>Datos manuales</h2>
          <p className={s.sectionDescription}>Usa esta seccion para registrar dinero real, pilotos activos y notas mientras la version siga local.</p>
          <div className={s.manualGrid}>
            <label className={s.formField}><span>MRR actual</span><input type="number" className={s.formInput} value={manualForm.mrrActualClp ?? 0} onChange={(event) => setManualForm((current) => ({ ...current, mrrActualClp: Number(event.target.value || 0) }))} /></label>
            <label className={s.formField}><span>Clientes pagados</span><input type="number" className={s.formInput} value={manualForm.clientesPagadosActuales ?? 0} onChange={(event) => setManualForm((current) => ({ ...current, clientesPagadosActuales: Number(event.target.value || 0) }))} /></label>
            <label className={s.formField}><span>Pilotos activos</span><input type="number" className={s.formInput} value={manualForm.pilotosActivosActuales ?? 0} onChange={(event) => setManualForm((current) => ({ ...current, pilotosActivosActuales: Number(event.target.value || 0) }))} /></label>
            <label className={`${s.formField} ${s.formFieldFull}`}><span>Notas</span><textarea className={s.formTextarea} value={manualForm.notas ?? ""} onChange={(event) => setManualForm((current) => ({ ...current, notas: event.target.value }))} /></label>
          </div>
          <div className={s.formActions}><button type="button" className={s.primaryButton} onClick={() => void saveManual()}>Guardar datos manuales</button></div>
        </PremiumPageSection>
      ) : null}

      {growth.currentTab === "experimentos" ? (
        <PremiumPageSection className={s.sectionCard}>
          <h2 className={s.sectionTitle}>Experimentos</h2>
          <p className={s.sectionDescription}>Secundario. Solo para registrar pruebas, sin competir con el trabajo del dia.</p>
          <div className={s.experimentGrid}>
            {experimentsDraft.map((experiment, index) => (
              <div key={experiment.id} className={s.experimentCard}>
                <div className={s.experimentCardTop}>
                  <strong>Experimento {index + 1}</strong>
                  <button type="button" className={s.iconButton} onClick={() => setExperimentsDraft((current) => current.filter((item) => item.id !== experiment.id))}><LuTrash2 aria-hidden /></button>
                </div>
                <input className={s.formInput} value={experiment.nombre} onChange={(event) => setExperimentsDraft((current) => current.map((item) => item.id === experiment.id ? { ...item, nombre: event.target.value, dataStatus: "manual" } : item))} />
                <textarea className={s.formTextarea} value={experiment.objetivo} onChange={(event) => setExperimentsDraft((current) => current.map((item) => item.id === experiment.id ? { ...item, objetivo: event.target.value, dataStatus: "manual" } : item))} />
                <div className={s.experimentFields}>
                  <input className={s.formInput} value={experiment.owner} onChange={(event) => setExperimentsDraft((current) => current.map((item) => item.id === experiment.id ? { ...item, owner: event.target.value, dataStatus: "manual" } : item))} />
                  <input className={s.formInput} value={experiment.kpi} onChange={(event) => setExperimentsDraft((current) => current.map((item) => item.id === experiment.id ? { ...item, kpi: event.target.value, dataStatus: "manual" } : item))} />
                  <select className={s.formInput} value={experiment.estado} onChange={(event) => setExperimentsDraft((current) => current.map((item) => item.id === experiment.id ? { ...item, estado: event.target.value as GrowthExperiment["estado"], dataStatus: "manual" } : item))}>
                    <option value="idea">Idea</option><option value="activo">Activo</option><option value="medicion">Medicion</option><option value="cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <div className={s.formActions}>
            <button type="button" className={s.secondaryButton} onClick={() => setExperimentsDraft((current) => [...current, { id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `exp-${Date.now()}`, nombre: "Nuevo experimento", objetivo: "Definir hipotesis", estado: "idea", owner: "Founder", kpi: "Respondieron", dataStatus: "manual" }])}><LuPlus aria-hidden />Agregar experimento</button>
            <button type="button" className={s.primaryButton} onClick={() => void saveExperiments()}>Guardar experimentos</button>
          </div>
        </PremiumPageSection>
      ) : null}

      <PremiumPageSection className={s.checklistCard}>
        <h2 className={s.sectionTitle}>Checklist de uso</h2>
        <ul className={s.checklist}>
          <li>puedo agregar prospecto</li>
          <li>puedo cambiar estado</li>
          <li>puedo cambiar proximo paso</li>
          <li>puedo configurar metas</li>
          <li>puedo ver que hacer hoy</li>
          <li>puedo ver MRR</li>
          <li>puedo ver pilotos</li>
          <li>puedo ver pagos</li>
        </ul>
      </PremiumPageSection>
      {growth.isAddProspectOpen ? (
        <div className={s.overlay} role="dialog" aria-modal="true">
          <div className={s.drawer}>
            <div className={s.drawerHeader}><div><h2 className={s.sectionTitle}>Agregar prospecto</h2><p className={s.sectionDescription}>Se guarda en este navegador y entra directo al tablero operativo.</p></div><button type="button" className={s.iconButton} onClick={growth.closeAddProspect}><LuX aria-hidden /></button></div>
            <div className={s.formGrid}>
              <label className={s.formField}><span>Empresa</span><input className={s.formInput} value={prospectForm.empresa} onChange={(event) => setProspectForm((current) => ({ ...current, empresa: event.target.value }))} /></label>
              <label className={s.formField}><span>Rubro</span><input className={s.formInput} value={prospectForm.rubro} onChange={(event) => setProspectForm((current) => ({ ...current, rubro: event.target.value }))} /></label>
              <label className={s.formField}><span>Canal</span><select className={s.formInput} value={prospectForm.canal} onChange={(event) => setProspectForm((current) => ({ ...current, canal: event.target.value as GrowthChannel }))}>{CHANNELS.map((channel) => <option key={channel} value={channel}>{channel}</option>)}</select></label>
              <label className={s.formField}><span>Contacto publico</span><input className={s.formInput} value={prospectForm.contactoPublico} onChange={(event) => setProspectForm((current) => ({ ...current, contactoPublico: event.target.value }))} /></label>
              <label className={s.formField}><span>Region/comuna</span><input className={s.formInput} value={prospectForm.regionComuna} onChange={(event) => setProspectForm((current) => ({ ...current, regionComuna: event.target.value }))} /></label>
              <label className={s.formField}><span>Score</span><input className={s.formInput} value={prospectForm.score} onChange={(event) => setProspectForm((current) => ({ ...current, score: event.target.value }))} /></label>
              <label className={s.formField}><span>Estado</span><select className={s.formInput} value={prospectForm.estado} onChange={(event) => setProspectForm((current) => ({ ...current, estado: event.target.value as GrowthProspectStatus }))}>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className={s.formField}><span>Prioridad</span><select className={s.formInput} value={prospectForm.prioridad} onChange={(event) => setProspectForm((current) => ({ ...current, prioridad: event.target.value as GrowthPriority }))}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
              <label className={`${s.formField} ${s.formFieldFull}`}><span>Por que calza</span><textarea className={s.formTextarea} value={prospectForm.porQueCalza} onChange={(event) => setProspectForm((current) => ({ ...current, porQueCalza: event.target.value }))} /></label>
              <label className={`${s.formField} ${s.formFieldFull}`}><span>Angulo de primer mensaje</span><textarea className={s.formTextarea} value={prospectForm.anguloPrimerMensaje} onChange={(event) => setProspectForm((current) => ({ ...current, anguloPrimerMensaje: event.target.value }))} /></label>
              <label className={`${s.formField} ${s.formFieldFull}`}><span>URL fuente</span><input className={s.formInput} value={prospectForm.fuenteUrl ?? ""} onChange={(event) => setProspectForm((current) => ({ ...current, fuenteUrl: event.target.value }))} /></label>
              <label className={`${s.formField} ${s.formFieldFull}`}><span>Proximo paso</span><input className={s.formInput} value={prospectForm.proximoPaso} onChange={(event) => setProspectForm((current) => ({ ...current, proximoPaso: event.target.value }))} /></label>
              <label className={s.formField}><span>Fecha proximo contacto</span><input type="date" className={s.formInput} value={prospectForm.fechaProximoContacto} onChange={(event) => setProspectForm((current) => ({ ...current, fechaProximoContacto: event.target.value }))} /></label>
            </div>
            <div className={s.formActions}>
              <button type="button" className={s.secondaryButton} onClick={growth.closeAddProspect}>Cancelar</button>
              <button type="button" className={s.primaryButton} onClick={() => void growth.addProspect(prospectForm).then(() => setProspectForm(buildEmptyProspect()))}>Guardar prospecto</button>
            </div>
          </div>
        </div>
      ) : null}

      {growth.isConfigOpen ? (
        <div className={s.overlay} role="dialog" aria-modal="true">
          <div className={s.drawer}>
            <div className={s.drawerHeader}><div><h2 className={s.sectionTitle}>Configurar crecimiento</h2><p className={s.sectionDescription}>Metas, precios, canales y regiones del tablero.</p></div><button type="button" className={s.iconButton} onClick={growth.closeConfig}><LuX aria-hidden /></button></div>
            <div className={s.formGrid}>
              <label className={s.formField}><span>Meta mensual MRR</span><input type="number" className={s.formInput} value={configForm.monthlyMrrGoalClp ?? 0} onChange={(event) => setConfigForm((current) => ({ ...current, monthlyMrrGoalClp: Number(event.target.value || 0) }))} /></label>
              <label className={s.formField}><span>Meta mensual clientes pagados</span><input type="number" className={s.formInput} value={configForm.monthlyPaidGoal ?? 0} onChange={(event) => setConfigForm((current) => ({ ...current, monthlyPaidGoal: Number(event.target.value || 0) }))} /></label>
              <label className={s.formField}><span>Meta mensual pilotos</span><input type="number" className={s.formInput} value={configForm.monthlyPilotGoal ?? 0} onChange={(event) => setConfigForm((current) => ({ ...current, monthlyPilotGoal: Number(event.target.value || 0) }))} /></label>
              <label className={s.formField}><span>Objetivo diario de contactos</span><input type="number" className={s.formInput} value={configForm.dailyContactGoal ?? 0} onChange={(event) => setConfigForm((current) => ({ ...current, dailyContactGoal: Number(event.target.value || 0) }))} /></label>
              <label className={s.formField}><span>Precio mensual</span><input type="number" className={s.formInput} value={configForm.monthlyPriceClp ?? 0} onChange={(event) => setConfigForm((current) => ({ ...current, monthlyPriceClp: Number(event.target.value || 0) }))} /></label>
              <label className={s.formField}><span>Precio anual</span><input type="number" className={s.formInput} value={configForm.annualPriceClp ?? 0} onChange={(event) => setConfigForm((current) => ({ ...current, annualPriceClp: Number(event.target.value || 0) }))} /></label>
              <label className={s.formField}><span>Fecha inicio periodo</span><input type="date" className={s.formInput} value={configForm.periodStartDate ?? ""} onChange={(event) => setConfigForm((current) => ({ ...current, periodStartDate: event.target.value }))} /></label>
              <label className={s.formField}><span>Fecha fin periodo</span><input type="date" className={s.formInput} value={configForm.periodEndDate ?? ""} onChange={(event) => setConfigForm((current) => ({ ...current, periodEndDate: event.target.value }))} /></label>
              <label className={`${s.formField} ${s.formFieldFull}`}><span>Canales activos</span><div className={s.checkboxGrid}>{CHANNELS.map((channel) => <label key={channel} className={s.checkboxItem}><input type="checkbox" checked={(configForm.activeChannels ?? []).includes(channel)} onChange={(event) => setConfigForm((current) => ({ ...current, activeChannels: event.target.checked ? [...(current.activeChannels ?? []), channel] : (current.activeChannels ?? []).filter((item) => item !== channel) }))} /><span>{channel}</span></label>)}</div></label>
              <label className={`${s.formField} ${s.formFieldFull}`}><span>Regiones prioritarias</span><input className={s.formInput} value={(configForm.priorityRegions ?? []).join(", ")} onChange={(event) => setConfigForm((current) => ({ ...current, priorityRegions: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></label>
            </div>
            <div className={s.formActions}>
              <button type="button" className={s.secondaryButton} onClick={() => void growth.resetWorkspace().then(() => growth.closeConfig())}>Resetear datos V1</button>
              <button type="button" className={s.primaryButton} onClick={() => void saveConfig()}>Guardar configuracion</button>
            </div>
          </div>
        </div>
      ) : null}
    </PremiumPageReveal>
  );
}
