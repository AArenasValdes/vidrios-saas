import "server-only";

import {
  BILLING_PLANS,
  type BillingPlanCode,
} from "@/features/billing/types/plans";
import type { SupportedCountryCode } from "@/features/organization-region/types/organization-region";

export const MERCADOPAGO_MARKET_PLAN_CODES = [
  "founder_monthly",
  "founder_full_annual",
  "quote_only_annual",
] as const satisfies readonly BillingPlanCode[];

export type MercadoPagoMarketPlanCode = (typeof MERCADOPAGO_MARKET_PLAN_CODES)[number];

type MercadoPagoMarketDefinition = {
  countryCode: SupportedCountryCode;
  currencyCode: string;
  billingEnabledEnv: string;
  accessTokenEnv: string;
  webhookSecretEnv: string;
  providerPlanEnv: Record<MercadoPagoMarketPlanCode, string>;
  commercialAmounts: Partial<Record<MercadoPagoMarketPlanCode, number>>;
};

const MARKET_DEFINITIONS: Record<SupportedCountryCode, MercadoPagoMarketDefinition> = {
  CL: {
    countryCode: "CL",
    currencyCode: "CLP",
    billingEnabledEnv: "MERCADOPAGO_BILLING_ENABLED",
    accessTokenEnv: "MERCADOPAGO_CL_ACCESS_TOKEN",
    webhookSecretEnv: "MERCADOPAGO_CL_WEBHOOK_SECRET",
    providerPlanEnv: {
      founder_monthly: "MERCADOPAGO_CL_FOUNDER_MONTHLY_PLAN_ID",
      founder_full_annual: "MERCADOPAGO_CL_FOUNDER_YEARLY_PLAN_ID",
      quote_only_annual: "MERCADOPAGO_CL_QUOTE_ONLY_YEARLY_PLAN_ID",
    },
    commercialAmounts: {
      founder_monthly: BILLING_PLANS.founder_monthly.amountClp,
      founder_full_annual: BILLING_PLANS.founder_full_annual.amountClp,
      quote_only_annual: BILLING_PLANS.quote_only_annual.amountClp,
    },
  },
  PE: buildDisabledMarketDefinition("PE", "PEN"),
  CO: buildDisabledMarketDefinition("CO", "COP"),
  AR: buildDisabledMarketDefinition("AR", "ARS"),
  UY: buildDisabledMarketDefinition("UY", "UYU"),
  MX: buildDisabledMarketDefinition("MX", "MXN"),
};

function buildDisabledMarketDefinition(
  countryCode: Exclude<SupportedCountryCode, "CL">,
  currencyCode: string
): MercadoPagoMarketDefinition {
  const prefix = `MERCADOPAGO_${countryCode}`;

  return {
    countryCode,
    currencyCode,
    billingEnabledEnv: `${prefix}_BILLING_ENABLED`,
    accessTokenEnv: `${prefix}_ACCESS_TOKEN`,
    webhookSecretEnv: `${prefix}_WEBHOOK_SECRET`,
    providerPlanEnv: {
      founder_monthly: `${prefix}_FOUNDER_MONTHLY_PLAN_ID`,
      founder_full_annual: `${prefix}_FOUNDER_YEARLY_PLAN_ID`,
      quote_only_annual: `${prefix}_QUOTE_ONLY_YEARLY_PLAN_ID`,
    },
    // No usar FX ni precios por defecto. Un mercado solo se habilita cuando
    // su precio comercial se agrega deliberadamente a este catalogo versionado.
    commercialAmounts: {},
  };
}

function isEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function isMercadoPagoSupportedMarket(
  value: string
): value is SupportedCountryCode {
  return Object.prototype.hasOwnProperty.call(MARKET_DEFINITIONS, value);
}

export function isMercadoPagoMarketPlanCode(
  value: string
): value is MercadoPagoMarketPlanCode {
  return MERCADOPAGO_MARKET_PLAN_CODES.some((code) => code === value);
}

export function getMercadoPagoMarketConfig(countryCode: SupportedCountryCode) {
  const definition = MARKET_DEFINITIONS[countryCode];

  return {
    countryCode: definition.countryCode,
    currencyCode: definition.currencyCode,
    enabled: isEnabled(process.env[definition.billingEnabledEnv]),
    accessToken: process.env[definition.accessTokenEnv]?.trim() ?? "",
    webhookSecret: process.env[definition.webhookSecretEnv]?.trim() ?? "",
  };
}

export function getMercadoPagoMarketPlan(
  countryCode: SupportedCountryCode,
  planCode: MercadoPagoMarketPlanCode
) {
  const definition = MARKET_DEFINITIONS[countryCode];
  const amount = definition.commercialAmounts[planCode];

  if (amount === undefined) {
    return null;
  }

  return {
    ...BILLING_PLANS[planCode],
    amount,
    providerPlanId: process.env[definition.providerPlanEnv[planCode]]?.trim() ?? "",
    countryCode: definition.countryCode,
    currencyCode: definition.currencyCode,
  };
}

export function isMercadoPagoMarketCommerciallyConfigured(
  countryCode: SupportedCountryCode
) {
  return MERCADOPAGO_MARKET_PLAN_CODES.every((code) =>
    Boolean(getMercadoPagoMarketPlan(countryCode, code))
  );
}

export function isMercadoPagoMarketBillingReady(countryCode: SupportedCountryCode) {
  const config = getMercadoPagoMarketConfig(countryCode);

  return (
    config.enabled &&
    Boolean(config.accessToken) &&
    Boolean(config.webhookSecret) &&
    MERCADOPAGO_MARKET_PLAN_CODES.every((code) => {
      const plan = getMercadoPagoMarketPlan(countryCode, code);
      return Boolean(plan?.providerPlanId);
    })
  );
}

export function getMercadoPagoMarketReadiness(countryCode: SupportedCountryCode) {
  const config = getMercadoPagoMarketConfig(countryCode);

  return {
    countryCode,
    currencyCode: config.currencyCode,
    commerciallyConfigured: isMercadoPagoMarketCommerciallyConfigured(countryCode),
    ready: isMercadoPagoMarketBillingReady(countryCode),
  };
}
