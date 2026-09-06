"use client";

import { FormEvent, useMemo, useState } from "react";
import { LuChevronDown, LuMonitor, LuPlus, LuSave, LuSmartphone, LuTrash2 } from "react-icons/lu";

import { useGrowthContent } from "@/features/growth/hooks/use-growth-content";
import {
  GROWTH_CLAIM_REVIEW_STATUSES,
  GROWTH_CONTENT_CHANNELS,
  GROWTH_CONTENT_FORMATS,
  GROWTH_CONTENT_OBJECTIVES,
  GROWTH_CONTENT_PILLARS,
  GROWTH_CONTENT_STATUSES,
  type CreateGrowthContentItemInput,
  type GrowthContentItem,
  type UpdateGrowthContentItemInput,
} from "@/features/growth/types/growth-content";
import s from "./admin-marketing-content-control.module.css";

type ContentForm = {
  contentId: string;
  titulo: string;
  pilar: CreateGrowthContentItemInput["pilar"];
  formato: CreateGrowthContentItemInput["formato"];
  canal: CreateGrowthContentItemInput["canal"];
  objetivo: NonNullable<CreateGrowthContentItemInput["objetivo"]>;
  hook: string;
  cta: string;
  guion: string;
  caption: string;
  campaignKey: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  estado: NonNullable<CreateGrowthContentItemInput["estado"]>;
  claimReviewStatus: NonNullable<CreateGrowthContentItemInput["claimReviewStatus"]>;
  claimReviewNotes: string;
  programadoPara: string;
  grupoNombre: string;
  grupoSegmento: string;
  grupoRegion: string;
  alcance: string;
  interacciones: string;
  comentarios: string;
  mensajesDemo: string;
  demos: string;
  pagos: string;
};

const PILLAR_LABELS = {
  dolor_transformacion: "Dolor → transformación",
  demo_producto: "Demo de producto",
  onboarding: "Onboarding",
  objecion: "Objeción",
  oferta: "Oferta",
} as const;

const OBJECTIVE_LABELS = {
  generar_demos: "Generar demos",
  activar_prueba: "Activar prueba",
  primera_cotizacion: "Primera cotización",
  primer_pdf: "Primer PDF",
  configurar_lineas: "Configurar líneas",
  aclarar_objecion: "Aclarar objeción",
} as const;

const STATUS_LABELS = {
  borrador: "Borrador",
  revision: "En revisión",
  aprobado: "Aprobado",
  programado: "Programado",
  publicado: "Publicado",
  pausado: "Pausado",
  ganador: "Ganador",
  archivado: "Archivado",
} as const;

const CLAIM_LABELS = {
  pendiente: "Claim pendiente",
  aprobado: "Claim aprobado",
  bloqueado: "Claim bloqueado",
} as const;

const GROUP_SEGMENTS = [
  "Fabricantes de ventanas PVC",
  "Talleres de aluminio",
  "Vidrierías",
  "Maestros instaladores",
  "Shower y cierres",
  "Talleres pequeños",
] as const;

