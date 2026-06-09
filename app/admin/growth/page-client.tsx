"use client";

import { useState, type ReactNode } from "react";
import {
  LuCalendarDays,
  LuCircleDollarSign,
  LuPlus,
  LuSettings2,
  LuTarget,
  LuTrash2,
  LuX,
} from "react-icons/lu";

import { PremiumPageReveal, PremiumPageSection } from "@/components/motion/premium-page-reveal";
import { useGrowthDashboard } from "@/features/growth/hooks/useGrowthDashboard";
import { growthDashboardService } from "@/features/growth/services/growth-dashboard.service";
import type {
  CreateGrowthClientInput,
  CreateGrowthMarketingTaskInput,
  CreateGrowthProspectInput,
  GrowthClientPlan,
  GrowthMarketingStatus,
  GrowthOnboardingStatus,
  GrowthPanelTab,
  GrowthPaymentStatus,
  GrowthProspectStatus,
  UpdateGrowthManualMetricsInput,
  UpdateGrowthSettingsInput,
} from "@/features/growth/types/growth-dashboard";
import s from "./page.module.css";

const PROSPECT_STATUSES = growthDashboardService.getProspectStatuses();
const CLIENT_PLANS: GrowthClientPlan[] = [
  "founder_full",
  "quote_only",
  "mensual",
  "trial",
];
const PAYMENT_STATUSES: GrowthPaymentStatus[] = [
  "pendiente",
  "pagado",
  "vencido",
];
const ONBOARDING_STATUSES: GrowthOnboardingStatus[] = [
  "pendiente",
  "en_proceso",
  "completado",
];
const MARKETING_STATUSES: GrowthMarketingStatus[] = [
  "pendiente",
  "en_proceso",
  "publicado",
  "cerrado",
];

function buildEmptyProspect(): CreateGrowthProspectInput {
  return {
    nombre: "",
    empresa: "",
    whatsapp: "+56 9 ",
    ciudad: "",
    origen: "Manual",
    estado: "nuevo",
    proximoPaso: "Primer contacto",
    fechaProximoSeguimiento: new Date().toISOString().slice(0, 10),
    notas: "",
  };
}

function buildEmptyClient(): CreateGrowthClientInput {
  return {
    empresa: "",
    contacto: "",
    whatsapp: "+56 9 ",
    correoAcceso: "",
    plan: "trial",
    montoPagadoClp: 0,
    estadoPago: "pendiente",
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaVencimiento: "",
    onboarding: "pendiente",
    pwaInstalada: false,
    videosEnviados: false,
    primeraCotizacionCreada: false,
    notas: "",
  };
}

function buildEmptyMarketingTask(): CreateGrowthMarketingTaskInput {
  return {
    campanaCanal: "",
    mensajeUsado: "",
    contenidoPendiente: "",
    fecha: new Date().toISOString().slice(0, 10),
    estado: "pendiente",
    resultado: "",
    notas: "",
  };
}

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function sourceClass(status: "real" | "manual" | "mock") {
  if (status === "real") return `${s.sourceText} ${s.sourceTextReal}`;
  if (status === "manual") return `${s.sourceText} ${s.sourceTextManual}`;
  return `${s.sourceText} ${s.sourceTextMock}`;
}

function planLabel(plan: GrowthClientPlan) {
  if (plan === "founder_full") return "Founder full";
  if (plan === "quote_only") return "Solo cotizacion";
  if (plan === "mensual") return "Mensual";
  return "Trial";
}

function primaryActionForTab(tab: GrowthPanelTab) {
  if (tab === "prospectos") return "prospect";
  if (tab === "clientes") return "client";
  if (tab === "marketing") return "marketing";
  return null;
}

