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
  it("deriva company_ready solo con nombre y telefono", () => {
    expect(
      deriveCompanyReadyState(
        buildProfile({
          empresaEmail: "",
          solicitudPublicaSlug: "",
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

  it("calcula el siguiente paso partiendo por la primera cotizacion", () => {
    const checklist = buildOnboardingChecklistViewModel({
      records: [buildRecord("company_ready", "completado")],
      context: {
        profile: buildProfile({ isPublished: false }),
        leadCount: 0,
        quoteStates: [],
        latestQuoteId: null,
      },
    });

    expect(checklist.firstPendingStepKey).toBe("first_quote");
    expect(checklist.nextAction?.href).toBe("/cotizaciones/nueva");
    expect(checklist.nextAction?.label).toBe("Crear mi primera cotizacion");
  });

  it("despues de cotizar envia a datos minimos de empresa", () => {
    const checklist = buildOnboardingChecklistViewModel({
      records: [buildRecord("first_quote", "completado")],
      context: {
        profile: buildProfile({ empresaNombre: "", empresaTelefono: "" }),
        leadCount: 0,
        quoteStates: ["creada"],
        latestQuoteId: "cot-1",
      },
    });

    const nextAction = buildNextOnboardingAction({ steps: checklist.steps });

    expect(nextAction?.stepKey).toBe("company_ready");
    expect(nextAction?.href).toBe("/configuracion/empresa?inicio=1");
    expect(nextAction?.openInNewTab).toBe(false);
  });

  it("expone la activacion inicial para no duplicar guias dentro de la app", () => {
    const checklist = buildOnboardingChecklistViewModel({
      records: [buildRecord("activation_complete", "omitido")],
      context: {
        profile: buildProfile(),
        leadCount: 0,
        quoteStates: [],
        latestQuoteId: null,
      },
    });

    expect(checklist.activationState).toBe("omitido");
  });
});
