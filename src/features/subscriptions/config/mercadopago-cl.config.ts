import "server-only";

import {
  getMercadoPagoMarketConfig,
  getMercadoPagoMarketPlan,
  isMercadoPagoMarketBillingReady,
  isMercadoPagoMarketPlanCode,
  MERCADOPAGO_MARKET_PLAN_CODES,
  type MercadoPagoMarketPlanCode,
} from "@/features/subscriptions/config/mercadopago-market.config";

export const MERCADOPAGO_CHILE_PLAN_CODES = MERCADOPAGO_MARKET_PLAN_CODES;
type MercadoPagoChilePlanCode = MercadoPagoMarketPlanCode;

export function isMercadoPagoChilePlanCode(
  value: string
): value is MercadoPagoChilePlanCode {
  return isMercadoPagoMarketPlanCode(value);
}

export function getMercadoPagoChileConfig() {
  return getMercadoPagoMarketConfig("CL");
}

export function getMercadoPagoChilePlan(planCode: MercadoPagoChilePlanCode) {
  const plan = getMercadoPagoMarketPlan("CL", planCode);

  if (!plan) {
    throw new Error(`Plan Mercado Pago Chile no configurado: ${planCode}`);
  }

  return {
    ...plan,
    amountClp: plan.amount,
  };
}

export function isMercadoPagoChileBillingReady() {
  return isMercadoPagoMarketBillingReady("CL");
}

export type { MercadoPagoChilePlanCode };