export function GrowthPageClient() {
  const growth = useGrowthDashboard();
  const { viewModel } = growth;
  const [prospectForm, setProspectForm] = useState(buildEmptyProspect);
  const [clientForm, setClientForm] = useState(buildEmptyClient);
  const [marketingForm, setMarketingForm] = useState(buildEmptyMarketingTask);
  const [configForm, setConfigForm] = useState<UpdateGrowthSettingsInput>({});
  const [manualForm, setManualForm] = useState<UpdateGrowthManualMetricsInput>({});

  if (growth.error) {
    return (
      <div className={s.errorBanner}>
        <strong>No pudimos cargar el panel.</strong>
        <p>{growth.error}</p>
      </div>
    );
  }

  if (growth.isLoading || !viewModel) {
    return (
      <div className={s.page}>
        <div className={s.loadingHeader} />
        <div className={s.loadingBlock} />
        <div className={s.loadingTable} />
      </div>
    );
  }

  const openConfig = () => {
    setConfigForm({ ...viewModel.settings });
    setManualForm({ ...viewModel.manualMetrics });
    growth.openConfig();
  };

  const openPrimaryAction = () => {
    const action = primaryActionForTab(growth.currentTab);

    if (action === "prospect") {
      setProspectForm(buildEmptyProspect());
      growth.openAddProspect();
      return;
    }

    if (action === "client") {
      setClientForm(buildEmptyClient());
      growth.openAddClient();
      return;
    }

    if (action === "marketing") {
      setMarketingForm(buildEmptyMarketingTask());
      growth.openAddMarketing();
    }
  };

  const primaryLabel =
    growth.currentTab === "prospectos"
      ? "Agregar prospecto"
      : growth.currentTab === "clientes"
        ? "Agregar cliente"
        : growth.currentTab === "marketing"
          ? "Agregar tarea"
          : null;

  return (
    <PremiumPageReveal className={s.page}>
      <PremiumPageSection className={s.header}>
        <div className={s.headerMain}>
          <div>
            <h1 className={s.title}>{viewModel.title}</h1>
            <div className={s.headerMeta}>
              <span className={s.metaItem}>
                <LuCalendarDays aria-hidden />
                {viewModel.periodLabel}
              </span>
              <span className={s.metaItem}>
                <LuTarget aria-hidden />
                Meta: {viewModel.metaMensualLabel}
              </span>
              <span className={s.metaItem}>
                <LuCircleDollarSign aria-hidden />
                MRR: {viewModel.mrrActualLabel}
              </span>
            </div>
          </div>
          <div className={s.headerActions}>
            {primaryLabel ? (
              <button
                type="button"
                className={s.primaryButton}
                onClick={openPrimaryAction}
              >
                <LuPlus aria-hidden />
                {primaryLabel}
              </button>
            ) : null}
            <button
              type="button"
              className={s.secondaryButton}
              onClick={openConfig}
            >
              <LuSettings2 aria-hidden />
              Configurar
            </button>
          </div>
        </div>
        <div className={s.headerFooter}>
          Guardado local · {viewModel.counts.prospectosActivos} prospectos activos ·{" "}
          {viewModel.counts.clientesActivos} clientes · actualizado{" "}
          {viewModel.updatedAtLabel}
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={s.tabRow}>
        {viewModel.tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${s.tabButton}${growth.currentTab === tab.id ? ` ${s.tabButtonActive}` : ""}`}
            onClick={() => growth.setCurrentTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </PremiumPageSection>

      {growth.currentTab === "trabajo" ? (
        <PremiumPageSection className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <div>
              <h2 className={s.sectionTitle}>Trabajo de hoy</h2>
              <p className={s.sectionDescription}>
                Cola operativa del dia. Toca una tarjeta para ir al tab correspondiente.
              </p>
            </div>
          </div>
          <div className={s.workGrid}>
            {viewModel.workToday.map((item) => (
              <div key={item.id} className={s.workCard}>
                <div className={s.workTop}>
                  <strong>{item.title}</strong>
                  <span className={s.priorityText}>{item.priorityLabel}</span>
                </div>
                <div className={s.workCount}>
                  {item.count} {item.count === 1 ? "caso" : "casos"}
                </div>
                <p className={s.workPreview}>
                  {item.names.length > 0
                    ? item.names.join(", ")
                    : "Sin casos en esta cola."}
                </p>
                <p className={s.workNext}>{item.nextStep}</p>
                <button
                  type="button"
                  className={s.workButton}
                  onClick={() => growth.jumpToWorkQueue(item.targetTab)}
                >
                  {item.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </PremiumPageSection>
      ) : null}

      {growth.currentTab === "prospectos" ? (
        <section className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <div>
              <h2 className={s.sectionTitle}>Prospectos</h2>
              <p className={s.sectionDescription}>
                Pipeline comercial simple. Edita inline y queda en localStorage.
              </p>
            </div>
          </div>
          <div className={s.recordList}>
            {viewModel.prospects.map((prospect) => (
              <article key={prospect.id} className={s.recordCard}>
                <div className={s.recordTop}>
                  <div>
                    <strong>{prospect.empresa || "Sin empresa"}</strong>
                    <p className={s.recordSub}>
                      {prospect.nombre || "Sin nombre"} · {prospect.ciudad || "Sin ciudad"}
                    </p>
                  </div>
                  <span className={sourceClass(prospect.dataStatus)}>
                    {growthDashboardService.getDataStatusLabel(prospect.dataStatus)}
                  </span>
                </div>
                <div className={s.recordGrid}>
                  <label className={s.formField}>
                    <span>Nombre</span>
                    <input
                      className={s.formInput}
                      value={prospect.nombre}
                      onChange={(event) =>
                        void growth.updateProspect(prospect.id, {
                          nombre: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Empresa</span>
                    <input
                      className={s.formInput}
                      value={prospect.empresa}
                      onChange={(event) =>
                        void growth.updateProspect(prospect.id, {
                          empresa: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>WhatsApp</span>
                    <input
                      className={s.formInput}
                      value={prospect.whatsapp}
                      onChange={(event) =>
                        void growth.updateProspect(prospect.id, {
                          whatsapp: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Ciudad</span>
                    <input
                      className={s.formInput}
                      value={prospect.ciudad}
                      onChange={(event) =>
                        void growth.updateProspect(prospect.id, {
                          ciudad: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Origen</span>
                    <input
                      className={s.formInput}
                      value={prospect.origen}
                      onChange={(event) =>
                        void growth.updateProspect(prospect.id, {
                          origen: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Estado</span>
                    <select
                      className={s.formInput}
                      value={prospect.estado}
                      onChange={(event) =>
                        void growth.updateProspect(prospect.id, {
                          estado: event.target.value as GrowthProspectStatus,
                        })
                      }
                    >
                      {PROSPECT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {growthDashboardService.getProspectStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={s.formField}>
                    <span>Proximo paso</span>
                    <input
                      className={s.formInput}
                      value={prospect.proximoPaso}
                      onChange={(event) =>
                        void growth.updateProspect(prospect.id, {
                          proximoPaso: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Fecha seguimiento</span>
                    <input
                      type="date"
                      className={s.formInput}
                      value={prospect.fechaProximoSeguimiento}
                      onChange={(event) =>
                        void growth.updateProspect(prospect.id, {
                          fechaProximoSeguimiento: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={`${s.formField} ${s.formFieldFull}`}>
                    <span>Notas</span>
                    <textarea
                      className={s.formTextarea}
                      value={prospect.notas}
                      onChange={(event) =>
                        void growth.updateProspect(prospect.id, {
                          notas: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className={s.recordActions}>
                  <button
                    type="button"
                    className={s.rowActionButton}
                    onClick={() => void growth.advanceProspect(prospect.id)}
                  >
                    {growthDashboardService.getStatusActionLabel(prospect.estado)}
                  </button>
                  <button
                    type="button"
                    className={s.iconButton}
                    onClick={() => void growth.deleteProspect(prospect.id)}
                    aria-label="Eliminar prospecto"
                  >
                    <LuTrash2 aria-hidden />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {growth.currentTab === "clientes" ? (
        <section className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <div>
              <h2 className={s.sectionTitle}>Clientes y pagos</h2>
              <p className={s.sectionDescription}>
                Cuentas activas, cobros y onboarding. Separado de prospectos frios.
              </p>
            </div>
          </div>
          <div className={s.recordList}>
            {viewModel.clientAccounts.map((client) => (
              <article key={client.id} className={s.recordCard}>
                <div className={s.recordTop}>
                  <div>
                    <strong>{client.empresa || "Sin empresa"}</strong>
                    <p className={s.recordSub}>
                      {client.contacto} · {planLabel(client.plan)}
                    </p>
                  </div>
                  <span className={sourceClass(client.dataStatus)}>
                    {growthDashboardService.getDataStatusLabel(client.dataStatus)}
                  </span>
                </div>
                <div className={s.recordGrid}>
                  <label className={s.formField}>
                    <span>Empresa</span>
                    <input
                      className={s.formInput}
                      value={client.empresa}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          empresa: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Contacto</span>
                    <input
                      className={s.formInput}
                      value={client.contacto}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          contacto: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>WhatsApp</span>
                    <input
                      className={s.formInput}
                      value={client.whatsapp}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          whatsapp: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Correo acceso</span>
                    <input
                      className={s.formInput}
                      value={client.correoAcceso}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          correoAcceso: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Plan</span>
                    <select
                      className={s.formInput}
                      value={client.plan}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          plan: event.target.value as GrowthClientPlan,
                        })
                      }
                    >
                      {CLIENT_PLANS.map((plan) => (
                        <option key={plan} value={plan}>
                          {planLabel(plan)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={s.formField}>
                    <span>Monto pagado</span>
                    <input
                      type="number"
                      className={s.formInput}
                      value={client.montoPagadoClp}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          montoPagadoClp: Number(event.target.value || 0),
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Estado pago</span>
                    <select
                      className={s.formInput}
                      value={client.estadoPago}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          estadoPago: event.target.value as GrowthPaymentStatus,
                        })
                      }
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={s.formField}>
                    <span>Fecha inicio</span>
                    <input
                      type="date"
                      className={s.formInput}
                      value={client.fechaInicio}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          fechaInicio: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Fecha vencimiento</span>
                    <input
                      type="date"
                      className={s.formInput}
                      value={client.fechaVencimiento}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          fechaVencimiento: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Onboarding</span>
                    <select
                      className={s.formInput}
                      value={client.onboarding}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          onboarding: event.target.value as GrowthOnboardingStatus,
                        })
                      }
                    >
                      {ONBOARDING_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={s.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={client.pwaInstalada}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          pwaInstalada: event.target.checked,
                        })
                      }
                    />
                    <span>PWA instalada</span>
                  </label>
                  <label className={s.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={client.videosEnviados}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          videosEnviados: event.target.checked,
                        })
                      }
                    />
                    <span>Videos enviados</span>
                  </label>
                  <label className={s.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={client.primeraCotizacionCreada}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          primeraCotizacionCreada: event.target.checked,
                        })
                      }
                    />
                    <span>Primera cotizacion creada</span>
                  </label>
                  <label className={`${s.formField} ${s.formFieldFull}`}>
                    <span>Notas</span>
                    <textarea
                      className={s.formTextarea}
                      value={client.notas}
                      onChange={(event) =>
                        void growth.updateClient(client.id, {
                          notas: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className={s.recordActions}>
                  <span className={s.recordHint}>
                    Pagado: {formatClp(client.montoPagadoClp)}
                  </span>
                  <button
                    type="button"
                    className={s.iconButton}
                    onClick={() => void growth.deleteClient(client.id)}
                    aria-label="Eliminar cliente"
                  >
                    <LuTrash2 aria-hidden />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {growth.currentTab === "marketing" ? (
        <section className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <div>
              <h2 className={s.sectionTitle}>Marketing y tareas</h2>
              <p className={s.sectionDescription}>
                Campanas, contenido y resultados comerciales de Ventora.
              </p>
            </div>
          </div>
          <div className={s.recordList}>
            {viewModel.marketingTasks.map((task) => (
              <article key={task.id} className={s.recordCard}>
                <div className={s.recordTop}>
                  <div>
                    <strong>{task.campanaCanal || "Sin campana"}</strong>
                    <p className={s.recordSub}>{task.fecha}</p>
                  </div>
                  <span className={sourceClass(task.dataStatus)}>
                    {growthDashboardService.getDataStatusLabel(task.dataStatus)}
                  </span>
                </div>
                <div className={s.recordGrid}>
                  <label className={s.formField}>
                    <span>Campaña / canal</span>
                    <input
                      className={s.formInput}
                      value={task.campanaCanal}
                      onChange={(event) =>
                        void growth.updateMarketingTask(task.id, {
                          campanaCanal: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Mensaje usado</span>
                    <input
                      className={s.formInput}
                      value={task.mensajeUsado}
                      onChange={(event) =>
                        void growth.updateMarketingTask(task.id, {
                          mensajeUsado: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={`${s.formField} ${s.formFieldFull}`}>
                    <span>Contenido pendiente</span>
                    <textarea
                      className={s.formTextarea}
                      value={task.contenidoPendiente}
                      onChange={(event) =>
                        void growth.updateMarketingTask(task.id, {
                          contenidoPendiente: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Fecha</span>
                    <input
                      type="date"
                      className={s.formInput}
                      value={task.fecha}
                      onChange={(event) =>
                        void growth.updateMarketingTask(task.id, {
                          fecha: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={s.formField}>
                    <span>Estado</span>
                    <select
                      className={s.formInput}
                      value={task.estado}
                      onChange={(event) =>
                        void growth.updateMarketingTask(task.id, {
                          estado: event.target.value as GrowthMarketingStatus,
                        })
                      }
                    >
                      {MARKETING_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={`${s.formField} ${s.formFieldFull}`}>
                    <span>Resultado</span>
                    <textarea
                      className={s.formTextarea}
                      value={task.resultado}
                      onChange={(event) =>
                        void growth.updateMarketingTask(task.id, {
                          resultado: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={`${s.formField} ${s.formFieldFull}`}>
                    <span>Notas</span>
                    <textarea
                      className={s.formTextarea}
                      value={task.notas}
                      onChange={(event) =>
                        void growth.updateMarketingTask(task.id, {
                          notas: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className={s.recordActions}>
                  <button
                    type="button"
                    className={s.iconButton}
                    onClick={() => void growth.deleteMarketingTask(task.id)}
                    aria-label="Eliminar tarea"
                  >
                    <LuTrash2 aria-hidden />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {growth.isAddProspectOpen ? (
        <Modal
          title="Agregar prospecto"
          description="Se guarda local en este navegador."
          onClose={growth.closeAddProspect}
        >
          <ProspectFormFields
            value={prospectForm}
            onChange={setProspectForm}
          />
          <div className={s.formActions}>
            <button
              type="button"
              className={s.secondaryButton}
              onClick={growth.closeAddProspect}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={s.primaryButton}
              onClick={() =>
                void growth.addProspect(prospectForm).then(() => {
                  setProspectForm(buildEmptyProspect());
                })
              }
            >
              Guardar prospecto
            </button>
          </div>
        </Modal>
      ) : null}

      {growth.isAddClientOpen ? (
        <Modal
          title="Agregar cliente"
          description="Cuenta activa o piloto con seguimiento de pago."
          onClose={growth.closeAddClient}
        >
          <ClientFormFields value={clientForm} onChange={setClientForm} />
          <div className={s.formActions}>
            <button
              type="button"
              className={s.secondaryButton}
              onClick={growth.closeAddClient}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={s.primaryButton}
              onClick={() =>
                void growth.addClient(clientForm).then(() => {
                  setClientForm(buildEmptyClient());
                })
              }
            >
              Guardar cliente
            </button>
          </div>
        </Modal>
      ) : null}

      {growth.isAddMarketingOpen ? (
        <Modal
          title="Agregar tarea de marketing"
          description="Registra campaña, mensaje y contenido pendiente."
          onClose={growth.closeAddMarketing}
        >
          <MarketingFormFields
            value={marketingForm}
            onChange={setMarketingForm}
          />
          <div className={s.formActions}>
            <button
              type="button"
              className={s.secondaryButton}
              onClick={growth.closeAddMarketing}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={s.primaryButton}
              onClick={() =>
                void growth.addMarketingTask(marketingForm).then(() => {
                  setMarketingForm(buildEmptyMarketingTask());
                })
              }
            >
              Guardar tarea
            </button>
          </div>
        </Modal>
      ) : null}

      {growth.isConfigOpen ? (
        <Modal
          title="Configurar panel"
          description="Metas, MRR manual y reset del workspace local."
          onClose={growth.closeConfig}
        >
          <div className={s.formGrid}>
            <label className={s.formField}>
              <span>Meta mensual MRR</span>
              <input
                type="number"
                className={s.formInput}
                value={configForm.monthlyMrrGoalClp ?? 0}
                onChange={(event) =>
                  setConfigForm((current) => ({
                    ...current,
                    monthlyMrrGoalClp: Number(event.target.value || 0),
                  }))
                }
              />
            </label>
            <label className={s.formField}>
              <span>Meta mensual pagos</span>
              <input
                type="number"
                className={s.formInput}
                value={configForm.monthlyPaidGoal ?? 0}
                onChange={(event) =>
                  setConfigForm((current) => ({
                    ...current,
                    monthlyPaidGoal: Number(event.target.value || 0),
                  }))
                }
              />
            </label>
            <label className={s.formField}>
              <span>MRR actual manual</span>
              <input
                type="number"
                className={s.formInput}
                value={manualForm.mrrActualClp ?? 0}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    mrrActualClp: Number(event.target.value || 0),
                  }))
                }
              />
            </label>
            <label className={s.formField}>
              <span>Clientes pagados manual</span>
              <input
                type="number"
                className={s.formInput}
                value={manualForm.clientesPagadosActuales ?? 0}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    clientesPagadosActuales: Number(event.target.value || 0),
                  }))
                }
              />
            </label>
            <label className={`${s.formField} ${s.formFieldFull}`}>
              <span>Notas manuales</span>
              <textarea
                className={s.formTextarea}
                value={manualForm.notas ?? ""}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    notas: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className={s.formActions}>
            <button
              type="button"
              className={s.secondaryButton}
              onClick={() => void growth.resetWorkspace().then(() => growth.closeConfig())}
            >
              Resetear datos locales
            </button>
            <button
              type="button"
              className={s.primaryButton}
              onClick={() =>
                void growth
                  .updateSettings(configForm)
                  .then(() => growth.updateManualMetrics(manualForm))
                  .then(() => growth.closeConfig())
              }
            >
              Guardar configuracion
            </button>
          </div>
        </Modal>
      ) : null}
    </PremiumPageReveal>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={s.overlay} role="dialog" aria-modal="true">
      <div className={s.drawer}>
        <div className={s.drawerHeader}>
          <div>
            <h2 className={s.sectionTitle}>{title}</h2>
            <p className={s.sectionDescription}>{description}</p>
          </div>
          <button type="button" className={s.iconButton} onClick={onClose}>
            <LuX aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProspectFormFields({
  value,
  onChange,
}: {
  value: CreateGrowthProspectInput;
  onChange: (next: CreateGrowthProspectInput) => void;
}) {
  return (
    <div className={s.formGrid}>
      <label className={s.formField}>
        <span>Nombre</span>
        <input
          className={s.formInput}
          value={value.nombre}
          onChange={(event) =>
            onChange({ ...value, nombre: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Empresa</span>
        <input
          className={s.formInput}
          value={value.empresa}
          onChange={(event) =>
            onChange({ ...value, empresa: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>WhatsApp</span>
        <input
          className={s.formInput}
          value={value.whatsapp}
          onChange={(event) =>
            onChange({ ...value, whatsapp: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Ciudad</span>
        <input
          className={s.formInput}
          value={value.ciudad}
          onChange={(event) =>
            onChange({ ...value, ciudad: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Origen</span>
        <input
          className={s.formInput}
          value={value.origen}
          onChange={(event) =>
            onChange({ ...value, origen: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Estado</span>
        <select
          className={s.formInput}
          value={value.estado}
          onChange={(event) =>
            onChange({
              ...value,
              estado: event.target.value as GrowthProspectStatus,
            })
          }
        >
          {PROSPECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {growthDashboardService.getProspectStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label className={s.formField}>
        <span>Proximo paso</span>
        <input
          className={s.formInput}
          value={value.proximoPaso}
          onChange={(event) =>
            onChange({ ...value, proximoPaso: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Fecha seguimiento</span>
        <input
          type="date"
          className={s.formInput}
          value={value.fechaProximoSeguimiento}
          onChange={(event) =>
            onChange({
              ...value,
              fechaProximoSeguimiento: event.target.value,
            })
          }
        />
      </label>
      <label className={`${s.formField} ${s.formFieldFull}`}>
        <span>Notas</span>
        <textarea
          className={s.formTextarea}
          value={value.notas}
          onChange={(event) => onChange({ ...value, notas: event.target.value })}
        />
      </label>
    </div>
  );
}

function ClientFormFields({
  value,
  onChange,
}: {
  value: CreateGrowthClientInput;
  onChange: (next: CreateGrowthClientInput) => void;
}) {
  return (
    <div className={s.formGrid}>
      <label className={s.formField}>
        <span>Empresa</span>
        <input
          className={s.formInput}
          value={value.empresa}
          onChange={(event) =>
            onChange({ ...value, empresa: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Contacto</span>
        <input
          className={s.formInput}
          value={value.contacto}
          onChange={(event) =>
            onChange({ ...value, contacto: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>WhatsApp</span>
        <input
          className={s.formInput}
          value={value.whatsapp}
          onChange={(event) =>
            onChange({ ...value, whatsapp: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Correo acceso</span>
        <input
          className={s.formInput}
          value={value.correoAcceso}
          onChange={(event) =>
            onChange({ ...value, correoAcceso: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Plan</span>
        <select
          className={s.formInput}
          value={value.plan}
          onChange={(event) =>
            onChange({
              ...value,
              plan: event.target.value as GrowthClientPlan,
            })
          }
        >
          {CLIENT_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {planLabel(plan)}
            </option>
          ))}
        </select>
      </label>
      <label className={s.formField}>
        <span>Monto pagado</span>
        <input
          type="number"
          className={s.formInput}
          value={value.montoPagadoClp}
          onChange={(event) =>
            onChange({
              ...value,
              montoPagadoClp: Number(event.target.value || 0),
            })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Estado pago</span>
        <select
          className={s.formInput}
          value={value.estadoPago}
          onChange={(event) =>
            onChange({
              ...value,
              estadoPago: event.target.value as GrowthPaymentStatus,
            })
          }
        >
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className={s.formField}>
        <span>Fecha inicio</span>
        <input
          type="date"
          className={s.formInput}
          value={value.fechaInicio}
          onChange={(event) =>
            onChange({ ...value, fechaInicio: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Fecha vencimiento</span>
        <input
          type="date"
          className={s.formInput}
          value={value.fechaVencimiento}
          onChange={(event) =>
            onChange({ ...value, fechaVencimiento: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Onboarding</span>
        <select
          className={s.formInput}
          value={value.onboarding}
          onChange={(event) =>
            onChange({
              ...value,
              onboarding: event.target.value as GrowthOnboardingStatus,
            })
          }
        >
          {ONBOARDING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className={`${s.formField} ${s.formFieldFull}`}>
        <span>Notas</span>
        <textarea
          className={s.formTextarea}
          value={value.notas}
          onChange={(event) => onChange({ ...value, notas: event.target.value })}
        />
      </label>
    </div>
  );
}

function MarketingFormFields({
  value,
  onChange,
}: {
  value: CreateGrowthMarketingTaskInput;
  onChange: (next: CreateGrowthMarketingTaskInput) => void;
}) {
  return (
    <div className={s.formGrid}>
      <label className={s.formField}>
        <span>Campaña / canal</span>
        <input
          className={s.formInput}
          value={value.campanaCanal}
          onChange={(event) =>
            onChange({ ...value, campanaCanal: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Mensaje usado</span>
        <input
          className={s.formInput}
          value={value.mensajeUsado}
          onChange={(event) =>
            onChange({ ...value, mensajeUsado: event.target.value })
          }
        />
      </label>
      <label className={`${s.formField} ${s.formFieldFull}`}>
        <span>Contenido pendiente</span>
        <textarea
          className={s.formTextarea}
          value={value.contenidoPendiente}
          onChange={(event) =>
            onChange({ ...value, contenidoPendiente: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Fecha</span>
        <input
          type="date"
          className={s.formInput}
          value={value.fecha}
          onChange={(event) =>
            onChange({ ...value, fecha: event.target.value })
          }
        />
      </label>
      <label className={s.formField}>
        <span>Estado</span>
        <select
          className={s.formInput}
          value={value.estado}
          onChange={(event) =>
            onChange({
              ...value,
              estado: event.target.value as GrowthMarketingStatus,
            })
          }
        >
          {MARKETING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className={`${s.formField} ${s.formFieldFull}`}>
        <span>Resultado</span>
        <textarea
          className={s.formTextarea}
          value={value.resultado}
          onChange={(event) =>
            onChange({ ...value, resultado: event.target.value })
          }
        />
      </label>
      <label className={`${s.formField} ${s.formFieldFull}`}>
        <span>Notas</span>
        <textarea
          className={s.formTextarea}
          value={value.notas}
          onChange={(event) => onChange({ ...value, notas: event.target.value })}
        />
      </label>
    </div>
  );
}
