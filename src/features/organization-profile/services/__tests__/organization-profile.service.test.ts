import {
  buildEmpresaProfileInput,
  buildPaginaVentaProfileInput,
  DEFAULT_FINAL_CTA_LABEL,
  DEFAULT_FINAL_CTA_SUBTITLE,
  DEFAULT_FINAL_CTA_TITLE,
  DEFAULT_FORM_SUBTITLE,
  DEFAULT_FORM_TITLE,
  DEFAULT_HERO_TITLE,
  resolvePublicLandingConfig,
  resolveOrganizationProfile,
} from "../organization-profile.service";
import type { OrganizationProfile } from "../../types/organization-profile";

function createProfile(overrides: Partial<OrganizationProfile> = {}): OrganizationProfile {
  return {
    organizationId: 14,
    empresaNombre: "Vidriería Norte",
    empresaLogoUrl: null,
    empresaDireccion: "La Serena 123",
    empresaTelefono: "+56 9 8899 3049",
    empresaEmail: "hola@vidrierianorte.cl",
    brandColor: "#243b6b",
    formaPago: "50% anticipo",
    solicitudPublicaSlug: "vidrieria-norte",
    solicitudPublicaDescripcionCorta: "",
    solicitudPublicaValor: "",
    solicitudPublicaMensajeConfianza: "",
    solicitudPublicaPrivacidad: "",
    solicitudPublicaHorarioDesde: "09:00",
    solicitudPublicaHorarioHasta: "19:00",
    solicitudPublicaDiasAtencion: ["1", "2", "3", "4", "5", "6"],
    solicitudPublicaHorarioPorDia: [],
    proveedorPreferido: "",
    modoPrecioPreferido: "margen",
    margenDefecto: 100,
    creadoEn: null,
    actualizadoEn: null,
    publicName: "",
    publicSubtitle: "",
    publicZone: "La Serena y alrededores",
    publicBusinessType: "Vidrios y aluminio",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    websiteUrl: "",
    publicServices: [],
    finalCtaTitle: "custom",
    finalCtaSubtitle: "custom",
    finalCtaLabel: "custom",
    businessHoursNote: "custom",
    secondaryColor: "#25d366",
    heroMode: "gradient",
    heroImageUrl: null,
    heroTitle: "",
    heroSubtitle: "",
    showGallery: true,
    showSchedule: true,
    showRating: false,
    ratingLabel: "",
    jobsCountLabel: "",
    formTitle: "",
    formSubtitle: "",
    isPublished: false,
    subscriptionStatus: "trial_active",
    trialStartedAt: "2026-05-20T12:00:00.000Z",
    trialEndsAt: "2026-05-27T12:00:00.000Z",
    subscriptionStartedAt: null,
    subscriptionEndsAt: null,
    planType: "trial",
    billingPeriod: "none",
    paymentMethod: "none",
    lastPaymentAt: null,
    founderPriceLocked: false,
    subscription: resolveOrganizationProfile(14, null).subscription,
    ...overrides,
  };
}

describe("organization-profile.service", () => {
  it("debe construir el input de Empresa con slug y colores normalizados", () => {
    const input = buildEmpresaProfileInput(
      createProfile({
        solicitudPublicaSlug: "Mi Empresa Serena",
        secondaryColor: "",
      })
    );

    expect(input.solicitudPublicaSlug).toBe("mi-empresa-serena");
    expect(input.brandColor).toBe("#243b6b");
    expect(input.secondaryColor).toBe("#243b6b");
  });

  it("debe construir el input de Pagina de venta manteniendo defaults del sistema", () => {
    const input = buildPaginaVentaProfileInput(createProfile());

    expect(input.heroTitle).toBe(DEFAULT_HERO_TITLE);
    expect(input.formTitle).toBe(DEFAULT_FORM_TITLE);
    expect(input.formSubtitle).toBe(DEFAULT_FORM_SUBTITLE);
  });

  it("debe resolver la landing publica usando Empresa como fuente fija", () => {
    const config = resolvePublicLandingConfig(
      createProfile({
        publicName: "",
        publicBusinessType: "Ventanas de aluminio",
        empresaDireccion: "Coquimbo 456",
        brandColor: "azul" as never,
        secondaryColor: "",
        isPublished: true,
      })
    );

    expect(config.publicName).toBe("Vidriería Norte");
    expect(config.publicBusinessType).toBe("Ventanas de aluminio");
    expect(config.empresaDireccion).toBe("Coquimbo 456");
    expect(config.brandColor).toBe("#1a3a5c");
    expect(config.secondaryColor).toBe("#1a3a5c");
  });

  it("debe fijar CTA final del sistema y no depender del valor guardado", () => {
    const config = resolvePublicLandingConfig(
      createProfile({
        finalCtaTitle: "Mi CTA",
        finalCtaSubtitle: "Mi subtitulo",
        finalCtaLabel: "Mi boton",
        businessHoursNote: "Solo por agenda",
        isPublished: true,
      })
    );

    expect(config.finalCtaTitle).toBe(DEFAULT_FINAL_CTA_TITLE);
    expect(config.finalCtaSubtitle).toBe(DEFAULT_FINAL_CTA_SUBTITLE);
    expect(config.finalCtaLabel).toBe(DEFAULT_FINAL_CTA_LABEL);
    expect(config.businessHoursNote).toBe("");
  });
});
