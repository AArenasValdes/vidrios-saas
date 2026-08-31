import type {
  BillingPeriod,
  PlanCode,
  PlanType,
} from "@/features/subscriptions/types/subscription";

export type BillingPlanCode =
  | "quote_only_monthly"
  | "quote_only_annual"
  | "founder_monthly"
  | "founder_full_annual";

export type BillingProductCode = "quote_only" | "founder_full";
export type BillingPeriodCode = "monthly" | "yearly";

export type BillingPlan = {
  code: BillingPlanCode;
  subscriptionPlanCode: Exclude<PlanCode, "trial">;
  planType: Exclude<PlanType, "trial">;
  billingPeriod: Exclude<BillingPeriod, "none">;
  amountClp: number;
  durationMonths: number;
  label: string;
  checkoutEnabled: boolean;
  productLabel: string;
  description: string;
  benefits: readonly string[];
  recommended: boolean;
};

export const BILLING_PLANS: Record<BillingPlanCode, BillingPlan> = {
  quote_only_monthly: {
    code: "quote_only_monthly",
    subscriptionPlanCode: "quote_only",
    planType: "monthly",
    billingPeriod: "monthly",
    amountClp: 6_990,
    durationMonths: 1,
    label: "Ventora Cotización Mensual",
    checkoutEnabled: true,
    productLabel: "Ventora Cotización",
    description:
      "Para cotizar, enviar presupuestos profesionales y preparar la fabricación sin depender de planillas.",
    benefits: [
      "Cotizador en celular, tablet y computador",
      "Misma cuenta en varios dispositivos",
      "PDF profesional y envío por WhatsApp",
      "Clientes y cotizaciones ordenadas",
      "Líneas propias y recetas configurables",
      "Pauta interna revisable en computador cuando corresponde",
    ],
    recommended: false,
  },
  founder_full_annual: {
    code: "founder_full_annual",
    subscriptionPlanCode: "founder_full",
    planType: "founder",
    billingPeriod: "yearly",
    amountClp: 89_990,
    durationMonths: 12,
    label: "Ventora Comercial Anual",
    checkoutEnabled: true,
    productLabel: "Ventora Comercial",
    description:
      "Para el taller que además de cotizar quiere ordenar oportunidades y cerrar más trabajos.",
    benefits: [
      "Todo lo de Ventora Cotización",
      "Seguimiento comercial y aprobación del cliente",
      "Página pública para recibir solicitudes",
      "Bandeja de solicitudes, links por canal y QR",
    ],
    recommended: true,
  },
  quote_only_annual: {
    code: "quote_only_annual",
    subscriptionPlanCode: "quote_only",
    planType: "yearly",
    billingPeriod: "yearly",
    amountClp: 59_990,
    durationMonths: 12,
    label: "Ventora Cotización Anual",
    checkoutEnabled: true,
    productLabel: "Ventora Cotización",
    description:
      "Para cotizar, enviar presupuestos profesionales y preparar la fabricación sin depender de planillas.",
    benefits: [
      "Cotizador en celular, tablet y computador",
      "Misma cuenta en varios dispositivos",
      "PDF profesional y envío por WhatsApp",
      "Clientes y cotizaciones ordenadas",
      "Líneas propias y recetas configurables",
      "Pauta interna revisable en computador cuando corresponde",
    ],
    recommended: false,
  },
  founder_monthly: {
    code: "founder_monthly",
    subscriptionPlanCode: "founder_full",
    planType: "monthly",
    billingPeriod: "monthly",
    amountClp: 9_990,
    durationMonths: 1,
    label: "Ventora Comercial Mensual",
    checkoutEnabled: true,
    productLabel: "Ventora Comercial",
    description:
      "Para el taller que además de cotizar quiere ordenar oportunidades y cerrar más trabajos.",
    benefits: [
      "Todo lo de Ventora Cotización",
      "Seguimiento comercial y aprobación del cliente",
      "Página pública para recibir solicitudes",
      "Bandeja de solicitudes, links por canal y QR",
    ],
    recommended: true,
  },
};

export const BILLING_PRODUCT_VARIANTS: Record<
  BillingProductCode,
  Record<BillingPeriodCode, BillingPlanCode>
> = {
  quote_only: {
    monthly: "quote_only_monthly",
    yearly: "quote_only_annual",
  },
  founder_full: {
    monthly: "founder_monthly",
    yearly: "founder_full_annual",
  },
};

export function isBillingProductCode(value: string): value is BillingProductCode {
  return value === "quote_only" || value === "founder_full";
}

export function isBillingPeriodCode(value: string): value is BillingPeriodCode {
  return value === "monthly" || value === "yearly";
}

export function getBillingPlanForSelection(
  productCode: BillingProductCode,
  billingPeriod: BillingPeriodCode
) {
  return BILLING_PLANS[BILLING_PRODUCT_VARIANTS[productCode][billingPeriod]];
}

export function getBillingPlanCodeForSelection(
  productCode: BillingProductCode,
  billingPeriod: BillingPeriodCode
): BillingPlanCode {
  return BILLING_PRODUCT_VARIANTS[productCode][billingPeriod];
}

export function isBillingPlanCode(value: string): value is BillingPlanCode {
  return Object.prototype.hasOwnProperty.call(BILLING_PLANS, value);
}

export function getBillingPlan(code: BillingPlanCode): BillingPlan {
  return BILLING_PLANS[code];
}

export function formatBillingPlanAmount(code: BillingPlanCode): string {
  return `$${BILLING_PLANS[code].amountClp.toLocaleString("es-CL")}`;
}