const CONTENT_STARTERS: Array<{
  id: string;
  label: string;
  description: string;
  device: "movil" | "escritorio";
  form: Partial<ContentForm>;
}> = [
  {
    id: "cotizacion-celular",
    label: "Demostración desde celular",
    description: "Cotización rápida → PDF → WhatsApp.",
    device: "movil",
    form: {
      contentId: "reel-cotiza-celular-01",
      titulo: "Cotiza desde la obra y envía un PDF",
      pilar: "demo_producto",
      objetivo: "generar_demos",
      hook: "¿Todavía llegas a casa a hacer presupuestos?",
      campaignKey: "onboarding_celular",
      utmCampaign: "onboarding_celular",
      utmContent: "reel_cotiza_celular_01",
      guion: "1. Nueva cotización.\n2. Cliente y precio del trabajo.\n3. Resumen y PDF.\n4. Envío por WhatsApp.\n5. CTA: Escríbeme DEMO.",
    },
  },
  {
    id: "lineas-escritorio",
    label: "Demostración desde computador",
    description: "Líneas y precios → cotización por ítems.",
    device: "escritorio",
    form: {
      contentId: "reel-lineas-escritorio-01",
      titulo: "Configura tus líneas y cotiza por ítems",
      pilar: "demo_producto",
      objetivo: "configurar_lineas",
      hook: "Configura tu línea una vez y úsala al cotizar.",
      campaignKey: "lineas_escritorio",
      utmCampaign: "lineas_escritorio",
      utmContent: "reel_lineas_escritorio_01",
      guion: "1. Abre una línea común.\n2. Ajusta precio y datos comerciales.\n3. Crea una cotización por ítems.\n4. Muestra que también puede continuar desde el celular.\n5. CTA: Te muestro una cotización real.",
    },
  },
  ...GROUP_SEGMENTS.map((segment, index) => ({
    id: `grupo-${index + 1}`,
    label: `Grupo · ${segment}`,
    description: "Publicación adaptada para un grupo especializado.",
    device: "movil" as const,
    form: {
      contentId: `grupo-${index + 1}-cotiza-obra`,
      titulo: `Cotizar mejor en ${segment.toLowerCase()}`,
      pilar: "dolor_transformacion" as const,
      formato: "carrusel" as const,
      canal: "grupos" as const,
      objetivo: "generar_demos" as const,
      hook: "¿Sigues armando presupuestos entre WhatsApp, Excel y notas?",
      campaignKey: "chile_sales_sprint_30d",
      utmSource: "facebook",
      utmMedium: "group",
      utmCampaign: "chile_sales_sprint_30d",
      utmContent: `grupo_${index + 1}`,
      grupoSegmento: segment,
      guion: `1. Presentar el dolor de ${segment.toLowerCase()}.\n2. Mostrar una cotización real desde el celular.\n3. Explicar PDF y WhatsApp.\n4. CTA: Escríbeme DEMO.`,
    },
  })),
];

