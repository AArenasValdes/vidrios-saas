import { VENTORA_CONTACT } from "@/constants/ventora-brand";
import type {
  BillingPeriod,
  EffectiveSubscriptionState,
  OrganizationSubscriptionSnapshot,
  PaymentMethod,
  PlanCode,
  PlanType,
  SubscriptionStatus,
} from "@/features/subscriptions/types/subscription";

export const TRIAL_DURATION_DAYS = 7;
export const TRIAL_EXPIRING_SOON_DAYS = 2;
export const VENTORA_MONTHLY_PRICE = 8_990;
export const VENTORA_YEARLY_PRICE = 79_990;
export const VENTORA_QUOTE_ONLY_YEARLY_PRICE = 59_990;

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WRITE_RESTRICTED_SOLICITUDES_PREFIX = "/solicitudes/canales";

export const QUOTE_ONLY_RESTRICTED_PATHS = [
  "/solicitudes",
  "/solicitudes/canales",
  "/configuracion/pagina-venta",
] as const;

export function isQuoteOnlyRestrictedPath(pathname: string): boolean {
  if (!pathname) return false;
  return QUOTE_ONLY_RESTRICTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

const VALID_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  "trial_active",
  "trial_expiring",
  "trial_expired",
  "active",
  "past_due",
  "cancelled",
]);
const VALID_PLAN_TYPES = new Set<PlanType>([
  "trial",
  "monthly",
  "yearly",
  "founder",
]);
const VALID_BILLING_PERIODS = new Set<BillingPeriod>([
  "monthly",
  "yearly",
  "none",
]);
const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
  "manual_transfer",
  "manual_other",
  "none",
  "flow",
  "webpay_plus",
]);

function normalizeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizeSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus | null {
  if (value && VALID_SUBSCRIPTION_STATUSES.has(value as SubscriptionStatus)) {
    return value as SubscriptionStatus;
  }

  return null;
}

function normalizePlanType(value: string | null | undefined): PlanType | null {
  if (value && VALID_PLAN_TYPES.has(value as PlanType)) {
    return value as PlanType;
  }

  return null;
}

function normalizeBillingPeriod(
  value: string | null | undefined
): BillingPeriod | null {
  if (value && VALID_BILLING_PERIODS.has(value as BillingPeriod)) {
    return value as BillingPeriod;
  }

  return null;
}

function normalizePaymentMethod(
  value: string | null | undefined
): PaymentMethod | null {
  if (value && VALID_PAYMENT_METHODS.has(value as PaymentMethod)) {
    return value as PaymentMethod;
  }

  return null;
}

function normalizePlanCode(value: string | null | undefined): PlanCode | null {
  if (
    value &&
    (value === "trial" || value === "founder_full" || value === "quote_only")
  ) {
    return value as PlanCode;
  }

  return null;
}

function resolveDaysRemaining(targetDate: Date | null, now: Date) {
  if (!targetDate) {
    return null;
  }

  const remainingMs = targetDate.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / DAY_IN_MS);
}

export function normalizeOrganizationSubscriptionSnapshot(
  input?: Partial<OrganizationSubscriptionSnapshot> | null
): OrganizationSubscriptionSnapshot {
  return {
    subscriptionStatus: normalizeSubscriptionStatus(input?.subscriptionStatus),
    trialStartedAt: input?.trialStartedAt ?? null,
    trialEndsAt: input?.trialEndsAt ?? null,
    subscriptionStartedAt: input?.subscriptionStartedAt ?? null,
    subscriptionEndsAt: input?.subscriptionEndsAt ?? null,
    planType: normalizePlanType(input?.planType),
    planCode: normalizePlanCode(input?.planCode),
    billingPeriod: normalizeBillingPeriod(input?.billingPeriod) ?? "none",
    paymentMethod: normalizePaymentMethod(input?.paymentMethod) ?? "none",
    lastPaymentAt: input?.lastPaymentAt ?? null,
    founderPriceLocked: input?.founderPriceLocked ?? false,
  };
}

export function resolveOrganizationSubscriptionState(
  input?: Partial<OrganizationSubscriptionSnapshot> | null,
  now = new Date()
): EffectiveSubscriptionState {
  const snapshot = normalizeOrganizationSubscriptionSnapshot(input);
  const trialEndsAt = normalizeDate(snapshot.trialEndsAt);
  const subscriptionEndsAt = normalizeDate(snapshot.subscriptionEndsAt);
  const configured = Boolean(
    snapshot.subscriptionStatus ||
      snapshot.trialStartedAt ||
      snapshot.trialEndsAt ||
      snapshot.subscriptionStartedAt ||
      snapshot.subscriptionEndsAt ||
      snapshot.planType
  );
  const normalizedStatus = snapshot.subscriptionStatus;
  const isFounderActive =
    snapshot.planType === "founder" &&
    normalizedStatus === "active" &&
    subscriptionEndsAt === null;
  const hasActiveSubscription =
    normalizedStatus === "active" &&
    (isFounderActive ||
      (subscriptionEndsAt !== null && subscriptionEndsAt.getTime() > now.getTime()));
  const daysRemaining = resolveDaysRemaining(
    hasActiveSubscription ? subscriptionEndsAt : trialEndsAt,
    now
  );

  let effectiveStatus: SubscriptionStatus = normalizedStatus ?? "trial_active";

  if (hasActiveSubscription) {
    effectiveStatus = "active";
  } else if (normalizedStatus === "past_due") {
    effectiveStatus = "past_due";
  } else if (normalizedStatus === "cancelled") {
    effectiveStatus = "cancelled";
  } else if (trialEndsAt && now.getTime() > trialEndsAt.getTime()) {
    effectiveStatus = "trial_expired";
  } else if (
    trialEndsAt &&
    now.getTime() < trialEndsAt.getTime() &&
    (daysRemaining ?? Infinity) <= TRIAL_EXPIRING_SOON_DAYS
  ) {
    effectiveStatus = "trial_expiring";
  } else if (trialEndsAt && now.getTime() < trialEndsAt.getTime()) {
    effectiveStatus = "trial_active";
  }

  const isExpired =
    effectiveStatus === "trial_expired" ||
    effectiveStatus === "past_due" ||
    effectiveStatus === "cancelled";
  const isTrial =
    effectiveStatus === "trial_active" ||
    effectiveStatus === "trial_expiring" ||
    effectiveStatus === "trial_expired";
  const isExpiringSoon = effectiveStatus === "trial_expiring";
  const isLastTrialDay = isExpiringSoon && (daysRemaining ?? 0) <= 1;

  return {
    ...snapshot,
    effectiveStatus,
    isConfigured: configured,
    isActive: hasActiveSubscription || !isExpired,
    isTrial,
    isExpiringSoon,
    isExpired,
    isWriteBlocked: isExpired,
    daysRemaining,
    isLastTrialDay,
    shouldShowTrialBanner: configured && isExpiringSoon,
    shouldShowExpiredBanner: configured && isExpired,
  };
}

