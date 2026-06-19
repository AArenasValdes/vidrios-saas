import {
  buildNextOnboardingAction,
  buildOnboardingChecklistViewModel,
  deriveCompanyReadyState,
  deriveFirstLeadState,
  deriveFirstQuoteState,
  derivePublicPageLiveState,
} from "@/features/onboarding/services/onboarding-checklist.service";
import type { OnboardingStepRecord } from "@/features/onboarding/types/onboarding-checklist";
import type { OrganizationProfile } from "@/features/organization-profile/types/organization-profile";

function buildProfile(
  overrides: Partial<OrganizationProfile> = {}
): OrganizationProfile {
  return {
    organizationId: 1,
    empresaNombre: "Ventora Demo",
    empresaLogoUrl: null,
    responsableComercial: "",
    empresaDireccion: "",
    empresaTelefono: "+56 9 1111 1111",
    empresaEmail: "demo@ventora.cl",
    brandColor: "#1a3a5c",
    formaPago: "",
    solicitudPublicaSlug: "ventora-demo",
    solicitudPublicaDescripcionCorta: "",
    solicitudPublicaValor: "",
    solicitudPublicaMensajeConfianza: "",
    solicitudPublicaPrivacidad: "",
    solicitudPublicaHorarioDesde: "09:00",
    solicitudPublicaHorarioHasta: "19:00",
    solicitudPublicaDiasAtencion: ["1", "2", "3", "4", "5"],
    solicitudPublicaHorarioPorDia: [],
    proveedorPreferido: "",
    modoPrecioPreferido: "margen",
    margenDefecto: 100,
    creadoEn: null,
    actualizadoEn: null,
    publicName: "Ventora Demo",
    publicSubtitle: "",
    publicZone: "",
    publicBusinessType: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    websiteUrl: "",
    publicServices: [],
    finalCtaTitle: "",
    finalCtaSubtitle: "",
    finalCtaLabel: "",
    businessHoursNote: "",
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
    ...overrides,
  };
}

function buildRecord(
  stepKey: OnboardingStepRecord["stepKey"],
  estado: OnboardingStepRecord["estado"]
): OnboardingStepRecord {
  return {
    id: `${stepKey}-1`,
    organizationId: 1,
    stepKey,
    estado,
    completedAt: estado === "completado" ? "2026-05-22T12:00:00.000Z" : null,
    completedByUserId: estado === "completado" ? 1 : null,
    completionSource: estado === "completado" ? "test" : null,
    metadataJson: {},
    creadoEn: "2026-05-22T12:00:00.000Z",
    actualizadoEn: "2026-05-22T12:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("onboarding-checklist.service", () => {
  it("deriva company_ready solo con nombre, telefono, email y slug", () => {
    expect(
      deriveCompanyReadyState(
        buildProfile({
          empresaDireccion: "",
        })
      )
    ).toBe("completado");

    expect(
      deriveCompanyReadyState(
        buildProfile({
          empresaTelefono: "",
        })
      )
    ).toBe("pendiente");
  });

  it("deriva public_page_live desde isPublished", () => {
    expect(derivePublicPageLiveState(buildProfile({ isPublished: true }))).toBe(
      "completado"
    );
    expect(derivePublicPageLiveState(buildProfile({ isPublished: false }))).toBe(
      "pendiente"
    );
  });

  it("deriva first_lead desde la existencia de solicitudes", () => {
    expect(deriveFirstLeadState(0)).toBe("pendiente");
    expect(deriveFirstLeadState(1)).toBe("completado");
  });

  it("marca first_quote en progreso si solo hay borradores", () => {
    expect(deriveFirstQuoteState(["borrador"])).toBe("en_progreso");
  });

  it("marca first_quote completado si existe una cotizacion real", () => {
    expect(deriveFirstQuoteState(["borrador", "creada"])).toBe("completado");
  });

  it("calcula el siguiente paso correcto en el orden comercial", () => {
    const checklist = buildOnboardingChecklistViewModel({
      records: [
        buildRecord("company_ready", "completado"),
        buildRecord("public_page_live", "pendiente"),
      ],
      context: {
        profile: buildProfile({ isPublished: false }),
        leadCount: 0,
        quoteStates: [],
        latestQuoteId: null,
      },
    });

    expect(checklist.firstPendingStepKey).toBe("public_page_live");
    expect(checklist.nextAction?.href).toBe("/configuracion/pagina-venta");
    expect(checklist.nextAction?.label).toBe("Publicar pagina");
  });

  it("envia first_lead a preview de solicitud en nueva pestaña", () => {
    const checklist = buildOnboardingChecklistViewModel({
      records: [
        buildRecord("company_ready", "completado"),
        buildRecord("public_page_live", "completado"),
        buildRecord("channel_ready", "completado"),
      ],
      context: {
        profile: buildProfile({ isPublished: true, solicitudPublicaSlug: "vidrios-demo" }),
        leadCount: 0,
        quoteStates: [],
        latestQuoteId: null,
      },
    });

    const nextAction = buildNextOnboardingAction({ steps: checklist.steps });

    expect(nextAction?.stepKey).toBe("first_lead");
    expect(nextAction?.href).toBe("/solicitud/vidrios-demo?preview=1");
    expect(nextAction?.openInNewTab).toBe(true);
  });
});
