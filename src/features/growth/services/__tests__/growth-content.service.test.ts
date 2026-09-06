import { buildGrowthContentPatch } from "@/features/growth/services/growth-content.service";
import type { GrowthContentItem } from "@/features/growth/types/growth-content";

const CURRENT: GrowthContentItem = {
  id: "content-uuid",
  workspaceId: "workspace-uuid",
  contentId: "reel-cotiza-obra-01",
  titulo: "Cotiza en obra",
  pilar: "demo_producto",
  formato: "reel",
  canal: "instagram",
  objetivo: "generar_demos",
  hook: null,
  cta: "Escríbeme DEMO",
  guion: null,
  caption: null,
  campaignKey: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  estado: "borrador",
  claimReviewStatus: "pendiente",
  claimReviewNotes: null,
  metadata: {
    grupoNombre: null,
    grupoSegmento: null,
    grupoRegion: null,
    publicacionUrl: null,
    piezaBaseId: null,
    metricas: {
      alcance: null,
      interacciones: null,
      comentarios: null,
      mensajesDemo: null,
      demos: null,
      pagos: null,
    },
  },
  programadoPara: null,
  publicadoEn: null,
  creadoEn: "2026-08-20T12:00:00.000Z",
  actualizadoEn: "2026-08-20T12:00:00.000Z",
};

describe("growth-content.service", () => {
  it("normaliza el content_id comercial", () => {
    const patch = buildGrowthContentPatch({
      contentId: " Reel Cotiza Obra 01 ",
      titulo: "Cotiza en obra",
      pilar: "demo_producto",
      formato: "reel",
      canal: "instagram",
    });

    expect(patch.content_id).toBe("reel-cotiza-obra-01");
    expect(patch.cta).toBe("Escríbeme DEMO");
  });

  it("bloquea programar sin claim aprobado y UTM completa", () => {
    expect(() => buildGrowthContentPatch({ estado: "programado" }, CURRENT)).toThrow(
      "Aprueba claims"
    );

    expect(() => buildGrowthContentPatch({
      estado: "programado",
      claimReviewStatus: "aprobado",
    }, CURRENT)).toThrow("Completa source, medium, campaña y contenido UTM");
  });

  it("permite programar cuando la evidencia humana y atribución están completas", () => {
    const patch = buildGrowthContentPatch({
      estado: "programado",
      claimReviewStatus: "aprobado",
      utmSource: "instagram",
      utmMedium: "organic",
      utmCampaign: "cotiza_obra_aug26",
      utmContent: "reel_cotiza_obra_01",
    }, CURRENT);

    expect(patch.estado).toBe("programado");
    expect(patch.claim_review_status).toBe("aprobado");
    expect(patch.utm_content).toBe("reel_cotiza_obra_01");
  });

  it("exige identificar el grupo antes de publicar una adaptación", () => {
    expect(() => buildGrowthContentPatch({
      canal: "grupos",
      estado: "publicado",
      claimReviewStatus: "aprobado",
      utmSource: "facebook",
      utmMedium: "group",
      utmCampaign: "chile_sales_sprint_30d",
      utmContent: "grupo_1",
    }, CURRENT)).toThrow("nombre del grupo");
  });
});
