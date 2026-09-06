import { mapGrowthContentItemRow } from "@/features/growth/repositories/growth-content.repository";

describe("growth-content.repository", () => {
  it("completa metadata histórica incompleta antes de entregarla a la UI", () => {
    const row = {
      id: "content-uuid",
      workspace_id: "workspace-uuid",
      content_id: "carrusel-01",
      titulo: "Carrusel",
      pilar: "demo_producto",
      formato: "carrusel",
      canal: "facebook",
      objetivo: "generar_demos",
      hook: null,
      cta: "Escríbeme DEMO",
      guion: null,
      caption: null,
      campaign_key: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      estado: "borrador",
      claim_review_status: "pendiente",
      claim_review_notes: null,
      metadata_json: {},
      programado_para: null,
      publicado_en: null,
      creado_en: "2026-09-06T00:00:00.000Z",
      actualizado_en: "2026-09-06T00:00:00.000Z",
    } as Parameters<typeof mapGrowthContentItemRow>[0];

    const item = mapGrowthContentItemRow(row);

    expect(item.metadata.metricas).toEqual({
      alcance: null,
      interacciones: null,
      comentarios: null,
      mensajesDemo: null,
      demos: null,
      pagos: null,
    });
  });
});
