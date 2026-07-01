import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type GrowthProspectKpi = {
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  hasQuote: boolean;
  firstQuoteAt: string | null;
  hasApprovedPayment: boolean;
  planCode: string | null;
  activationLabel: "Real" | "Pendiente de instrumentación";
  trialLabel: "Real" | "Pendiente de instrumentación";
  paymentLabel: "Real" | "Pendiente de instrumentación";
};

type ProfileKpiRow = {
  trial_started_at: string | null;
  trial_ends_at: string | null;
  plan_code: string | null;
  subscription_status: string | null;
};

type QuoteKpiRow = {
  creado_en: string;
};

type PaymentKpiRow = {
  status: string;
};

export async function getProspectKpis(
  organizationId: number
): Promise<GrowthProspectKpi> {
  const admin = createAdminClient();

  const [profileResult, quoteResult, paymentResult] = await Promise.all([
    admin
      .from("organization_profile")
      .select("trial_started_at, trial_ends_at, plan_code")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin
      .from("cotizaciones")
      .select("creado_en")
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("pagos_suscripcion")
      .select("status")
      .eq("organization_id", organizationId)
      .eq("status", "aprobado")
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileResult.data as ProfileKpiRow | null;
  const quote = quoteResult.data as QuoteKpiRow | null;
  const payment = paymentResult.data as PaymentKpiRow | null;

  return {
    trialStartedAt: profile?.trial_started_at ?? null,
    trialEndsAt: profile?.trial_ends_at ?? null,
    hasQuote: Boolean(quote),
    firstQuoteAt: quote?.creado_en ?? null,
    hasApprovedPayment: Boolean(payment),
    planCode: profile?.plan_code ?? null,
    activationLabel: quote ? "Real" : "Pendiente de instrumentación",
    trialLabel: profile?.trial_started_at ? "Real" : "Pendiente de instrumentación",
    paymentLabel: payment ? "Real" : "Pendiente de instrumentación",
  };
}

export async function getOrganizationTrialSnapshot(organizationId: number) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_profile")
    .select("trial_started_at, trial_ends_at, subscription_status")
    .eq("organization_id", organizationId)
    .maybeSingle();

  return data as ProfileKpiRow | null;
}

export async function hasApprovedPayment(organizationId: number) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pagos_suscripcion")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "aprobado")
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}
