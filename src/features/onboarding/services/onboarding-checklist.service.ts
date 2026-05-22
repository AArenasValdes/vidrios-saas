import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { createOnboardingChecklistRepository } from "@/features/onboarding/repositories/onboarding-checklist.repository";
import type {
  OnboardingChecklistViewModel,
  OnboardingDerivedContext,
  OnboardingNextAction,
  OnboardingStepDefinition,
  OnboardingStepKey,
  OnboardingStepRecord,
  OnboardingStepState,
  OnboardingStepViewModel,
  OnboardingSyncTransition,
} from "@/features/onboarding/types/onboarding-checklist";
import type { OrganizationProfile } from "@/features/organization-profile/types/organization-profile";
import type { EntityId } from "@/types/common";

const STEP_DEFINITIONS: OnboardingStepDefinition[] = [
  {
    key: "company_ready",
    title: "Completa tu empresa",
    helper: "Nombre, telefono, email y slug listos para captar.",
    ctaLabel: "Completar empresa",
  },
  {
    key: "public_page_live",
    title: "Publica tu pagina",
    helper: "Activa tu pagina publica para recibir solicitudes reales.",
    ctaLabel: "Publicar pagina",
  },
  {
    key: "channel_ready",
    title: "Copia tu link o QR",
    helper: "Comparte tu pagina en WhatsApp, Instagram o con QR.",
    ctaLabel: "Ir a canales",
  },
  {
    key: "first_lead",
    title: "Prueba tu primera solicitud",
    helper: "Envia una solicitud de prueba desde tu pagina publica.",
    ctaLabel: "Abrir pagina publica",
  },
  {
    key: "first_quote",
    title: "Crea tu primera cotizacion",
    helper: "Convierte una solicitud en una cotizacion util.",
    ctaLabel: "Crear cotizacion",
  },
  {
    key: "first_share",
    title: "Comparte tu primer PDF o link",
    helper: "Envia la cotizacion por WhatsApp o comparte el link publico.",
    ctaLabel: "Compartir cotizacion",
  },
];

const DERIVED_STEP_KEYS: OnboardingStepKey[] = [
  "company_ready",
  "public_page_live",
  "first_lead",
  "first_quote",
];

function isCompletedState(state: OnboardingStepState) {
  return state === "completado";
}

function getManualStepState(
  recordsByKey: Map<OnboardingStepKey, OnboardingStepRecord>,
  stepKey: "channel_ready" | "first_share"
) {
  return recordsByKey.get(stepKey)?.estado ?? "pendiente";
}

function buildStepHref(
  stepKey: OnboardingStepKey,
  profile: OrganizationProfile | null,
  latestQuoteId: string | null
) {
  if (stepKey === "company_ready") return "/configuracion/empresa";
  if (stepKey === "public_page_live") return "/configuracion/pagina-venta";
  if (stepKey === "channel_ready") return "/solicitudes/canales";

  if (stepKey === "first_lead") {
    const slug = profile?.solicitudPublicaSlug?.trim();
    return slug ? `/solicitud/${slug}?preview=1` : "/configuracion/empresa";
  }

  if (stepKey === "first_quote") return "/cotizaciones/nueva";
  if (latestQuoteId) return `/cotizaciones/${latestQuoteId}`;
  return "/cotizaciones";
}

function shouldOpenInNewTab(stepKey: OnboardingStepKey, profile: OrganizationProfile | null) {
  return stepKey === "first_lead" && Boolean(profile?.solicitudPublicaSlug?.trim());
}

function buildTransitionEventPayload(input: {
  organizationId: EntityId;
  stepKey: OnboardingStepKey;
  completionSource: string | null;
  completedByUserId: EntityId | null;
  metadataJson: Record<string, unknown>;
}) {
  return {
    organization_id: input.organizationId,
    step_key: input.stepKey,
    completion_source: input.completionSource ?? undefined,
    completed_by_user_id: input.completedByUserId ?? undefined,
    metadata_json: JSON.stringify(input.metadataJson),
  };
}

export function deriveCompanyReadyState(profile: OrganizationProfile | null): OnboardingStepState {
  if (
    profile?.empresaNombre.trim() &&
    profile.empresaTelefono.trim() &&
    profile.empresaEmail.trim() &&
    profile.solicitudPublicaSlug.trim()
  ) {
    return "completado";
  }

  return "pendiente";
}

export function derivePublicPageLiveState(profile: OrganizationProfile | null): OnboardingStepState {
  return profile?.isPublished ? "completado" : "pendiente";
}

export function deriveFirstLeadState(leadCount: number): OnboardingStepState {
  return leadCount > 0 ? "completado" : "pendiente";
}

