"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuCalendar, LuMessageCircle, LuRotateCcw, LuX } from "react-icons/lu";

import { growthApiClient } from "@/features/growth/client/growth-api.client";
import { formatProspectActivity } from "@/features/growth/services/prospect-activity-display";
import {
  addDaysYmd,
  getTemplatesForProspect,
  pickRecommendedTemplate,
  resolveProspectWhatsappMessage,
  shouldUseRegisterContactPipeline,
  buildProspectTemplateContext,
  type ProspectWhatsappTemplate,
} from "@/features/growth/services/prospect-whatsapp-templates";
import {
  buildWhatsappUrl,
  getProspectStatusLabel,
} from "@/features/growth/services/prospectos-workspace.service";
import type {
  GrowthProspect,
  UpdateGrowthProspectInput,
} from "@/features/growth/types/growth-dashboard";
import s from "./prospectos-workspace.module.css";

type GrowthActivity = {
  id: string;
  tipo: string;
  canal?: string | null;
  contenido: string | null;
  metadata_json?: Record<string, unknown> | null;
  creado_en: string;
};

type FollowupOutcome =
  | "sin_respuesta"
  | "interesado"
  | "mas_informacion"
  | "demo_agendada"
  | "no_interesado"
  | "contactar_despues";

type WhatsappPendingSend = {
  templateId: string;
  templateName: string;
  message: string;
};

type ProspectDetailDrawerProps = {
  prospect: GrowthProspect | null;
  statusLabel: string;
  onClose: () => void;
  onAdvance: (prospectId: string) => Promise<void>;
  onUpdate: (prospectId: string, patch: UpdateGrowthProspectInput) => Promise<void>;
  onRegisterContact: (
    prospectId: string,
    input: { canal?: string; contenido?: string }
  ) => Promise<void>;
};

const FOLLOWUP_OUTCOMES: Array<{ id: FollowupOutcome; label: string }> = [
  { id: "sin_respuesta", label: "Sin respuesta" },
  { id: "interesado", label: "Interesado" },
  { id: "mas_informacion", label: "Pidió más información" },
  { id: "demo_agendada", label: "Demo agendada" },
  { id: "no_interesado", label: "No interesado" },
  { id: "contactar_despues", label: "Contactar después" },
];