function parseMetric(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function emptyForm(): ContentForm {
  return {
    contentId: "",
    titulo: "",
    pilar: "demo_producto",
    formato: "reel",
    canal: "instagram",
    objetivo: "generar_demos",
    hook: "",
    cta: "Escríbeme DEMO",
    guion: "",
    caption: "",
    campaignKey: "",
    utmSource: "instagram",
    utmMedium: "organic",
    utmCampaign: "",
    utmContent: "",
    estado: "borrador",
    claimReviewStatus: "pendiente",
    claimReviewNotes: "",
    programadoPara: "",
    grupoNombre: "",
    grupoSegmento: "",
    grupoRegion: "",
    alcance: "",
    interacciones: "",
    comentarios: "",
    mensajesDemo: "",
    demos: "",
    pagos: "",
  };
}

function itemToForm(item: GrowthContentItem): ContentForm {
  return {
    contentId: item.contentId,
    titulo: item.titulo,
    pilar: item.pilar,
    formato: item.formato,
    canal: item.canal,
    objetivo: item.objetivo,
    hook: item.hook ?? "",
    cta: item.cta,
    guion: item.guion ?? "",
    caption: item.caption ?? "",
    campaignKey: item.campaignKey ?? "",
    utmSource: item.utmSource ?? "",
    utmMedium: item.utmMedium ?? "",
    utmCampaign: item.utmCampaign ?? "",
    utmContent: item.utmContent ?? "",
    estado: item.estado,
    claimReviewStatus: item.claimReviewStatus,
    claimReviewNotes: item.claimReviewNotes ?? "",
    programadoPara: item.programadoPara ? item.programadoPara.slice(0, 16) : "",
    grupoNombre: item.metadata.grupoNombre ?? "",
    grupoSegmento: item.metadata.grupoSegmento ?? "",
    grupoRegion: item.metadata.grupoRegion ?? "",
    alcance: item.metadata.metricas.alcance?.toString() ?? "",
    interacciones: item.metadata.metricas.interacciones?.toString() ?? "",
    comentarios: item.metadata.metricas.comentarios?.toString() ?? "",
    mensajesDemo: item.metadata.metricas.mensajesDemo?.toString() ?? "",
    demos: item.metadata.metricas.demos?.toString() ?? "",
    pagos: item.metadata.metricas.pagos?.toString() ?? "",
  };
}

function formToInput(form: ContentForm): CreateGrowthContentItemInput {
  return {
    ...form,
    hook: form.hook || null,
    guion: form.guion || null,
    caption: form.caption || null,
    campaignKey: form.campaignKey || null,
    utmSource: form.utmSource || null,
    utmMedium: form.utmMedium || null,
    utmCampaign: form.utmCampaign || null,
    utmContent: form.utmContent || null,
    claimReviewNotes: form.claimReviewNotes || null,
    programadoPara: form.programadoPara || null,
    metadata: {
      grupoNombre: form.grupoNombre || null,
      grupoSegmento: form.grupoSegmento || null,
      grupoRegion: form.grupoRegion || null,
      publicacionUrl: null,
      piezaBaseId: null,
      metricas: {
        alcance: parseMetric(form.alcance),
        interacciones: parseMetric(form.interacciones),
        comentarios: parseMetric(form.comentarios),
        mensajesDemo: parseMetric(form.mensajesDemo),
        demos: parseMetric(form.demos),
        pagos: parseMetric(form.pagos),
      },
    },
  };
}

function statusClass(status: GrowthContentItem["estado"]) {
  if (status === "publicado" || status === "ganador") return s.statusLive;
  if (status === "programado" || status === "aprobado") return s.statusReady;
  if (status === "pausado" || status === "archivado") return s.statusMuted;
  return s.statusDraft;
}

function claimClass(status: GrowthContentItem["claimReviewStatus"]) {
  if (status === "aprobado") return s.claimApproved;
  if (status === "bloqueado") return s.claimBlocked;
  return s.claimPending;
}

export function AdminMarketingContentControl() {
  const content = useGrowthContent();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composer, setComposer] = useState<ContentForm>(emptyForm);
  const [drafts, setDrafts] = useState<Record<string, ContentForm>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const summary = useMemo(() => ({
    total: content.items.length,
    ready: content.items.filter((item) => item.estado === "programado" || item.estado === "publicado").length,
    pendingClaims: content.items.filter((item) => item.claimReviewStatus !== "aprobado").length,
  }), [content.items]);

  function setComposerField<K extends keyof ContentForm>(key: K, value: ContentForm[K]) {
    setComposer((current) => ({ ...current, [key]: value }));
  }

  function startFromTemplate(template: (typeof CONTENT_STARTERS)[number]) {
    setComposer({ ...emptyForm(), ...template.form });
    setIsComposerOpen(true);
  }

  function draftFor(item: GrowthContentItem) {
    return drafts[item.id] ?? itemToForm(item);
  }

  function setDraftField<K extends keyof ContentForm>(item: GrowthContentItem, key: K, value: ContentForm[K]) {
    setDrafts((current) => ({
      ...current,
      [item.id]: { ...draftFor(item), [key]: value },
    }));
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setIsSaving(true);
    try {
      await content.create(formToInput(composer));
      setComposer(emptyForm());
      setIsComposerOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No pudimos guardar la pieza.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveItem(item: GrowthContentItem) {
    setActionError(null);
    setIsSaving(true);
    try {
      const input: UpdateGrowthContentItemInput = { id: item.id, ...formToInput(draftFor(item)) };
      await content.update(input);
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No pudimos actualizar la pieza.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeItem(item: GrowthContentItem) {
    if (!window.confirm(`Archivar “${item.titulo}”? La pieza no se borrará de forma definitiva.`)) return;
    setActionError(null);
    try {
      await content.update({ id: item.id, eliminado: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No pudimos archivar la pieza.");
    }
  }

  return (
    <section className={s.section} aria-label="Control editorial de marketing">
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Paso 2 · Publica contenido</p>
          <h2>Crea la siguiente demostración</h2>
          <p>Parte con un video real. Antes de programarlo, completa la UTM y revisa el claim.</p>
        </div>
        <button className={s.primaryButton} type="button" onClick={() => setIsComposerOpen((open) => !open)}>
          <LuPlus aria-hidden /> Nueva pieza
        </button>
      </div>

      <div className={s.summary}>
        <span><strong>{summary.total}</strong> piezas</span>
        <span><strong>{summary.ready}</strong> programadas/publicadas</span>
        <span><strong>{summary.pendingClaims}</strong> claims por revisar</span>
      </div>

      <div className={s.starters} aria-label="Piezas recomendadas para empezar">
        <div className={s.startersCopy}>
          <strong>No empieces desde cero</strong>
          <span>Elige una base y deja el guion listo para editar.</span>
        </div>
        <div className={s.starterActions}>
          {CONTENT_STARTERS.map((starter) => {
            const Icon = starter.device === "movil" ? LuSmartphone : LuMonitor;
            return (
              <button key={starter.id} type="button" className={s.starterButton} onClick={() => startFromTemplate(starter)}>
                <Icon aria-hidden />
                <span><strong>{starter.label}</strong><small>{starter.description}</small></span>
              </button>
            );
          })}
        </div>
      </div>

      {actionError ? <p className={s.error}>{actionError}</p> : null}
      {content.error ? <p className={s.error}>{content.error}</p> : null}

      {isComposerOpen ? (
        <form className={s.composer} onSubmit={createItem}>
          <div className={s.composerTitle}>
            <h3>Nueva pieza</h3>
            <p>Parte por la promesa, define el CTA y deja la atribución lista antes de publicar.</p>
          </div>
          <ContentFields form={composer} onChange={setComposerField} />
          <div className={s.formActions}>
            <button className={s.secondaryButton} type="button" onClick={() => setIsComposerOpen(false)}>Cancelar</button>
            <button className={s.primaryButton} type="submit" disabled={isSaving}>{isSaving ? "Guardando…" : "Guardar borrador"}</button>
          </div>
        </form>
      ) : null}

      {content.isLoading ? <div className={s.empty}>Cargando cola editorial…</div> : null}
      {!content.isLoading && content.items.length === 0 ? (
        <div className={s.empty}>
          Aún no hay piezas. Crea primero el video móvil principal: cotizar en obra → PDF por WhatsApp.
        </div>
      ) : null}

      <div className={s.itemList}>
        {content.items.map((item) => {
          const draft = draftFor(item);
          const isUtmReady = Boolean(draft.utmSource && draft.utmMedium && draft.utmCampaign && draft.utmContent);
          return (
            <details className={s.item} key={item.id}>
              <summary>
                <span className={s.itemMain}>
                  <strong>{item.titulo}</strong>
                  <span>{item.contentId} · {PILLAR_LABELS[item.pilar]} · {item.canal}</span>
                </span>
                <span className={s.badges}>
                  <span className={`${s.badge} ${statusClass(item.estado)}`}>{STATUS_LABELS[item.estado]}</span>
                  <span className={`${s.badge} ${claimClass(item.claimReviewStatus)}`}>{CLAIM_LABELS[item.claimReviewStatus]}</span>
                  <LuChevronDown className={s.chevron} aria-hidden />
                </span>
              </summary>
              <div className={s.itemEditor}>
                <ContentFields form={draft} onChange={(key, value) => setDraftField(item, key, value)} />
                <p className={isUtmReady ? s.readyHint : s.pendingHint}>
                  {isUtmReady ? "UTM completa: source, medium, campaña y contenido listos." : "Faltan UTMs: completa las 4 antes de programar o publicar."}
                </p>
                <div className={s.formActions}>
                  <button className={s.deleteButton} type="button" onClick={() => void removeItem(item)}><LuTrash2 aria-hidden /> Archivar</button>
                  <button className={s.primaryButton} type="button" disabled={isSaving} onClick={() => void saveItem(item)}><LuSave aria-hidden /> Guardar cambios</button>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function ContentFields({
  form,
  onChange,
}: {
  form: ContentForm;
  onChange: <K extends keyof ContentForm>(key: K, value: ContentForm[K]) => void;
}) {
  return (
    <div className={s.fields}>
      <label><span>ID de pieza</span><input value={form.contentId} onChange={(event) => onChange("contentId", event.target.value)} placeholder="reel-cotiza-obra-01" required /></label>
      <label><span>Título</span><input value={form.titulo} onChange={(event) => onChange("titulo", event.target.value)} placeholder="Cotiza en obra desde tu teléfono" required /></label>
      <label><span>Pilar</span><select value={form.pilar} onChange={(event) => onChange("pilar", event.target.value as ContentForm["pilar"])}>{GROWTH_CONTENT_PILLARS.map((value) => <option key={value} value={value}>{PILLAR_LABELS[value]}</option>)}</select></label>
      <label><span>Formato</span><select value={form.formato} onChange={(event) => onChange("formato", event.target.value as ContentForm["formato"])}>{GROWTH_CONTENT_FORMATS.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></label>
      <label><span>Canal</span><select value={form.canal} onChange={(event) => onChange("canal", event.target.value as ContentForm["canal"])}>{GROWTH_CONTENT_CHANNELS.map((value) => <option key={value} value={value}>{value === "grupos" ? "Grupos de Facebook" : value}</option>)}</select></label>
      <label><span>Objetivo</span><select value={form.objetivo} onChange={(event) => onChange("objetivo", event.target.value as ContentForm["objetivo"])}>{GROWTH_CONTENT_OBJECTIVES.map((value) => <option key={value} value={value}>{OBJECTIVE_LABELS[value]}</option>)}</select></label>
      <label className={s.full}><span>Hook</span><input value={form.hook} onChange={(event) => onChange("hook", event.target.value)} placeholder="¿Todavía llegas a casa a hacer presupuestos?" /></label>
      <label><span>CTA</span><input value={form.cta} onChange={(event) => onChange("cta", event.target.value)} required /></label>
      <label><span>Estado</span><select value={form.estado} onChange={(event) => onChange("estado", event.target.value as ContentForm["estado"])}>{GROWTH_CONTENT_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label>
      <label><span>Revisión de claim</span><select value={form.claimReviewStatus} onChange={(event) => onChange("claimReviewStatus", event.target.value as ContentForm["claimReviewStatus"])}>{GROWTH_CLAIM_REVIEW_STATUSES.map((value) => <option key={value} value={value}>{CLAIM_LABELS[value]}</option>)}</select></label>
      <label><span>Programar para</span><input type="datetime-local" value={form.programadoPara} onChange={(event) => onChange("programadoPara", event.target.value)} /></label>
      <label className={s.full}><span>Campaña</span><input value={form.campaignKey} onChange={(event) => onChange("campaignKey", event.target.value)} placeholder="reels_cotiza_obra_aug26" /></label>
      <div className={`${s.utmFields} ${s.full}`}>
        <span>UTM de esta pieza</span>
        <label><input value={form.utmSource} onChange={(event) => onChange("utmSource", event.target.value)} placeholder="source" /></label>
        <label><input value={form.utmMedium} onChange={(event) => onChange("utmMedium", event.target.value)} placeholder="medium" /></label>
        <label><input value={form.utmCampaign} onChange={(event) => onChange("utmCampaign", event.target.value)} placeholder="campaign" /></label>
        <label><input value={form.utmContent} onChange={(event) => onChange("utmContent", event.target.value)} placeholder="content" /></label>
      </div>
      {form.canal === "grupos" ? (
        <>
          <div className={`${s.utmFields} ${s.full}`}>
            <span>Distribución en grupo</span>
            <label><span>Nombre del grupo</span><input value={form.grupoNombre} onChange={(event) => onChange("grupoNombre", event.target.value)} placeholder="Fabricantes PVC y aluminio Chile" required={form.estado === "programado" || form.estado === "publicado"} /></label>
            <label><span>Segmento</span><select value={form.grupoSegmento} onChange={(event) => onChange("grupoSegmento", event.target.value)}><option value="">Seleccionar</option>{GROUP_SEGMENTS.map((segment) => <option key={segment} value={segment}>{segment}</option>)}</select></label>
            <label><span>Región/cobertura</span><input value={form.grupoRegion} onChange={(event) => onChange("grupoRegion", event.target.value)} placeholder="Chile · RM" /></label>
          </div>
          <div className={`${s.utmFields} ${s.full}`}>
            <span>Resultados manuales · separados de prospectos</span>
            <label><span>Alcance</span><input inputMode="numeric" value={form.alcance} onChange={(event) => onChange("alcance", event.target.value)} placeholder="—" /></label>
            <label><span>Interacciones</span><input inputMode="numeric" value={form.interacciones} onChange={(event) => onChange("interacciones", event.target.value)} placeholder="—" /></label>
            <label><span>Comentarios</span><input inputMode="numeric" value={form.comentarios} onChange={(event) => onChange("comentarios", event.target.value)} placeholder="—" /></label>
            <label><span>Mensajes DEMO</span><input inputMode="numeric" value={form.mensajesDemo} onChange={(event) => onChange("mensajesDemo", event.target.value)} placeholder="—" /></label>
            <label><span>Demos</span><input inputMode="numeric" value={form.demos} onChange={(event) => onChange("demos", event.target.value)} placeholder="—" /></label>
            <label><span>Pagos</span><input inputMode="numeric" value={form.pagos} onChange={(event) => onChange("pagos", event.target.value)} placeholder="—" /></label>
          </div>
        </>
      ) : null}
      <label className={s.full}><span>Guion</span><textarea value={form.guion} onChange={(event) => onChange("guion", event.target.value)} placeholder="Qué mostrar, en qué orden y qué decir." rows={4} /></label>
      <label className={s.full}><span>Caption</span><textarea value={form.caption} onChange={(event) => onChange("caption", event.target.value)} placeholder="Texto del post y CTA." rows={3} /></label>
      <label className={s.full}><span>Notas de revisión de claim</span><textarea value={form.claimReviewNotes} onChange={(event) => onChange("claimReviewNotes", event.target.value)} placeholder="Fuente, alcance y frase aprobada para publicar." rows={2} /></label>
    </div>
  );
}
