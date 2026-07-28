import type { OrganizationProfile } from "@/features/organization-profile/types/organization-profile";
import type { EntityId } from "@/types/common";

export type OnboardingStepKey =
  | "company_ready"
  | "public_page_live"
  | "channel_ready"
  | "first_lead"
  | "first_quote"
  | "first_share"
  | "activation_complete";

export type OnboardingStepState =
  | "pendiente"
  | "en_progreso"
  | "completado"
  | "omitido";

export type OnboardingStepRecord = {
  id: string;
  organizationId: EntityId;
  stepKey: OnboardingStepKey;
  estado: OnboardingStepState;
  completedAt: string | null;
  completedByUserId: EntityId | null;
  completionSource: string | null;
  metadataJson: Record<string, unknown>;
  creadoEn: string | null;
  actualizadoEn: string | null;
  eliminadoEn: string | null;
};

export type OnboardingStepDefinition = {
  key: OnboardingStepKey;
  title: string;
  helper: string;
  ctaLabel: string;
};

export type OnboardingStepViewModel = OnboardingStepDefinition & {
  estado: OnboardingStepState;
  isCompleted: boolean;
  isCurrent: boolean;
  href: string;
  openInNewTab: boolean;
  completedAt: string | null;
  completionSource: string | null;
};

export type OnboardingNextAction = {
  stepKey: OnboardingStepKey;
  href: string;
  label: string;
  openInNewTab: boolean;
};

export type OnboardingChecklistViewModel = {
  steps: OnboardingStepViewModel[];
  activationState?: OnboardingStepState;
  progressPct: number;
  completedCount: number;
  totalCount: number;
  nextAction: OnboardingNextAction | null;
  isComplete: boolean;
  firstPendingStepKey: OnboardingStepKey | null;
  latestQuoteId: string | null;
};

export type OnboardingDerivedContext = {
  profile: OrganizationProfile | null;
  leadCount: number;
  quoteStates: string[];
  latestQuoteId: string | null;
};

export type OnboardingSyncTransition = {
  stepKey: OnboardingStepKey;
  previousState: OnboardingStepState | null;
  nextState: OnboardingStepState;
};

export type OnboardingSyncStepInput = {
  organizationId: EntityId;
  stepKey: OnboardingStepKey;
  estado: OnboardingStepState;
  completedByUserId?: EntityId | null;
  completionSource?: string | null;
  metadataJson?: Record<string, unknown>;
};