export function deriveFirstQuoteState(quoteStates: string[]): OnboardingStepState {
  const normalized = quoteStates
    .map((state) => state.trim().toLowerCase())
    .filter(Boolean);

  if (
    normalized.some((state) =>
      ["creada", "enviada", "aprobada", "rechazada", "terminada"].includes(state)
    )
  ) {
    return "completado";
  }

  if (normalized.some((state) => state === "borrador")) {
    return "en_progreso";
  }

  return "pendiente";
}

export function buildNextOnboardingAction(input: {
  steps: Array<
    Pick<OnboardingStepViewModel, "estado" | "href" | "ctaLabel" | "key" | "openInNewTab">
  >;
}) {
  const nextStep = input.steps.find((step) => !isCompletedState(step.estado));
  if (!nextStep) {
    return null;
  }

  return {
    stepKey: nextStep.key,
    href: nextStep.href,
    label: nextStep.ctaLabel,
    openInNewTab: nextStep.openInNewTab,
  } satisfies OnboardingNextAction;
}

export function buildOnboardingChecklistViewModel(input: {
  records: OnboardingStepRecord[];
  context: OnboardingDerivedContext;
}) {
  const recordsByKey = new Map(input.records.map((record) => [record.stepKey, record]));
  const latestQuoteId = input.context.latestQuoteId;

  const effectiveStates: Record<OnboardingStepKey, OnboardingStepState> = {
    company_ready: deriveCompanyReadyState(input.context.profile),
    public_page_live: derivePublicPageLiveState(input.context.profile),
    channel_ready: getManualStepState(recordsByKey, "channel_ready"),
    first_lead: deriveFirstLeadState(input.context.leadCount),
    first_quote: deriveFirstQuoteState(input.context.quoteStates),
    first_share: getManualStepState(recordsByKey, "first_share"),
  };

  const firstPendingStepKey =
    STEP_DEFINITIONS.find((step) => !isCompletedState(effectiveStates[step.key]))?.key ?? null;

  const steps = STEP_DEFINITIONS.map((definition) => {
    const record = recordsByKey.get(definition.key) ?? null;
    const estado = effectiveStates[definition.key];

    return {
      ...definition,
      estado,
      isCompleted: isCompletedState(estado),
      isCurrent: firstPendingStepKey === definition.key,
      href: buildStepHref(definition.key, input.context.profile, latestQuoteId),
      openInNewTab: shouldOpenInNewTab(definition.key, input.context.profile),
      completedAt: record?.completedAt ?? null,
      completionSource: record?.completionSource ?? null,
    } satisfies OnboardingStepViewModel;
  });

  const completedCount = steps.filter((step) => step.isCompleted).length;
  const totalCount = steps.length;

  return {
    steps,
    progressPct: Math.round((completedCount / totalCount) * 100),
    completedCount,
    totalCount,
    nextAction: buildNextOnboardingAction({ steps }),
    isComplete: completedCount === totalCount,
    firstPendingStepKey,
    latestQuoteId,
  } satisfies OnboardingChecklistViewModel;
}

class OnboardingChecklistService {
  constructor(
    private readonly repository = createOnboardingChecklistRepository()
  ) {}

  private async trackTransition(
    organizationId: EntityId,
    record: OnboardingStepRecord,
    previousState: OnboardingStepState | null
  ) {
    if (previousState === record.estado) {
      return;
    }

    if (record.estado === "completado" && previousState !== "completado") {
      googleTagService.trackEvent(
        "onboarding_step_completed",
        buildTransitionEventPayload({
          organizationId,
          stepKey: record.stepKey,
          completionSource: record.completionSource,
          completedByUserId: record.completedByUserId,
          metadataJson: record.metadataJson,
        })
      );
      return;
    }

    if (previousState === "completado" && record.estado !== "completado") {
      googleTagService.trackEvent(
        "onboarding_step_reopened",
        buildTransitionEventPayload({
          organizationId,
          stepKey: record.stepKey,
          completionSource: record.completionSource,
          completedByUserId: record.completedByUserId,
          metadataJson: record.metadataJson,
        })
      );
    }
  }

  private async syncDerivedStep(
    organizationId: EntityId,
    completedByUserId: EntityId | null,
    recordsByKey: Map<OnboardingStepKey, OnboardingStepRecord>,
    stepKey: OnboardingStepKey,
    estado: OnboardingStepState
  ) {
    const existing = recordsByKey.get(stepKey);
    if (existing?.estado === estado) {
      return null;
    }

    const { previousState, record } = await this.repository.syncStep({
      organizationId,
      stepKey,
      estado,
      completedByUserId,
      completionSource: "derived_sync",
      metadataJson: { source: "derived_sync" },
    });

    recordsByKey.set(stepKey, record);
    await this.trackTransition(organizationId, record, previousState);

    return {
      stepKey,
      previousState,
      nextState: record.estado,
    } satisfies OnboardingSyncTransition;
  }

