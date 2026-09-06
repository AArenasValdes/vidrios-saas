import {
  buildAttentionLeads,
  buildSalesFunnel,
  buildSprintProgress,
  buildWeekPlan,
  hasSalesFunnelSignal,
  mapContentStatusToWeekStatus,
} from "@/features/admin/services/admin-marketing-command-center.logic";
import type { MarketingProspectSnapshot } from "@/features/admin/types/admin-marketing";

function prospect(
  partial: Partial<MarketingProspectSnapshot> & Pick<MarketingProspectSnapshot, "id" | "estado">
): MarketingProspectSnapshot {
  return {
    empresa: "Vidriería Rojas",
    contactoNombre: "Carlos Rojas",
    fuente: "Facebook",
    channelId: "grupos",
    commercialState: "prospecto",
    convertedOrganizationId: null,
    noContactar: false,
    dataStatus: "real",
    creadoEn: "2026-09-01T12:00:00.000Z",
    actualizadoEn: "2026-09-01T12:00:00.000Z",
    proximaAccionEn: null,
    ...partial,
  };
}

describe("admin-marketing-command-center.logic", () => {
  it("arma el embudo con alcance y DEMO de grupos más pipeline real", () => {
    const stages = buildSalesFunnel({
      groups: [
        {
          grupoNombre: "Maestros instaladores",
          grupoSegmento: "Maestros instaladores",
          grupoRegion: "Chile",
          publicaciones: 2,
          alcance: 220,
          interacciones: 10,
          comentarios: 1,
          mensajesDemo: 29,
          demos: 2,
          pagos: 1,
          metricasRegistradas: true,
        },
      ],
      acquisitionFunnel: [
        { id: "prospectos", label: "Prospectos", count: 40, pctOfPrevious: null, pctOfTotal: 100, hasRealSignal: true },
        { id: "contactados", label: "Contactados", count: 12, pctOfPrevious: 30, pctOfTotal: 30, hasRealSignal: true },
        { id: "demo", label: "Demo", count: 7, pctOfPrevious: 58, pctOfTotal: 18, hasRealSignal: true },
        { id: "trial", label: "Trial", count: 3, pctOfPrevious: 43, pctOfTotal: 8, hasRealSignal: true },
        { id: "pagado", label: "Pagado", count: 1, pctOfPrevious: 33, pctOfTotal: 3, hasRealSignal: true },
      ],
      prospects: [
        prospect({ id: "1", estado: "contactado", commercialState: "contactado" }),
        prospect({ id: "2", estado: "contactado", commercialState: "contactado" }),
        prospect({ id: "mock", estado: "contactado", commercialState: "contactado", dataStatus: "mock" }),
      ],
    });

    expect(stages.map((stage) => [stage.id, stage.count])).toEqual([
      ["grupo", 220],
      ["demo_msg", 29],
      ["conversaciones", 2],
      ["demos", 7],
      ["pilotos", 3],
      ["pagos", 1],
    ]);
    expect(hasSalesFunnelSignal(stages)).toBe(true);
  });

  it("prioriza seguimientos vencidos y no inventa leads mock", () => {
    const leads = buildAttentionLeads(
      [
        prospect({
          id: "overdue",
          estado: "contactado",
          commercialState: "contactado",
          proximaAccionEn: "2026-09-04T00:00:00.000Z",
        }),
        prospect({
          id: "fresh",
          estado: "nuevo",
          contactoNombre: "Ana",
          empresa: "Aluminios Sur",
        }),
        prospect({
          id: "mock",
          estado: "contactado",
          commercialState: "contactado",
          dataStatus: "mock",
          proximaAccionEn: "2026-09-01T00:00:00.000Z",
        }),
      ],
      new Date("2026-09-06T15:00:00.000Z")
    );

    expect(leads[0]?.id).toBe("overdue");
    expect(leads[0]?.ctaLabel).toBe("Agendar demo");
    expect(leads[0]?.nextActionTone).toBe("overdue");
    expect(leads.map((lead) => lead.id)).toEqual(["overdue", "fresh"]);
  });

  it("mapea estados editoriales a la semana sin crear estados nuevos en persistencia", () => {
    expect(mapContentStatusToWeekStatus({ estado: "borrador", hasManualMetrics: false })).toBe("idea");
    expect(mapContentStatusToWeekStatus({ estado: "revision", hasManualMetrics: false })).toBe("guion");
    expect(mapContentStatusToWeekStatus({ estado: "aprobado", hasManualMetrics: false })).toBe("editado");
    expect(mapContentStatusToWeekStatus({ estado: "programado", hasManualMetrics: false })).toBe("programado");
    expect(mapContentStatusToWeekStatus({ estado: "publicado", hasManualMetrics: false })).toBe("publicado");
    expect(mapContentStatusToWeekStatus({ estado: "publicado", hasManualMetrics: true })).toBe("medir");
  });

  it("arma la semana lunes a domingo en Santiago y deja días vacíos para agregar al plan", () => {
    const week = buildWeekPlan(
      [
        {
          id: "a",
          title: "Demo mampara",
          formato: "reel",
          canal: "grupos",
          estado: "publicado",
          grupoNombre: "Grupo Maestros",
          programadoPara: null,
          publicadoEn: "2026-09-06T15:00:00.000Z",
          actualizadoEn: "2026-09-06T15:00:00.000Z",
          hasManualMetrics: true,
        },
      ],
      new Date("2026-09-06T15:00:00.000Z")
    );

    expect(week).toHaveLength(7);
    expect(week[0]?.dateKey).toBe("2026-08-31");
    expect(week[6]?.dateKey).toBe("2026-09-06");
    expect(week[6]?.item?.status).toBe("medir");
    expect(week[6]?.item?.actionText).toBe("Ver resultados");
    expect(week[0]?.item).toBeNull();
  });

  it("calcula el sprint con acciones reales y no inventa el hito", () => {
    const sprint = buildSprintProgress({
      now: new Date("2026-09-06T15:00:00.000Z"),
      groupPublications: 0,
      nowActions: [
        { id: "onboarding", title: "", detail: "", ctaLabel: "", href: "", done: true },
        { id: "demo_celular", title: "", detail: "", ctaLabel: "", href: "", done: true },
        { id: "utm", title: "", detail: "", ctaLabel: "", href: "", done: false },
      ],
      nextActions: [
        { id: "publicaciones", title: "", detail: "", current: 0, target: 3, href: "" },
        { id: "seguimientos", title: "", detail: "", current: 0, target: null, href: "" },
      ],
    });

    expect(sprint.title).toBe("Semana 1 de 30 — Chile Sales Sprint");
    expect(sprint.completed).toBe(3);
    expect(sprint.total).toBe(7);
    expect(sprint.nextMilestone).toBe("Completar UTM de las piezas listas");
  });
});