function addTrialDuration(date: Date) {
  return new Date(date.getTime() + TRIAL_DURATION_DAYS * DAY_IN_MS);
}

function isRepairableFreshTrialSnapshot(
  snapshot: OrganizationSubscriptionSnapshot | null
): snapshot is OrganizationSubscriptionSnapshot {
  if (!snapshot) {
    return false;
  }

  if (snapshot.planType && snapshot.planType !== "trial") {
    return false;
  }

  if (snapshot.planCode && snapshot.planCode !== "trial") {
    return false;
  }

  return (
    snapshot.subscriptionStatus === null ||
    snapshot.subscriptionStatus === "trial_active" ||
    snapshot.subscriptionStatus === "trial_expiring" ||
    snapshot.subscriptionStatus === "trial_expired"
  );
}

export function buildFreshTrialRepairSnapshot(input: {
  snapshot: OrganizationSubscriptionSnapshot | null;
  organizationCreatedAt: string | null | undefined;
  now?: Date;
}): OrganizationSubscriptionSnapshot | null {
  const { snapshot, organizationCreatedAt } = input;
  const now = input.now ?? new Date();
  const createdAt = normalizeDate(organizationCreatedAt);

  if (!createdAt || !isRepairableFreshTrialSnapshot(snapshot)) {
    return null;
  }

  const trialEndsAt = addTrialDuration(createdAt);

  if (trialEndsAt.getTime() <= now.getTime()) {
    return null;
  }

  return {
    ...snapshot,
    subscriptionStatus: "trial_active",
    trialStartedAt: snapshot.trialStartedAt ?? createdAt.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
    planType: "trial",
    planCode: "trial",
    billingPeriod: "none",
    paymentMethod: "none",
    founderPriceLocked: false,
  };
}

export function isWriteRestrictedPrivatePath(pathname: string) {
  if (!pathname) {
    return false;
  }

  if (pathname === "/cotizaciones/nueva") {
    return true;
  }

  if (pathname === "/clientes/nuevo") {
    return true;
  }

  if (
    pathname.startsWith("/clientes/") &&
    (pathname.endsWith("/editar") || pathname.includes("/editar?"))
  ) {
    return true;
  }

  if (
    pathname === "/configuracion" ||
    pathname.startsWith("/configuracion/")
  ) {
    return true;
  }

  if (
    pathname === WRITE_RESTRICTED_SOLICITUDES_PREFIX ||
    pathname.startsWith(`${WRITE_RESTRICTED_SOLICITUDES_PREFIX}/`)
  ) {
    return true;
  }

  return false;
}

export function canAccessPrivatePathWithSubscription(
  pathname: string,
  subscription: EffectiveSubscriptionState
) {
  if (pathname === "/cuenta-vencida") {
    return true;
  }

  if (!subscription.isWriteBlocked) {
    return true;
  }

  return !isWriteRestrictedPrivatePath(pathname);
}

export class SubscriptionWriteAccessError extends Error {
  code = "subscription_write_blocked" as const;
}

export function isQuoteOnly(planCode: PlanCode | null | undefined): boolean {
  return planCode === "quote_only";
}

export function assertSubscriptionAllowsWrite(
  subscription: EffectiveSubscriptionState
) {
  if (subscription.isWriteBlocked) {
    throw new SubscriptionWriteAccessError(
      "Tu prueba gratuita ya vencio. Activa tu cuenta para volver a operar."
    );
  }
}

function normalizeWhatsappDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function buildSubscriptionActivationWhatsappHref(input: {
  companyName: string;
  plan: "mensual" | "anual";
}) {
  const planLabel = input.plan === "mensual" ? "Mensual" : "Anual";
  return buildPlanContractWhatsappHref({
    planLabel,
    companyName: input.companyName,
  });
}

export function buildPlanContractWhatsappHref(input: {
  planLabel: string;
  companyName?: string | null;
}) {
  const phone = normalizeWhatsappDigits(VENTORA_CONTACT.phoneHref);
  const planLabel = input.planLabel.trim();

  let message = `Hola, quiero contratar el plan: ${planLabel}.`;

  const companyName = input.companyName?.trim();
  if (companyName) {
    message += ` Mi empresa es ${companyName}.`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
