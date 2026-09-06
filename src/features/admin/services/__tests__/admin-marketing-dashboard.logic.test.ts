import {
  buildContentHighlights,
  buildGroupPerformance,
  buildNextActions,
  buildNowActions,
  buildPublicUtmRows,
  buildQuoteUsageInsight,
  buildTrendSeries,
  countReadyOnboardingVideos,
} from "@/features/admin/services/admin-marketing-dashboard.logic";
import type {
  MarketingContentSnapshot,
  MarketingOnboardingVideoSnapshot,
  MarketingProspectSnapshot,
} from "@/features/admin/types/admin-marketing";
import type { PublicSolicitudRow } from "@/features/admin/services/admin-public-channel.logic";

const period = {
  preset: "30d" as const,
  start: "2026-06-01T00:00:00.000Z",
  end: "2026-06-03T23:59:59.999Z",
  previousStart: "2026-05-29T00:00:00.000Z",
  previousEnd: "2026-05-31T23:59:59.999Z",
  label: "Últimos 30 días",
};

function prospect(
  partial: Partial<MarketingProspectSnapshot> & Pick<MarketingProspectSnapshot, "id" | "estado" | "creadoEn">
): MarketingProspectSnapshot {
  return {
    empresa: "Vidrios",
    contactoNombre: "Ana",
    fuente: "Instagram",
    channelId: "instagram",
    commercialState: "prospecto",
    convertedOrganizationId: null,
    noContactar: false,
    dataStatus: "real",
    actualizadoEn: partial.creadoEn,
    proximaAccionEn: null,
    ...partial,
  };
}

