import {
  buildAcquisitionFunnel,
  buildAcquisitionKpis,
  buildChannelRows,
  buildMarketingQuoteUsage,
  buildMarketingQuoteUsageKpis,
  countProspectsWithOriginInPeriod,
  hasAcquisitionMeasurementBase,
  normalizeMarketingChannel,
  resolveCommercialState,
} from "@/features/admin/services/admin-marketing.logic";
import type { MarketingProspectSnapshot } from "@/features/admin/types/admin-marketing";

describe("admin-marketing.logic", () => {
  const period = {
    preset: "30d" as const,
    start: "2026-06-01T00:00:00.000Z",
    end: "2026-06-30T23:59:59.999Z",
    previousStart: "2026-05-01T00:00:00.000Z",
    previousEnd: "2026-05-31T23:59:59.999Z",
    label: "Últimos 30 días",
  };

  const baseProspects: MarketingProspectSnapshot[] = [
    {
      id: "1",
      empresa: "Vidrios Norte",
      contactoNombre: "Juan",
      fuente: "Instagram",
      channelId: "instagram",
      estado: "nuevo",
      commercialState: "prospecto",
      convertedOrganizationId: null,
      noContactar: false,
      dataStatus: "real",
      creadoEn: "2026-06-10T00:00:00.000Z",
      actualizadoEn: "2026-06-10T00:00:00.000Z",
    },
    {
      id: "2",
      empresa: "Alumglass",
      contactoNombre: "Ana",
      fuente: "WhatsApp",
      channelId: "whatsapp",
      estado: "demo_agendada",
      commercialState: "demo_agendada",
      convertedOrganizationId: null,
      noContactar: false,
      dataStatus: "real",
      creadoEn: "2026-06-12T00:00:00.000Z",
      actualizadoEn: "2026-06-15T00:00:00.000Z",
    },
    {
      id: "3",
      empresa: "TermoHome",
      contactoNombre: "Luis",
      fuente: "manual",
      channelId: "sin_origen",
      estado: "pagado",
      commercialState: "cliente_pagado",
      convertedOrganizationId: 42,
      noContactar: false,
      dataStatus: "real",
      creadoEn: "2026-06-05T00:00:00.000Z",
      actualizadoEn: "2026-06-20T00:00:00.000Z",
    },
  ];

  it("normaliza canales de adquisición", () => {
    expect(normalizeMarketingChannel("Instagram")).toBe("instagram");
    expect(normalizeMarketingChannel("manual")).toBe("sin_origen");
    expect(normalizeMarketingChannel("Referido cliente")).toBe("referidos");
  });

  it("calcula KPIs de adquisición sin conversión falsa con denominador cero", () => {
    const kpis = buildAcquisitionKpis({ prospects: [], period });
    const conversion = kpis.find((item) => item.id === "conversion");
    expect(conversion?.displayValue).toBe("—");
    expect(conversion?.insight).toContain("insuficientes");
  });

  it("construye embudo acumulativo con caída principal", () => {
    const funnel = buildAcquisitionFunnel({ prospects: baseProspects, period });
    expect(funnel.steps[0]?.count).toBe(3);
    expect(funnel.steps.at(-1)?.count).toBe(1);
    expect(funnel.insight).toContain("Principal caída");
  });

  it("marca mejor conversión solo con base suficiente", () => {
    const manyProspects: MarketingProspectSnapshot[] = Array.from({ length: 4 }).map(
      (_, index) => ({
        ...baseProspects[0]!,
        id: `ig-${index}`,
        fuente: "Instagram",
        channelId: "instagram" as const,
        estado: index === 0 ? "pagado" : "nuevo",
        commercialState: resolveCommercialState(index === 0 ? "pagado" : "nuevo"),
        creadoEn: "2026-06-10T00:00:00.000Z",
      })
    );

    const channels = buildChannelRows({ prospects: manyProspects, period });
    expect(channels.bestConversionChannelId).toBe("instagram");
  });

  it("oculta base de adquisición cuando no hay prospectos con origen", () => {
    const onlyManual = baseProspects.filter((item) => item.channelId === "sin_origen");
    expect(countProspectsWithOriginInPeriod(onlyManual, period)).toBe(0);
    expect(hasAcquisitionMeasurementBase(onlyManual, period)).toBe(false);
    expect(countProspectsWithOriginInPeriod(baseProspects, period)).toBe(2);
    expect(hasAcquisitionMeasurementBase(baseProspects, period)).toBe(true);
  });

  it("solo devuelve canales con prospectos reales", () => {
    const channels = buildChannelRows({ prospects: baseProspects, period });
    expect(channels.rows.every((row) => row.prospects > 0)).toBe(true);
    expect(channels.rows.some((row) => row.id === "instagram")).toBe(true);
    expect(channels.rows.some((row) => row.id === "facebook")).toBe(false);
  });

  it("separa Guiada y Constructor del histórico no clasificable", () => {
    const usage = buildMarketingQuoteUsage([
      { pricingMode: "por_item", creationSurface: "mobile_constructor", pdfDownloadedAt: "2026-06-10" },
      { pricingMode: "por_item", creationSurface: "desktop_guiada", pdfDownloadedAt: null },
      { pricingMode: "por_item", creationSurface: null, pdfDownloadedAt: null },
      { pricingMode: "total_global", creationSurface: "total_global", pdfDownloadedAt: null },
    ]);

    expect(usage).toMatchObject({
      totalQuotes: 4,
      itemQuotes: 3,
      constructorItemQuotes: 1,
      mobileConstructorQuotes: 1,
      desktopConstructorQuotes: 0,
      guidedItemQuotes: 1,
      constructorItemPdfs: 1,
      historicalUnclassifiedItemQuotes: 1,
    });

    const constructorPdf = buildMarketingQuoteUsageKpis({ usage, period }).find(
      (item) => item.id === "constructor_pdf"
    );
    expect(constructorPdf?.displayValue).toBe("100%");
  });
});
