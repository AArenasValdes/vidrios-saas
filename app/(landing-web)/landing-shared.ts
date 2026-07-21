import { BILLING_PLANS } from "@/features/billing/types/plans";

export const WHATSAPP_LANDING_HREF =
  "https://wa.me/56977338906?text=Hola%20Ventora%2C%20quiero%20mi%20demo.";

export const navLinks = [
  { href: "#problema", label: "Problema" },
  { href: "#solucion", label: "Flujo" },
  { href: "#captacion", label: "Link público" },
  { href: "#precios", label: "Precios" },
  { href: "#preguntas", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
] as const;

export const heroTrustItems = [
  "PDF profesional",
  "Envío por WhatsApp",
  "Clientes ordenados",
  "Link público opcional",
] as const;

export const PRICING_IMPLEMENTATION_HREF = `https://wa.me/56977338906?text=${encodeURIComponent(
  "Hola Ventora, quiero solicitar implementación acompañada para mi empresa."
)}`;

export const founderPlanBenefits = [
  "Todo lo del cotizador",
  "Página pública para recibir solicitudes",
  "Bandeja de solicitudes centralizada",
  "Links por canal y QR",
  "Seguimiento comercial completo",
  "PDF con imagen comercial",
  "Link público para revisión del presupuesto",
  "Aprobación o rechazo del cliente",
  "Configuración inicial incluida",
  "Soporte de arranque por WhatsApp",
] as const;

export const monthlyPlanBenefits = [
  "Incluye cotizador y página pública completa",
  "Pago mensual flexible",
  "7 días gratis",
  "Puedes pasar al anual cuando quieras",
] as const;

export const quoteOnlyPlanBenefits = [
  "Cotizador desde el celular",
  "PDF profesional",
  "Envío por WhatsApp",
  "Clientes y cotizaciones ordenadas",
  "Ideal si no necesitas página pública todavía",
] as const;

export const accompaniedPlanBenefits = [
  "Todo lo del Plan Fundador",
  "Configuración asistida completa",
  "Revisión de tu página pública",
  "Capacitación inicial",
  "Soporte prioritario de arranque",
] as const;

export function formatClp(value: number) {
  return `$${value.toLocaleString("es-CL")}`;
}

export const monthlyPrice = BILLING_PLANS.founder_monthly.amountClp;
export const yearlyPrice = BILLING_PLANS.founder_full_annual.amountClp;
export const quoteOnlyPrice = BILLING_PLANS.quote_only_annual.amountClp;
export const yearlyEquivalentMonthlyPrice = Math.round(yearlyPrice / 12);
export const annualSavingsVsMonthly = monthlyPrice * 12 - yearlyPrice;

export type PricingPlanTone = "secondary" | "featured" | "highlight" | "anchor";
export type PricingPlanCtaKind = "internal" | "whatsapp";

export type PricingPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  ctaLabel: string;
  href: string;
  ctaKind: PricingPlanCtaKind;
  tone: PricingPlanTone;
  trackingLocation: string;
  badge?: string;
  helper?: string;
  savings?: string;
  benefits?: readonly string[];
};

export const pricingPlans: readonly PricingPlan[] = [
  {
    name: "Plan Fundador Anual",
    price: formatClp(yearlyPrice),
    period: "/ año",
    description: `Equivale a ${formatClp(yearlyEquivalentMonthlyPrice)} al mes`,
    ctaLabel: "Empezar 7 días gratis",
    href: "/planes",
    ctaKind: "internal",
    tone: "featured",
    trackingLocation: "precios-fundador",
    badge: "Recomendado",
    helper: "Cotizador completo más página pública y solicitudes.",
    savings: `Ahorras ${formatClp(annualSavingsVsMonthly)} al año frente al pago mensual`,
    benefits: founderPlanBenefits,
  },
  {
    name: "Solo Cotización Anual",
    price: formatClp(quoteOnlyPrice),
    period: "/ año",
    description: "Entrada simple para cotizar y enviar presupuestos profesionales.",
    ctaLabel: "Probar cotizador gratis",
    href: "/planes",
    ctaKind: "internal",
    tone: "highlight",
    trackingLocation: "precios-solo-cotizacion",
    helper: "Ideal para quien no necesita página pública todavía.",
    benefits: quoteOnlyPlanBenefits,
  },
  {
    name: "Plan Mensual",
    price: formatClp(monthlyPrice),
    period: "/ mes",
    description: "Opción flexible mes a mes con Ventora completo, sin compromiso anual.",
    ctaLabel: "Probar 7 días gratis",
    href: "/planes",
    ctaKind: "internal",
    tone: "secondary",
    trackingLocation: "precios-mensual",
    benefits: monthlyPlanBenefits,
  },
  {
    name: "Plan Empresa Acompañado",
    price: "Desde $250.000",
    period: "/ año",
    description:
      "Para empresas que necesitan configuración asistida, capacitación y soporte de arranque.",
    ctaLabel: "Solicitar implementación",
    href: PRICING_IMPLEMENTATION_HREF,
    ctaKind: "whatsapp",
    tone: "anchor",
    trackingLocation: "precios-implementacion",
    benefits: accompaniedPlanBenefits,
  },
];

export const faqs = [
  {
    question: "¿Ventora reemplaza mi WhatsApp?",
    answer:
      "No. Ventora te ayuda a cotizar, generar PDF y enviar presupuestos por WhatsApp. También puedes recibir solicitudes con tu link público si lo activas.",
  },
  {
    question: "¿Sirve si trabajo solo?",
    answer:
      "Sí. Cotiza desde el celular, envía presupuestos profesionales y mantén clientes ordenados aunque trabajes solo en terreno o taller.",
  },
  {
    question: "¿Ventora calcula precios automáticamente?",
    answer:
      "No es motor técnico de perfilería. Te ayuda a armar cotizaciones comerciales con medidas, valores, PDF profesional y seguimiento.",
  },
  {
    question: "¿Necesito la página pública para usar Ventora?",
    answer:
      "No. Puedes empezar solo con el cotizador. La página pública es un complemento para captar solicitudes cuando no puedes responder.",
  },
  {
    question: "¿El cliente necesita instalar algo?",
    answer:
      "No. Recibe el PDF por WhatsApp o revisa el presupuesto desde un link público.",
  },
] as const;