export function ProspectDetailDrawer({
  prospect,
  statusLabel,
  onClose,
  onAdvance,
  onUpdate,
  onRegisterContact,
}: ProspectDetailDrawerProps) {
  const [activities, setActivities] = useState<GrowthActivity[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [messageEdited, setMessageEdited] = useState(false);

  const [whatsappPending, setWhatsappPending] = useState<WhatsappPendingSend | null>(
    null
  );
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [confirmAdvanceState, setConfirmAdvanceState] = useState(false);

  const [followupOutcome, setFollowupOutcome] = useState<FollowupOutcome | "">("");
  const [followupNote, setFollowupNote] = useState("");
  const [followupNextAction, setFollowupNextAction] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [lostReason, setLostReason] = useState("");

  const availableTemplates = useMemo(
    () => (prospect ? getTemplatesForProspect(prospect) : []),
    [prospect]
  );

  const selectedTemplate = useMemo(
    () => availableTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [availableTemplates, selectedTemplateId]
  );

  const templateContext = useMemo(
    () => (prospect ? buildProspectTemplateContext(prospect) : null),
    [prospect]
  );

  const resolvedBaseline = useMemo(() => {
    if (!prospect || !selectedTemplate) {
      return "";
    }
    return resolveProspectWhatsappMessage(prospect, selectedTemplate);
  }, [prospect, selectedTemplate]);

  const whatsappUrl = prospect
    ? buildWhatsappUrl(prospect.whatsapp, messageDraft.trim())
    : null;

  const reloadActivities = useCallback(async (prospectId: string) => {
    const response = await fetch(
      `/api/admin/growth/activities?prospectId=${prospectId}`
    );
    const payload = (await response.json()) as {
      activities?: GrowthActivity[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "No pudimos cargar actividad.");
    }

    setActivities(payload.activities ?? []);
  }, []);

  useEffect(() => {
    if (!prospect) {
      setActivities([]);
      setSelectedTemplateId("");
      setMessageDraft("");
      setMessageEdited(false);
      setWhatsappPending(null);
      setShowSendConfirm(false);
      return;
    }

    const recommended = pickRecommendedTemplate(prospect, getTemplatesForProspect(prospect));
    if (recommended) {
      setSelectedTemplateId(recommended.id);
      setMessageDraft(resolveProspectWhatsappMessage(prospect, recommended));
      setMessageEdited(false);
    }

    let cancelled = false;

    async function loadActivities() {
      try {
        await reloadActivities(prospect!.id);
      } catch {
        if (!cancelled) {
          setActivities([]);
        }
      }
    }

    void loadActivities();

    return () => {
      cancelled = true;
    };
  }, [prospect, reloadActivities]);

  useEffect(() => {
    if (!prospect || messageEdited || !selectedTemplate) {
      return;
    }
    setMessageDraft(resolvedBaseline);
  }, [prospect, messageEdited, selectedTemplate, resolvedBaseline]);

  useEffect(() => {
    if (!followupOutcome) {
      return;
    }

    if (followupOutcome === "sin_respuesta") {
      setFollowupDate((current) => current || addDaysYmd(3));
      setFollowupNextAction((current) => current || "Follow-up sin respuesta");
      return;
    }

    if (followupOutcome === "interesado") {
      setFollowupNextAction((current) => current || "Agendar demo o activar trial");
      return;
    }

    if (followupOutcome === "demo_agendada") {
      setFollowupNextAction((current) => current || "Confirmar demo");
      return;
    }

    if (followupOutcome === "contactar_despues") {
      setFollowupDate((current) => current || addDaysYmd(7));
    }
  }, [followupOutcome]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && whatsappPending) {
        setShowSendConfirm(true);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [whatsappPending]);

  async function runAction(action: () => Promise<void>) {
    setIsBusy(true);
    setError(null);

    try {
      await action();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "No pudimos completar la acción."
      );
    } finally {
      setIsBusy(false);
    }
  }

  function handleTemplateChange(templateId: string) {
    if (!prospect) {
      return;
    }

    const template = availableTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setSelectedTemplateId(templateId);
    setMessageDraft(resolveProspectWhatsappMessage(prospect, template));
    setMessageEdited(false);
  }

  function handleRestoreTemplate() {
    if (!prospect || !selectedTemplate) {
      return;
    }

    setMessageDraft(resolveProspectWhatsappMessage(prospect, selectedTemplate));
    setMessageEdited(false);
  }

  async function logActivity(
    prospectId: string,
    input: {
      tipo: string;
      contenido?: string;
      canal?: string;
      metadata_json?: Record<string, unknown>;
    }
  ) {
    await growthApiClient.insertActivity({
      prospect_id: prospectId,
      ...input,
    });
    await reloadActivities(prospectId);
  }

  async function handleOpenWhatsapp() {
    if (!prospect || !selectedTemplate || !whatsappUrl) {
      return;
    }

    setWhatsappPending({
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      message: messageDraft.trim(),
    });

    await logActivity(prospect.id, {
      tipo: "nota",
      contenido: selectedTemplate.name,
      canal: "whatsapp",
      metadata_json: {
        kind: "plantilla_preparada",
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
      },
    });

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  async function handleConfirmWhatsappSent(registered: boolean) {
    if (!prospect || !whatsappPending) {
      setShowSendConfirm(false);
      return;
    }

    if (registered) {
      await runAction(async () => {
        if (shouldUseRegisterContactPipeline(prospect)) {
          await onRegisterContact(prospect.id, {
            canal: "whatsapp",
            contenido: `[${whatsappPending.templateName}]\n${whatsappPending.message}`,
          });
        } else {
          await logActivity(prospect.id, {
            tipo: "mensaje_enviado",
            canal: "whatsapp",
            contenido: whatsappPending.message,
            metadata_json: {
              templateId: whatsappPending.templateId,
              templateName: whatsappPending.templateName,
            },
          });
        }

        if (confirmAdvanceState) {
          await onAdvance(prospect.id);
        }

        await reloadActivities(prospect.id);
      });
    }

    setWhatsappPending(null);
    setShowSendConfirm(false);
    setConfirmAdvanceState(false);
  }

  function handleCloseRequest() {
    if (whatsappPending) {
      setShowSendConfirm(true);
      return;
    }
    onClose();
  }

  async function handleSaveFollowup() {
    if (!prospect) {
      return;
    }

    const outcomeLabel =
      FOLLOWUP_OUTCOMES.find((item) => item.id === followupOutcome)?.label ?? "";

    await runAction(async () => {
      const patch: UpdateGrowthProspectInput = {};

      if (followupNextAction.trim()) {
        patch.proximoPaso = followupNextAction.trim();
      }

      if (followupDate) {
        patch.fechaProximoSeguimiento = followupDate;
      }

      if (followupOutcome === "interesado") {
        patch.estado = "respondio";
        if (!patch.proximoPaso) {
          patch.proximoPaso = "Agendar demo o activar trial";
        }
      }

      if (followupOutcome === "demo_agendada") {
        patch.estado = "demo_agendada";
        if (!patch.proximoPaso) {
          patch.proximoPaso = "Hacer demo";
        }
      }

      if (followupOutcome === "no_interesado") {
        patch.estado = "perdido";
        if (lostReason.trim()) {
          patch.notas = [prospect.notas, `Motivo: ${lostReason.trim()}`]
            .filter(Boolean)
            .join("\n\n");
        }
      }

      if (Object.keys(patch).length > 0) {
        await onUpdate(prospect.id, patch);
      }

      await logActivity(prospect.id, {
        tipo: followupDate ? "followup" : "nota",
        contenido: followupNote.trim() || outcomeLabel || "Seguimiento registrado",
        canal: "whatsapp",
        metadata_json: {
          kind: "seguimiento",
          resultLabel: outcomeLabel || undefined,
          followupDate: followupDate || undefined,
          nextAction: followupNextAction.trim() || undefined,
        },
      });

      setFollowupNote("");
      setFollowupOutcome("");
      setFollowupNextAction("");
      setFollowupDate("");
      setLostReason("");
    });
  }

  if (!prospect) {
    return null;
  }

  const timelineItems = activities.map(formatProspectActivity);

  return (
    <>
      <button
        type="button"
        className={s.drawerBackdrop}
        aria-label="Cerrar detalle"
        onClick={handleCloseRequest}
      />

      <aside className={s.drawer} aria-label="Detalle del prospecto">
        <div className={s.drawerHeader}>
          <div>
            <h3>{prospect.empresa}</h3>
            <p>{statusLabel || getProspectStatusLabel(prospect.estado)}</p>
          </div>
          <button type="button" className={s.iconBtn} onClick={handleCloseRequest}>
            <LuX aria-hidden />
          </button>
        </div>

        {error ? <div className={s.bannerError}>{error}</div> : null}

        {showSendConfirm && whatsappPending ? (
          <div className={s.whatsappConfirm}>
            <p>¿Enviaste este mensaje?</p>
            <span className={s.whatsappConfirmHint}>{whatsappPending.templateName}</span>
            <label className={s.whatsappConfirmCheck}>
              <input
                type="checkbox"
                checked={confirmAdvanceState}
                onChange={(event) => setConfirmAdvanceState(event.target.checked)}
              />
              También avanzar estado del pipeline
            </label>
            <div className={s.whatsappConfirmActions}>
              <button
                type="button"
                className={s.primaryBtn}
                disabled={isBusy}
                onClick={() => void handleConfirmWhatsappSent(true)}
              >
                Sí, registrar contacto
              </button>
              <button
                type="button"
                className={s.secondaryBtn}
                disabled={isBusy}
                onClick={() => void handleConfirmWhatsappSent(false)}
              >
                No, mantener igual
              </button>
            </div>
          </div>
        ) : null}

        <div className={s.drawerBody}>
          <dl className={s.detailList}>
            <div>
              <dt>Contacto</dt>
              <dd>{prospect.nombre || "—"}</dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>{prospect.whatsapp || "—"}</dd>
            </div>
            <div>
              <dt>Ciudad</dt>
              <dd>{prospect.ciudad || "—"}</dd>
            </div>
            <div>
              <dt>Origen</dt>
              <dd>{prospect.origen || "—"}</dd>
            </div>
            <div>
              <dt>Próxima acción</dt>
              <dd>{prospect.proximoPaso || "—"}</dd>
            </div>
            <div>
              <dt>Siguiente seguimiento</dt>
              <dd>{prospect.fechaProximoSeguimiento || "—"}</dd>
            </div>
            <div>
              <dt>Notas</dt>
              <dd>{prospect.notas || "Sin notas"}</dd>
            </div>
          </dl>

          <section className={s.whatsappBlock} aria-labelledby="whatsapp-message-title">
            <div className={s.whatsappBlockHeader}>
              <h4 id="whatsapp-message-title">Mensaje para WhatsApp</h4>
              {messageEdited && selectedTemplate ? (
                <button
                  type="button"
                  className={s.ghostBtn}
                  onClick={handleRestoreTemplate}
                >
                  <LuRotateCcw aria-hidden />
                  Restaurar plantilla
                </button>
              ) : null}
            </div>

            <label className={s.whatsappField}>
              <span>Plantilla</span>
              <select
                value={selectedTemplateId}
                onChange={(event) => handleTemplateChange(event.target.value)}
              >
                {availableTemplates.map((template: ProspectWhatsappTemplate) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={s.whatsappField}>
              <span>Vista previa</span>
              <textarea
                rows={5}
                value={messageDraft}
                onChange={(event) => {
                  setMessageDraft(event.target.value);
                  setMessageEdited(event.target.value !== resolvedBaseline);
                }}
              />
            </label>

            {templateContext ? (
              <div className={s.templateVars}>
                {(
                  [
                    ["Empresa", templateContext.empresa],
                    ["Contacto", templateContext.contacto],
                    ["Ciudad", templateContext.ciudad],
                    ["Rubro", templateContext.rubro],
                    ["Origen", templateContext.origen],
                  ] as const
                )
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <span key={label}>
                      {label}: {value}
                    </span>
                  ))}
              </div>
            ) : null}

            <span className={s.charCount}>{messageDraft.length} caracteres</span>
          </section>

          <div className={s.drawerActions}>
            {whatsappUrl ? (
              <button
                type="button"
                className={s.primaryBtn}
                disabled={isBusy || !messageDraft.trim()}
                onClick={() => void runAction(handleOpenWhatsapp)}
              >
                <LuMessageCircle aria-hidden />
                WhatsApp
              </button>
            ) : null}
            <button
              type="button"
              className={s.secondaryBtn}
              disabled={isBusy}
              onClick={() =>
                void runAction(async () => {
                  await onUpdate(prospect.id, { estado: "demo_agendada" });
                })
              }
            >
              <LuCalendar aria-hidden />
              Agendar demo
            </button>
            <Link href="/admin/clientes#crear-trial" className={s.secondaryBtn}>
              Crear trial
            </Link>
          </div>

          <div className={s.followupBox}>
            <label htmlFor="followup-outcome">Registrar seguimiento</label>
            <select
              id="followup-outcome"
              value={followupOutcome}
              onChange={(event) =>
                setFollowupOutcome(event.target.value as FollowupOutcome | "")
              }
            >
              <option value="">Resultado (opcional)</option>
              {FOLLOWUP_OUTCOMES.map((outcome) => (
                <option key={outcome.id} value={outcome.id}>
                  {outcome.label}
                </option>
              ))}
            </select>

            <textarea
              id="followup-note"
              rows={2}
              value={followupNote}
              onChange={(event) => setFollowupNote(event.target.value)}
              placeholder="Nota breve (opcional)"
            />

            <input
              type="text"
              value={followupNextAction}
              onChange={(event) => setFollowupNextAction(event.target.value)}
              placeholder="Próxima acción (opcional)"
            />

            <input
              type="date"
              value={followupDate}
              onChange={(event) => setFollowupDate(event.target.value)}
              aria-label="Fecha de siguiente seguimiento"
            />

            {followupOutcome === "no_interesado" ? (
              <input
                type="text"
                value={lostReason}
                onChange={(event) => setLostReason(event.target.value)}
                placeholder="Motivo (opcional)"
              />
            ) : null}

            <button
              type="button"
              className={s.secondaryBtn}
              disabled={isBusy}
              onClick={() => void handleSaveFollowup()}
            >
              Guardar seguimiento
            </button>
          </div>

          <div className={s.drawerActions}>
            <button
              type="button"
              className={s.secondaryBtn}
              disabled={isBusy}
              onClick={() => void runAction(async () => onAdvance(prospect.id))}
            >
              Avanzar estado
            </button>
            <button
              type="button"
              className={s.secondaryBtn}
              disabled={isBusy}
              onClick={() =>
                void runAction(async () => {
                  await onUpdate(prospect.id, { estado: "pagado" });
                })
              }
            >
              Marcar ganado
            </button>
            <button
              type="button"
              className={s.dangerBtn}
              disabled={isBusy}
              onClick={() =>
                void runAction(async () => {
                  await onUpdate(prospect.id, { estado: "perdido" });
                })
              }
            >
              Marcar perdido
            </button>
          </div>

          <div className={s.timelineBlock}>
            <h4>Timeline</h4>
            {timelineItems.length === 0 ? (
              <p className={s.emptyCompact}>Sin actividad registrada aún.</p>
            ) : (
              <ul className={s.moveList}>
                {timelineItems.map((activity) => (
                  <li key={activity.id}>
                    <div className={s.moveItemStatic}>
                      <strong>{activity.title}</strong>
                      {activity.subtitle ? <span>{activity.subtitle}</span> : null}
                      <span>{new Date(activity.at).toLocaleString("es-CL")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