  async getChecklistByOrganizationId(input: {
    organizationId: EntityId;
    authUserId?: string | null;
    profile: OrganizationProfile | null;
  }) {
    const [records, internalUserId, leadCount, quoteRows] = await Promise.all([
      this.repository.listByOrganizationId(input.organizationId),
      this.repository.resolveCurrentUserId(input.authUserId ?? null, input.organizationId),
      this.repository.countActiveLeads(input.organizationId),
      this.repository.listQuoteStates(input.organizationId),
    ]);

    const recordsByKey = new Map(records.map((record) => [record.stepKey, record]));
    const quoteStates = quoteRows.map((row) => row.estado);
    const latestQuoteId = quoteRows[0]?.id ?? null;
    const transitions: OnboardingSyncTransition[] = [];

    const derivedStateMap: Record<OnboardingStepKey, OnboardingStepState> = {
      company_ready: deriveCompanyReadyState(input.profile),
      public_page_live: derivePublicPageLiveState(input.profile),
      channel_ready: getManualStepState(recordsByKey, "channel_ready"),
      first_lead: deriveFirstLeadState(leadCount),
      first_quote: deriveFirstQuoteState(quoteStates),
      first_share: getManualStepState(recordsByKey, "first_share"),
    };

    for (const stepKey of DERIVED_STEP_KEYS) {
      const transition = await this.syncDerivedStep(
        input.organizationId,
        internalUserId,
        recordsByKey,
        stepKey,
        derivedStateMap[stepKey]
      );

      if (transition) {
        transitions.push(transition);
      }
    }

    const finalRecords = STEP_DEFINITIONS.map((definition) => recordsByKey.get(definition.key))
      .filter((record): record is OnboardingStepRecord => Boolean(record));

    const checklist = buildOnboardingChecklistViewModel({
      records: finalRecords,
      context: {
        profile: input.profile,
        leadCount,
        quoteStates,
        latestQuoteId,
      },
    });

    if (checklist.isComplete && transitions.some((transition) => transition.nextState === "completado")) {
      googleTagService.trackEvent("onboarding_checklist_completed", {
        organization_id: input.organizationId,
        completed_by_user_id: internalUserId ?? undefined,
        metadata_json: JSON.stringify({
          completed_count: checklist.completedCount,
          total_count: checklist.totalCount,
        }),
      });
    }

    return {
      checklist,
      records: finalRecords,
      internalUserId,
      transitions,
    };
  }

  async markChannelReady(input: {
    organizationId: EntityId;
    authUserId?: string | null;
    completionSource: string;
    metadataJson?: Record<string, unknown>;
  }) {
    return this.markManualStep({
      ...input,
      stepKey: "channel_ready",
    });
  }

  async markFirstShare(input: {
    organizationId: EntityId;
    authUserId?: string | null;
    completionSource: string;
    metadataJson?: Record<string, unknown>;
  }) {
    return this.markManualStep({
      ...input,
      stepKey: "first_share",
    });
  }

  private async markManualStep(input: {
    organizationId: EntityId;
    authUserId?: string | null;
    stepKey: "channel_ready" | "first_share";
    completionSource: string;
    metadataJson?: Record<string, unknown>;
  }) {
    const internalUserId = await this.repository.resolveCurrentUserId(
      input.authUserId ?? null,
      input.organizationId
    );

    const { previousState, record } = await this.repository.syncStep({
      organizationId: input.organizationId,
      stepKey: input.stepKey,
      estado: "completado",
      completedByUserId: internalUserId,
      completionSource: input.completionSource,
      metadataJson: input.metadataJson ?? {},
    });

    await this.trackTransition(input.organizationId, record, previousState);
    return record;
  }
}

let onboardingChecklistServiceInstance: OnboardingChecklistService | null = null;

function resolveOnboardingChecklistService() {
  if (!onboardingChecklistServiceInstance) {
    onboardingChecklistServiceInstance = new OnboardingChecklistService(
      createOnboardingChecklistRepository()
    );
  }

  return onboardingChecklistServiceInstance;
}

export const onboardingChecklistService = {
  getChecklistByOrganizationId: (...args: Parameters<OnboardingChecklistService["getChecklistByOrganizationId"]>) =>
    resolveOnboardingChecklistService().getChecklistByOrganizationId(...args),
  markChannelReady: (...args: Parameters<OnboardingChecklistService["markChannelReady"]>) =>
    resolveOnboardingChecklistService().markChannelReady(...args),
  markFirstShare: (...args: Parameters<OnboardingChecklistService["markFirstShare"]>) =>
    resolveOnboardingChecklistService().markFirstShare(...args),
};
export { STEP_DEFINITIONS };