describe("admin-marketing-dashboard.logic", () => {
  it("arma series diarias y excluye prospectos mock", () => {
    const series = buildTrendSeries({
      period,
      quotes: [
        {
          pricingMode: "por_item",
          creationSurface: "mobile_guiada",
          pdfDownloadedAt: null,
          creadoEn: "2026-06-02T10:00:00.000Z",
        },
      ],
      prospects: [
        prospect({ id: "1", estado: "nuevo", creadoEn: "2026-06-01T12:00:00.000Z" }),
        prospect({
          id: "2",
          estado: "pagado",
          creadoEn: "2026-06-02T12:00:00.000Z",
          actualizadoEn: "2026-06-03T09:00:00.000Z",
          commercialState: "cliente_pagado",
        }),
        prospect({
          id: "mock",
          estado: "nuevo",
          creadoEn: "2026-06-01T12:00:00.000Z",
          dataStatus: "mock",
        }),
      ],
    });

    expect(series).toHaveLength(3);
    expect(series[0]).toMatchObject({ date: "2026-06-01", prospects: 1, quotes: 0 });
    expect(series[1]).toMatchObject({ date: "2026-06-02", prospects: 1, quotes: 1 });
    expect(series[2]).toMatchObject({ date: "2026-06-03", paid: 1, trials: 1 });
  });

  it("agrupa UTM de páginas públicas y oculta el resto como otros", () => {
    const solicitudes: PublicSolicitudRow[] = [
      {
        id: "1",
        nombre: "A",
        organization_id: 1,
        contexto: "empresa-publica",
        estado: "nueva",
        creado_en: "2026-06-01T12:00:00.000Z",
        ayuda: null,
        contactada_at: null,
        utm_source: "instagram",
        utm_medium: "bio",
      },
      {
        id: "2",
        nombre: "B",
        organization_id: 1,
        contexto: "empresa-publica",
        estado: "nueva",
        creado_en: "2026-06-02T12:00:00.000Z",
        ayuda: null,
        contactada_at: null,
        utm_source: "instagram",
        utm_medium: "bio",
      },
      {
        id: "3",
        nombre: "C",
        organization_id: 2,
        contexto: "empresa-publica",
        estado: "nueva",
        creado_en: "2026-06-02T12:00:00.000Z",
        ayuda: null,
        contactada_at: null,
        utm_source: null,
        utm_medium: null,
      },
    ];

    const rows = buildPublicUtmRows({ solicitudes, period, limit: 1 });
    expect(rows[0]).toMatchObject({ label: "instagram / bio", count: 2 });
    expect(rows.at(-1)).toMatchObject({ id: "otros", count: 1 });
  });

  it("no inventa highlights si no hay piezas publicadas", () => {
    const draft: MarketingContentSnapshot = {
      id: "draft",
      title: "Borrador",
      formato: "reel",
      canal: "instagram",
      estado: "borrador",
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      grupoNombre: null,
      grupoSegmento: null,
      grupoRegion: null,
      metricas: {
        alcance: null,
        interacciones: null,
        comentarios: null,
        mensajesDemo: null,
        demos: null,
        pagos: null,
      },
      publicadoEn: null,
      programadoPara: null,
      actualizadoEn: "2026-06-01T00:00:00.000Z",
    };

    expect(buildContentHighlights([draft])).toEqual([]);
  });

  it("marca UTM incompleta y videos listos en acciones", () => {
    const videos: MarketingOnboardingVideoSnapshot[] = [
      { dispositivo: "movil", estado: "listo", esPredeterminado: true, hasUrl: true },
      { dispositivo: "escritorio", estado: "borrador", esPredeterminado: true, hasUrl: false },
    ];
    const content: MarketingContentSnapshot[] = [
      {
        id: "1",
        title: "Demo",
        formato: "reel",
        canal: "instagram",
        estado: "publicado",
        utmSource: "instagram",
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        grupoNombre: null,
        grupoSegmento: null,
        grupoRegion: null,
        metricas: {
          alcance: null,
          interacciones: null,
          comentarios: null,
          mensajesDemo: null,
          demos: null,
          pagos: null,
        },
        publicadoEn: "2026-06-02T00:00:00.000Z",
        programadoPara: null,
        actualizadoEn: "2026-06-02T00:00:00.000Z",
      },
    ];

    expect(countReadyOnboardingVideos(videos)).toBe(1);
    const now = buildNowActions({ videos, content });
    expect(now[0]?.done).toBe(false);
    expect(now[1]?.done).toBe(true);
    expect(now[2]?.done).toBe(false);
    expect(now[2]?.title).toContain("Completa UTM");
  });

  it("separa el rendimiento manual por grupo de Facebook", () => {
    const groups = buildGroupPerformance([
      {
        id: "g1",
        title: "Cotiza desde el celular",
        formato: "carrusel",
        canal: "grupos",
        estado: "publicado",
        utmSource: "facebook",
        utmMedium: "group",
        utmCampaign: "chile_sales_sprint_30d",
        utmContent: "grupo_1",
        grupoNombre: "Fabricantes PVC Chile",
        grupoSegmento: "Fabricantes de ventanas PVC",
        grupoRegion: "Chile",
        metricas: {
          alcance: 1716,
          interacciones: 264,
          comentarios: 8,
          mensajesDemo: 2,
          demos: 1,
          pagos: 0,
        },
        publicadoEn: "2026-09-06T00:00:00.000Z",
        programadoPara: null,
        actualizadoEn: "2026-09-06T00:00:00.000Z",
      },
    ]);

    expect(groups).toEqual([
      expect.objectContaining({
        grupoNombre: "Fabricantes PVC Chile",
        alcance: 1716,
        interacciones: 264,
        mensajesDemo: 2,
        metricasRegistradas: true,
      }),
    ]);
  });

  it("cuenta seguimientos vencidos y omite mock o cerrados", () => {
    const actions = buildNextActions({
      videos: [],
      content: [],
      now: new Date("2026-06-10T12:00:00.000Z"),
      prospects: [
        prospect({
          id: "overdue",
          estado: "contactado",
          creadoEn: "2026-06-01T00:00:00.000Z",
          proximaAccionEn: "2026-06-08T00:00:00.000Z",
        }),
        prospect({
          id: "paid",
          estado: "pagado",
          creadoEn: "2026-06-01T00:00:00.000Z",
          proximaAccionEn: "2026-06-08T00:00:00.000Z",
        }),
      ],
    });

    const followUps = actions.find((item) => item.id === "seguimientos");
    expect(followUps?.current).toBe(1);
  });

  it("arma insight de cotizador sin inventar share con denominador cero", () => {
    expect(buildQuoteUsageInsight({
      totalQuotes: 0,
      itemQuotes: 0,
      totalGlobalQuotes: 0,
      constructorItemQuotes: 0,
      mobileConstructorQuotes: 0,
      desktopConstructorQuotes: 0,
      guidedItemQuotes: 0,
      constructorItemPdfs: 0,
      classifiedItemQuotes: 0,
      historicalUnclassifiedItemQuotes: 0,
    }).ctaLabel).toBeNull();

    const insight = buildQuoteUsageInsight({
      totalQuotes: 10,
      itemQuotes: 8,
      totalGlobalQuotes: 2,
      constructorItemQuotes: 0,
      mobileConstructorQuotes: 0,
      desktopConstructorQuotes: 0,
      guidedItemQuotes: 7,
      constructorItemPdfs: 0,
      classifiedItemQuotes: 7,
      historicalUnclassifiedItemQuotes: 1,
    });
    expect(insight.text).toContain("80%");
    expect(insight.ctaHref).toBe("#contenido");
  });
});
